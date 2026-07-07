"""Garimpo (somente leitura) de candidatos a VÍTIMAS NATURAIS DO PARANÁ.

Varre acervos (CNV, CEV-PR, CEMDP, dossie-ditadura-cevsp) buscando padrões de
naturalidade explícita: "nascido/nascida em [município] (PR)", "natural de [município]",
"nasceu em ... Paraná", etc.

NÃO faz juízo curatorial final nem escreve no banco — produz uma lista bruta de
candidatos (com nome, município, data de nascimento, trecho literal, fonte, confiança)
para o curador-historiador validar.

Verifica se já existe biografia e se o município existe na tabela municipios_ibge.

Saída:
  - pipeline/dados/dossie_naturais_pr.json  (estruturado)
  - pipeline/dados/dossie_naturais_pr.md    (legível, agrupado por confiança)

Uso: python3 pipeline/garimpo_naturais_pr.py
"""

import json
import os
import re
import unicodedata
from collections import defaultdict
from pathlib import Path
from typing import Optional

import psycopg
from dotenv import load_dotenv

RAIZ = Path(__file__).resolve().parent
load_dotenv(RAIZ.parent / ".env.local")
load_dotenv(RAIZ / ".env.local")

SAIDA_JSON = RAIZ / "dados" / "dossie_naturais_pr.json"
SAIDA_MD = RAIZ / "dados" / "dossie_naturais_pr.md"

# Padrões de naturalidade explícita
# Alta confiança: fonte estruturada (CNV cabeçalho "Data e local de nascimento")
# Média: "nascido/nascida em" ou "natural de" em relatório
# Baixa/incerto: ambíguo ou possível homônimo

# Evita falsos positivos: rejeita se há "Nascido no [UF]" diferente antes do padrão
NAO_NATURAL_PR = re.compile(
    r"nascid[oa]\s+(?:no|em|à)\s+(?:Rio\s+(?:de\s+)?Janeiro|São\s+Paulo|"
    r"Rio\s+Grande\s+do\s+Sul|Minas\s+Gerais|Bahia|Pernambuco|Santa\s+Catarina|"
    r"Espírito\s+Santo|Ceará|Pará|Goiás|Distrito\s+Federal|Amazonas|Rondônia|"
    r"Maranhão|Piauí|Rio\s+Grande\s+do\s+Norte|Paraíba|Alagoas|Sergipe|Acre|"
    r"Roraima|Amapá|Tocantins|RJ|SP|RS|MG|BA|PE|SC|ES|CE|PA|GO|DF|AM|RO|MA|"
    r"PI|RN|PB|AL|SE|AC|RR|AP|TO)",
    re.IGNORECASE | re.VERBOSE
)

NATURAIS_PR = re.compile(
    r"""
    (nascid[oa]\s+em|nasceu\s+em|natural\s+d[aoe]|natural\s+da\s+cidade\s+de|
     originário\s+de|oriundo\s+de|nativ[oa]\s+de|procedência\s*:?)\s*
    ([A-Za-zÀ-ÿ\s\-']+?)
    \s*
    (?:\(PR\)|Paraná|do\s+Paraná|do\s+Estado\s+do\s+Paraná)
    """,
    re.IGNORECASE | re.VERBOSE
)

# Data de nascimento: DD/MM/AAAA ou DD de mês de AAAA ou variações
DATA_NASC = re.compile(
    r"""
    (\d{1,2})\s*(?:de|\/)\s*
    (janeiro|fevereiro|março|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro|
     jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez|\d{1,2})\s*
    (?:de|\/)\s*
    (\d{4})
    """,
    re.IGNORECASE | re.VERBOSE
)

# Nomes próprios capitalizados
TOKEN = re.compile(r"[A-Za-zÀ-ÿ']+")
CONECTIVOS = {"da", "de", "do", "das", "dos", "e", "d'"}


def normalizar(s: str) -> str:
    """Remove acentos e normaliza para comparação."""
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"\s+", " ", s.lower()).strip()


def extrair_municipios_ibge(conn) -> set:
    """Retorna set de nomes de municípios PR (normalizados) que existem no IBGE."""
    with conn.cursor() as cur:
        cur.execute(
            "select nome from municipios_ibge where uf = %s",
            ("PR",)
        )
        munis = set(normalizar(row[0]) for row in cur.fetchall())
    return munis


