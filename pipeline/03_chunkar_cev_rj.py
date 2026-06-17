r"""
Chunking do Relatório Final da Comissão da Verdade do Rio (CEV-Rio),
publicado em dezembro de 2015. 229 páginas PDF (págs. 227-229 vazias).

Uso: python 03_chunkar_cev_rj.py

Lê pipeline/dados/extraido/cev-rj-relatorio-final.jsonl (uma linha JSON por
página, gerado pelo 02_extrair.py) e produz
pipeline/dados/chunks/cev-rj-relatorio-final.jsonl, um chunk por linha.

=============================================================================
PECULIARIDADE DO PDF
=============================================================================
Cada página física do PDF imprime DUAS páginas do documento original.
O texto começa com os dois números de página impressa separados por \n:
  "18\n19\nconteúdo..."
Esses pares são removidos na limpeza.

=============================================================================
PÁGINAS DESCARTADAS
=============================================================================
- PDF págs. 1-3: capa/folha de rosto (sem prosa indexável)
- PDF págs. 5-6: expediente/equipe
- PDF pág. 7: sumário (só pontilhados de índice)
- PDF págs. 227-229: vazias

=============================================================================
DETECÇÃO DE SEÇÃO
=============================================================================
Seções detectadas por regex no texto da página (case-insensitive).
Seção inicial para páginas não descartadas sem seção detectada: 'pre_conteudo'.

=============================================================================
CHUNKING (idêntico aos demais scripts do projeto)
=============================================================================
- Tokenizer: intfloat/multilingual-e5-small (384 dim)
- Alvo: ~395 tokens, sobreposição ~80, limite 512 tokens
- Nunca cruza fronteira de seção
- tipo_chunk sempre "corpo"
- Cada chunk registra faixa de páginas PDF cobertas (lista [inicio, fim])
"""

import json
import re
import statistics
from pathlib import Path

from transformers import AutoTokenizer

RAIZ = Path(__file__).resolve().parent

MODELO_TOKENIZER = "intfloat/multilingual-e5-small"
ALVO_TOKENS = 395
SOBREPOSICAO_TOKENS = 80
LIMITE_MAXIMO_TOKENS = 512

SLUG = "cev-rj-relatorio-final"

# ---------------------------------------------------------------------------
# Páginas descartadas (numeração JSONL, começando em 1)
# ---------------------------------------------------------------------------
PAGINAS_DESCARTADAS = (
    set(range(1, 4))   # págs. 1-3: capa/folha de rosto
    | {5, 6}           # expediente
    | {7}              # sumário
    | set(range(227, 230))  # págs. 227-229: vazias
)

# ---------------------------------------------------------------------------
# Padrões de limpeza
# ---------------------------------------------------------------------------

# Par de números de página impressa no início do texto: "18\n19\n"
PAR_PAGINAS = re.compile(r"^\d+\n\d+\n", re.MULTILINE)

# Número de página isolado em linha
NUM_PAGINA = re.compile(r"^\s*\d{1,4}\s*$", re.MULTILINE)

# Cabeçalhos corridos (variações encontradas no documento)
HEADER_CEV_RJ = re.compile(
    r"^Comissão da Verdade do Rio\s*$",
    re.MULTILINE | re.IGNORECASE,
)
HEADER_RELATORIO = re.compile(
    r"^Relatório\s*$",
    re.MULTILINE,
)
HEADER_CEV_RIO_ABREV = re.compile(
    r"^CEV[-\s]?Rio\s*$",
    re.MULTILINE | re.IGNORECASE,
)

# ---------------------------------------------------------------------------
# Detecção de seção
# ---------------------------------------------------------------------------

