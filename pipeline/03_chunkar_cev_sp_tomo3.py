r"""
Chunking do Relatório Final da Comissão da Verdade do Estado de São Paulo
"Rubens Paiva" — Tomo III: Audiências Públicas (marco/2015).

Uso: python 03_chunkar_cev_sp_tomo3.py

Lê pipeline/dados/extraido/cev-sp-rubens-paiva-tomo3.jsonl (12.225 registros,
um por página de PDF escaneado, OCR Tesseract pt-BR a 200dpi, campos
"pagina", "texto", "qualidade_ocr") e produz
pipeline/dados/chunks/cev-sp-rubens-paiva-tomo3.jsonl, no MESMO formato dos
demais volumes da CEV-SP (campos "ordem", "conteudo", "paginas", "secao",
"tipo_chunk" — ver 03_chunkar_cev_sp.py para o Tomo I).

=============================================================================
ESTRUTURA DO DOCUMENTO E LIMPEZA
=============================================================================
- Páginas 1-2960: completamente em branco (qualidade_ocr =
  "pagina_em_branco_sem_ocr") — DESCARTADAS sem OCR algum. Restam 7.104
  páginas com texto (2961-12225 menos algumas em branco no meio).
- Cabeçalho corrido repetido em quase toda página com texto: um bloco de
  1-3 linhas no topo —
      "COMISSÃO DA" (às vezes OCRado "ISSÃO DA")
      "<ruído opcional>Relatório - Tomo III - Audiências Públicas da
       Comissão da Verdade do Estado de São Paulo" (variantes de grafia:
       "Tomo Ill", "Tomo III")
      "do Estado de São Paulo"  (linha de continuação, presente na maioria)
  seguido, em muitas páginas, de uma linha em branco e uma linha contendo
  só o número de página impresso (não confiável como página real — não
  usado). Esse bloco é removido por completo (3-5 primeiras linhas,
  detectadas por regex), sem virar seção.
- NÃO há uma estrutura de seções confiável: o Tomo III é a transcrição
  corrida de várias audiências públicas em sequência, sem títulos
  padronizados detectáveis por regex (regra "não inventamos" — mesma do
  Tomo I). secao = None para todos os chunks. O curador-historiador pode,
  em uma fase futura, mapear faixas de página -> nome da audiência a partir
  do índice oficial do Tomo III, se julgar necessário.
- Desfazer hifenização de quebra de linha: "agremia-\nção" -> "agremiação".

=============================================================================
CRITÉRIO DE QUALIDADE MÍNIMA (descarte de ruído de OCR)
=============================================================================
Após remover o cabeçalho, uma página só é aproveitada se o texto restante:
  1. tiver pelo menos MINIMO_CARACTERES (60) caracteres alfabéticos
     (letras a-z/A-Z incl. acentuadas) — elimina páginas que sobraram só
     com fragmentos de cabeçalho, números soltos ou pontuação de OCR; e
  2. tiver proporção de caracteres alfabéticos >= PROPORCAO_ALFA_MINIMA
     (0.5) sobre o total de caracteres não-espaço — elimina páginas-lixo
     dominadas por símbolos/números (ex.: tabelas mal OCRadas, carimbos).
Critério simples e auditável; registrado nas estatísticas finais para o
curador-historiador revisar a amostra descartada, se desejar.

=============================================================================
CHUNKING (idêntico a 03_chunkar_cev_sp.py / 03_chunkar.py)
=============================================================================
- Alvo de ~395 tokens (tokenizer do intfloat/multilingual-e5-small),
  sobreposição de ~80 tokens, limite de 512 tokens.
- Como não há seções, os chunks fluem livremente entre páginas; só fecham
  ao atingir o alvo de tokens (ou ao fim do documento).
- tipo_chunk é sempre "corpo".
- Cada chunk registra a faixa de páginas (do JSONL, não o número impresso)
  que cobre ("N" ou "N-M").
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

SLUG = "cev-sp-rubens-paiva-tomo3"

MINIMO_CARACTERES = 60
PROPORCAO_ALFA_MINIMA = 0.5

# --- Padrões de limpeza do cabeçalho corrido ----------------------------------

LINHA_COMISSAO = re.compile(r"^(ISS[ÃA]O DA|COMISS[ÃA]O DA)\s*$")
LINHA_RELATORIO_TOMO3 = re.compile(
    r"Relat[oó]rio\s*-\s*Tomo\s*I[lI]+\s*-\s*Audi[eê]ncias\s*P[uú]blicas"
)
LINHA_CONTINUACAO = re.compile(r"^do Estado de São Paulo\s*$")
LINHA_NUMERO_PAGINA = re.compile(r"^\d{1,4}\s*$")

ALFA = re.compile(r"[^\W\d_]", re.UNICODE)  # letras (com acentos), exclui dígitos/underscore


def remover_cabecalho(texto):
    """Remove o bloco de cabeçalho corrido do topo da página, se presente."""
    linhas = texto.split("\n")
    i = 0
    n = len(linhas)

    if i < n and LINHA_COMISSAO.match(linhas[i].strip()):
        i += 1
        # segunda linha: pode ter ruído de OCR antes do texto reconhecível
        if i < n and LINHA_RELATORIO_TOMO3.search(linhas[i]):
            i += 1
            # linha de continuação opcional
            if i < n and LINHA_CONTINUACAO.match(linhas[i].strip()):
                i += 1
            # linha em branco + número de página impresso, opcionais
            if i < n and linhas[i].strip() == "":
                j = i + 1
                if j < n and LINHA_NUMERO_PAGINA.match(linhas[j].strip()):
                    i = j + 1

    return "\n".join(linhas[i:])


def limpar_pagina(texto):
    """Limpa o texto de uma página.

    Retorna (texto_limpo, eh_pagina_valida).
    """
    sem_cabecalho = remover_cabecalho(texto)

    # desfazer hifenização de quebra de linha
    sem_cabecalho = re.sub(r"(\w)-\n(\w)", r"\1\2", sem_cabecalho)

    # normalizar múltiplas linhas em branco
    texto_limpo = re.sub(r"\n{3,}", "\n\n", sem_cabecalho).strip()

    if not texto_limpo:
        return "", False

    n_alfa = len(ALFA.findall(texto_limpo))
    n_nao_espaco = len(re.sub(r"\s", "", texto_limpo))

    if n_alfa < MINIMO_CARACTERES:
        return texto_limpo, False
    if n_nao_espaco == 0 or (n_alfa / n_nao_espaco) < PROPORCAO_ALFA_MINIMA:
        return texto_limpo, False

    return texto_limpo, True


def main():
    entrada = RAIZ / "dados" / "extraido" / f"{SLUG}.jsonl"
    saida = RAIZ / "dados" / "chunks" / f"{SLUG}.jsonl"

    tokenizer = AutoTokenizer.from_pretrained(MODELO_TOKENIZER)

    def contar_tokens(texto):
        return len(tokenizer.encode(texto, add_special_tokens=True))

    paginas = []  # lista de (numero_pagina, texto_limpo)
    total_registros = 0
    descartadas_brancas = 0
    descartadas_qualidade = 0

    with open(entrada, encoding="utf-8") as f:
        for linha in f:
            registro = json.loads(linha)
            total_registros += 1
            numero_pagina = registro["pagina"]

            if registro["qualidade_ocr"] == "pagina_em_branco_sem_ocr" or not registro["texto"].strip():
                descartadas_brancas += 1
                continue

            texto_limpo, valida = limpar_pagina(registro["texto"])
            if not valida:
                descartadas_qualidade += 1
                continue

            paginas.append((numero_pagina, texto_limpo))

    print(f"Registros totais: {total_registros}")
    print(f"Descartadas (em branco/sem OCR): {descartadas_brancas}")
    print(f"Descartadas (abaixo do critério de qualidade): {descartadas_qualidade}")
    print(f"Páginas aproveitadas: {len(paginas)}")

    # --- Montagem dos chunks (mesma lógica de 03_chunkar_cev_sp.py) -------------
    saida.parent.mkdir(parents=True, exist_ok=True)

    chunks = []
    ordem = 0
    buffer_unidades = []  # (token_ids, texto, pagina)

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
                "secao": None,
                "tipo_chunk": "corpo",
            }
        )
        ordem += 1
        buffer_unidades = []

    def tokens_no_buffer():
        return sum(len(u[0]) for u in buffer_unidades)

    for num_pagina, texto_limpo in paginas:
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
                    buffer_unidades.append((tokens_pedaco, pedaco, num_pagina))
                continue

            if tokens_no_buffer() + len(tokens_par) > ALVO_TOKENS and buffer_unidades:
                conteudo_anterior = list(buffer_unidades)
                fechar_chunk()

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
    chunks_finais = []
    for chunk in chunks:
        tokens_totais = len(tokenizer.encode(chunk["conteudo"], add_special_tokens=True))
        if tokens_totais <= LIMITE_MAXIMO_TOKENS:
            chunks_finais.append(chunk)
            continue

        pedacos = re.split(r"(?<=[.!?])\s+", chunk["conteudo"])
        # rede de segurança adicional: se mesmo a divisão por sentença deixar
        # um pedaço grande demais (ex.: lista longa separada só por vírgulas,
        # sem pontuação final), divide também por vírgula.
        pedacos_expandidos = []
        for pedaco in pedacos:
            if len(tokenizer.encode(pedaco, add_special_tokens=False)) > LIMITE_MAXIMO_TOKENS - 2:
                pedacos_expandidos.extend(re.split(r"(?<=,)\s+", pedaco))
            else:
                pedacos_expandidos.append(pedaco)
        pedacos = pedacos_expandidos
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
    print(f"Arquivo de saída: {saida}")


if __name__ == "__main__":
    main()
