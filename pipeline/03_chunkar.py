"""
Chunking do Relatório Final da CNV (Volume I).

Lê pipeline/dados/extraido/cnv-vol1.jsonl (uma linha JSON por página, com o
texto extraído por OCR/parsing do PDF) e produz pipeline/dados/chunks/cnv-vol1.jsonl,
um chunk por linha, pronto para gerar embeddings (passo 04).

ETAPAS DE LIMPEZA (documentadas — diagnóstico do engenheiro de dados):
1. Remover o cabeçalho repetido "comissão nacional da verdade – relatório –
   volume i – dezembro de 2014", em qualquer posição (início ou fim da página).
2. Remover linhas que contêm SOMENTE o número da página solto.
3. Remover a linha "N – título da seção" que funciona como cabeçalho/rodapé
   corrido nas páginas do corpo (ex.: "12 – desaparecimentos forçados").
   Essa mesma linha é usada para identificar a SEÇÃO do documento.
4. Desfazer hifenização de quebra de linha: "agremia-\nção" -> "agremiação".
5. Pular páginas vazias (texto em branco) e o sumário (página 11, com
   pontilhados "....").
6. Páginas 1–14 (sem numeração impressa) recebem como "pagina" o próprio
   número de linha do JSONL (1-indexado), pois não há paginação confiável.

DETECÇÃO DE SEÇÃO (heurística simples, documentada):
- Páginas de abertura de capítulo trazem "N\ncapítulo\n<título em maiúsculas
  ou minúsculas, em várias linhas>" no topo da página (ex.: página 19:
  "1\ncapítulo\na criação da comissão nacional da verdade").
- Páginas do corpo trazem a linha corrida "N – <título do capítulo>" como
  cabeçalho ou rodapé (ex.: "12 – desaparecimentos forçados").
- A seção corrente é atualizada sempre que uma dessas linhas é encontrada e
  se mantém a mesma até a próxima mudança. Não inventamos títulos: se nenhuma
  pista for encontrada até o momento, secao = null.
- Para distinguir esse cabeçalho corrido das notas de rodapé numeradas (ver
  abaixo), só tratamos "N – texto" como cabeçalho de seção quando: é a
  PRIMEIRA ou ÚLTIMA linha não vazia da página, N <= 18 (o relatório tem 18
  capítulos) e o "texto" não parece referência bibliográfica (não contém
  pistas como "Arquivo", "Ibid", "p.", URLs etc.).

DETECÇÃO DE NOTAS DE RODAPÉ (tipo_chunk):
- A CNV concentra notas numeradas no fim de cada capítulo (ex.: páginas
  721-725, fim do capítulo 14): blocos de muitas linhas no formato
  "N – referência bibliográfica/arquivística", com N de 1 a 3 dígitos,
  frequentemente ultrapassando 18 (não pode ser confundido com capítulo).
- Cada parágrafo é classificado como "nota_rodape" se a sua primeira linha
  casar com o padrão NOTA_RODAPE (^\d{1,3}\s*[–-]\s+\S) E o parágrafo NÃO
  for o cabeçalho de seção já tratado acima.
- Chunks nunca misturam parágrafos "corpo" e "nota_rodape": ao mudar de tipo,
  o chunk corrente é fechado (igual à fronteira de seção). Em caso de dúvida
  (parágrafo sem o padrão numérico, mesmo que dentro de um bloco de notas),
  classifica-se como "corpo" — falso negativo é menos grave que esconder
  conteúdo do corpo do texto.

CHUNKING:
- Alvo de ~400 tokens (contados pelo tokenizer do intfloat/multilingual-e5-small,
  o mesmo modelo usado para os embeddings), sobreposição de ~80 tokens.
- Nunca cruza fronteira de seção (capítulo) nem de tipo_chunk (corpo/nota de
  rodapé): ao mudar de qualquer um dos dois, o chunk corrente é fechado mesmo
  que ainda não tenha atingido o alvo de tokens.
- Cada chunk registra a faixa de páginas que cobre ("N" ou "N-M").
"""

import json
import re
import statistics
from pathlib import Path

from transformers import AutoTokenizer

RAIZ = Path(__file__).resolve().parent
ENTRADA = RAIZ / "dados" / "extraido" / "cnv-vol1.jsonl"
SAIDA = RAIZ / "dados" / "chunks" / "cnv-vol1.jsonl"

MODELO_TOKENIZER = "intfloat/multilingual-e5-small"
ALVO_TOKENS = 395
SOBREPOSICAO_TOKENS = 80
LIMITE_MAXIMO_TOKENS = 512  # limite do modelo e5-small

# --- Padrões de limpeza -----------------------------------------------------