SECOES = [
    # Títulos em linha isolada (início de página, sem texto corrido ao redor)
    (re.compile(r"^AGRADECIMENTOS\s*$",                   re.IGNORECASE | re.MULTILINE), "agradecimentos"),
    (re.compile(r"^APRESENTA[ÇC][ÃA]O\s*$",              re.IGNORECASE | re.MULTILINE), "apresentacao"),
    # Títulos de PARTE: aparecem como "PARTE I\nA COMISSÃO..." no início da pág.
    # Usam DOTALL pois título ocupa múltiplas linhas; ancoramos no início do texto
    (re.compile(r"PARTE\s+I\b[^V].*COMISS",               re.IGNORECASE | re.DOTALL), "parte_i_comissao"),
    (re.compile(r"PARTE\s+II\b.*GOLPE",                   re.IGNORECASE | re.DOTALL), "parte_ii_golpe"),
    (re.compile(r"PARTE\s+III\b.*VIOL",                   re.IGNORECASE | re.DOTALL), "parte_iii_violencia"),
    (re.compile(r"PARTE\s+IV\b.*ESTRUTURA",               re.IGNORECASE | re.DOTALL), "parte_iv_estrutura"),
    (re.compile(r"PARTE\s+V\b[^I].*AUTORIA",              re.IGNORECASE | re.DOTALL), "parte_v_autoria"),
    (re.compile(r"PARTE\s+VI\b.*RESTA",                   re.IGNORECASE | re.DOTALL), "parte_vi_legado"),
    # Capítulos temáticos: ancoramos em linha isolada com "Capítulo N -"
    (re.compile(r"^Cap[íi]tulo\s+9\s*[-–]",              re.IGNORECASE | re.MULTILINE), "cap9_racismo"),
    (re.compile(r"^Cap[íi]tulo\s+10\s*[-–]",             re.IGNORECASE | re.MULTILINE), "cap10_mulheres"),
    (re.compile(r"^Cap[íi]tulo\s+11\s*[-–]",             re.IGNORECASE | re.MULTILINE), "cap11_homossexualidades"),
    # Cap. 13 não tem título isolado na pág. de abertura — detectamos pelo conteúdo
    (re.compile(r"^Cap[íi]tulo\s+13\b",                  re.IGNORECASE | re.MULTILINE), "cap13_inventario_cicatrizes"),
]


def detectar_secao(texto):
    """Retorna o slug da seção detectada no texto, ou None."""
    for padrao, slug in SECOES:
        if padrao.search(texto):
            return slug
    return None


def limpar_pagina(texto, numero_pagina):
    """Limpa o texto de uma página e detecta seção.

    Retorna (texto_limpo, secao_detectada_ou_None, eh_valida).
    """
    if numero_pagina in PAGINAS_DESCARTADAS:
        return "", None, False

    if not texto.strip():
        return "", None, False

    # Detecta seção ANTES da limpeza (cabeçalhos podem ser removidos)
    secao_detectada = detectar_secao(texto)

    # Remove par de números de página impressa no início ("18\n19\n")
    texto_limpo = PAR_PAGINAS.sub("", texto)

    # Remove números de página isolados
    texto_limpo = NUM_PAGINA.sub("", texto_limpo)

    # Remove cabeçalhos corridos
    texto_limpo = HEADER_CEV_RJ.sub("", texto_limpo)
    texto_limpo = HEADER_RELATORIO.sub("", texto_limpo)
    texto_limpo = HEADER_CEV_RIO_ABREV.sub("", texto_limpo)

    # Desfaz hifenização de quebra de linha ("palavra-\nção" → "palavra-ção")
    texto_limpo = re.sub(r"(\w)-\n(\w)", r"\1\2", texto_limpo)

    # Normaliza múltiplas linhas em branco
    texto_limpo = re.sub(r"\n{3,}", "\n\n", texto_limpo)
    texto_limpo = texto_limpo.strip()

    if not texto_limpo or len(texto_limpo) < 50:
        return "", secao_detectada, False

    return texto_limpo, secao_detectada, True