def limpar_municipio(nome_muni: str) -> str:
    """Remove parênteses, símbolos e normaliza grafia."""
    nome_muni = re.sub(r'[\(\)]', '', nome_muni).strip()
    nome_muni = re.sub(r'\s+', ' ', nome_muni)
    return nome_muni


def buscar_data_nascimento(texto: str, nome: str, contexto_match_inicio: int = None) -> Optional[str]:
    """Procura data de nascimento próxima ao nome, APENAS em contexto de nascimento explícito."""
    # Busca por contexto explícito: "nascido em DD/MM/AAAA" ou "nascimento: DD/MM/AAAA"
    # ou padrões claros na BIOGRAFIA
    nome_pos = texto.find(nome)

    # Procura "nascido em" ou "nascimento" ANTES do match
    if contexto_match_inicio is not None:
        inicio = max(0, contexto_match_inicio - 200)
        fim = min(len(texto), contexto_match_inicio + 500)
        janela_bio = texto[inicio:fim]

        # Procura "nascido em", "nascimento", "nascida em" imediatamente antes da data
        contextos = re.finditer(
            r"(?:nascid[oa]\s+em|nasceu\s+em|nascimento\s*:?|data\s+de\s+nascimento\s*:?)\s*"
            r"(\d{1,2}\s*(?:de|\/)\s*(?:janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro|jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez|\d{1,2})\s*(?:de|\/)\s*\d{4})",
            janela_bio,
            re.IGNORECASE
        )

        for m_ctx in contextos:
            data_str = m_ctx.group(1)
            m = DATA_NASC.search(data_str)
            if m:
                dia, mes, ano = m.groups()
                try:
                    if int(ano) > 1980:
                        continue
                except:
                    continue
                # Converter mês
                meses = {
                    'janeiro': '01', 'jan': '01',
                    'fevereiro': '02', 'fev': '02',
                    'março': '03', 'mar': '03',
                    'abril': '04', 'abr': '04',
                    'maio': '05', 'mai': '05',
                    'junho': '06', 'jun': '06',
                    'julho': '07', 'jul': '07',
                    'agosto': '08', 'ago': '08',
                    'setembro': '09', 'set': '09',
                    'outubro': '10', 'out': '10',
                    'novembro': '11', 'nov': '11',
                    'dezembro': '12', 'dez': '12',
                }
                mes_num = meses.get(mes.lower(), mes if mes.isdigit() else None)
                if mes_num:
                    return f"{dia.zfill(2)}/{mes_num}/{ano}"

    return None


PALAVRAS_NAO_NOME = {
    "Comissão", "Estado", "Brasil", "Forças", "Armadas", "Exército",
    "Polícia", "Federal", "Nacional", "Verdade", "Movimento", "Partido",
    "Frente", "União", "República", "São", "Santa", "Santo", "Ação",
    "Organização", "Libertadora", "Especial", "Vanguarda", "Revolução",
    "Ordem", "Segurança", "Justiça", "Ministério", "Instituto",
}


def nome_plausivel(nome: str) -> bool:
    """Rejeita nomes que são principalmente termos institucionais."""
    toks = nome.split()
    if len(toks) < 2:
        return False
    inst = sum(1 for t in toks if t in PALAVRAS_NAO_NOME)
    return inst <= len(toks) // 2


def nomes_na_janela(janela: str) -> list:
    """Retorna lista de nomes próprios encontrados na janela (padrão garimpo_vitimas_negras)."""
    def _capitalizada(tok: str) -> bool:
        return tok[:1].upper() == tok[:1] and tok[:1].isalpha() and not tok.isupper()

    toks = [(m.group(0), m.start(), m.end()) for m in TOKEN.finditer(janela)]
    nomes, i, n = [], 0, len(toks)

    while i < n:
        tok, s, e = toks[i]
        if _capitalizada(tok):
            j, fim_pos, partes = i + 1, e, [tok]
            while j < n:
                t2, s2, e2 = toks[j]
                if _capitalizada(t2):
                    partes.append(t2)
                    fim_pos = e2
                    j += 1
                elif t2.lower() in CONECTIVOS and j + 1 < n and _capitalizada(toks[j + 1][0]):
                    partes.append(t2.lower())
                    j += 1
                else:
                    break
            if len(partes) >= 2:
                nomes.append((" ".join(partes), s, fim_pos))
            i = j
        else:
            i += 1

    return nomes


