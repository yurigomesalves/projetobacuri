r"""
Chunking do Relatório Final da Comissão da Verdade do Estado de São Paulo
"Rubens Paiva" — Tomo II: Dossiê Ditadura — Mortos e Desaparecidos Políticos
no Brasil (1964-1985), VERSÃO DE SÍNTESE (mar/2015).

Uso: python 03_chunkar_cev_sp_tomo2.py

Lê pipeline/dados/extraido/cev-sp-rubens-paiva-tomo2.jsonl (16 registros, um
por página, camada de texto nativa do PDF, campos "pagina", "texto") e produz
pipeline/dados/chunks/cev-sp-rubens-paiva-tomo2.jsonl, no MESMO formato dos
demais volumes da CEV-SP (campos "ordem", "conteudo", "paginas", "secao",
"tipo_chunk" — ver 03_chunkar_cev_sp.py para o Tomo I).

=============================================================================
ESTRUTURA DO DOCUMENTO
=============================================================================
O PDF oficial do Tomo II disponível no portal é a versão de SÍNTESE do dossiê
(~16 páginas, 839 KB) — NÃO o dossiê completo com a lista de todas as vítimas.
É um texto de apresentação corrido (abertura com a epígrafe de Julius Fucik,
explicação do que é o Dossiê e seu histórico), sem partes numeradas.

- Detecção de seção pela PRIMEIRA LINHA da página, quando ela é um título em
  CAIXA ALTA com mais de 15 letras (mesma heurística do Tomo IV). Como o texto
  é majoritariamente corrido, a maioria dos chunks fica com secao = None — o
  que é fiel ao documento (não inventamos estrutura sem pista visual real).
- Desfazer hifenização de quebra de linha: "agremia-\nção" -> "agremiação".

=============================================================================
CRITÉRIO DE QUALIDADE MÍNIMA
=============================================================================
Texto nativo do PDF (não é OCR escaneado). Aplicamos o mesmo piso de robustez
dos demais tomos: depois de remover rodapé, uma página só é aproveitada se
tiver pelo menos MINIMO_CARACTERES (60) caracteres alfabéticos.

=============================================================================
CHUNKING (idêntico a 03_chunkar_cev_sp.py / 03_chunkar.py)
=============================================================================
- Alvo de ~395 tokens (tokenizer do intfloat/multilingual-e5-small),
  sobreposição de ~80 tokens, limite de 512 tokens.
- Nunca cruza fronteira de seção: ao mudar de seção, o chunk corrente é
  fechado mesmo que não tenha atingido o alvo de tokens.
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

SLUG = "cev-sp-rubens-paiva-tomo2"

MINIMO_CARACTERES = 60

# --- Padrões -------------------------------------------------------------------

# O rodapé do Tomo II aparece ao fim de cada página, com dois-pontos após
# "Tomo II" (não hífen como nos demais tomos) e às vezes cortando uma frase
# do corpo que continua na página seguinte:
#   "...enunciar os \nRelatório - Tomo II: Dossiê Ditadura: ... \nwww.verdadeaberta.org"
RODAPE = re.compile(
    r"\n?Relat[oó]rio\s*-\s*Tomo II\s*[:\-].*?www\.verdadeaberta\.org\s*$",
    re.S,
)

ANEXO = re.compile(r"^ANEXO\s+[IVXLCDM]+\b")

ALFA = re.compile(r"[^\W\d_]", re.UNICODE)


def eh_titulo_caixa_alta(linha):
    letras = re.sub(r"[^A-Za-zÀ-ÿ]", "", linha)
    return len(letras) > 15 and letras == letras.upper()


def limpar_pagina(texto):
    """Remove rodapé corrido e detecta pista de seção na primeira linha.

    Retorna (texto_limpo, secao_detectada_ou_None, eh_pagina_valida).
    """
    sem_rodape = RODAPE.sub("", texto).strip()

    if not sem_rodape:
        return "", None, False

    primeira_linha = sem_rodape.split("\n")[0].strip()
    secao_detectada = None
    if ANEXO.match(primeira_linha):
        secao_detectada = primeira_linha
    elif eh_titulo_caixa_alta(primeira_linha):
        secao_detectada = primeira_linha

    # desfazer hifenização de quebra de linha
    texto_limpo = re.sub(r"(\w)-\n(\w)", r"\1\2", sem_rodape)
    texto_limpo = re.sub(r"\n{3,}", "\n\n", texto_limpo).strip()

    if len(ALFA.findall(texto_limpo)) < MINIMO_CARACTERES:
        return texto_limpo, secao_detectada, False

    return texto_limpo, secao_detectada, True


def main():
    entrada = RAIZ / "dados" / "extraido" / f"{SLUG}.jsonl"
    saida = RAIZ / "dados" / "chunks" / f"{SLUG}.jsonl"

    tokenizer = AutoTokenizer.from_pretrained(MODELO_TOKENIZER)

    def contar_tokens(texto):
        return len(tokenizer.encode(texto, add_special_tokens=True))

    paginas = []  # lista de (numero_pagina, texto_limpo, secao)
    secao_atual = None
    total_registros = 0
    descartadas_vazias = 0
    descartadas_qualidade = 0

    with open(entrada, encoding="utf-8") as f:
        for linha in f:
            registro = json.loads(linha)
            total_registros += 1
            numero_pagina = registro["pagina"]

            if not registro["texto"].strip():
                descartadas_vazias += 1
                continue

            texto_limpo, secao_detectada, valida = limpar_pagina(registro["texto"])
            if secao_detectada:
                secao_atual = secao_detectada
            if not valida:
                descartadas_qualidade += 1
                continue

            paginas.append((numero_pagina, texto_limpo, secao_atual))

    print(f"Registros totais: {total_registros}")
    print(f"Descartadas (vazias): {descartadas_vazias}")
    print(f"Descartadas (abaixo do critério de qualidade): {descartadas_qualidade}")
    print(f"Páginas aproveitadas: {len(paginas)}")

    # --- Montagem dos chunks (mesma lógica de 03_chunkar_cev_sp.py) -------------
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
    chunks_finais = []
    for chunk in chunks:
        tokens_totais = len(tokenizer.encode(chunk["conteudo"], add_special_tokens=True))
        if tokens_totais <= LIMITE_MAXIMO_TOKENS:
            chunks_finais.append(chunk)
            continue

        pedacos = re.split(r"(?<=[.!?])\s+", chunk["conteudo"])
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
    com_secao = sum(1 for c in chunks if c["secao"])
    print(f"Chunks com seção preenchida: {com_secao} ({100*com_secao/len(chunks):.1f}%)")
    print(f"Arquivo de saída: {saida}")


if __name__ == "__main__":
    main()
