r"""
Chunking do Relatório Final da Comissão da Verdade do Estado de São Paulo
"Rubens Paiva" — Tomo I: Recomendações Gerais e Recomendações Temáticas
(marco/2015).

Uso: python 03_chunkar_cev_sp.py

Lê pipeline/dados/extraido/cev-sp-rubens-paiva-tomo1.jsonl (uma linha JSON
por página, texto nativo do PDF, 1912 páginas) e produz
pipeline/dados/chunks/cev-sp-rubens-paiva-tomo1.jsonl, um chunk por linha, no
MESMO formato usado para a CNV e a CEMDP (ver 03_chunkar.py e
03_chunkar_cemdp.py): campos "ordem", "conteudo", "paginas", "secao",
"tipo_chunk".

=============================================================================
POR QUE UM SCRIPT NOVO (em vez de reusar 03_chunkar.py/03_chunkar_cemdp.py)
=============================================================================
O CORE de chunking (tamanho-alvo ~395 tokens, sobreposição ~80, não cruzar
fronteira de seção, contagem com o tokenizer do e5-small) é IDÊNTICO ao dos
outros volumes e foi copiado sem alteração. Mas a limpeza e a detecção de
seção são específicas deste documento:
- Cabeçalho/rodapé corrido diferente (próprio do Tomo I da CEV-SP, não da CNV).
- A estrutura interna é muito mais rasa: só 4 "PARTE N" (não há um padrão
  confiável "N – título" repetido por capítulo como na CNV, nem perfis
  individuais como na CEMDP/vol. III). Inventar subseções via heurística de
  "linha curta sem ponto final" gerou ~320 falsos candidatos em teste — não
  confiável, então NÃO foi usado (regra "não inventamos": se não há pista
  forte, secao = a PARTE vigente, ou None antes da primeira PARTE).
- ~190 páginas (26-213, bloco de notas de rodapé do fim da Parte 1) foram
  extraídas com uma fonte customizada que mapeia caracteres para a Área de
  Uso Privado do Unicode (U+F000-U+F8FF) — cabeçalho corrido e os números de
  nota ficam ilegíveis, mas o corpo das notas (citações, texto corrido) é
  texto normal e PERMANECE LEGÍVEL. Tratamento: descarta apenas as LINHAS
  com alta proporção de caracteres da Área de Uso Privado (header repetido e
  prefixos numéricos de nota); o texto remanescente da nota é mantido como
  "corpo" (perde a numeração, mas o conteúdo textual é preservado e
  buscável). Registrado para auditoria do curador-historiador.

=============================================================================
ESTRUTURA DO DOCUMENTO
=============================================================================
- Rodapé corrido em toda página: "Relatório - Tomo I: Recomendações Gerais e
  Recomendações Temáticas\nwww.verdadeaberta.org" — removido sem virar seção.
- ~336 páginas são essencialmente vazias após remover o rodapé (páginas de
  separação/capa entre partes, preenchidas com caracteres NBSP) — descartadas.
- 4 seções de nível "PARTE", detectadas pelo padrão "PARTE\xa0N\xa0\n<TÍTULO>":
  - PARTE 1 (pág. 2): Estruturas e Sistemas de Repressão
  - PARTE 2 (pág. 650): Grupos Sociais e Movimentos Perseguidos ou Atingidos
    pela Ditadura
  - PARTE 3 (pág. 1229): Ações de Resistência e Medidas de Justiça de Transição
  - PARTE 4 (pág. 1815): Arquivos e Memória
  Páginas antes da página 2 (capa) recebem secao = None.
- Páginas 26-213: bloco de notas de rodapé da Parte 1, parcialmente em fonte
  customizada (ver acima). tipo_chunk continua "corpo" — não há separação
  estrutural clara o bastante para isolar como "nota_rodape" sem perder
  numeração de qualquer forma.
- Desfazer hifenização de quebra de linha: "agremia-\nção" -> "agremiação".

=============================================================================
CHUNKING (idêntico a 03_chunkar.py / 03_chunkar_cemdp.py)
=============================================================================
- Alvo de ~395 tokens (tokenizer do intfloat/multilingual-e5-small),
  sobreposição de ~80 tokens, limite de 512 tokens.
- Nunca cruza fronteira de seção (PARTE): ao mudar de PARTE, o chunk corrente
  é fechado mesmo que não tenha atingido o alvo de tokens.
- tipo_chunk é sempre "corpo".
- Cada chunk registra a faixa de páginas que cobre ("N" ou "N-M").
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

SLUG = "cev-sp-rubens-paiva-tomo1"

# --- Padrões de limpeza -------------------------------------------------------

FOOTER = re.compile(
    r"Relatório - Tomo I: Recomendações Gerais e Recomendações Temáticas\s*\n"
    r"www\.verdadeaberta\.org\s*$"
)

# "PARTE\xa0N\xa0\n<TÍTULO EM CAIXA ALTA, possivelmente em várias linhas>"
ABERTURA_PARTE = re.compile(r"PARTE\xa0(\d)\xa0\n((?:[^\n]*\xa0\n)+)")

PRIVATE_USE = re.compile("[\uE000-\uF8FF]")


# --- Limpeza específica do anexo re-OCRado (pp. 460-501) ----------------------
# Essas páginas são reproduções escaneadas re-OCRadas pelo 02b_reocr_anexo_cev_sp.py.
# O Tesseract capturou o logotipo/cabeçalho da CEV-SP no topo de CADA página,
# sempre com esta forma (o prefixo da 2ª linha é ruído variável do logotipo):
#   COMISSÃO DA
#   <ruído> Relatório - Tomo |: Recomendações Gerais e Recomendações Temáticas
#   d[eo] Estado de São Paulo
# Removemos essas linhas (senão poluiriam todos os chunks do anexo) e corrigimos
# só o ruído de aspas claramente espúrio que o OCR gerou ("!!"/'"!' por aspa de
# fechamento). NÃO mexemos em "="/"»", cuja correção seria insegura. Restrito a
# este intervalo para não tocar nas ~1870 páginas de texto nativo do documento.
REOCR_PAGINA_INICIO = 460
REOCR_PAGINA_FIM = 501

REOCR_LINHAS_CABECALHO = [
    # Toleramos alguns tokens curtos de ruído no fim da linha (números de página,
    # restos de OCR como "pa"/"224"); uma frase real que cite "Estado de São
    # Paulo" é longa e NÃO casa este padrão (fica protegida).
    re.compile(r"^COMISSÃO DA(\s+\S{1,4}){0,3}$"),
    # subtítulo do logotipo; o prefixo "Relatório - Tomo" é OCRado de formas
    # variáveis (ex.: "E elatório", quebra de linha), então casamos a frase
    # estável, que no anexo (460-501) só ocorre no cabeçalho.
    re.compile(r"Recomendações Gerais e Recomendações"),
    re.compile(r"^d[eo] Estado de São Paulo(\s+\S{1,4}){0,2}$"),
]


def limpar_reocr(texto):
    """Remove o cabeçalho/logotipo da CEV-SP captado pelo OCR e corrige o ruído
    de aspas, nas páginas re-OCRadas (anexo escaneado, pp. 460-501)."""
    linhas = [
        linha
        for linha in texto.split("\n")
        if not any(rx.search(linha.strip()) for rx in REOCR_LINHAS_CABECALHO)
    ]
    texto = "\n".join(linhas)
    # aspas de fechamento que o OCR transformou em "!!" ou '"!'
    texto = texto.replace("!!", '"').replace('"!', '"')
    return texto


def limpar_pagina(texto, numero_pagina):
    """Limpa o texto de uma página e tenta extrair pista de seção (PARTE).

    Retorna (texto_limpo, secao_detectada_ou_None, eh_pagina_valida).
    """
    secao_detectada = None

    # normaliza NBSP para espaço comum (mais fácil de detectar páginas vazias)
    texto_norm = texto.replace("\xa0", " ")

    # detecção de abertura de "PARTE N"
    m_parte = ABERTURA_PARTE.search(texto)
    if m_parte:
        titulo_bruto = m_parte.group(2).replace("\xa0", " ")
        linhas_titulo = [l.strip() for l in titulo_bruto.split("\n") if l.strip()]
        titulo = " ".join(linhas_titulo)
        secao_detectada = f"PARTE {m_parte.group(1)} – {titulo}"

    # remove rodapé corrido
    texto_sem_rodape = FOOTER.sub("", texto_norm).strip()

    # limpeza do cabeçalho/aspas nas páginas re-OCRadas (anexo escaneado)
    if REOCR_PAGINA_INICIO <= numero_pagina <= REOCR_PAGINA_FIM:
        texto_sem_rodape = limpar_reocr(texto_sem_rodape).strip()

    if not texto_sem_rodape:
        return "", secao_detectada, False

    # descarta linhas dominadas por caracteres da Área de Uso Privado
    # (cabeçalho corrido e prefixos de nota em fonte customizada, ver docstring)
    linhas_saida = []
    for linha in texto_sem_rodape.split("\n"):
        linha_strip = linha.strip()
        if not linha_strip:
            linhas_saida.append("")
            continue
        n_priv = len(PRIVATE_USE.findall(linha_strip))
        if n_priv / len(linha_strip) > 0.3:
            continue
        linhas_saida.append(linha)

    texto_limpo = "\n".join(linhas_saida)

    # desfazer hifenização de quebra de linha
    texto_limpo = re.sub(r"(\w)-\n(\w)", r"\1\2", texto_limpo)

    # normalizar múltiplas linhas em branco
    texto_limpo = re.sub(r"\n{3,}", "\n\n", texto_limpo)
    texto_limpo = texto_limpo.strip()

    if not texto_limpo:
        return "", secao_detectada, False

    return texto_limpo, secao_detectada, True


def main():
    entrada = RAIZ / "dados" / "extraido" / f"{SLUG}.jsonl"
    saida = RAIZ / "dados" / "chunks" / f"{SLUG}.jsonl"

    tokenizer = AutoTokenizer.from_pretrained(MODELO_TOKENIZER)

    def contar_tokens(texto):
        return len(tokenizer.encode(texto, add_special_tokens=True))

    paginas = []  # lista de (numero_pagina, texto_limpo, secao)
    secao_atual = None

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

    # --- Montagem dos chunks (mesma lógica de 03_chunkar.py) --------------------
    saida.parent.mkdir(parents=True, exist_ok=True)

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
        if len(paginas_cobertas) == 1:
            faixa = str(paginas_cobertas[0])
        else:
            faixa = f"{paginas_cobertas[0]}-{paginas_cobertas[-1]}"
        chunks.append(
            {
                "ordem": ordem,
                "conteudo": texto_chunk,
                "paginas": faixa,
                "secao": secao_buffer,
                "tipo_chunk": "corpo",
            }
        )
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

    # --- Rede de segurança: garante que nenhum chunk exceda o limite do modelo --
    # (idêntico em espírito ao corte por sentença/linha já feito acima; aqui
    # corrige os poucos casos residuais em que a junção de parágrafos pequenos
    # com um parágrafo grande ainda passou do limite.)
    chunks_finais = []
    for chunk in chunks:
        tokens_totais = len(tokenizer.encode(chunk["conteudo"], add_special_tokens=True))
        if tokens_totais <= LIMITE_MAXIMO_TOKENS:
            chunks_finais.append(chunk)
            continue

        pedacos = re.split(r"(?<=[.!?])\s+", chunk["conteudo"])
        grupo_atual = []
        tokens_grupo = 0
        for pedaco in pedacos:
            if not pedaco.strip():
                continue
            tokens_pedaco = len(tokenizer.encode(pedaco, add_special_tokens=False))
            if tokens_grupo + tokens_pedaco > LIMITE_MAXIMO_TOKENS - 2 and grupo_atual:
                chunks_finais.append({**chunk, "conteudo": " ".join(grupo_atual)})
                grupo_atual = []
                tokens_grupo = 0
            grupo_atual.append(pedaco)
            tokens_grupo += tokens_pedaco
        if grupo_atual:
            chunks_finais.append({**chunk, "conteudo": " ".join(grupo_atual)})

    # renumera "ordem" após o split de segurança
    for nova_ordem, chunk in enumerate(chunks_finais):
        chunk["ordem"] = nova_ordem
    chunks = chunks_finais

    # --- Estatísticas e gravação -------------------------------------------------
    tamanhos = []
    with open(saida, "w", encoding="utf-8") as f:
        for chunk in chunks:
            tam = contar_tokens(chunk["conteudo"])
            tamanhos.append(tam)
            f.write(json.dumps(chunk, ensure_ascii=False) + "\n")

    print(f"Chunks gerados: {len(chunks)}")
    print(f"Tokens por chunk — mínimo: {min(tamanhos)}, mediana: {statistics.median(tamanhos):.0f}, máximo: {max(tamanhos)}")
    acima_512 = sum(1 for t in tamanhos if t > LIMITE_MAXIMO_TOKENS)
    print(f"Chunks acima de {LIMITE_MAXIMO_TOKENS} tokens: {acima_512}")
    com_secao = sum(1 for c in chunks if c["secao"])
    print(f"Chunks com seção preenchida: {com_secao} ({100*com_secao/len(chunks):.1f}%)")
    print(f"Arquivo de saída: {saida}")


if __name__ == "__main__":
    main()
