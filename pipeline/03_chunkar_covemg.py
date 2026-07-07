r"""
Chunking dos documentos suplementares da Covemg com texto nativo extraído.

Processa 24 documentos substanciais (>500 caracteres extraídos) que ficaram
fora do 03_chunkar_cev_mg.py, que trata apenas o Relatório Final 2017 e o
Anexo UFMG. Estes são documentos avulsos do repositório DSpace da Covemg:
depoimentos, laudos periciais, listas de vítimas/torturadores, relatório
sindical, CPI, cartas etc.

Uso:
    python 03_chunkar_covemg.py [slug...]
    sem argumento → processa todos os 24

Lê:  pipeline/dados/extraido/cev-mg-covemg-{slug}.jsonl
Gera: pipeline/dados/chunks/cev-mg-covemg-{slug}.jsonl

=============================================================================
ESTRATÉGIA DE CHUNKING
=============================================================================
Núcleo idêntico ao de 03_chunkar_estaduais.py / 03_chunkar_cev_mg.py:
  alvo ~395 tokens, sobreposição ~80, limite 512 (intfloat/multilingual-e5-small).

Seções: secao=None para todos os documentos deste lote. Os 24 docs têm
  estruturas heterogêneas (depoimentos, laudos, tabelas, CPI de 1965…) e
  não possuem sumário verificado para mapear seções. O campo secao poderá
  ser preenchido por curadoria posterior se necessário.

Limpeza de cabeçalhos/rodapés por grupo:
  Depoimentos Covemg (402, 408, 431, 467, 523)
    — cabeçalho corrido: "Av. Amazonas, 558 / 3º andar – Centro –
       Belo Horizonte / MG Cep: 30.170-130 \nFone: (31) 3270-3226 \n"
  Entrevista UFMG (392)
    — cabeçalho: "IA - CM - \nN\n" (código do projeto + número de página)
  Relatório SJPMG (468)
    — cabeçalho: "COMISSÃO DA VERDADE – SJPMG – ... \nCOMISSÃO DA VERDADE
       - SJPMG \nPágina N \n"
  Demais (310, 316, 335, 341, 352, 354, 372, 402, 426, 432, 434, 454, 455,
          461, 462, 482, 486, 502)
    — limpeza genérica: número de página isolado no topo (^\d+\s*\n)
       + "Folha no N" (laudos CNV)

Todas as decisões podem ser conferidas comparando os PDFs originais em
  pipeline/dados/brutos/cev-mg-covemg-{ID}-*.pdf

=============================================================================
"""

import json
import re
import statistics
import sys
from pathlib import Path

from transformers import AutoTokenizer

RAIZ = Path(__file__).resolve().parent
MODELO_TOKENIZER = "intfloat/multilingual-e5-small"
ALVO_TOKENS = 395
SOBREPOSICAO_TOKENS = 80
LIMITE_MAXIMO_TOKENS = 512

ALFA = re.compile(r"[^\W\d_]", re.UNICODE)
MINIMO_CARACTERES = 60  # mínimo de letras para página ser aproveitada


# =============================================================================
# SLUGS DOS 24 DOCUMENTOS SUBSTANCIAIS
# =============================================================================

