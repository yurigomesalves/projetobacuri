"""Garimpo (somente leitura) de candidatos a VÍTIMAS NEGRAS no acervo indexado.

Varre `chunks` por termos de identificação racial negra, extrai o nome próprio
mais próximo do termo, descarta ruído geográfico/expressões e agrupa por pessoa.
NÃO faz juízo curatorial final nem escreve no banco — produz uma lista bruta de
candidatos (com trecho, fonte e página) para o curador-historiador validar.

Saída: pipeline/dados/garimpo_vitimas_negras.json  (diretório gitignored).
Uso: python3 pipeline/garimpo_vitimas_negras.py
"""

import json
import os
import re
import unicodedata
from collections import defaultdict
from pathlib import Path

import psycopg
from dotenv import load_dotenv

RAIZ = Path(__file__).resolve().parent
load_dotenv(RAIZ.parent / ".env.local")
load_dotenv(RAIZ / ".env.local")

SAIDA = RAIZ / "dados" / "garimpo_vitimas_negras.json"

# Termo racial referido a PESSOA. Evitamos "população negra", "movimento negro" etc.
TERMO = re.compile(
    r"\b(negr[oa]s?|afrodescendente|afro-?brasileir[oa]s?|mulat[oa]s?|"
    r"pele\s+negra|ra[çc]a\s+negra|cor\s+(?:preta|parda)|de\s+cor\s+(?:preta|parda))\b",
    re.IGNORECASE,
)
# Ruído: ocorrências que quase nunca se referem à cor de uma pessoa.
RUIDO = re.compile(
    r"\b(rio\s+negro|mar\s+negro|lista\s+negra|listas\s+negras|mercado\s+negro|"
    r"cabo\s+negro|monte\s+negro|porto\s+negro|ouro\s+negro|buraco\s+negro|"
    r"movimento\s+negro|consci[êe]ncia\s+negra|popula[çc][ãa]o\s+negra|"
    r"povo\s+negro|quarta-?feira\s+negra|p[áa]ssaro\s+preto|agulhas\s+negras|"
    r"frente\s+negra|serpentes\s+negras|m[ãa]os?\s+negras|mulheres\s+negras|"
    r"homens\s+negros|guarda\s+negra|m[áa]scaras?\s+negras|panteras\s+negras)\b",
    re.IGNORECASE,
)
# Tokenização linear (sem backtracking): palavras e suas posições na janela.
TOKEN = re.compile(r"[A-Za-zÀ-ÿ']+")
CONECTIVOS = {"da", "de", "do", "das", "dos", "e", "d'"}

PALAVRAS_NAO_NOME = {
    "Comissão", "Estado", "Brasil", "Forças", "Armadas", "Exército",
    "Polícia", "Federal", "Nacional", "Verdade", "Movimento", "Partido",
    "Frente", "União", "República", "São", "Santa", "Santo",
}


def normalizar(s: str) -> str:
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"\s+", " ", s.lower()).strip()


def nome_plausivel(nome: str) -> bool:
    toks = nome.split()
    if len(toks) < 2:
        return False
    # rejeita se a maioria das palavras é institucional
    inst = sum(1 for t in toks if t in PALAVRAS_NAO_NOME)
    return inst <= len(toks) // 2


def _capitalizada(tok: str) -> bool:
    return tok[:1].upper() == tok[:1] and tok[:1].isalpha() and not tok.isupper()


def nomes_na_janela(janela: str):
    """Runs de palavras Capitalizadas (com conectivos pt-br) -> [(nome, ini, fim)]."""
    toks = [(m.group(0), m.start(), m.end()) for m in TOKEN.finditer(janela)]
    nomes, i, n = [], 0, len(toks)
    while i < n:
        tok, s, e = toks[i]
        if _capitalizada(tok):
            j, fim_pos, partes = i + 1, e, [tok]
            while j < n:
                t2, s2, e2 = toks[j]
                if _capitalizada(t2):
                    partes.append(t2); fim_pos = e2; j += 1
                elif t2.lower() in CONECTIVOS and j + 1 < n and _capitalizada(toks[j + 1][0]):
                    partes.append(t2.lower()); j += 1
                else:
                    break
            if len(partes) >= 2:
                nomes.append((" ".join(partes), s, fim_pos))
            i = j
        else:
            i += 1
    return nomes


def nome_mais_proximo(janela: str, termo_ini: int, termo_fim: int):
    """Nome próprio mais próximo do termo (posições relativas à janela)."""
    melhor, melhor_dist = None, 10**9
    for nome, s, e in nomes_na_janela(janela):
        if not nome_plausivel(nome):
            continue
        if e <= termo_ini:
            d = termo_ini - e
        elif s >= termo_fim:
            d = (s - termo_fim) + 40
        else:
            d = 0
        if d < melhor_dist:
            melhor, melhor_dist = nome.strip(), d
    return melhor if melhor_dist <= 160 else None