CABECALHO_CNV = re.compile(
    r"^comissão nacional da verdade\s*[–-]\s*relatório\s*[–-]\s*volume i\s*[–-]\s*dezembro de 2014\s*$",
    re.IGNORECASE,
)
LINHA_SO_NUMERO = re.compile(r"^\d{1,4}$")
# "N – título da seção" — candidato a cabeçalho/rodapé corrido OU a nota de
# rodapé numerada; a distinção é feita em limpar_pagina (ver docstring).
LINHA_CAPITULO_CORRIDO = re.compile(r"^(\d{1,2})\s*[–-]\s*(.{3,90})$")
# qualquer "N – texto" com N de 1 a 3 dígitos: marcador de nota de rodapé
NOTA_RODAPE = re.compile(r"^\d{1,3}\s*[–-]\s+\S")
# pistas de que "N – texto" é referência bibliográfica/arquivística (nota),
# não título de capítulo
PISTAS_REFERENCIA = re.compile(
    r"\b(arquivo|ibid|p\.\s*\d|pp\.\s*\d|cnv|cemdp|sni|cisa|depoimento|entrevista|"
    r"http|www\.|disponível em)\b",
    re.IGNORECASE,
)
NUM_MAX_CAPITULOS = 18
# abertura de capítulo: "N\ncapítulo\n<título...>"
ABERTURA_CAPITULO = re.compile(r"^(\d{1,2})\ncapítulo\n", re.IGNORECASE)
# pontilhados do sumário
PONTILHADO = re.compile(r"\.{5,}")


def limpar_pagina(texto, numero_pagina):
    """Limpa o texto de uma página e tenta extrair pista de seção.

    Retorna (texto_limpo, secao_detectada_ou_None, eh_pagina_valida).
    """
    if not texto.strip():
        return "", None, False

    # sumário: página com muitos pontilhados (índice/sumário)
    if len(PONTILHADO.findall(texto)) >= 3:
        return "", None, False

    secao_detectada = None

    # detecção de abertura de capítulo (antes de remover linhas)
    m_abertura = ABERTURA_CAPITULO.match(texto)
    if m_abertura:
        # título do capítulo: linhas seguintes até a próxima quebra dupla
        resto = texto[m_abertura.end():]
        linhas_titulo = []
        for linha in resto.split("\n"):
            linha = linha.strip()
            if not linha:
                break
            linhas_titulo.append(linha)
            if len(linhas_titulo) >= 4:
                break
        if linhas_titulo:
            titulo = " ".join(linhas_titulo)
            secao_detectada = f"{m_abertura.group(1)} – {titulo}"

    # índices das linhas de "conteúdo real" (não vazias, e que não sejam o
    # cabeçalho CNV nem o número de página solto) — só a primeira e a última
    # dessas linhas podem ser cabeçalho/rodapé corrido de seção.
    linhas_brutas = texto.split("\n")
    indices_conteudo = [
        i
        for i, l in enumerate(linhas_brutas)
        if l.strip()
        and not CABECALHO_CNV.match(l.strip())
        and not LINHA_SO_NUMERO.match(l.strip())
    ]
    primeira_idx = indices_conteudo[0] if indices_conteudo else None
    ultima_idx = indices_conteudo[-1] if indices_conteudo else None

    linhas_saida = []
    for i, linha in enumerate(linhas_brutas):
        linha_strip = linha.strip()

        if not linha_strip:
            linhas_saida.append("")
            continue

        if CABECALHO_CNV.match(linha_strip):
            continue

        if LINHA_SO_NUMERO.match(linha_strip):
            continue

        m_corrido = LINHA_CAPITULO_CORRIDO.match(linha_strip)
        if m_corrido:
            num = int(m_corrido.group(1))
            eh_borda = i == primeira_idx or i == ultima_idx
            parece_referencia = PISTAS_REFERENCIA.search(m_corrido.group(2))
            if eh_borda and num <= NUM_MAX_CAPITULOS and not parece_referencia:
                # cabeçalho/rodapé corrido de seção: registra e remove da página
                secao_detectada = secao_detectada or linha_strip
                continue
            # caso contrário, é nota de rodapé numerada: mantém no texto
            # (será classificada como "nota_rodape" na montagem dos chunks)

        linhas_saida.append(linha)

    texto_limpo = "\n".join(linhas_saida)

    # desfazer hifenização de quebra de linha: "agremia-\nção" -> "agremiação"
    texto_limpo = re.sub(r"(\w)-\n(\w)", r"\1\2", texto_limpo)

    # normalizar múltiplas linhas em branco
    texto_limpo = re.sub(r"\n{3,}", "\n\n", texto_limpo)
    texto_limpo = texto_limpo.strip()

    if not texto_limpo:
        return "", secao_detectada, False

    return texto_limpo, secao_detectada, True


def numero_pagina_real(indice_linha, numero_jsonl):
    """Páginas 1-14 não têm numeração impressa: usamos a posição no JSONL."""
    if numero_jsonl <= 14:
        return indice_linha  # 1-indexado, igual ao número da linha
    return numero_jsonl