def main():
    entrada = RAIZ / "dados" / "extraido" / f"{SLUG}.jsonl"
    saida = RAIZ / "dados" / "chunks" / f"{SLUG}.jsonl"

    if not entrada.exists():
        print(f"Arquivo não encontrado: {entrada}")
        print("Execute primeiro: python 02_extrair.py cev-rj-relatorio-final")
        return

    tokenizer = AutoTokenizer.from_pretrained(MODELO_TOKENIZER)

    def contar_tokens(texto):
        return len(tokenizer.encode(texto, add_special_tokens=True))

    # --- Leitura e limpeza por página -----------------------------------------
    paginas = []  # (numero_pagina, texto_limpo, secao)
    secao_atual = "pre_conteudo"

    with open(entrada, encoding="utf-8") as f:
        for numero_pagina, linha in enumerate(f, start=1):
            registro = json.loads(linha)
            texto_limpo, secao_detectada, valida = limpar_pagina(
                registro["texto"], numero_pagina
            )
            if secao_detectada:
                secao_atual = secao_detectada
            if not valida:
                continue
            paginas.append((numero_pagina, texto_limpo, secao_atual))

    # --- Montagem dos chunks --------------------------------------------------
    saida.parent.mkdir(parents=True, exist_ok=True)

    chunks = []
    buffer_unidades = []   # lista de (token_ids, texto, pagina)
    secao_buffer = None

    def fechar_chunk():
        nonlocal buffer_unidades
        if not buffer_unidades:
            return
        texto_chunk = "\n\n".join(u[1] for u in buffer_unidades)
        paginas_cobertas = sorted({u[2] for u in buffer_unidades})
        chunks.append(
            {
                "fonte_slug": SLUG,
                "secao": secao_buffer,
                "paginas": [paginas_cobertas[0], paginas_cobertas[-1]],
                "tipo_chunk": "corpo",
                "texto": texto_chunk,
                "n_tokens": contar_tokens(texto_chunk),
            }
        )
        buffer_unidades = []

    def tokens_no_buffer():
        return sum(len(u[0]) for u in buffer_unidades)

    for num_pagina, texto_limpo, secao in paginas:
        # Mudança de seção: fecha chunk corrente (não cruza fronteira)
        if secao_buffer is not None and secao != secao_buffer and buffer_unidades:
            fechar_chunk()

        secao_buffer = secao

        paragrafos = [p.strip() for p in texto_limpo.split("\n\n") if p.strip()]
        for paragrafo in paragrafos:
            tokens_par = tokenizer.encode(paragrafo, add_special_tokens=False)

            if len(tokens_par) > ALVO_TOKENS:
                # Parágrafo longo: divide por frases
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

                # Sobreposição: reutiliza até SOBREPOSICAO_TOKENS do chunk anterior
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

    # --- Rede de segurança: divide chunks que excedem o limite do modelo ------
    chunks_finais = []
    for chunk in chunks:
        if chunk["n_tokens"] <= LIMITE_MAXIMO_TOKENS:
            chunks_finais.append(chunk)
            continue

        pedacos = re.split(r"(?<=[.!?])\s+", chunk["texto"])
        grupo_atual = []
        tokens_grupo = 0
        for pedaco in pedacos:
            if not pedaco.strip():
                continue
            tokens_pedaco = len(tokenizer.encode(pedaco, add_special_tokens=False))
            if tokens_grupo + tokens_pedaco > LIMITE_MAXIMO_TOKENS - 2 and grupo_atual:
                novo_texto = " ".join(grupo_atual)
                chunks_finais.append({**chunk, "texto": novo_texto, "n_tokens": contar_tokens(novo_texto)})
                grupo_atual = []
                tokens_grupo = 0
            grupo_atual.append(pedaco)
            tokens_grupo += tokens_pedaco
        if grupo_atual:
            novo_texto = " ".join(grupo_atual)
            chunks_finais.append({**chunk, "texto": novo_texto, "n_tokens": contar_tokens(novo_texto)})

    chunks = chunks_finais

    # --- Estatísticas e gravação ----------------------------------------------
    tamanhos = [c["n_tokens"] for c in chunks]

    with open(saida, "w", encoding="utf-8") as f:
        for chunk in chunks:
            f.write(json.dumps(chunk, ensure_ascii=False) + "\n")

    print(f"Chunks gerados: {len(chunks)}")
    if tamanhos:
        print(
            f"Tokens por chunk — mínimo: {min(tamanhos)}, "
            f"mediana: {statistics.median(tamanhos):.0f}, "
            f"máximo: {max(tamanhos)}"
        )
    acima_512 = sum(1 for t in tamanhos if t > LIMITE_MAXIMO_TOKENS)
    print(f"Chunks acima de {LIMITE_MAXIMO_TOKENS} tokens: {acima_512}")

    # Distribuição por seção
    from collections import Counter
    contagem_secao = Counter(c["secao"] for c in chunks)
    print("\nDistribuição por seção (top 10):")
    for secao, qtd in contagem_secao.most_common(10):
        print(f"  {secao}: {qtd}")

    print(f"\nArquivo de saída: {saida}")


if __name__ == "__main__":
    main()