def confianca(janela: str, termo: str) -> str:
    j = normalizar(janela)
    t = normalizar(termo)
    explicito = re.search(r"(negr[oa]|cor (preta|parda)|pele negra|ra[çc]a negra)", t)
    contexto_pessoa = re.search(
        r"(jovem|rapaz|moça|operári[oa]|estudante|militante|preso|presa|"
        r"torturad[oa]|assassinad[oa]|mort[oa]|desaparecid[oa]|vítima|"
        r"trabalhador|trabalhadora|de cor|negro de|negra de)", j
    )
    if explicito and contexto_pessoa:
        return "alta"
    if explicito:
        return "media"
    return "baixa"


def main():
    dsn = os.environ["DATABASE_URL"]
    candidatos = defaultdict(lambda: {"evidencias": [], "confiancas": set()})

    with psycopg.connect(dsn) as conn, conn.cursor() as cur:
        cur.execute(
            """
            select c.chunk_id, c.conteudo, c.paginas, f.titulo, f.autor_orgao
            from chunks c
            join fontes f on f.fonte_id = c.fonte_id
            where c.conteudo ~* %s
            """,
            (r"negr|afrodescendente|afro-?brasileir|mulat|pele negra|ra[çc]a negra|cor (preta|parda)",),
        )
        linhas = cur.fetchall()
        n_chunks = len(linhas)

        for chunk_id, conteudo, paginas, titulo, autor in linhas:
            for m in TERMO.finditer(conteudo):
                ini, fim = m.start(), m.end()
                ji, jf = max(0, ini - 130), min(len(conteudo), fim + 130)
                janela = conteudo[ji:jf]
                if RUIDO.search(janela):
                    continue
                nome = nome_mais_proximo(janela, ini - ji, fim - ji)
                if not nome:
                    continue
                # descarta nomes de lugar/organização que CONTÊM o termo racial
                # (ex.: "Agulhas Negras", "Frente Negra") — não é descrição de pessoa
                termo_norm = normalizar(m.group(0))
                nome_norm = normalizar(nome)
                if any(p in nome_norm.split() for p in termo_norm.split()):
                    continue
                conf = confianca(janela, m.group(0))
                chave = normalizar(nome)
                reg = candidatos[chave]
                reg["nome"] = nome
                reg["confiancas"].add(conf)
                trecho = re.sub(r"\s+", " ", janela).strip()
                # evita duplicar trecho idêntico
                if not any(e["trecho"] == trecho for e in reg["evidencias"]):
                    reg["evidencias"].append({
                        "trecho": trecho,
                        "termo": m.group(0),
                        "fonte": titulo,
                        "autor_orgao": autor,
                        "pagina": paginas,
                        "chunk_id": str(chunk_id),
                    })

        # checa biografias existentes
        cur.execute("select nome from biografias")
        bios = [normalizar(r[0]) for r in cur.fetchall()]

    def ja_tem(chave):
        return any(chave in b or b in chave for b in bios)

    ordem_conf = {"alta": 0, "media": 1, "baixa": 2}
    saida = []
    for chave, reg in candidatos.items():
        confs = reg["confiancas"]
        conf = "alta" if "alta" in confs else ("media" if "media" in confs else "baixa")
        saida.append({
            "nome": reg["nome"],
            "confianca": conf,
            "n_evidencias": len(reg["evidencias"]),
            "ja_tem_biografia": ja_tem(chave),
            "evidencias": reg["evidencias"],
        })
    saida.sort(key=lambda x: (ordem_conf[x["confianca"]], -x["n_evidencias"]))

    SAIDA.parent.mkdir(parents=True, exist_ok=True)
    SAIDA.write_text(json.dumps(saida, ensure_ascii=False, indent=2), encoding="utf-8")

    # relatório
    por_conf = defaultdict(int)
    for c in saida:
        por_conf[c["confianca"]] += 1
    novas = sum(1 for c in saida if not c["ja_tem_biografia"])
    print(f"chunks varridos: {n_chunks}")
    print(f"candidatos únicos: {len(saida)}  (alta={por_conf['alta']} "
          f"media={por_conf['media']} baixa={por_conf['baixa']})")
    print(f"já têm biografia: {len(saida) - novas}  |  seriam novas: {novas}")
    print(f"arquivo: {SAIDA}")
    print("\nTop por confiança/evidências:")
    for c in saida[:15]:
        flag = "✓bio" if c["ja_tem_biografia"] else "novo"
        print(f"  [{c['confianca'][:1].upper()}|{c['n_evidencias']}|{flag}] {c['nome']}")


if __name__ == "__main__":
    main()
