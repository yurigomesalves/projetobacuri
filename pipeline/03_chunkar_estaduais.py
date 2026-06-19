r"""
Chunking das comissões estaduais e municipais da verdade:

  cev-am-waimiri-atroari     92 p.   Comitê Estadual da Verdade AM (Waimiri-Atroari)
  cev-sc-relatorio-final    208 p.   CEV Paulo Stuart Wright – Santa Catarina
  cev-rs-relatorio-final    152 p.   Subcomissão Verdade, Memória e Justiça – RS
  cev-pb-relatorio-final    117 p.   Comissão Estadual da Verdade – Paraíba
  cev-pe-relatorio-final    408 p.   CEV Dom Helder Câmara – Pernambuco
  cev-es-relatorio-final    364 p.   CEV Orlando Bomfim – Espírito Santo
  cev-pr-relatorio-vol1     416 p.   CEV Teresa Urban – Paraná, vol. 1
  cev-pr-relatorio-vol2     444 p.   CEV Teresa Urban – Paraná, vol. 2
  cev-ap-relatorio-final    129 p.   CEV do Amapá "Chaguinha", 2017
  cev-ba-relatorio-vol1     828 p.   CEV da Bahia, vol. 1 (Relatório de Atividades), 2016
  cev-ba-relatorio-vol2     980 p.   CEV da Bahia, vol. 2 "Íntegra dos Depoimentos", 2016
  cev-se-relatorio-final    428 p.   CEV de Sergipe "Paulo Barbosa de Araújo", 2020
  cev-mg-triangulo-mineiro  136 p.   Comissão da Verdade do Triângulo Mineiro e Alto
                                     Paranaíba "Ismene Mendes" (UFU/EDUFU), 2016

  --- Comissões Universitárias (adicionadas 2026-06) ---
  cuv-ba-ufba        174 p.   UFBA – Comissão Milton Santos, 2014
  cuv-df-unb         363 p.   UnB – Comissão Anísio Teixeira, 2015
  cuv-es-ufes        190 p.   UFES – CVUfes, 2016
  cuv-mg-ufop        258 p.   UFOP – GT UFOP/COVEMG, 2017
  cuv-pb-ufcg         30 p.   UFCG – CVMJER/UFCG (relatório parcial), 2015
  cuv-sp-unicamp      61 p.   Unicamp – Comissão "Octávio Ianni", 2015
  cuv-sp-unifesp      84 p.   UNIFESP – Comissão "Marcos Lindenberg", 2015
  cuv-rn-ufrn        491 p.   UFRN – Comissão da Verdade da UFRN, 2015

  --- Comissões Municipais (adicionadas 2026-06) ---
  cmv-mg-juiz-de-fora       272 p.   CMV Juiz de Fora – "Memórias da Repressão", 2015
  cmv-pb-joao-pessoa        345 p.   CMV João Pessoa, 2020
  cmv-rj-niteroi            145 p.   Comissão da Verdade de Niterói – II Relatório Parcial
                                     (versão preliminar), 2015
  cmv-rj-petropolis         402 p.   CMV Petrópolis – crimes e violações (1964-1985), 2018
  cmv-rj-volta-redonda      589 p.   CMV D. Waldyr Calheiros – Volta Redonda (2013-2015)
  cmv-sp-maua                72 p.   CMV Mauá, 2014
  cmv-sp-osasco             117 p.   CMV Osasco (OCR Tesseract 300dpi), 2014
  cmv-sp-sao-paulo          396 p.   Comissão da Memória e Verdade da Prefeitura de SP
                                     "Vladimir Herzog", 2016

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
  • AP  — 3 partes + Recomendações (pags 17, 28, 104, 110 do jsonl verificadas)
  • BA-vol1 — 7 capítulos (pags 17, 41, 71, 109, 191, 297, 355 verificadas)
  • SE  — Introdução + Partes I/II/III/VI (pags 26, 75, 93, 283, 373 verificadas)
  • MG-Triângulo — Apresentação + Introdução + 6 capítulos + 4 Anexos (índice
    verificado e páginas divisórias confirmadas no jsonl)
  • UFBA — Introdução + 8 caps + Recomendações + Anexos (sumário pag 7;
    campo pagina == jsonl pos; nº impresso = pag − 2; caps verificados:
    8,11,22,36,42,50,57,142,143,145)
  • UnB  — Sumário Executivo + Apresentação + Atividades + Justiça de Transição
    + Repressão/Resistência + Depoentes + UnB Projeto + PARTE I (cronologia)
    + PARTE II + PARTE II.3 + PARTE IV + Referências (cabeçalho corrido alternado;
    pags 13,15,14,20,22,29,32,59,237,255,296,357 verificadas)
  • UFES — Apresentação + Introdução + UFES Criação ao Golpe + Nota Metod. +
    4 ondas repressivas + Conclusões (sumário pag 7; offset +2; pags
    11,13,15,20,24,51,79,122,181 verificadas)
  • UFOP — Agradecimentos + Introdução + Parte I + Parte II +
    Considerações Finais + Recomendações + Anexos (sumário pag 5;
    campo pagina == jsonl pos; pags 7,8,11,136,224,231,235,247,256 verificadas)
  • UFCG — relatório parcial curto (30 pags), sem sumário estruturado → secao=None
  • Unicamp — Introdução + 2 caps + Linha do Tempo + Recomendações + Anexos
    (sumário pag 4; offset +1; pags 5,9,17,49,51,53 verificadas)
  • UNIFESP — Apresentação + 6 caps (sumário pags 7-8; offset +8;
    pags 11,15,27,45,55,61,79 verificadas)
  • UFRN — Agradecimentos + Apresentação + Caps I–XII + Referências + Lista +
    Anexos (sumário pag 5; campo pagina == jsonl pos;
    pags 7,9,11,31,67,85,101,115,121,143,325,385,399,411,429,441,445 verificadas)
  • JF  — Apresentação + 6 capítulos + Apêndices + Anexos (sumário na pag 11;
    páginas divisórias 12,14,42,80,110,128,204,216,251 são em branco; conteúdo
    começa 2 páginas depois: 12,16,44,82,112,130,206,216,251 verificadas)
  • João Pessoa — 9 capítulos + Referências + Anexos + Fotos (sumário pags 15-16;
    páginas divisórias confirmadas no jsonl: 19,23,69,77,89,103,167,179,183,275,
    283,289,331 verificadas)
  • Niterói — Apresentação + Introdução + 4 Capítulos + Anexos (sumário pag 3;
    pags 4,5,10,31,59,80,130 verificadas)
  • Petrópolis — Apresentação + Trajetória + 3 seções históricas + Vítimas +
    Instituições + Testemunhos + Textos Temáticos + Oitivas MPF + Recomendações
    + Anexos (sumário pags 12-13; offset +1 entre nº impresso e posição no jsonl;
    pags jsonl 14,18,55,122,176,210,254,268,289,376,388,392 verificadas)
  • Volta Redonda — Introdução + 5 Partes + Recomendações (sumário pags 4-5;
    pags 6,30,101,112,140,161,183,209,255,330,404,432,454,535,551,573 verificadas;
    mapeamento usa as Partes como unidades, não os 14 casos individuais)
  • SP (Vladimir Herzog) — 4 Partes + Caderno de Imagens + Anexos (sumário
    pags 7-9; páginas de rosto de parte confirmadas: 15,61,115,247,327,349)
  Para os demais municipais (Mauá, Osasco) secao = None:
    Mauá — 72 pags, documento curto sem cabeçalhos de seção nas páginas
    Osasco — texto OCR fragmentado (decretos, atas, ofícios sem estrutura linear)

Limpeza de cabeçalhos/rodapés:
  AM  — "Página N de 92" no início de cada página
  SC  — "RELATÓRIO FINAL" no início de cada página
  RS/PB/PE/PR/AP/BA-vol1/BA-vol2 — número de página isolado no início
        (^\d+\s*\n); no PR também rodapé "COMISSÃO ESTADUAL DA VERDADE DO
        PARANÁ – TERESA URBAN"
  ES  — sem cabeçalho corrido detectado; apenas normalização padrão
  SE  — cabeçalho corrido "NN | SEÇÃO" ou "SEÇÃO | NN" em cada página
  MG-Triângulo — cabeçalho corrido com nome da comissão + número de página
        ("comissão da verdade do triângulo mineiro… dezembro 2016\nNN")
  JF/JP/Niterói/VR/Mauá/Osasco — número de página isolado no topo (^\d+\s*\n)
  Petrópolis — número de página entre colchetes no topo ("[N]")
  SP (Vladimir Herzog) — número de página + linha "Comissão da Memória e Verdade
        da Prefeitura de São Paulo • Relatório • Dezembro/2016"

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
    """Recebe lista de (numero_pagina, texto_limpo, secao, subsecao) e devolve chunks.

    Para compatibilidade, tuplas de 3 (sem subseção) também são aceitas.
    """
    chunks = []
    ordem = 0
    buffer_unidades = []  # (token_ids, texto, pagina)
    secao_buffer = None
    subsecao_buffer = None

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
            "subsecao": subsecao_buffer,
            "tipo_chunk": "corpo",
        })
        ordem += 1
        buffer_unidades = []

    def tokens_no_buffer():
        return sum(len(u[0]) for u in buffer_unidades)

    for unidade_pagina in paginas:
        num_pagina, texto_limpo, secao = unidade_pagina[:3]
        subsecao = unidade_pagina[3] if len(unidade_pagina) > 3 else None
        # Fecha o chunk ao trocar de seção OU de subseção, para que cada chunk
        # carregue um único par (secao, subsecao).
        if secao_buffer is not None \
                and (secao, subsecao) != (secao_buffer, subsecao_buffer) \
                and buffer_unidades:
            fechar_chunk()
        secao_buffer = secao
        subsecao_buffer = subsecao

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


def paginas_validas(slug, limpar_fn, secao_fn=None, subsecao_fn=None):
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
            subsecao = subsecao_fn(numero) if subsecao_fn else None
            paginas.append((numero, texto_limpo, secao, subsecao))
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


# --- AP: número de página isolado no topo (mesmo padrão RS/PB/PE) ---
def limpar_ap(texto):
    return limpar_numero_pagina(texto)


# --- BA-vol1: número de página isolado no topo ---
def limpar_ba_vol1(texto):
    return limpar_numero_pagina(texto)


# --- BA-vol2: número de página isolado no topo ---
# Páginas 1 e 3 têm encoding corrompido (fonte proprietária não-embutida);
# o filtro MINIMO_CARACTERES/ALFA as descarta automaticamente.
def limpar_ba_vol2(texto):
    return limpar_numero_pagina(texto)


# --- SE: cabeçalho corrido "NN | SEÇÃO" ou "SEÇÃO | NN" em cada página ---
# Exemplos reais: "24 | INTRODUÇÃO", "INTRODUÇÃO | 25", "74 | PARTE I",
# "PARTE I | 75", "100 | PARTE II".
_RE_SE_HEADER = re.compile(
    r"^(?:\d+\s*\|\s*[\w\s]+|[\w\s]+\|\s*\d+)\s*\n",
    re.UNICODE,
)

def limpar_se(texto):
    return _RE_SE_HEADER.sub("", texto).strip()


# --- MG-Triângulo: cabeçalho corrido com nome da comissão + número de página ---
# Aparece em páginas ímpares: "comissão da verdade do triângulo mineiro e alto
# paranaíba – relatório I – caso ismene mendes – dezembro 2016\nNN"
# Em páginas pares: "NN\n<seção em minúsculas>"  → o número de página solto
# já é capturado por _RE_NUM_PAG; o rótulo de seção em minúsculas (ex:
# "apresentação", "caso ismene: ...") permanece no texto — é conteúdo legítimo.
_RE_MG_TRIG_HEADER = re.compile(
    r"^comiss[aã]o da verdade do tri[aâ]ngulo mineiro.*?dezembro 2016\s*\n\d*\s*\n?",
    re.IGNORECASE | re.DOTALL,
)

def limpar_mg_triangulo(texto):
    texto = _RE_MG_TRIG_HEADER.sub("", texto)
    texto = _RE_NUM_PAG.sub("", texto)
    return texto.strip()


# =============================================================================
# LIMPEZA — COMISSÕES UNIVERSITÁRIAS (adicionadas 2026-06)
# =============================================================================

# --- cuv-ba-ufba: número de página solto no topo ("N\n" ou "NN\n") ---
# Cada página começa com o número impresso (ex: "8\n", "17\n").
# Mesmo padrão de RS/PB/PE — reutiliza _RE_NUM_PAG.
def limpar_cuv_ufba(texto):
    return _RE_NUM_PAG.sub("", texto).strip()


# --- cuv-df-unb: cabeçalho corrido alternado em páginas pares e ímpares ---
# Pares:   "NN \nUniversidade de Brasília\n"
# Ímpares: "Relatório da Comissão Anísio Teixeira de Memória e Verdade \nNN\n"
_RE_UNB_PAR = re.compile(
    r"^\d+\s*\nUniversidade de Bras[ií]lia\s*\n",
    re.IGNORECASE,
)
_RE_UNB_IMPAR = re.compile(
    r"^Relat[oó]rio da Comiss[aã]o An[ií]sio Teixeira de Mem[oó]ria e Verdade\s*\n\d+\s*\n",
    re.IGNORECASE,
)

def limpar_cuv_unb(texto):
    texto = _RE_UNB_PAR.sub("", texto)
    texto = _RE_UNB_IMPAR.sub("", texto)
    return texto.strip()


# --- cuv-es-ufes: cabeçalho corrido alternado ---
# Pares:   "NN\nRelatório Final da Comissão da Verdade\n"
# Ímpares: "NN\nUniversidade Federal do Espírito Santo\n"
_RE_UFES_HEADER = re.compile(
    r"^\d+\s*\n(?:Relat[oó]rio Final da Comiss[aã]o da Verdade|"
    r"Universidade Federal do Esp[ií]rito Santo)\s*\n",
    re.IGNORECASE,
)

def limpar_cuv_ufes(texto):
    return _RE_UFES_HEADER.sub("", texto).strip()


# --- cuv-mg-ufop: sem cabeçalho corrido detectado ---
# Documento extraído sem número de página no início de cada bloco.
def limpar_cuv_ufop(texto):
    return texto.strip()


# --- cuv-pb-ufcg: cabeçalho corrido de contatos em todas as páginas ---
# Linha: "Contatos: cvmjufcg@hotmail.com - ADUFCG: 3333-1032/ ADUC: 3531-2255 / \n
#         Sintespb/UFCG: 3333-1048/ ADUFCG-Patos: 3423-9513 / DCE-UFCG: 2101-1378/1251 \n"
_RE_UFCG_HEADER = re.compile(
    r"^Contatos:\s*cvmjufcg@hotmail\.com.*?DCE-UFCG:\s*2101-1378/1251\s*\n",
    re.DOTALL | re.IGNORECASE,
)

def limpar_cuv_ufcg(texto):
    return _RE_UFCG_HEADER.sub("", texto).strip()


# --- cuv-sp-unicamp: número de página isolado no topo ("N \n") ---
# Mesmo padrão de RS/PB/PE — reutiliza _RE_NUM_PAG.
def limpar_cuv_unicamp(texto):
    return _RE_NUM_PAG.sub("", texto).strip()


# --- cuv-sp-unifesp: número de página + linha de crédito da universidade ---
# "NN\nUniversidade Federal de São Paulo | Unifesp | Comissão da Verdade\n"
_RE_UNIFESP_HEADER = re.compile(
    r"^\d+\s*\nUniversidade Federal de S[aã]o Paulo\s*\|\s*Unifesp\s*\|\s*Comiss[aã]o da Verdade\s*\n",
    re.IGNORECASE,
)

def limpar_cuv_unifesp(texto):
    return _RE_UNIFESP_HEADER.sub("", texto).strip()


# --- cuv-rn-ufrn: cabeçalho "Comissão da Verdade da UFRN\nNN\n" ---
# Aparece no topo de cada página: "Comissão da Verdade da UFRN\n10\n"
_RE_UFRN_HEADER = re.compile(
    r"^Comiss[aã]o da Verdade da UFRN\s*\n\d+\s*\n",
    re.IGNORECASE,
)

def limpar_cuv_ufrn(texto):
    texto = _RE_UFRN_HEADER.sub("", texto)
    # algumas páginas começam com o número antes da linha da comissão
    texto = _RE_NUM_PAG.sub("", texto)
    return texto.strip()


# =============================================================================
# MAPAS DE SEÇÕES — COMISSÕES UNIVERSITÁRIAS (adicionados 2026-06)
# =============================================================================

# cuv-ba-ufba: 9 caps + Recomendações + Anexos
# Sumário pag 7 do jsonl. Campo pagina == jsonl pos; nº impresso = campo − 2.
# Caps verificados lendo o conteúdo real de cada posição no jsonl:
# jsonl 8 = cap 1 (intro, pag impressa 6), jsonl 11 = cap 2 (pag 9),
# jsonl 22 = cap 3 (pag 20), jsonl 36 = cap 4 (pag 34),
# jsonl 42 = cap 5 (pag 40), jsonl 50 = cap 6 (pag 48),
# jsonl 57 = cap 7 (pag 55), jsonl 142 = cap 8 conclusão (pag 140),
# jsonl 143 = cap 9 recomendações, jsonl 145 = Anexos.
_SECOES_UFBA = [
    (8,   "1. Introdução"),
    (11,  "2. O Golpe, os Aplausos e a Resistência"),
    (22,  "3. A Repressão do Movimento Estudantil"),
    (36,  "4. O Controle Ideológico da Instituição"),
    (42,  "5. O Avanço da Resistência e da Luta pela Democracia"),
    (50,  "6. Estrutura e Funcionamento do Sistema de Vigilância e Submissão"),
    (57,  "7. Os Perseguidos"),
    (142, "8. Conclusão"),
    (143, "9. Recomendações"),
    (145, "Anexos"),
]

# cuv-df-unb: seções conforme sumário executivo e divisões explícitas no texto.
# Pags verificadas lendo o conteúdo real de cada posição no jsonl.
# Nota: PARTE III não existe neste documento (salta de II.3 para IV).
# Pag 14 é continuação da pag 13 (Sumário Executivo) — não é seção nova.
_SECOES_UNB = [
    (13,  "Sumário Executivo e Atividades da Comissão"),
    (15,  "Apresentação"),
    (20,  "A Justiça de Transição e as Comissões da Verdade"),
    (22,  "Repressão e Resistência na Universidade: a Luta das Gerações"),
    (29,  "Relação de Depoentes à CATMV-UnB"),
    (32,  "UnB: Projeto Inicial Interrompido e o CIEM"),
    (59,  "Parte I – Organização Cronológica: UnB, Ditadura, Resistência (1962-1988)"),
    (237, "Parte II – Eixos Temáticos"),
    (255, "Parte II.3 – Vidas: Desaparecidos Políticos da UnB"),
    (296, "Parte IV – Conclusões e Recomendações"),
    (357, "Referências Bibliográficas"),
]

# cuv-es-ufes: Apresentação + Introdução + seção histórica + Nota + 4 ondas + Conclusões
# Sumário pag 7. Campo pagina == jsonl pos; nº impresso = campo − 2.
# Pags verificadas (jsonl pos): 11, 13, 15, 20, 24, 51, 79, 122, 181.
_SECOES_UFES = [
    (11,  "Apresentação"),
    (13,  "Introdução"),
    (15,  "Universidade Federal do Espírito Santo: da Criação ao Golpe de 1964"),
    (20,  "Nota Metodológica"),
    (24,  "A Primeira Onda Repressiva na UFES: o Golpe e a Universidade"),
    (51,  "A Segunda Onda Repressiva na UFES: a Ditadura se Fecha"),
    (79,  "A Terceira Onda Repressiva na UFES: Graves Violações dos Direitos Humanos no Espírito Santo"),
    (122, "A Quarta Onda Repressiva na UFES: a Universidade sob o Olhar da Repressão Política (1975-1985)"),
    (181, "Conclusões"),
]

# cuv-mg-ufop: Agradecimentos + Introdução + Parte I (6 caps) + Parte II (3 caps) +
# Considerações Finais + Recomendações + Anexos
# Sumário pag 5. Campo pagina == jsonl pos.
# Pags verificadas: 7, 8, 11, 136, 224, 231, 235, 247, 256.
# Caps internos não têm páginas divisórias separadas — a granularidade das Partes é suficiente.
_SECOES_UFOP = [
    (7,   "Agradecimentos"),
    (8,   "Introdução"),
    (11,  "Parte I – A Universidade no Interior da Cidade e o Contexto Político do Pré e Pós-Golpe de 1964"),
    (136, "Parte II – A Cidade e o Contexto Dentro da Universidade"),
    (224, "Considerações Finais"),
    (231, "Recomendações"),
    (235, "Anexo 1 – Os Festivais de Inverno e a Repressão em Ouro Preto"),
    (247, "Anexo 2 – O ICHS/UFOP no Processo de Redemocratização"),
    (256, "Anexo 3 – Fotos do Protesto em Ouro Preto (19/03/1984)"),
]

# cuv-sp-unicamp: Introdução + 2 capítulos + Linha do Tempo + Recomendações + Anexos
# Sumário pag 4. Campo pagina == jsonl pos (offset +1 vs nº impresso).
# Pags verificadas: 5 (intro), 9 (cap 1), 17 (cap 2), 49 (linha do tempo),
# 51 (recomendações), 53 (anexos).
_SECOES_UNICAMP = [
    (5,   "Introdução"),
    (9,   "1. \"Por uma Comissão da Verdade e Memória na Unicamp\""),
    (17,  "2. Efeitos da Ditadura Militar sobre a Comunidade Acadêmica"),
    (49,  "3. Linha do Tempo"),
    (51,  "4. Recomendações"),
    (53,  "Anexos"),
]

# cuv-sp-unifesp: Apresentação + 6 capítulos
# Sumário pags 7-8. Campo pagina == jsonl pos (offset +8 vs nº impresso).
# Pags verificadas: 11 (apresentação), 15 (cap 1), 27 (cap 2),
# 45 (cap 3 biografias), 55 (cap 4 depoimento), 61 (cap 5 reflexões),
# 79 (cap 6 sumário do relatório).
_SECOES_UNIFESP = [
    (11,  "Apresentação"),
    (15,  "Capítulo 1 – À Guisa de Abertura: entre a História, a Memória, o Tempo e a Verdade"),
    (27,  "Capítulo 2 – 1972: Estudantes no Olho do Furacão"),
    (45,  "Capítulo 3 – Biografias"),
    (55,  "Capítulo 4 – Depoimento: Nestor Schor"),
    (61,  "Capítulo 5 – Reflexões"),
    (79,  "Capítulo 6 – Sumário do Relatório da Comissão da Verdade Marcos Lindenberg da Unifesp"),
]

# cuv-rn-ufrn: Agradecimentos + Apresentação + 12 capítulos + Referências + Lista + Anexos
# Sumário pag 5. Campo pagina == jsonl pos == nº impresso (sem offset).
# Pags verificadas: 7, 9, 11, 31, 67, 85, 101, 115, 121, 143, 325, 385, 399, 411, 429, 441, 445.
_SECOES_UFRN = [
    (7,   "Agradecimentos"),
    (9,   "Apresentação"),
    (11,  "I – Introdução"),
    (31,  "II – Antecedentes, Registros Históricos, Dados e Resultados da Comissão da Verdade na UFRN"),
    (67,  "III – Arcabouço Histórico da Ditadura Militar no Brasil: Eclosão da Ditadura e os Reflexos no RN e na UFRN"),
    (85,  "IV – A Assessoria de Segurança e Informações do MEC na UFRN (ASI/UFRN): o Braço da Repressão nas Universidades"),
    (101, "V – Diligências para Localização do Acervo Documental da Extinta ASI/UFRN (1970-1990)"),
    (115, "VI – A Ação Estudantil Pré-1964 no Rio Grande do Norte"),
    (121, "VII – Ações Repressivas Oficiais: IPMs da UFRN (1964) e do Restaurante Universitário (1968)"),
    (143, "VIII – Resistência e Memória: Atuação Estudantil-Universitária Durante a Ditadura Militar (1964-1985)"),
    (325, "IX – Movimento Docente: Criação da ADURN no Período de Redemocratização"),
    (385, "X – Expurgo de Pessoal Docente"),
    (399, "XI – Resgate Histórico da Movimentação dos Servidores Públicos Federais"),
    (411, "XII – Considerações Finais e Recomendações"),
    (429, "Referências"),
    (441, "Lista de Abreviaturas"),
    (445, "Anexos – Documentos e Iconografia"),
]


# =============================================================================
# LIMPEZA — COMISSÕES MUNICIPAIS (adicionadas 2026-06)
# =============================================================================

# --- JF / JP / Niterói / VR / Mauá / Osasco: número de página isolado no topo ---
# Padrão idêntico a RS/PB/PE; reutiliza limpar_numero_pagina.
# Mauá tem \xa0 após o número ("10\xa0\n\xa0\n …") mas ^\d+\s*\n captura igualmente.

def limpar_cmv_num_pagina(texto):
    return limpar_numero_pagina(texto)


# --- Petrópolis: número de página entre colchetes no topo ("[N]") ---
# Todas as páginas de conteúdo começam com "[N]" (ex: "[19]", "[99]").
# Verificado nas pags 20, 50, 100, 150, 200, 250, 300, 350, 400 do jsonl.
_RE_PET_HEADER = re.compile(r"^\[\d+\]\s*\n?")

def limpar_petropolis(texto):
    return _RE_PET_HEADER.sub("", texto).strip()


# --- SP (Vladimir Herzog): número de página + linha de crédito da comissão ---
# Todas as páginas com texto começam com "N\nComissão da Memória e Verdade…\n".
# Verificado nas pags 17, 20, 50, 100, 200, 300 do jsonl.
_RE_SP_CMV_HEADER = re.compile(
    r"^\d+\s*\nComiss[aã]o da Mem[oó]ria e Verdade da Prefeitura de S[aã]o Paulo"
    r"\s*[•·]\s*Relat[oó]rio\s*[•·]\s*Dezembro/2016\s*\n",
    re.IGNORECASE,
)

def limpar_sp_cmv(texto):
    texto = _RE_SP_CMV_HEADER.sub("", texto)
    # páginas de rosto de Parte (ex: "PARTE I\nA COMISSÃO...") não têm o cabeçalho
    # mas também não têm número solto; normalização padrão suficiente
    return texto.strip()


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

# PR-vol2: capítulos verificados pelas páginas-divisórias no .jsonl.
# A parte "Textos Temáticos" reúne dois capítulos com numeração própria
# (4 e 5 no sumário); tratamo-los como duas seções de 1º nível, como o
# próprio documento os numera. O divisor "TEXTOS TEMÁTICOS" (off 394) e a
# página em branco seguinte são curtos e caem no filtro de mínimo de
# caracteres, então não geram chunk sob o rótulo do cap. 4.
_SECOES_PR2 = [
    (22,  "1. Operação Condor"),
    (160, "2. Outras Graves Violações de Direitos Humanos"),
    (288, "3. Partidos Políticos, Sindicatos e Ditadura"),
    (394, "4. Flávio Suplicy de Lacerda"),
    (414, "5. O papel das igrejas durante a ditadura civil-militar"),
]

# PR-vol2: subseções de nível X.Y dentro dos capítulos. Offsets = posição
# da página no .jsonl extraído (mesma régua de _SECOES_PR2), resolvidos pela
# página impressa do sumário (offset = página impressa + 1 no corpo) e
# conferidos no conteúdo. Como o rótulo é por página, quando várias
# subseções começam na mesma página, a página leva a ÚLTIMA da lista
# (_secao_fn é "último offset <= página"); isso costuma favorecer o caso/
# vítima nomeada sobre o "Considerações iniciais" anterior. Subseção nominal
# ausente numa página ≠ conteúdo perdido — é só a granularidade grossa do
# rótulo.
_SUBSECOES_PR2 = [
    # Cap. 1 — Operação Condor
    (26,  "1.1 Considerações iniciais"),
    (38,  "1.2 Encontro com Adolfo Pérez Esquivel"),
    (40,  "1.3 Objetivo principal do GT \"Operação Condor\""),
    (52,  "1.4 A Chacina do Parque Nacional do Iguaçu (1974)"),
    (96,  "1.5 Gilberto Giovanetti e Maria Madalena Cavalcanti Lacerda"),
    (110, "1.6 Major Joaquim Pires Cerveira"),
    (113, "1.7 Rodolfo Mongelós, Aníbal Abbate Soley, Alejandro Stumpfs e César Cabral"),
    (114, "1.8 Operação Colombo: o caso do jornal O Dia de Curitiba (PR)"),
    (117, "1.9 Agustín Goiburú"),
    (120, "1.10 Guiomar Schmidt Klasko"),
    (121, "1.11 Remigio Giménez Gamarra"),
    (132, "1.12 Aluízio Ferreira Palmar"),
    (152, "1.13 Liliana Inés Goldemberg e Eduardo Gonzalo Escabosa"),
    (153, "1.14 Embaixador José Pinheiro Jobim"),
    (156, "1.15 Recomendações gerais ao Grupo de Trabalho \"Operação Condor\""),
    # Cap. 2 — Outras Graves Violações de Direitos Humanos
    (162, "2.1 Considerações iniciais"),
    (162, "2.2 Soldado Jorge Borges"),
    (163, "2.3 Clarice Valença"),
    (169, "2.4 Tsutomu Higashi"),
    (203, "2.5 Jane Argolo"),
    (221, "2.6 Benedito Lúcio Machado"),
    (222, "2.7 Campo de Instrução Marechal Hermes – Papanduva (SC): graves violações no apossamento realizado pela 5ª Região Militar do Exército em áreas rurais de Papanduva e Três Barras (SC)"),
    (283, "2.8 Documentos recebidos em oitivas e pesquisas de campo"),
    # Cap. 3 — Partidos Políticos, Sindicatos e Ditadura
    (290, "3.1 Considerações iniciais"),
    (292, "3.2 Apresentação do Grupo de Trabalho"),
    (292, "3.3 Metodologia do Grupo de Trabalho"),
    (292, "3.4 Atividades desenvolvidas e parceiros"),
    (293, "3.5 O movimento sindical"),
    (294, "3.6 Os partidos políticos"),
    (298, "3.7 O Grupo dos Onze"),
    (298, "3.8 O Partido Comunista Brasileiro e o inquérito policial militar – zona norte do Paraná"),
    (298, "3.9 Ação Popular Marxista Leninista"),
    (299, "3.10 Inquérito policial militar nº 44 – sobre as atividades dos comunistas no Paraná e em Santa Catarina"),
    (300, "3.11 Comissão Nacional da Verdade, Memória, Justiça e Reparação da CUT"),
    (301, "3.12 Grupo de Trabalho \"Resgate da Verdade, Memória e Justiça do Sindicato dos Bancários de Curitiba e Região Metropolitana\""),
    (303, "3.13 Grupo de Trabalho \"Verdade, Memória e Justiça do Sindicato dos Jornalistas do Paraná\""),
    (304, "3.14 Entrevistas do projeto \"Mapeamento das elites políticas do Paraná – os comunistas\""),
    (304, "3.15 Entrevistas do projeto \"DHPAZ/Paraná – depoimentos para a História\""),
    (305, "3.16 Ato unitário sindical da Comissão Estadual da Verdade com as centrais sindicais do Paraná"),
    (305, "3.17 Audiências públicas da Comissão Estadual da Verdade"),
    (306, "3.18 Audiência pública da Comissão Estadual da Verdade em Curitiba"),
    (307, "3.19 Caravana da agricultura familiar – Fetraf/Paraná"),
    (307, "3.20 Audiência pública da Comissão Estadual da Verdade em Umuarama"),
    (309, "3.21 Audiência pública da Comissão Estadual da Verdade em Maringá em parceria com o Sismmar e a Universidade Estadual de Maringá"),
    (311, "3.22 Audiência pública da Comissão Estadual da Verdade na cidade de Londrina, em parceria com o Sindicato dos Bancários de Londrina, Câmara Municipal de Londrina e Universidade Estadual de Londrina"),
    (313, "3.23 Projeto DHPAZ/Paraná – Depoimentos para a História: resumo das oitivas – entrevistas cedidas à CEV-PR"),
    (344, "3.24 Projeto de mapeamento de elites políticas: velhos vermelhos (memória e história dos dirigentes do Partido Comunista do Brasil)"),
    (357, "3.25 Projeto de 80 anos do Sindicato dos Bancários de Curitiba e Região Metropolitana – realizado com pessoas ligadas ao movimento sindical"),
    (372, "3.26 Recomendações do GT \"Partidos Políticos, Sindicatos e Ditadura\""),
    (373, "3.27 Recomendações ao GT \"Ditadura e Repressão aos Trabalhadores e ao Movimento Sindical\" da CNV"),
    (379, "3.28 Das reparações históricas e recondução dos mandatos legislativos"),
    (380, "3.29 Considerações finais"),
    # Cap. 4 — Flávio Suplicy de Lacerda
    (396, "4.1 Considerações iniciais"),
    (397, "4.2 A \"Operação Limpeza\""),
    (400, "4.3 A Lei Suplicy"),
    (407, "4.4 O ex-ministro da Educação retorna à Universidade Federal do Paraná"),
    (411, "4.5 Considerações finais"),
    # Cap. 5 — O papel das igrejas durante a ditadura civil-militar
    (414, "5.1 Considerações iniciais"),
    (415, "5.2 A extrema direita católica no apoio ao golpe civil-militar no norte paranaense"),
    (418, "5.3 Integrantes do clero que se opuseram à ditadura civil-militar no Paraná"),
    (430, "5.4 Atuação de freiras e padres da Igreja Católica Apostólica Romana (ICAR)"),
    (437, "5.5 Considerações finais"),
]

# AP: 3 partes + Recomendações
# Verificadas lendo sumário (pag 10) e conteúdo real das páginas divisórias no jsonl.
_SECOES_AP = [
    (17,  "I Parte – Organização e Funcionamento"),
    (28,  "II Parte – Ditadura Civil-Militar no Amapá (1964-1988)"),
    (104, "III Parte – Projeto A Memória Vai à Escola"),
    (110, "IV Parte – Recomendações"),
]

# BA-vol1: 7 capítulos
# Verificados lendo o sumário (pags 5-10) e as páginas divisórias reais no jsonl
# (pags 17, 41, 71, 109, 191, 297, 355 — cada uma começa com "NN \n\nCAPÍTULO N").
_SECOES_BA1 = [
    (17,  "Capítulo 1 – A Comissão Estadual da Verdade-BA e o Trabalho Realizado"),
    (41,  "Capítulo 2 – O Impacto Imediato do Golpe"),
    (71,  "Capítulo 3 – Sistema de Segurança e de Justiça: Estrutura da Repressão"),
    (109, "Capítulo 4 – Cultura e Meios de Comunicação: Repressão e Resistência"),
    (191, "Capítulo 5 – Vítimas da Ditadura: Perseguidos, Cassados, Exilados, Torturados, Mortos e Desaparecidos"),
    (297, "Capítulo 6 – Igrejas e Ditadura Militar na Bahia"),
    (355, "Capítulo 7 – Considerações e Recomendações"),
]

# SE: Introdução + 7 Partes
# Verificados lendo o sumário (pags 21-24 do jsonl) e confirmando as páginas divisórias
# reais no jsonl: cabeçalhos "NN | PARTE X" / "PARTE X | NN" confirmam cada entrada.
# Partes IV e V estavam ausentes no mapa anterior (mapeamento errôneo que pulava III→VI).
# jsonl pag 26 = "24 | INTRODUÇÃO"
# jsonl pag 75 = "74 | PARTE I"
# jsonl pag 91 = "90 | PARTE II"
# jsonl pag 283 = "282 | PARTE III"
# jsonl pag 315 = "314 | PARTE IV"
# jsonl pag 343 = "342 | PARTE V"
# jsonl pag 373 = "372 | PARTE VI"
# jsonl pag 380 = "PÓS TEXTUAIS| 379" (Parte VII)
_SECOES_SE = [
    (26,  "Introdução"),
    (75,  "Parte I – O Estado de Segurança Nacional e as Estruturas de Repressão Política"),
    (91,  "Parte II – A Cronologia da Repressão Política em Sergipe de 1946 a 1988"),
    (283, "Parte III – Verdade e Memória: Temas Diversos"),
    (315, "Parte IV – Pessoas Atingidas pela Repressão Política em Sergipe"),
    (343, "Parte V – A Repressão Política em Sergipe"),
    (373, "Parte VI – Recomendações"),
    (380, "Parte VII – Pós-Textuais"),
]

# MG-Triângulo: Apresentação + Introdução + 6 capítulos + 4 Anexos
# Documento gira inteiramente em torno do Caso Ismene Mendes.
# Páginas verificadas lendo o índice (pag 6) e o conteúdo real de cada divisória.
_SECOES_MG_TRIG = [
    (9,   "Apresentação – As Comissões da Verdade"),
    (14,  "Introdução – Justiça de Transição e Consolidação Democrática"),
    (17,  "Biografia de Ismene Mendes"),
    (19,  "Capítulo I – Caso Ismene: do Inquérito Policial à Realidade dos Fatos"),
    (25,  "Capítulo II – A Ditadura e os seus Suicidados"),
    (28,  "Capítulo III – Repressão aos Sindicalistas Rurais no Final da Ditadura"),
    (33,  "Capítulo IV – Ditadura Civil-Militar e a Questão de Gênero"),
    (46,  "Capítulo V – Das Ligas Camponesas ao MST"),
    (53,  "Capítulo VI – Ismênia: o Caso Ismene Mendes e a Justiça de Transição pela Arte"),
    (61,  "Anexo I – Perfil CNV: Mortos e Desaparecidos Políticos"),
    (68,  "Anexo II – A Vida de Ismene Mendes"),
    (75,  "Anexo III – Inquérito Caso Ismene Mendes"),
    (110, "Anexo IV – Principais Depoimentos"),
]


# =============================================================================
# MAPAS DE SEÇÕES — COMISSÕES MUNICIPAIS (adicionados 2026-06)
# =============================================================================

# JF: Apresentação + 6 capítulos + Apêndices + Anexos
# Sumário na pag 11 do jsonl. Páginas divisórias são em branco (só número);
# o conteúdo começa 2 páginas depois de cada entrada do sumário.
# Verificadas: pag 12 (Apresentação), 16 (Cap1), 44 (Cap2), 82 (Cap3),
#              112 (Cap4), 130 (Cap5), 206 (Cap6), 216 (Apêndices), 251 (Anexos).
_SECOES_JF = [
    (12,  "Apresentação"),
    (16,  "Capítulo 1 – Trajetória da Comissão"),
    (44,  "Capítulo 2 – Sistema de repressão em Juiz de Fora"),
    (82,  "Capítulo 3 – Vítimas da ditadura"),
    (112, "Capítulo 4 – Justiça e legislação de exceção"),
    (130, "Capítulo 5 – Os impactos da ditadura sobre as instituições"),
    (206, "Capítulo 6 – Conclusões e recomendações"),
    (216, "Apêndices"),
    (251, "Anexos"),
]

# João Pessoa: Apresentação + 9 capítulos + Referências + Anexos + Fotos
# Sumário nas pags 15-16 do jsonl. Páginas divisórias verificadas diretamente
# no jsonl: 19, 23, 69, 77, 89, 103, 167, 179, 183, 275, 283, 289, 331.
_SECOES_JP = [
    (19,  "Apresentação"),
    (23,  "Capítulo 1 – A Instalação da Ditadura Militar e a Repressão Política em João Pessoa"),
    (69,  "Capítulo 2 – Territórios de Resistência: João Pessoa e o Golpe de 1964"),
    (77,  "Capítulo 3 – A Prefeitura Municipal de João Pessoa e a Ditadura Militar"),
    (89,  "Capítulo 4 – A Câmara Municipal de João Pessoa e a Ditadura Militar"),
    (103, "Capítulo 5 – O Aparato Repressivo da Ditadura Militar em João Pessoa"),
    (167, "Capítulo 6 – Movimentos de Resistência e Defesa dos Direitos Humanos"),
    (179, "Capítulo 7 – João Pessoa e a Memória Histórica do Autoritarismo"),
    (183, "Capítulo 8 – Histórias de Vidas contra o Arbítrio"),
    (275, "Capítulo 9 – Recomendações"),
    (283, "Referências"),
    (289, "Anexos"),
    (331, "Fotos"),
]

# Niterói: Apresentação + Introdução + 4 Capítulos + Anexos
# Sumário na pag 3 do jsonl. Páginas divisórias verificadas no jsonl:
# pag 4 (Apresentação), 5 (Introdução), 10 (Cap I), 31 (Cap II), 59 (Cap III),
# 80 (Cap IV), 130 (Anexos).
_SECOES_NITEROI = [
    (4,   "Apresentação"),
    (5,   "Introdução"),
    (10,  "Capítulo I – O Estádio Caio Martins"),
    (31,  "Capítulo II – Niterói, o Golpe e a Repressão aos Trabalhadores: os Operários Navais"),
    (59,  "Capítulo III – O Centro de Armamento da Marinha"),
    (80,  "Capítulo IV – Ilha das Flores"),
    (130, "Anexos"),
]

# Petrópolis: Apresentação + Trajetória + 3 seções históricas + Vítimas +
# Instituições + Testemunhos + Textos Temáticos + Oitivas MPF +
# Considerações Finais + Anexos
# Sumário pags 12-13. O jsonl tem offset +1 vs. número impresso (pag impressa N
# = jsonl posição N+1). Páginas jsonl verificadas: 14, 18, 55, 122, 176, 210,
# 254, 268, 289, 376, 388, 392.
_SECOES_PETROPOLIS = [
    (14,  "Apresentação"),
    (18,  "Trajetória da Comissão Municipal da Verdade"),
    (55,  "1. O Golpe e a Formação da Ditadura Militar (1964-1969)"),
    (122, "2. A Consolidação da Ditadura Militar (1970-1979)"),
    (176, "3. A Redemocratização e a Retomada das Lutas Sociais (1980-1989)"),
    (210, "Vítimas"),
    (254, "Instituições, Leis e Agentes da Repressão"),
    (268, "Testemunhos Prestados à Comissão Municipal da Verdade de Petrópolis"),
    (289, "Textos Temáticos"),
    (376, "As Oitivas do Ministério Público Federal em Petrópolis"),
    (388, "Considerações Finais e Recomendações"),
    (392, "Anexos"),
]

# Volta Redonda: Introdução + 5 Partes históricas + Recomendações
# Sumário pags 4-5 do jsonl. Páginas verificadas no jsonl (sem offset):
# 6, 30, 140, 255, 404, 454, 573.
# Mapeamento usa as 5 Partes como unidade temática. Os 14 casos individuais
# ficam dentro de cada parte — granularidade excessiva para o mapa de seções.
_SECOES_VR = [
    (6,   "Introdução"),
    (30,  "Parte I – Volta Redonda na Ditadura Civil-Militar (1964-1966)"),
    (140, "Parte II – Volta Redonda na Ditadura Civil-Militar (1967-1969)"),
    (255, "Parte III – Volta Redonda na Ditadura Civil-Militar (1970-1973)"),
    (404, "Parte IV – Volta Redonda na Ditadura Civil-Militar (1974-1984)"),
    (454, "Parte V – A Ditadura Tardia em Volta Redonda (1985-1989)"),
    (573, "Recomendações"),
]

# SP (Vladimir Herzog): 4 Partes + Caderno de Imagens + Anexos
# Sumário pags 7-9 do jsonl. Páginas de rosto de Parte verificadas:
# 15 (Parte I), 61 (Parte II), 115 (Parte III), 247 (Parte IV),
# 327 (Parte V – Caderno de Imagens), 349 (Parte VI – Anexos).
# Capítulos dentro das partes não são mapeados (já cobertos pela divisão por Parte).
_SECOES_SP_CMV = [
    (15,  "Parte I – A Comissão da Memória e Verdade da Prefeitura de São Paulo"),
    (61,  "Parte II – Contexto Histórico"),
    (115, "Parte III – As Violações aos Direitos Humanos"),
    (247, "Parte IV – Recomendações"),
    (327, "Parte V – Caderno de Imagens"),
    (349, "Parte VI – Anexos"),
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


def _subsecao_coerente_fn(mapa_secoes, mapa_subsecoes):
    """Como _secao_fn, mas zera a subseção quando seu capítulo (o número antes
    do primeiro ponto, ex.: "3" em "3.29 …") não bate com o capítulo da seção
    vigente. Evita que a última subseção de um capítulo "vaze" para a página de
    abertura do capítulo seguinte (entre o divisor e a 1ª subseção X.1)."""
    secao_fn = _secao_fn(mapa_secoes)
    sub_fn = _secao_fn(mapa_subsecoes)

    def _cap(rotulo):
        return rotulo.split(".", 1)[0].strip() if rotulo else None

    def fn(num_pagina):
        sub = sub_fn(num_pagina)
        sec = secao_fn(num_pagina)
        if sub and sec and _cap(sub) != _cap(sec):
            return None
        return sub
    return fn


# =============================================================================
# 4º LOTE DHNET — COMISSÕES TEMÁTICAS/SETORIAIS (adicionados 2026-06)
# Mapas de seção verificados página a página no .jsonl extraído. Os TÍTULOS de
# seção são provisórios (a confirmar pela curadoria contra o sumário do PDF);
# os offsets (campo pagina == posição no jsonl) foram conferidos.
# camponesa/andes/df-bancarios/fenaj: único cabeçalho é o número de página
# isolado no topo → reutilizam limpar_numero_pagina (não-MULTILINE, só o topo).
# =============================================================================

# --- ctv-une: número de página isolado no topo + cabeçalho/rodapé corrido
#     "NN COMISSÃO NACIONAL DA VERDADE DA UNE" (nº+nome na mesma linha, rodapé)
#     ou só o nome em linha própria (topo). MULTILINE: o padrão nº+nome é
#     específico o bastante para não casar texto legítimo. ---
_RE_UNE_PAGNUM = re.compile(r"^\d+\s*\n")
_RE_UNE_NOME = re.compile(
    r"(?m)^\d*[ \t]*COMISSÃO NACIONAL DA VERDADE DA UNE[ \t]*\n?")

def limpar_ctv_une(texto):
    texto = _RE_UNE_PAGNUM.sub("", texto)
    texto = _RE_UNE_NOME.sub("", texto)
    return texto


# --- ctv-mg-jornalistas: cabeçalho corrido de 3 linhas (SJPMG) no topo ---
_RE_MG_JORN_HEADER = re.compile(
    r"^COMISSÃO DA VERDADE\s*[–-]\s*SJPMG\s*[–-]\s*BELO HORIZONTE\s*[–-]\s*"
    r"OUT\s*/\s*DEZ\s*-\s*2013\s*\n"
    r"COMISSÃO DA VERDADE\s*-\s*SJPMG\s*\n"
    r"Página\s+\d+\s*\n?")

def limpar_ctv_mg_jornalistas(texto):
    return _RE_MG_JORN_HEADER.sub("", texto)


# --- ctv-sp-cut: cabeçalho "Relatório ... da CUT\nNN" no topo ---
_RE_SP_CUT_HEADER = re.compile(
    r"^(?:Relatório da Comissão Nacional da Memória, Verdade e Justiça da CUT\s*\n)?"
    r"(?:\d+\s*\n)?")

def limpar_ctv_sp_cut(texto):
    return _RE_SP_CUT_HEADER.sub("", texto)


# --- ctv-sp-jornalistas: cabeçalho longo do Sindicato + número de página ---
_RE_SP_JORN_HEADER = re.compile(
    r"^(?:Relatório da Comissão Verdade, Memória e Justiça do Sindicato dos "
    r"Jornalistas Profissionais no Estado de São Paulo\s*\n)?(?:\d+\s*\n)?")

def limpar_ctv_sp_jornalistas(texto):
    return _RE_SP_JORN_HEADER.sub("", texto)


# --- ctv-sc-jornalistas: cabeçalho alterna (Jornalistas/SC | RELATÓRIO FINAL) ---
_RE_SC_JORN_HEADER = re.compile(
    r"^\d+\s*\n(?:Comissão da Verdade\s*-\s*Jornalistas/SC|RELATÓRIO FINAL)\s*\n"
    r"(?:A história de um país[^\n]*\n)?")

def limpar_ctv_sc_jornalistas(texto):
    return _RE_SC_JORN_HEADER.sub("", texto)


_SECOES_CTV_CAMPONESA = [
    (15, "Apresentação"),
    (17, "Resumo"),
    (21, "Introdução"),
    (28, "Parte I"),
    (54, "Parte II"),
    (94, "Parte III"),
    (572, "Parte IV"),
    (579, "Fontes"),
    (597, "Anexos"),
]

_SECOES_CTV_UNE = [
    (12, "Parte I — Artigos convidados"),
    (20, "Parte II — Relatório final da Comissão da Verdade da UNE"),
    (48, "Parte III — Estudantes mortos e desaparecidos"),
    (96, "Parte IV — Reconstruindo a memória da UNE"),
]

_SECOES_CTV_MG_JORNALISTAS = [
    (4, "Apresentação"),
    (5, "O método"),
    (7, "Censura e autocensura"),
    (9, "Depoimentos"),
    (81, "Conclusão"),
    (86, "Referências"),
    (93, "Anexos"),
]

_SECOES_CTV_SP_CUT = [
    (9, "Apresentação"),
    (11, "Prefácio"),
    (15, "Parte I"),
    (31, "Parte II"),
    (51, "Parte III"),
    (79, "Artigos"),
]

_SECOES_CTV_SP_JORNALISTAS = [
    (5, "Apresentação"),
    (8, "Homenagem a Milton Coelho da Graça"),
    (14, "Capítulo 1 — Jornalistas mortos e desaparecidos"),
    (41, "Capítulo 2 — Audiências públicas"),
    (60, "Capítulo 3 — Censura e perseguição"),
    (70, "Capítulo 4"),
    (72, "Capítulo 5"),
    (75, "Capítulo 6 — Acervo e referências"),
]

_SECOES_CTV_ANDES = [
    (5, "Introdução"),
    (6, "Apresentação"),
    (8, "Parte 1 — Estado ditatorial e a universidade"),
    (15, "Partes 2 e 3 — Perseguição a discentes e docentes"),
    (27, "Parte 4 — Violações físicas"),
    (29, "Anexos"),
]

_SECOES_CTV_DF_BANCARIOS = [
    (3, "Apresentação"),
    (4, "A Comissão"),
    (6, "Atividades"),
    (12, "Conclusão"),
    (13, "Declaração"),
    (14, "Anexo I"),
    (16, "Anexo II"),
    (17, "Anexo III"),
    (21, "Anexo IV"),
]

_SECOES_CTV_FENAJ = [
    (3, "Introdução"),
    (4, "Processos dos jornalistas"),
    (7, "Considerações finais"),
]


# =============================================================================
# PROCESSADORES
# =============================================================================

def processar(slug, limpar_fn, secao_fn=None, subsecao_fn=None):
    paginas = paginas_validas(slug, limpar_fn, secao_fn, subsecao_fn)
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
    "cev-pr-relatorio-vol2":    (limpar_pr,  _secao_fn(_SECOES_PR2), _subsecao_coerente_fn(_SECOES_PR2, _SUBSECOES_PR2)),
    # --- novos slugs (2025-06) ---
    "cev-ap-relatorio-final":   (limpar_ap,       _secao_fn(_SECOES_AP)),
    "cev-ba-relatorio-vol1":    (limpar_ba_vol1,  _secao_fn(_SECOES_BA1)),
    # vol2 = íntegra de depoimentos; sem capítulos formais → secao=None
    "cev-ba-relatorio-vol2":    (limpar_ba_vol2,  None),
    "cev-se-relatorio-final":   (limpar_se,       _secao_fn(_SECOES_SE)),
    "cev-mg-triangulo-mineiro": (limpar_mg_triangulo, _secao_fn(_SECOES_MG_TRIG)),
    # --- comissões universitárias (2026-06) ---
    "cuv-ba-ufba":    (limpar_cuv_ufba,    _secao_fn(_SECOES_UFBA)),
    "cuv-df-unb":     (limpar_cuv_unb,     _secao_fn(_SECOES_UNB)),
    "cuv-es-ufes":    (limpar_cuv_ufes,    _secao_fn(_SECOES_UFES)),
    "cuv-mg-ufop":    (limpar_cuv_ufop,    _secao_fn(_SECOES_UFOP)),
    # UFCG: relatório parcial curto sem sumário estruturado → secao=None
    "cuv-pb-ufcg":    (limpar_cuv_ufcg,    None),
    "cuv-sp-unicamp": (limpar_cuv_unicamp, _secao_fn(_SECOES_UNICAMP)),
    "cuv-sp-unifesp": (limpar_cuv_unifesp, _secao_fn(_SECOES_UNIFESP)),
    "cuv-rn-ufrn":    (limpar_cuv_ufrn,    _secao_fn(_SECOES_UFRN)),
    # --- comissões municipais (2026-06) ---
    "cmv-mg-juiz-de-fora":  (limpar_cmv_num_pagina, _secao_fn(_SECOES_JF)),
    "cmv-pb-joao-pessoa":   (limpar_cmv_num_pagina, _secao_fn(_SECOES_JP)),
    "cmv-rj-niteroi":       (limpar_cmv_num_pagina, _secao_fn(_SECOES_NITEROI)),
    "cmv-rj-petropolis":    (limpar_petropolis,     _secao_fn(_SECOES_PETROPOLIS)),
    "cmv-rj-volta-redonda": (limpar_cmv_num_pagina, _secao_fn(_SECOES_VR)),
    # Mauá: 72 pags, sem cabeçalhos de seção formais nas páginas → secao=None
    "cmv-sp-maua":          (limpar_cmv_num_pagina, None),
    # Osasco: OCR fragmentado (decretos, atas, ofícios) sem estrutura linear → secao=None
    "cmv-sp-osasco":        (limpar_cmv_num_pagina, None),
    "cmv-sp-sao-paulo":     (limpar_sp_cmv,         _secao_fn(_SECOES_SP_CMV)),
    # --- comissões temáticas/setoriais — 4º lote DHnet (2026-06) ---
    "ctv-camponesa":         (limpar_numero_pagina, _secao_fn(_SECOES_CTV_CAMPONESA)),
    "ctv-une":               (limpar_ctv_une,       _secao_fn(_SECOES_CTV_UNE)),
    "ctv-mg-jornalistas":    (limpar_ctv_mg_jornalistas, _secao_fn(_SECOES_CTV_MG_JORNALISTAS)),
    "ctv-sp-cut":            (limpar_ctv_sp_cut,    _secao_fn(_SECOES_CTV_SP_CUT)),
    "ctv-sp-jornalistas":    (limpar_ctv_sp_jornalistas, _secao_fn(_SECOES_CTV_SP_JORNALISTAS)),
    "ctv-andes":             (limpar_numero_pagina, _secao_fn(_SECOES_CTV_ANDES)),
    "ctv-df-bancarios":      (limpar_numero_pagina, _secao_fn(_SECOES_CTV_DF_BANCARIOS)),
    "ctv-fenaj-jornalistas": (limpar_numero_pagina, _secao_fn(_SECOES_CTV_FENAJ)),
    # sc-jornalistas: 11 p., texto corrido sem subdivisões internas → secao=None
    "ctv-sc-jornalistas":    (limpar_ctv_sc_jornalistas, None),
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
        config = DOCUMENTOS[slug]
        limpar_fn, secao_fn = config[0], config[1]
        subsecao_fn = config[2] if len(config) > 2 else None
        processar(slug, limpar_fn, secao_fn, subsecao_fn)


if __name__ == "__main__":
    main()