def extrair_nome_biografia(texto: str, inicio: int, fim: int) -> Optional[str]:
    """Extrai nome próprio mais próximo do match (padrão do garimpo_vitimas_negras)."""
    nomes = nomes_na_janela(texto)

    melhor, melhor_dist = None, 10**9
    for nome, s, e in nomes:
        if e <= inicio:
            d = inicio - e
        elif s >= fim:
            d = (s - fim) + 40
        else:
            d = 0
        if d < melhor_dist:
            melhor, melhor_dist = nome.strip(), d

    return melhor if melhor_dist <= 160 else None


def varre_jsonl(arquivo: Path, munis_ibge: set) -> list:
    """Varre arquivo JSONL e extrai candidatos (padrões narrativos + cabeçalhos estruturados)."""
    candidatos = []
    titulo_fonte = arquivo.stem.replace('.jsonl', '')

    # Padrão de cabeçalho estruturado: "Data e local de nascimento: DD/MM/AAAA, Município (PR)"
    CABECALHO_ESTRUTURADO = re.compile(
        r"Data\s+e\s+local\s+de\s+nascimento\s*:?\s*"
        r"(\d{1,2}/\d{1,2}/\d{4})\s*,?\s*"
        r"([A-Za-zÀ-ÿ\s\-']+?)\s*\(PR\)",
        re.IGNORECASE
    )

    with open(arquivo, 'r', encoding='utf-8') as f:
        for linha in f:
            try:
                obj = json.loads(linha)
            except:
                continue

            texto = obj.get('texto', '')
            pagina = obj.get('paginas', obj.get('pagina', '?'))

            # === Primeiro: cabeçalhos estruturados (CNV vol 3, CEV-PR, etc.) ===
            for match_cabec in CABECALHO_ESTRUTURADO.finditer(texto):
                data_nasc = match_cabec.group(1)  # DD/MM/AAAA
                muni_raw = match_cabec.group(2)
                muni_limpo = limpar_municipio(muni_raw)
                muni_norm = normalizar(muni_limpo)

                # Procura nome: há um padrão em CNV vol 3/CEMDP:
                # "NOME" em linha isolada (maiúscula) IMEDIATAMENTE ANTES de "Data e local de nascimento"
                # Procura apenas as 3 linhas ANTES do match (geralmente está perto)
                inicio_busca = max(0, match_cabec.start() - 300)
                contexto_antes = texto[inicio_busca:match_cabec.start()]

                # Procura de trás para frente nas últimas 3-5 linhas apenas
                linhas = contexto_antes.split('\n')
                nome = None
                linhas_inspecionadas = 0
                for i in range(len(linhas) - 1, -1, -1):  # Percorre de trás para frente
                    linhas_inspecionadas += 1
                    if linhas_inspecionadas > 5:
                        break
                    linha_limpa = linhas[i].strip()
                    # Pula linhas vazias, muito curtas ou com metadados
                    if not linha_limpa or len(linha_limpa) < 5:
                        continue
                    if ':' in linha_limpa or 'Data' in linha_limpa or 'Filiação' in linha_limpa:
                        continue
                    if 'Número' in linha_limpa or 'processo' in linha_limpa.lower():
                        continue
                    # Procura por nome plausível (2+ palavras capitalizadas)
                    nome_cand_list = nomes_na_janela(linha_limpa)
                    if nome_cand_list:
                        nome_cand = nome_cand_list[-1][0]
                        if nome_plausivel(nome_cand):
                            nome = nome_cand
                            break

                if not nome:
                    continue

                confianca = "alta"  # Cabeçalho estruturado é alta confiança
                existe_ibge = muni_norm in munis_ibge

                # Trecho com contexto
                ini = max(0, match_cabec.start() - 150)
                fim = min(len(texto), match_cabec.end() + 100)
                trecho = re.sub(r"\s+", " ", texto[ini:fim]).strip()

                candidatos.append({
                    "nome": nome,
                    "municipio_natal": muni_limpo,
                    "municipio_normalizado": muni_norm,
                    "data_nascimento": data_nasc,
                    "confianca": confianca,
                    "existe_em_ibge": existe_ibge,
                    "trecho": trecho,
                    "fonte": titulo_fonte,
                    "pagina": str(pagina),
                })

            # === Segundo: padrões narrativos (narrativa biográfica) ===
            for match in NATURAIS_PR.finditer(texto):
                tipo_expr = match.group(1)

                # Rejeita se há "Nascido no [outro UF]" antes do match (falso positivo)
                contexto_inicio = max(0, match.start() - 150)
                contexto_antes = texto[contexto_inicio:match.start()]
                if NAO_NATURAL_PR.search(contexto_antes):
                    continue

                muni_raw = match.group(2)
                muni_limpo = limpar_municipio(muni_raw)
                muni_norm = normalizar(muni_limpo)

                # Pega um "nome" que aparece perto (heurística)
                nome = extrair_nome_biografia(texto, match.start(), match.end())

                # Remove artefatos: se o nome inclui o padrão de naturalidade, limpa
                if nome:
                    nome = re.sub(
                        r'\s*(Natural\s+de|nascid[oa]\s+em|natural\s+d[aoe]).*',
                        '',
                        nome,
                        flags=re.IGNORECASE
                    ).strip()

                if not nome:
                    continue

                # Confiança
                if "Data e local de nascimento" in texto:
                    confianca = "alta"
                elif re.search(r"(nascid[oa]\s+em|natural\s+de)", tipo_expr, re.IGNORECASE):
                    confianca = "media"
                else:
                    confianca = "baixa"

                # Data de nascimento (procura no contexto do match primeiro)
                data_nasc = buscar_data_nascimento(texto, nome, contexto_match_inicio=match.start())

                # Trecho literal
                ini = max(0, match.start() - 100)
                fim = min(len(texto), match.end() + 100)
                trecho = re.sub(r"\s+", " ", texto[ini:fim]).strip()

                # Existência em IBGE
                existe_ibge = muni_norm in munis_ibge

                candidatos.append({
                    "nome": nome,
                    "municipio_natal": muni_limpo,
                    "municipio_normalizado": muni_norm,
                    "data_nascimento": data_nasc,
                    "confianca": confianca,
                    "existe_em_ibge": existe_ibge,
                    "trecho": trecho,
                    "fonte": titulo_fonte,
                    "pagina": str(pagina),
                })

    return candidatos


