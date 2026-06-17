r"""
Chunking das comissões estaduais da verdade ainda não processadas:

  cev-am-waimiri-atroari     92 p.   Comitê Estadual da Verdade AM (Waimiri-Atroari)
  cev-sc-relatorio-final    208 p.   CEV Paulo Stuart Wright – Santa Catarina
  cev-rs-relatorio-final    152 p.   Subcomissão Verdade, Memória e Justiça – RS
  cev-pb-relatorio-final    117 p.   Comissão Estadual da Verdade – Paraíba
  cev-pe-relatorio-final    408 p.   CEV Dom Helder Câmara – Pernambuco
  cev-es-relatorio-final    364 p.   CEV Orlando Bomfim – Espírito Santo
  cev-pr-relatorio-vol1     416 p.   CEV Teresa Urban – Paraná, vol. 1
  cev-pr-relatorio-vol2     444 p.   CEV Teresa Urban – Paraná, vol. 2

Uso: python 03_chunkar_estaduais.py [slug...]
     sem argumento → processa todos

Lê:  pipeline/dados/extraido/<slug>.jsonl
Gera: pipeline/dados/chunks/<slug>.jsonl

=============================================================================
ESTRATÉGIA DE CHUNKING
=============================================================================
Núcleo idêntico ao de 03_chunkar_cev_mg.py / 03_chunkar_cev_sp.py:
  alvo ~395 tokens, sobreposição ~80, limite 512 (intfloat/multilingual-e5-small).

Seções mapeadas manualmente pelo sumário impresso:
  • ES  — seções I a VIII confirmadas lendo o conteúdo das páginas divisórias
  • PR-vol1 — 6 capítulos, identificados pelas páginas de rosto em caixa alta
  • PR-vol2 — 4 capítulos, identificados pelas páginas de rosto em caixa alta
  Para os demais (AM, SC, RS, PB, PE) secao = None: documentos curtos ou
  estrutura interna muito fragmentada para mapeamento auditável sem risco
  de introduzir erros.

Limpeza de cabeçalhos/rodapés:
  AM  — "Página N de 92" no início de cada página
  SC  — "RELATÓRIO FINAL" no início de cada página
  RS/PB/PE/PR — número de página isolado no início (^\d+\s*\n) e, no PR,
                 o rodapé corrido "COMISSÃO ESTADUAL DA VERDADE DO PARANÁ –
                 TERESA URBAN"
  ES  — sem cabeçalho corrido detectado; apenas normalização padrão

Todas as decisões de curadoria deste script podem ser conferidas comparando
o mapa de capítulos com os sumários dos PDFs originais.
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
MINIMO_CARACTERES = 60


# =============================================================================
# NÚCLEO DE CHUNKING (idêntico a 03_chunkar_cev_mg.py)
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
    print(f"\n[{slug}]")
    print(f"Chunks gerados: {len(chunks)}")
    if tamanhos:
        print(f"Tokens — mínimo: {min(tamanhos)}, mediana: {statistics.median(tamanhos):.0f}, máximo: {max(tamanhos)}")
    acima = sum(1 for t in tamanhos if t > LIMITE_MAXIMO_TOKENS)
    print(f"Chunks acima de {LIMITE_MAXIMO_TOKENS} tokens: {acima}")
    com_secao = sum(1 for c in chunks if c.get("secao"))
    print(f"Chunks com seção: {com_secao} ({100 * com_secao / max(len(chunks), 1):.1f}%)")
    print(f"Saída: {saida}")


def paginas_validas(slug, limpar_fn, secao_fn=None):
    """Lê o .jsonl extraído, limpa e filtra páginas; devolve lista de tuplas."""
    entrada = RAIZ / "dados" / "extraido" / f"{slug}.jsonl"
    paginas = []
    descartadas = 0
    with open(entrada, encoding="utf-8") as f:
        for numero, linha in enumerate(f, start=1):
            r = json.loads(linha)
            texto = r.get("texto", r.get("text", "")).strip()
            if not texto:
                descartadas += 1
                continue
            texto_limpo = limpar_fn(texto)
            texto_limpo = re.sub(r"(\w)-\n(\w)", r"\1\2", texto_limpo)
            texto_limpo = re.sub(r"\n{3,}", "\n\n", texto_limpo).strip()
            if len(ALFA.findall(texto_limpo)) < MINIMO_CARACTERES:
                descartadas += 1
                continue
            secao = secao_fn(numero) if secao_fn else None
            paginas.append((numero, texto_limpo, secao))
    print(f"[{slug}] {len(paginas)} páginas aproveitadas, {descartadas} descartadas")
    return paginas


# =============================================================================
# LIMPEZA ESPECÍFICA POR DOCUMENTO
# =============================================================================

# --- AM: "Página N de 92" no topo ---
_RE_AM_HEADER = re.compile(r"^Página\s+\d+\s+de\s+92\s*\n?", re.IGNORECASE)

def limpar_am(texto):
    return _RE_AM_HEADER.sub("", texto).strip()


# --- SC: "RELATÓRIO FINAL" no topo ---
_RE_SC_HEADER = re.compile(r"^RELATÓRIO FINAL\s*\n?")

def limpar_sc(texto):
    return _RE_SC_HEADER.sub("", texto).strip()


# --- RS: número de página isolado no topo ("N \n") ---
_RE_NUM_PAG = re.compile(r"^\d+\s*\n")

def limpar_numero_pagina(texto):
    return _RE_NUM_PAG.sub("", texto).strip()


# --- PR: número de página + rodapé "COMISSÃO ESTADUAL DA VERDADE DO PARANÁ…" ---
_RE_PR_RODAPE = re.compile(
    r"\nCOMISSÃO ESTADUAL DA VERDADE DO PARANÁ\s*[–-]\s*TERESA URBAN\s*\n?"
)
# BOM (byte order mark) que aparece em algumas páginas do PR-vol2
_RE_BOM = re.compile(r"﻿")

def limpar_pr(texto):
    texto = _RE_NUM_PAG.sub("", texto)
    texto = _RE_PR_RODAPE.sub("\n", texto)
    texto = _RE_BOM.sub("", texto)
    return texto.strip()


# --- ES: sem cabeçalho corrido detectado ---
def limpar_es(texto):
    return texto.strip()


# --- PB: número de página isolado no topo ---
def limpar_pb(texto):
    return limpar_numero_pagina(texto)


# --- PE: número de página isolado no topo ---
def limpar_pe(texto):
    return limpar_numero_pagina(texto)


# =============================================================================
# MAPAS DE SEÇÕES (capítulo → página inicial no .jsonl, 1-based)
# Cada mapa foi construído lendo o sumário do PDF e verificando o conteúdo
# real das páginas divisórias no .jsonl extraído.
# =============================================================================

# ES: seções I–VIII + Anexos (sumário na pág 4 do PDF; conteúdo verificado)
_SECOES_ES = [
    (5,   "I. Criação da Comissão Estadual da Memória e Verdade Orlando Bomfim"),
    (10,  "II. Atividades desenvolvidas pela Comissão"),
    (12,  "III. O Golpe Civil Militar no Brasil e no Estado do Espírito Santo"),
    (42,  "IV. Síntese quantitativa das informações segundo os depoimentos"),
    (57,  "V. Síntese quantitativa das informações dos dossiês do SII/ES"),
    (62,  "VI. Transcrição dos Depoimentos"),
    (305, "VII. Transcrição das Palestras"),
    (353, "VIII. Conclusão e Recomendações"),
    (356, "Anexos"),
]

# PR-vol1: 6 capítulos identificados pelas páginas de rosto em caixa alta
# (verificado lendo o texto das páginas 22, 46, 118, 144, 302, 392 no .jsonl)
_SECOES_PR1 = [
    (22,  "1. Relatório da Comissão Estadual da Verdade do Paraná – Teresa Urban"),
    (46,  "2. Ditadura, Sistemas de Justiça e Repressão"),
    (118, "3. Graves Violações de Direitos Humanos"),
    (144, "4. Graves Violações de Direitos Humanos contra Povos Indígenas"),
    (302, "5. Graves Violações de Direitos Humanos no Campo"),
    (392, "6. Segurança Pública e Militarização"),
]

# PR-vol2: 4 capítulos (pág 22, 160, 288, 394 verificadas)
_SECOES_PR2 = [
    (22,  "1. Operação Condor"),
    (160, "2. Outras Graves Violações de Direitos Humanos"),
    (288, "3. Partidos Políticos, Sindicatos e Ditadura"),
    (394, "4. Textos Temáticos"),
]


def _secao_fn(mapa):
    """Devolve uma função pagina→secao dada uma lista (pagina_inicio, titulo)."""
    def fn(num_pagina):
        secao = None
        for pagina_inicio, titulo in mapa:
            if num_pagina >= pagina_inicio:
                secao = titulo
            else:
                break
        return secao
    return fn


# =============================================================================
# PROCESSADORES
# =============================================================================

def processar(slug, limpar_fn, secao_fn=None):
    paginas = paginas_validas(slug, limpar_fn, secao_fn)
    if not paginas:
        print(f"[{slug}] nenhuma página válida — pulando")
        return
    tokenizer = _tokenizer()
    chunks = chunkar_paginas(paginas, tokenizer)
    gravar_chunks(slug, chunks, tokenizer)


_tok_cache = None

def _tokenizer():
    global _tok_cache
    if _tok_cache is None:
        _tok_cache = AutoTokenizer.from_pretrained(MODELO_TOKENIZER)
    return _tok_cache


# =============================================================================
# CONFIGURAÇÃO DE TODOS OS DOCUMENTOS
# =============================================================================

DOCUMENTOS = {
    "cev-am-waimiri-atroari":   (limpar_am,  None),
    "cev-sc-relatorio-final":   (limpar_sc,  None),
    "cev-rs-relatorio-final":   (limpar_numero_pagina, None),
    "cev-pb-relatorio-final":   (limpar_pb,  None),
    "cev-pe-relatorio-final":   (limpar_pe,  None),
    "cev-es-relatorio-final":   (limpar_es,  _secao_fn(_SECOES_ES)),
    "cev-pr-relatorio-vol1":    (limpar_pr,  _secao_fn(_SECOES_PR1)),
    "cev-pr-relatorio-vol2":    (limpar_pr,  _secao_fn(_SECOES_PR2)),
}


def main():
    slugs = sys.argv[1:] if len(sys.argv) > 1 else list(DOCUMENTOS)
    desconhecidos = [s for s in slugs if s not in DOCUMENTOS]
    if desconhecidos:
        print(f"Slugs desconhecidos: {desconhecidos}")
        print(f"Disponíveis: {list(DOCUMENTOS)}")
        sys.exit(1)

    # carrega tokenizer uma vez
    _tokenizer()

    for slug in slugs:
        limpar_fn, secao_fn = DOCUMENTOS[slug]
        processar(slug, limpar_fn, secao_fn)


if __name__ == "__main__":
    main()
