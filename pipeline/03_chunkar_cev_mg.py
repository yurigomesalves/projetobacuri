r"""
Chunking do acervo da Comissão da Verdade em Minas Gerais (Covemg):
- Relatório Final 2017 (1781 páginas, texto nativo)
- Anexo "Justiça de Transição" do Centro de Estudos sobre Justiça de
  Transição da UFMG (5 páginas, texto nativo)

Uso: python 03_chunkar_cev_mg.py

Lê:
  pipeline/dados/extraido/cev-mg-covemg-relatorio-final-2017.jsonl
  pipeline/dados/extraido/cev-mg-covemg-anexo-justica-transicao-ufmg.jsonl
e produz:
  pipeline/dados/chunks/cev-mg-covemg-relatorio-final-2017.jsonl
  pipeline/dados/chunks/cev-mg-covemg-anexo-justica-transicao-ufmg.jsonl
no MESMO formato dos demais volumes (campos "ordem", "conteudo", "paginas",
"secao", "tipo_chunk" — ver 03_chunkar_cev_sp.py).

=============================================================================
ESTRUTURA DO RELATÓRIO FINAL 2017
=============================================================================
- Rodapé/cabeçalho corrido na maioria das páginas: "Relatório da Comissão da
  Verdade em Minas Gerais\n<número de página do documento>" (às vezes o
  número vem ANTES da frase, dependendo da extração) — removido sem virar
  seção.
- 3 páginas essencialmente vazias (25, 1240, 1781) — descartadas.
- O documento é organizado em 13 capítulos numerados + Apresentação e
  Prefácio, listados no Sumário (págs. 15-20). Cada capítulo abre com uma
  página de "página de rosto" (título em caixa alta, em várias linhas, mais
  a equipe responsável — "Coordenador(a)"/"Coordenação"/"Redação"/
  "Colaboradores" — e o marcador "VOLTAR AO SUMÁRIO"). Identificamos essas
  páginas de abertura MANUALMENTE (lendo o Sumário e confirmando o texto de
  cada página), porque o padrão visual varia demais entre capítulos para uma
  regex confiável (alguns títulos vêm antes da equipe, outros depois; alguns
  têm "Coordenador:", outros "Coordenação:"; o "VOLTAR AO SUMÁRIO" nem
  sempre está na mesma página do título). Isso segue a regra "não
  inventamos": preferimos uma lista curta, auditável e correta, a uma
  heurística genérica que erraria títulos. Registrado para auditoria do
  curador-historiador — qualquer capítulo no mapa abaixo pode ser conferido
  comparando com o Sumário nas páginas 15-20 do PDF.

  Mapa capítulo -> página inicial (numeração do arquivo .jsonl, 1-based):
    22  Apresentação
    26  Prefácio
    32  1. A Comissão da Verdade em Minas Gerais: História e Atuação
    68  2. Acontecimentos Envolvendo Mortes e Desaparecimentos de
        Opositores à Ditadura Militar
    162 3. Tortura e Violência Institucional aos Opositores à Ditadura em
        Minas Gerais
    294 4. Locais de Repressão e Tortura
    355 5. As Graves Violações de Direitos Humanos no Campo (1961-1988)
    589 6. A Repressão ao Mundo do Trabalho e ao Movimento Sindical Urbano
        em Minas Gerais, de 1946 a 1988
    865 7. A Posição das Igrejas Cristãs Durante o Governo Militar
    930 8. Violações de Direitos Humanos dos Povos Indígenas
    1035 9. A Extrema Direita vai ao Terrorismo em Minas Gerais
    1073 10. Censura aos Meios de Comunicação de Massa de Belo Horizonte, aos
         Espetáculos Artísticos e Culturais e aos Intérpretes
    1157 11. Cassação de Representantes Políticos, Aposentadorias e Demissões
         de Servidores Públicos, no Âmbito de Minas Gerais
    1201 12. Repressão ao Movimento Estudantil e às Universidades em Minas
         Gerais
    1363 13. Impedimento de Convivência de Crianças com seus Genitores em
         Razão da sua Prisão, Morte ou Desaparecimento

  Páginas 1-21 (capa, créditos, sumário, lista de siglas) recebem secao =
  None.

- Desfazer hifenização de quebra de linha: "agremia-\nção" -> "agremiação".
- Remoção do cabeçalho/rodapé corrido "Relatório da Comissão da Verdade em
  Minas Gerais" (com o número de página adjacente, em qualquer ordem).

=============================================================================
ESTRUTURA DO ANEXO (UFMG)
=============================================================================
Texto corrido, sem cabeçalho/rodapé repetido, 5 páginas. Um único bloco —
secao = None (não há subtítulos internos confiáveis o bastante para
segmentar; é um único artigo/relatório técnico curto). tipo_chunk = "corpo".

=============================================================================
CHUNKING (idêntico a 03_chunkar_cev_sp.py / 03_chunkar.py)
=============================================================================
- Alvo de ~395 tokens (tokenizer do intfloat/multilingual-e5-small),
  sobreposição de ~80 tokens, limite de 512 tokens.
- Nunca cruza fronteira de seção (capítulo): ao mudar de seção, o chunk
  corrente é fechado mesmo que não tenha atingido o alvo de tokens.
- tipo_chunk é sempre "corpo".
- Cada chunk registra a faixa de páginas que cobre ("N" ou "N-M") — número
  de página do arquivo .jsonl (1-based), que corresponde à página do PDF.
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

# --- Padrões de limpeza (Relatório Final) -------------------------------------

# cabeçalho/rodapé corrido: "Relatório da Comissão da Verdade em Minas
# Gerais" seguido (ou precedido) do número de página do documento.
CABECALHO_PRE = re.compile(
    r"^Relatório da Comissão da Verdade em Minas Gerais\s*\n\d+\s*\n?"
)
CABECALHO_POS = re.compile(
    r"^\d+\s*\nRelatório da Comissão da Verdade em Minas Gerais\s*\n?"
)

ALFA = re.compile(r"[^\W\d_]", re.UNICODE)
MINIMO_CARACTERES = 60

# Capítulos do Relatório Final 2017 — página inicial (1-based no .jsonl) e
# título normalizado (ver docstring para a auditoria do mapeamento).
CAPITULOS_RELATORIO = [
    (22, "Apresentação"),
    (26, "Prefácio"),
    (32, "1. A Comissão da Verdade em Minas Gerais: História e Atuação"),
    (68, "2. Acontecimentos Envolvendo Mortes e Desaparecimentos de Opositores à Ditadura Militar"),
    (162, "3. Tortura e Violência Institucional aos Opositores à Ditadura em Minas Gerais"),
    (294, "4. Locais de Repressão e Tortura"),
    (355, "5. As Graves Violações de Direitos Humanos no Campo (1961-1988)"),
    (589, "6. A Repressão ao Mundo do Trabalho e ao Movimento Sindical Urbano em Minas Gerais, de 1946 a 1988"),
    (865, "7. A Posição das Igrejas Cristãs Durante o Governo Militar"),
    (930, "8. Violações de Direitos Humanos dos Povos Indígenas"),
    (1035, "9. A Extrema Direita vai ao Terrorismo em Minas Gerais"),
    (1073, "10. Censura aos Meios de Comunicação de Massa de Belo Horizonte, aos Espetáculos Artísticos e Culturais e aos Intérpretes"),
    (1157, "11. Cassação de Representantes Políticos, Aposentadorias e Demissões de Servidores Públicos, no Âmbito de Minas Gerais"),
    (1201, "12. Repressão ao Movimento Estudantil e às Universidades em Minas Gerais"),
    (1363, "13. Impedimento de Convivência de Crianças com seus Genitores em Razão da sua Prisão, Morte ou Desaparecimento"),
]


def secao_para_pagina(num_pagina):
    secao = None
    for pagina_inicio, titulo in CAPITULOS_RELATORIO:
        if num_pagina >= pagina_inicio:
            secao = titulo
        else:
            break
    return secao


def limpar_pagina_relatorio(texto):
    """Remove cabeçalho/rodapé corrido e normaliza o texto de uma página do
    Relatório Final. Retorna (texto_limpo, eh_pagina_valida)."""
    sem_cabecalho = CABECALHO_PRE.sub("", texto)
    sem_cabecalho = CABECALHO_POS.sub("", sem_cabecalho)
    sem_cabecalho = sem_cabecalho.strip()

    if not sem_cabecalho:
        return "", False

    # desfazer hifenização de quebra de linha
    texto_limpo = re.sub(r"(\w)-\n(\w)", r"\1\2", sem_cabecalho)
    texto_limpo = re.sub(r"\n{3,}", "\n\n", texto_limpo).strip()

    if len(ALFA.findall(texto_limpo)) < MINIMO_CARACTERES:
        return texto_limpo, False

    return texto_limpo, True


# --- Núcleo de chunking (idêntico aos demais volumes) -------------------------

def chunkar_paginas(paginas, tokenizer):
    """Recebe lista de (numero_pagina, texto_limpo, secao) e devolve a lista
    de chunks no formato padrão. Núcleo idêntico ao de 03_chunkar_cev_sp.py."""

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
    print(f"Tokens por chunk — mínimo: {min(tamanhos)}, mediana: {statistics.median(tamanhos):.0f}, máximo: {max(tamanhos)}")
    acima_512 = sum(1 for t in tamanhos if t > LIMITE_MAXIMO_TOKENS)
    print(f"Chunks acima de {LIMITE_MAXIMO_TOKENS} tokens: {acima_512}")
    com_secao = sum(1 for c in chunks if c["secao"])
    print(f"Chunks com seção preenchida: {com_secao} ({100*com_secao/len(chunks):.1f}%)")
    print(f"Arquivo de saída: {saida}")


# --- Processamento de cada fonte ----------------------------------------------

def processar_relatorio_final(tokenizer):
    slug = "cev-mg-covemg-relatorio-final-2017"
    entrada = RAIZ / "dados" / "extraido" / f"{slug}.jsonl"

    paginas = []
    total_registros = 0
    descartadas_vazias = 0
    descartadas_qualidade = 0

    with open(entrada, encoding="utf-8") as f:
        for numero_pagina, linha in enumerate(f, start=1):
            registro = json.loads(linha)
            total_registros += 1

            if not registro["texto"].strip():
                descartadas_vazias += 1
                continue

            texto_limpo, valida = limpar_pagina_relatorio(registro["texto"])
            if not valida:
                descartadas_qualidade += 1
                continue

            secao = secao_para_pagina(numero_pagina)
            paginas.append((numero_pagina, texto_limpo, secao))

    print(f"[{slug}]")
    print(f"Registros totais: {total_registros}")
    print(f"Descartadas (vazias): {descartadas_vazias}")
    print(f"Descartadas (abaixo do critério de qualidade): {descartadas_qualidade}")
    print(f"Páginas aproveitadas: {len(paginas)}")

    chunks = chunkar_paginas(paginas, tokenizer)
    gravar_chunks(slug, chunks, tokenizer)


def processar_anexo_ufmg(tokenizer):
    slug = "cev-mg-covemg-anexo-justica-transicao-ufmg"
    entrada = RAIZ / "dados" / "extraido" / f"{slug}.jsonl"

    paginas = []
    with open(entrada, encoding="utf-8") as f:
        for numero_pagina, linha in enumerate(f, start=1):
            registro = json.loads(linha)
            texto = registro["texto"].strip()
            if not texto:
                continue
            texto_limpo = re.sub(r"(\w)-\n(\w)", r"\1\2", texto)
            texto_limpo = re.sub(r"\n{3,}", "\n\n", texto_limpo).strip()
            paginas.append((numero_pagina, texto_limpo, None))

    print(f"\n[{slug}]")
    print(f"Páginas aproveitadas: {len(paginas)}")

    chunks = chunkar_paginas(paginas, tokenizer)
    gravar_chunks(slug, chunks, tokenizer)


def main():
    tokenizer = AutoTokenizer.from_pretrained(MODELO_TOKENIZER)
    processar_relatorio_final(tokenizer)
    processar_anexo_ufmg(tokenizer)


if __name__ == "__main__":
    main()