def main():
    tokenizer = AutoTokenizer.from_pretrained(MODELO_TOKENIZER)

    def contar_tokens(texto):
        # contagem "crua" do conteúdo, sem o prefixo "passage: " (adicionado no passo 04)
        return len(tokenizer.encode(texto, add_special_tokens=True))

    paginas = []  # lista de (numero_pagina, texto_limpo, secao)
    secao_atual = None

    with open(ENTRADA, encoding="utf-8") as f:
        for indice, linha in enumerate(f, start=1):
            registro = json.loads(linha)
            num_pagina = numero_pagina_real(indice, registro["pagina"])
            texto_limpo, secao_detectada, valida = limpar_pagina(
                registro["texto"], num_pagina
            )
            if secao_detectada:
                secao_atual = secao_detectada
            if not valida:
                continue
            paginas.append((num_pagina, texto_limpo, secao_atual))

    # --- Montagem dos chunks -------------------------------------------------
    SAIDA.parent.mkdir(parents=True, exist_ok=True)

    chunks = []
    ordem = 0

    # buffer corrente: lista de (token_ids, texto, pagina) por "unidade" (parágrafo)
    buffer_unidades = []  # cada item: (lista_de_token_ids, texto, pagina)
    secao_buffer = None
    tipo_buffer = None

    def fechar_chunk():
        nonlocal ordem, buffer_unidades, secao_buffer, tipo_buffer
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
                "tipo_chunk": tipo_buffer or "corpo",
            }
        )
        ordem += 1
        buffer_unidades = []

    def tokens_no_buffer():
        return sum(len(u[0]) for u in buffer_unidades)

    for num_pagina, texto_limpo, secao in paginas:
        # mudança de seção: fecha o chunk corrente (não cruza fronteira de capítulo)
        if secao_buffer is not None and secao != secao_buffer and buffer_unidades:
            fechar_chunk()

        secao_buffer = secao

        # divide a página em parágrafos (unidades que não cortam frase ao meio)
        paragrafos = [p.strip() for p in texto_limpo.split("\n\n") if p.strip()]
        for paragrafo in paragrafos:
            tokens_par = tokenizer.encode(paragrafo, add_special_tokens=False)

            # classificação corpo/nota de rodapé: olha a primeira linha do
            # parágrafo (ver docstring "DETECÇÃO DE NOTAS DE RODAPÉ")
            primeira_linha = paragrafo.split("\n", 1)[0]
            tipo_paragrafo = "nota_rodape" if NOTA_RODAPE.match(primeira_linha) else "corpo"

            # mudança de tipo (corpo <-> nota_rodape): fecha o chunk corrente,
            # mesma lógica da fronteira de seção (sem sobreposição entre tipos)
            if tipo_buffer is not None and tipo_paragrafo != tipo_buffer and buffer_unidades:
                fechar_chunk()
                secao_buffer = secao

            tipo_buffer = tipo_paragrafo

            # parágrafo grande sozinho: divide por sentenças e, se ainda
            # assim faltar, por linhas. Limiar = ALVO_TOKENS (não o limite do
            # modelo) para que a sobreposição do chunk seguinte nunca o
            # empurre para além de LIMITE_MAXIMO_TOKENS.
            if len(tokens_par) > ALVO_TOKENS:
                pedacos = re.split(r"(?<=[.!?])\s+", paragrafo)
                pedacos_finais = []
                for pedaco in pedacos:
                    if not pedaco.strip():
                        continue
                    if len(tokenizer.encode(pedaco, add_special_tokens=False)) > LIMITE_MAXIMO_TOKENS - 2:
                        # ainda enorme (ex.: lista de nomes em uma linha): quebra por linha
                        pedacos_finais.extend(
                            l for l in pedaco.split("\n") if l.strip()
                        )
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
                # fecha o chunk e inicia o próximo com sobreposição
                conteudo_anterior = list(buffer_unidades)
                fechar_chunk()
                secao_buffer = secao

                # sobreposição: arrasta as últimas unidades do chunk anterior
                # até somar ~SOBREPOSICAO_TOKENS
                sobreposicao = []
                soma = 0
                for unidade in reversed(conteudo_anterior):
                    if soma >= SOBREPOSICAO_TOKENS:
                        break
                    # não arrasta uma unidade isolada maior que o alvo de
                    # sobreposição: evitaria ultrapassar o limite do modelo
                    # quando somada ao próximo parágrafo.
                    if not sobreposicao and len(unidade[0]) > SOBREPOSICAO_TOKENS:
                        break
                    sobreposicao.insert(0, unidade)
                    soma += len(unidade[0])
                buffer_unidades = sobreposicao

            buffer_unidades.append((tokens_par, paragrafo, num_pagina))

    fechar_chunk()

    # --- Estatísticas e gravação ----------------------------------------------
    tamanhos = []
    with open(SAIDA, "w", encoding="utf-8") as f:
        for chunk in chunks:
            tam = contar_tokens(chunk["conteudo"])
            tamanhos.append(tam)
            f.write(json.dumps(chunk, ensure_ascii=False) + "\n")

    print(f"Chunks gerados: {len(chunks)}")
    print(f"Tokens por chunk — mínimo: {min(tamanhos)}, mediana: {statistics.median(tamanhos):.0f}, máximo: {max(tamanhos)}")
    acima_512 = sum(1 for t in tamanhos if t > LIMITE_MAXIMO_TOKENS)
    print(f"Chunks acima de {LIMITE_MAXIMO_TOKENS} tokens: {acima_512}")
    print(f"Arquivo de saída: {SAIDA}")


if __name__ == "__main__":
    main()