TODOS_SLUGS = [
    "cev-mg-covemg-310-laudo-pericial-análise",
    "cev-mg-covemg-316-lista-torturadores-fontes-consultadas",
    "cev-mg-covemg-335-histórico-emails-trocados-entre",
    "cev-mg-covemg-341-acontecimentos-envolvendo-mortes-desaparecimentos",
    "cev-mg-covemg-352-cpi-agitação-meio-rural",
    "cev-mg-covemg-354-carta-caio-monteiro-barros",
    "cev-mg-covemg-372-laudo-pericial-comissão-nacional",
    "cev-mg-covemg-392-entrevista-christóvão-mourão-projeto",
    "cev-mg-covemg-402-depoimento-maria-conceição-rubinger",
    "cev-mg-covemg-408-depoimento-nilmário-miranda-sobre",
    "cev-mg-covemg-426-depoimento-chirlene-gonçalves-elaine",
    "cev-mg-covemg-431-depoimento-alípio-gomes-filho",
    "cev-mg-covemg-432-depoimento-josé-francisco-neres",
    "cev-mg-covemg-434-depoimento-omene-vera-comissão",
    "cev-mg-covemg-454-depoimento-daniel-bezerra-albuquerque",
    "cev-mg-covemg-455-laudo-referente-análise-dos",
    "cev-mg-covemg-461-lista-nomes-presos-políticos",
    "cev-mg-covemg-462-perfil-profissional-das-vítimas",
    "cev-mg-covemg-467-depoimento-professor-radialista-fábio",
    "cev-mg-covemg-468-relatório-comissão-verdade-sindicato",
    "cev-mg-covemg-482-tabela-brasil-nunca-mais",
    "cev-mg-covemg-486-quantitativo-vítimas-por-organizações",
    "cev-mg-covemg-502-planilha-mineiros-mortos-desaparecidos",
    "cev-mg-covemg-523-depoimento-emanuel-oliveira-césar",
]


# =============================================================================
# NÚCLEO DE CHUNKING (idêntico a 03_chunkar_estaduais.py)
# =============================================================================

def chunkar_paginas(paginas, tokenizer):
    """Recebe lista de (numero_pagina, texto_limpo, secao) e devolve chunks."""
    chunks = []
    ordem = 0
    buffer_unidades = []  # (token_ids, texto, pagina)
    secao_buffer = None

    def fechar_chunk():
        nonlocal ordem, buffer_unidades
        if not buffer_unidades:
            return
        texto_chunk = "\n\n".join(u[1] for u in buffer_unidades)
        paginas_cobertas = sorted({u[2] for u in buffer_unidades})
        faixa = str(paginas_cobertas[0]) if len(paginas_cobertas) == 1 else \
            f"{paginas_cobertas[0]}-{paginas_cobertas[-1]}"
        chunks.append({
            "ordem": ordem,
            "conteudo": texto_chunk,
            "paginas": faixa,
            "secao": secao_buffer,
            "tipo_chunk": "corpo",
        })
        ordem += 1
        buffer_unidades = []

    def tokens_no_buffer():
        return sum(len(u[0]) for u in buffer_unidades)

    for num_pagina, texto_limpo, secao in paginas:
        if secao_buffer is not None and secao != secao_buffer and buffer_unidades:
            fechar_chunk()
        secao_buffer = secao

        paragrafos = [p.strip() for p in texto_limpo.split("\n\n") if p.strip()]
        for paragrafo in paragrafos:
            tokens_par = tokenizer.encode(paragrafo, add_special_tokens=False)

            if len(tokens_par) > ALVO_TOKENS:
                pedacos = re.split(r"(?<=[.!?])\s+", paragrafo)
                pedacos_finais = []
                for pedaco in pedacos:
                    if not pedaco.strip():
                        continue
                    if len(tokenizer.encode(pedaco, add_special_tokens=False)) > LIMITE_MAXIMO_TOKENS - 2:
                        pedacos_finais.extend(l for l in pedaco.split("\n") if l.strip())
                    else:
                        pedacos_finais.append(pedaco)
                for pedaco in pedacos_finais:
                    tokens_pedaco = tokenizer.encode(pedaco, add_special_tokens=False)
                    if tokens_no_buffer() + len(tokens_pedaco) > ALVO_TOKENS and buffer_unidades:
                        fechar_chunk()
                        secao_buffer = secao
                    buffer_unidades.append((tokens_pedaco, pedaco, num_pagina))
                continue

            if tokens_no_buffer() + len(tokens_par) > ALVO_TOKENS and buffer_unidades:
                conteudo_anterior = list(buffer_unidades)
                fechar_chunk()
                secao_buffer = secao
                sobreposicao = []
                soma = 0
                for unidade in reversed(conteudo_anterior):
                    if soma >= SOBREPOSICAO_TOKENS:
                        break
                    if not sobreposicao and len(unidade[0]) > SOBREPOSICAO_TOKENS:
                        break
                    sobreposicao.insert(0, unidade)
                    soma += len(unidade[0])
                buffer_unidades = sobreposicao

            buffer_unidades.append((tokens_par, paragrafo, num_pagina))

    fechar_chunk()

    # rede de segurança: garante nenhum chunk acima do limite
    chunks_finais = []
    for chunk in chunks:
        if len(tokenizer.encode(chunk["conteudo"], add_special_tokens=True)) <= LIMITE_MAXIMO_TOKENS:
            chunks_finais.append(chunk)
            continue
        pedacos = re.split(r"(?<=[.!?])\s+", chunk["conteudo"])
        pedacos_exp = []
        for p in pedacos:
            if len(tokenizer.encode(p, add_special_tokens=False)) > LIMITE_MAXIMO_TOKENS - 2:
                pedacos_exp.extend(re.split(r"(?<=,)\s+", p))
            else:
                pedacos_exp.append(p)
        grupo, tokens_g = [], 0
        for p in pedacos_exp:
            if not p.strip():
                continue
            tp = len(tokenizer.encode(p, add_special_tokens=False))
            if tokens_g + tp > LIMITE_MAXIMO_TOKENS - 2 and grupo:
                chunks_finais.append({**chunk, "conteudo": " ".join(grupo)})
                grupo, tokens_g = [], 0
            grupo.append(p)
            tokens_g += tp
        if grupo:
            chunks_finais.append({**chunk, "conteudo": " ".join(grupo)})

    for nova_ordem, chunk in enumerate(chunks_finais):
        chunk["ordem"] = nova_ordem
    return chunks_finais