def main():
    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        print("ERRO: DATABASE_URL não configurada em .env.local")
        return

    # Carrega municípios IBGE-PR
    with psycopg.connect(dsn) as conn:
        munis_ibge = extrair_municipios_ibge(conn)
        print(f"Carregados {len(munis_ibge)} municípios PR do IBGE")

    # Varre arquivo JSONL
    arquivos = [
        RAIZ / "dados" / "extraido" / "cnv-vol3.jsonl",
        RAIZ / "dados" / "extraido" / "cnv-vol1.jsonl",
        RAIZ / "dados" / "extraido" / "cnv-vol2.jsonl",
        RAIZ / "dados" / "extraido" / "cev-pr-relatorio-vol1.jsonl",
        RAIZ / "dados" / "extraido" / "cev-pr-relatorio-vol2.jsonl",
        RAIZ / "dados" / "extraido" / "cemdp-direito-memoria-verdade.jsonl",
        RAIZ / "dados" / "extraido" / "dossie-ditadura-cevsp.jsonl",
    ]

    candidatos_brutos = []
    for arq in arquivos:
        if not arq.exists():
            print(f"Pulando {arq.name} (não encontrado)")
            continue
        print(f"Varrendo {arq.name}...")
        candidatos_brutos.extend(varre_jsonl(arq, munis_ibge))

    # Dedup por nome normalizado + município
    candidatos_dedup = {}
    for cand in candidatos_brutos:
        chave = (normalizar(cand["nome"]), cand["municipio_normalizado"])
        if chave not in candidatos_dedup:
            candidatos_dedup[chave] = cand
        else:
            # se tiver confiança melhor, atualiza
            ordem = {"alta": 0, "media": 1, "baixa": 2}
            if ordem[cand["confianca"]] < ordem[candidatos_dedup[chave]["confianca"]]:
                candidatos_dedup[chave] = cand

    candidatos = list(candidatos_dedup.values())

    # Checa biografias existentes
    with psycopg.connect(dsn) as conn:
        with conn.cursor() as cur:
            cur.execute("select nome from biografias")
            bios_existentes = [normalizar(r[0]) for r in cur.fetchall()]

    def ja_tem_bio(nome_norm):
        return any(nome_norm in b or b in nome_norm for b in bios_existentes)

    # Marca se já tem biografia
    for cand in candidatos:
        nome_norm = normalizar(cand["nome"])
        cand["ja_tem_biografia"] = ja_tem_bio(nome_norm)

    # Ordena por confiança + existência em IBGE
    ordem_conf = {"alta": 0, "media": 1, "baixa": 2}
    candidatos.sort(
        key=lambda x: (
            ordem_conf[x["confianca"]],
            not x["existe_em_ibge"],
            normalizar(x["nome"])
        )
    )

    # Salva JSON
    SAIDA_JSON.parent.mkdir(parents=True, exist_ok=True)
    SAIDA_JSON.write_text(
        json.dumps(candidatos, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )

    # Gera Markdown
    por_conf = defaultdict(list)
    for cand in candidatos:
        por_conf[cand["confianca"]].append(cand)

    linhas_md = ["# Dossiê de Vítimas Naturais do Paraná\n"]

    for conf in ["alta", "media", "baixa"]:
        if conf not in por_conf:
            continue

        cands = por_conf[conf]
        titulo_conf = {
            "alta": "Alta Confiança (fonte estruturada/CNV)",
            "media": "Confiança Média (padrões 'nascido/natural de' em relatório)",
            "baixa": "Baixa Confiança / Incerto",
        }

        linhas_md.append(f"\n## {titulo_conf[conf]}\n")
        linhas_md.append(f"Total: {len(cands)}\n")

        for cand in cands:
            bio_mark = "(✓ JÁ TEM BIOGRAFIA)" if cand["ja_tem_biografia"] else "(NOVO)"
            ibge_mark = "" if cand["existe_em_ibge"] else " ⚠️ GRAFIA NÃO ENCONTRADA EM IBGE"

            linhas_md.append(f"\n### {cand['nome']} {bio_mark}\n")
            linhas_md.append(f"- **Município:** {cand['municipio_natal']} (PR){ibge_mark}\n")
            if cand["data_nascimento"]:
                linhas_md.append(f"- **Data de nascimento:** {cand['data_nascimento']}\n")
            linhas_md.append(f"- **Fonte:** {cand['fonte']} (página {cand['pagina']})\n")
            linhas_md.append(f"- **Trecho:** > {cand['trecho']}\n")

    SAIDA_MD.write_text("".join(linhas_md), encoding="utf-8")

    # Relatório
    total = len(candidatos)
    novos = sum(1 for c in candidatos if not c["ja_tem_biografia"])
    por_conf_count = defaultdict(int)
    para_validar = []

    for cand in candidatos:
        por_conf_count[cand["confianca"]] += 1
        if not cand["existe_em_ibge"] or cand["confianca"] in ["media", "baixa"]:
            para_validar.append(cand)

    print(f"\n{'='*60}")
    print(f"RESUMO: GARIMPO DE NATURAIS DO PARANÁ")
    print(f"{'='*60}")
    print(f"Total de candidatos únicos: {total}")
    print(f"  - Alta confiança: {por_conf_count['alta']}")
    print(f"  - Média confiança: {por_conf_count['media']}")
    print(f"  - Baixa confiança: {por_conf_count['baixa']}")
    print(f"\nJá têm biografia: {total - novos}")
    print(f"Seriam NOVOS: {novos}")
    print(f"\nPrecisam decisão do curador: {len(para_validar)} (grafia/confiança/incerto)")

    print(f"\nNOVOS NATURAIS DO PR (alta confiança, sem biografia):")
    novos_alta = [c for c in candidatos if c["confianca"] == "alta" and not c["ja_tem_biografia"]]
    for c in novos_alta:
        ibge = "✓IBGE" if c["existe_em_ibge"] else "❌grafia"
        print(f"  • {c['nome']:40} — {c['municipio_natal']:20} [{ibge}]  ({c['fonte']})")

    print(f"\nArquivos gerados:")
    print(f"  {SAIDA_JSON}")
    print(f"  {SAIDA_MD}")


if __name__ == "__main__":
    main()