def gravar_chunks(slug, chunks, tokenizer):
    saida = RAIZ / "dados" / "chunks" / f"{slug}.jsonl"
    saida.parent.mkdir(parents=True, exist_ok=True)
    tamanhos = []
    with open(saida, "w", encoding="utf-8") as f:
        for chunk in chunks:
            tam = len(tokenizer.encode(chunk["conteudo"], add_special_tokens=True))
            tamanhos.append(tam)
            f.write(json.dumps(chunk, ensure_ascii=False) + "\n")
    print(f"  Chunks gerados: {len(chunks)}")
    if tamanhos:
        print(f"  Tokens — mín: {min(tamanhos)}, mediana: {statistics.median(tamanhos):.0f}, máx: {max(tamanhos)}")
    acima = sum(1 for t in tamanhos if t > LIMITE_MAXIMO_TOKENS)
    if acima:
        print(f"  AVISO: {acima} chunk(s) acima de {LIMITE_MAXIMO_TOKENS} tokens")
    print(f"  Saída: {saida}")


def paginas_validas(slug, limpar_fn):
    """Lê o .jsonl extraído, limpa e filtra páginas; devolve lista de tuplas."""
    entrada = RAIZ / "dados" / "extraido" / f"{slug}.jsonl"
    paginas = []
    descartadas = 0
    with open(entrada, encoding="utf-8") as f:
        for numero, linha in enumerate(f, start=1):
            r = json.loads(linha)
            texto = r.get("texto", r.get("conteudo", "")).strip()
            if not texto:
                descartadas += 1
                continue
            texto_limpo = limpar_fn(texto)
            texto_limpo = re.sub(r"(\w)-\n(\w)", r"\1\2", texto_limpo)
            texto_limpo = re.sub(r"\n{3,}", "\n\n", texto_limpo).strip()
            if len(ALFA.findall(texto_limpo)) < MINIMO_CARACTERES:
                descartadas += 1
                continue
            paginas.append((numero, texto_limpo, None))  # secao=None para todos
    print(f"  {len(paginas)} páginas aproveitadas, {descartadas} descartadas")
    return paginas


# =============================================================================
# FUNÇÕES DE LIMPEZA POR GRUPO
# =============================================================================

# Número de página isolado no topo (padrão genérico)
_RE_NUM_PAG = re.compile(r"^\d+\s*\n")
# "Folha no N" nos laudos periciais CNV
_RE_FOLHA = re.compile(r"^Folha\s+n[oº°]\s*\d+\s*\n?", re.IGNORECASE)

def limpar_generico(texto):
    texto = _RE_NUM_PAG.sub("", texto)
    texto = _RE_FOLHA.sub("", texto)
    return texto.strip()


# Depoimentos com endereço da sede da Covemg no cabeçalho de cada página
_RE_HEADER_COVEMG_DEP = re.compile(
    r"Av\.\s*Amazonas,\s*558[^\n]*\n"
    r"Fone:[^\n]*\n",
    re.IGNORECASE,
)

def limpar_depoimento_covemg(texto):
    texto = _RE_HEADER_COVEMG_DEP.sub("", texto)
    texto = _RE_NUM_PAG.sub("", texto)
    return texto.strip()


# Entrevista UFMG: "IA - CM - \nN\n" no topo de cada página
_RE_HEADER_UFMG = re.compile(r"^IA\s*-\s*CM\s*-\s*\n\d+\n", re.IGNORECASE)

def limpar_entrevista_ufmg(texto):
    texto = _RE_HEADER_UFMG.sub("", texto)
    return texto.strip()


# Relatório SJPMG: cabeçalho duplo com nome do sindicato e número de página
_RE_HEADER_SJPMG = re.compile(
    r"COMISSÃO DA VERDADE\s*[–-]\s*SJPMG[^\n]*\n"
    r"COMISSÃO DA VERDADE\s*-\s*SJPMG\s*\n"
    r"Página\s*\d+\s*\n",
    re.IGNORECASE,
)

def limpar_sjpmg(texto):
    texto = _RE_HEADER_SJPMG.sub("", texto)
    return texto.strip()


# Mapeamento slug → função de limpeza
LIMPADORES = {
    # Depoimentos com cabeçalho de endereço da Covemg
    "cev-mg-covemg-402-depoimento-maria-conceição-rubinger": limpar_depoimento_covemg,
    "cev-mg-covemg-408-depoimento-nilmário-miranda-sobre": limpar_depoimento_covemg,
    "cev-mg-covemg-431-depoimento-alípio-gomes-filho": limpar_depoimento_covemg,
    "cev-mg-covemg-467-depoimento-professor-radialista-fábio": limpar_depoimento_covemg,
    "cev-mg-covemg-523-depoimento-emanuel-oliveira-césar": limpar_depoimento_covemg,
    # Entrevista UFMG
    "cev-mg-covemg-392-entrevista-christóvão-mourão-projeto": limpar_entrevista_ufmg,
    # Relatório Sindicato dos Jornalistas MG
    "cev-mg-covemg-468-relatório-comissão-verdade-sindicato": limpar_sjpmg,
}


def limpador_para(slug):
    return LIMPADORES.get(slug, limpar_generico)


# =============================================================================
# MAIN
# =============================================================================

def processar_slug(slug, tokenizer):
    print(f"\n[{slug}]")
    entrada = RAIZ / "dados" / "extraido" / f"{slug}.jsonl"
    if not entrada.exists():
        print(f"  AVISO: arquivo não encontrado — pulando")
        return 0

    limpar = limpador_para(slug)
    paginas = paginas_validas(slug, limpar)
    if not paginas:
        print(f"  AVISO: nenhuma página aproveitável — pulando")
        return 0

    chunks = chunkar_paginas(paginas, tokenizer)
    gravar_chunks(slug, chunks, tokenizer)
    return len(chunks)


def main():
    slugs = sys.argv[1:] if len(sys.argv) > 1 else TODOS_SLUGS

    invalidos = [s for s in slugs if s not in TODOS_SLUGS]
    if invalidos:
        print(f"Slugs não reconhecidos: {invalidos}")
        print(f"Disponíveis: {TODOS_SLUGS}")
        sys.exit(1)

    print(f"Carregando tokenizador {MODELO_TOKENIZER}…")
    tokenizer = AutoTokenizer.from_pretrained(MODELO_TOKENIZER)

    total_chunks = 0
    for slug in slugs:
        total_chunks += processar_slug(slug, tokenizer)

    print(f"\n{'='*60}")
    print(f"Concluído: {len(slugs)} documentos processados, {total_chunks} chunks gerados.")


if __name__ == "__main__":
    main()
