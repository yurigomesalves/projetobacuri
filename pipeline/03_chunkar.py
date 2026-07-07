r"""
Chunking dos volumes do Relatório Final da CNV.

Uso: python 03_chunkar.py <slug>
  slug ∈ {cnv-vol1, cnv-vol2, cnv-vol3}

Lê pipeline/dados/extraido/<slug>.jsonl (uma linha JSON por página, com o
texto extraído por OCR/parsing do PDF) e produz pipeline/dados/chunks/<slug>.jsonl,
um chunk por linha, pronto para gerar embeddings (passo 04).

As heurísticas de limpeza e detecção de seção variam entre os volumes (cada
um tem cabeçalho corrido e organização interna diferentes) e estão reunidas
na constante CONFIGS_VOLUME, uma entrada por slug. As etapas de chunking em
si (tamanho-alvo, sobreposição, não cruzar fronteira de seção/tipo) são
comuns aos três volumes.

=============================================================================
VOLUME I — Relatório, dezembro de 2014 (18 capítulos)
=============================================================================
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

=============================================================================
VOLUME II — Textos Temáticos, dezembro de 2014 (9 textos de autoria
individual de conselheiros)
=============================================================================
- Mesmo esquema do vol. I, adaptado:
  - Cabeçalho corrido: "comissão nacional da verdade - relatório - volume ii
    - textos temáticos - dezembro de 2014" (usa hífen simples "-", não
    en-dash; o regex aceita ambos).
  - Abertura de "texto" (equivalente a capítulo): "N\ntexto\n<título...>"
    (ex.: página 11: "1\ntexto\nviolações de direitos humanos no meio militar").
  - Cabeçalho/rodapé corrido de seção: "N – título" ou "N - título", com
    N de 1 a 9 (NUM_MAX_CAPITULOS=9, são 9 textos), na primeira ou última
    linha de conteúdo da página (ex.: "1 – violações de direitos humanos no
    meio militar", "8 – civis que colaboraram com a ditadura").
  - Notas de rodapé: mesmo padrão NOTA_RODAPE do vol. I (cada texto temático
    tem suas próprias notas numeradas, recomeçando do 1).
  - Não há sumário com pontilhados no início (paginação contínua já
    confiável desde a página 1; a heurística de páginas 1-14 do vol. I não
    se aplica).

=============================================================================
VOLUME III — Mortos e Desaparecidos Políticos, dezembro de 2014 (434 perfis)
=============================================================================
- Cabeçalho corrido: "comissão nacional da verdade - relatório - volume iii -
  mortos e desaparecidos políticos - dezembro de 2014" (hífen simples),
  sempre como linha isolada — removido como o CABECALHO_CNV do vol. I (não
  carrega pista de seção).
- NÃO existe um padrão "N – título" confiável de seção corrida (a CNV não
  numera os perfis dessa forma no corpo do texto), então a detecção de
  capítulo/texto do vol. I/II É DESLIGADA para este volume
  (NUM_MAX_CAPITULOS=0, ABERTURA_SECAO=None).
- DETECÇÃO DE SEÇÃO POR ÍNDICE (heurística específica deste volume, é a base
  da futura fase de biografias):
  - As páginas 7-14 do PDF trazem o ÍNDICE "Relação de perfis de mortos e
    desaparecidos políticos – 1946-1988 (em ordem cronológica)", no formato
    "N. \n<Nome da vítima>.......<página inicial>". Esse índice tem 434
    entradas (1 por vítima) e é a fonte CONFIÁVEL para nomear cada perfil —
    o corpo do texto ("BIOGRAFIA\nNascido(a) em..., <Nome> ...") tem o nome
    embutido em prosa livre, sem marcação, e não seria seguro extrair por
    regex (risco de pegar nome errado).
  - Há um SEGUNDO índice (em ordem alfabética, páginas 15-22) que também soma
    434 entradas — ignorado, pois não dá a ordem de páginas correta.
  - ERRATA CONHECIDA: a entrada 136 ("Joaquim Alencar de Seixas") do índice
    cronológico aponta para a página 543, mas a página 543 é uma tabela de
    "Autoria de graves violações" do perfil ANTERIOR (entrada 128, "Antônio
    Joaquim de Souza Machado" — cujo BIOGRAFIA está corretamente na página
    554, valor já indicado pela própria entrada 128). O perfil de Joaquim
    Alencar de Seixas está de fato na página 583 (confirmado: "BIOGRAFIA \n
    Nascido no Pará, Joaquim Alencar..."), entre as entradas 135 (Abílio
    Clemente Filho, pág. 580) e 137 (Dimas Antônio Casemiro, pág. 590).
    Correção: 543 -> 583 (não 554 — essa foi uma correção anterior
    equivocada, que atribuiu a Joaquim Alencar de Seixas a página do perfil
    de Antônio Joaquim de Souza Machado). Confirmado por inspeção do corpo
    do documento, não é invenção.
  - VERIFICAÇÃO AUTOMÁTICA (auditoria obrigatória, rodada após qualquer
    mudança no índice): para cada uma das 434 entradas, confirma-se que cada
    palavra do nome (exceto preposições "de/da/do/dos/das/e"), normalizada
    sem acentos e caixa, aparece no texto das duas páginas a partir da
    página inicial do perfil. Resultado mais recente: 433/434 confirmadas
    automaticamente; a entrada 427 ("Liliana Inés Goldemberg", pág. 1962)
    diverge apenas por variante ortográfica do sobrenome no corpo
    ("Goldenberg" em vez de "Goldemberg") — confirmada manualmente como o
    mesmo perfil, sem necessidade de correção de página.
  - secao = f"Perfil – {nome}" para todas as páginas no intervalo
    [pagina_inicial_do_perfil, pagina_inicial_do_próximo_perfil - 1].
    Páginas ANTES do primeiro perfil (apresentação, introdução, índices)
    recebem secao = None.
  - Não inventamos: se o índice não cobrir a página (ex.: páginas finais
    após o último perfil, com "FONTES PRINCIPAIS DE INVESTIGAÇÃO" gerais),
    secao mantém o valor do último perfil detectado (mesma regra "mantém até
    a próxima mudança" do vol. I/II) — essas páginas de fontes pertencem ao
    perfil anterior.
- Notas de rodapé: mesmo padrão NOTA_RODAPE do vol. I/II (cada perfil tem
  suas próprias notas, recomeçando do 1; algumas usam o caractere "thin
  space" U+2007 ao redor do "–", já coberto por \s no regex).

=============================================================================
CHUNKING (comum aos três volumes)
=============================================================================
- Alvo de ~400 tokens (contados pelo tokenizer do intfloat/multilingual-e5-small,
  o mesmo modelo usado para os embeddings), sobreposição de ~80 tokens.
- Nunca cruza fronteira de seção (capítulo/texto/perfil) nem de tipo_chunk
  (corpo/nota de rodapé): ao mudar de qualquer um dos dois, o chunk corrente
  é fechado mesmo que ainda não tenha atingido o alvo de tokens.
- Cada chunk registra a faixa de páginas que cobre ("N" ou "N-M").
"""

import argparse
import json
import re
import statistics
from pathlib import Path

from transformers import AutoTokenizer

RAIZ = Path(__file__).resolve().parent

MODELO_TOKENIZER = "intfloat/multilingual-e5-small"
ALVO_TOKENS = 395
SOBREPOSICAO_TOKENS = 80
LIMITE_MAXIMO_TOKENS = 512  # limite do modelo e5-small

# --- Padrões de limpeza comuns -----------------------------------------------

LINHA_SO_NUMERO = re.compile(r"^\d{1,4}$")
# qualquer "N – texto" com N de 1 a 3 dígitos: marcador de nota de rodapé
NOTA_RODAPE = re.compile(r"^\d{1,3}\s*[–-]\s+\S")
# pistas de que "N – texto" é referência bibliográfica/arquivística (nota),
# não título de capítulo/texto
PISTAS_REFERENCIA = re.compile(
    r"\b(arquivo|ibid|p\.\s*\d|pp\.\s*\d|cnv|cemdp|sni|cisa|depoimento|entrevista|"
    r"http|www\.|disponível em)\b",
    re.IGNORECASE,
)
# pontilhados do sumário
PONTILHADO = re.compile(r"\.{5,}")


# --- Configuração por volume --------------------------------------------------
#
# CABECALHO_CNV: cabeçalho/rodapé corrido fixo, removido sem virar seção.
# ABERTURA_SECAO: regex de abertura de capítulo/texto ("N\n<palavra>\n<título>");
#   None se o volume não tiver esse padrão.
# LINHA_SECAO_CORRIDA: regex "N <sep> título" tratado como cabeçalho/rodapé de
#   seção quando está na borda da página e N <= NUM_MAX_CAPITULOS; None desliga
#   essa detecção.
# NUM_MAX_CAPITULOS: limite de N para LINHA_SECAO_CORRIDA.
# PAGINACAO_INICIAL_POR_LINHA: se True, páginas 1-14 recebem como número de
#   página o índice da linha no JSONL (caso do vol. I, sem paginação impressa
#   no início).
# INDICE_PERFIS: se True, constrói o mapeamento de seção a partir do índice de
#   perfis (só vol. III) — ver build_mapa_perfis_vol3().

CONFIGS_VOLUME = {
    "cnv-vol1": {
        "cabecalho_cnv": re.compile(
            r"^comissão nacional da verdade\s*[–-]\s*relatório\s*[–-]\s*volume i\s*[–-]\s*dezembro de 2014\s*$",
            re.IGNORECASE,
        ),
        "abertura_secao": re.compile(r"^(\d{1,2})\ncapítulo\n", re.IGNORECASE),
        "linha_secao_corrida": re.compile(r"^(\d{1,2})\s*[–-]\s*(.{3,90})$"),
        "num_max_capitulos": 18,
        "paginacao_inicial_por_linha": True,
        "indice_perfis": False,
        "pular_sumario": True,
    },
    "cnv-vol2": {
        "cabecalho_cnv": re.compile(
            r"^comissão nacional da verdade\s*[–-]\s*relatório\s*[–-]\s*volume ii\s*[–-]\s*textos temáticos\s*[–-]\s*dezembro de 2014\s*$",
            re.IGNORECASE,
        ),
        "abertura_secao": re.compile(r"^(\d{1,2})\ntexto\n", re.IGNORECASE),
        "linha_secao_corrida": re.compile(r"^(\d{1,2})\s*[–-]\s*(.{3,90})$"),
        "num_max_capitulos": 9,
        "paginacao_inicial_por_linha": False,
        "indice_perfis": False,
        "pular_sumario": False,
    },
    "cnv-vol3": {
        "cabecalho_cnv": re.compile(
            r"^comissão nacional da verdade\s*[–-]\s*relatório\s*[–-]\s*volume iii\s*[–-]\s*mortos e desaparecidos políticos\s*[–-]\s*dezembro de 2014\s*$",
            re.IGNORECASE,
        ),
        "abertura_secao": None,
        "linha_secao_corrida": None,
        "num_max_capitulos": 0,
        "paginacao_inicial_por_linha": False,
        "indice_perfis": True,
        "pular_sumario": False,
    },
}

# Correção pontual do índice de perfis do vol. III (ver docstring "ERRATA
# CONHECIDA"): {numero_da_entrada_no_indice: pagina_correta}
ERRATAS_INDICE_PERFIS_VOL3 = {
    # "Joaquim Alencar de Seixas": índice diz 543 (pág. do perfil anterior,
    # entrada 128, "Antônio Joaquim de Souza Machado"), corpo confirma 583
    136: 583,
}

# Correção de grafia de nome no índice do vol. III, decidida pelo
# curador-historiador na reauditoria da Fase 5 (docs/auditorias/
# fase5-cnv-vols-2-3.md): o corpo do relatório grafa "Goldenberg" (3
# ocorrências, inclusive em perfis correlatos da Operação Condor); o índice
# grafa "Goldemberg" (1 ocorrência). Adotamos a grafia do corpo.
# {numero_da_entrada_no_indice: nome_correto}
CORRECOES_NOME_PERFIS_VOL3 = {
    427: "Liliana Inés Goldenberg",
}


def build_mapa_perfis_vol3(caminho_jsonl):
    """Lê as páginas 7-14 do vol. III (índice cronológico de perfis) e devolve
    uma lista ordenada de (pagina_inicial, "Perfil – Nome"), uma por vítima.

    Ver docstring da seção VOLUME III para a justificativa completa.
    """
    pat_entrada = re.compile(r"(\d{1,3})\.\s*\n?\s*(.+?)\.{5,}\s*(\d{1,4})")

    with open(caminho_jsonl, encoding="utf-8") as f:
        linhas = f.readlines()

    entradas = []
    for indice_linha in range(7, 15):  # páginas 7-14 (1-indexado = índice_linha)
        registro = json.loads(linhas[indice_linha - 1])
        for m in pat_entrada.finditer(registro["texto"]):
            num_entrada = int(m.group(1))
            nome = m.group(2).strip()
            nome = CORRECOES_NOME_PERFIS_VOL3.get(num_entrada, nome)
            pagina = int(m.group(3))
            pagina = ERRATAS_INDICE_PERFIS_VOL3.get(num_entrada, pagina)
            entradas.append((pagina, f"Perfil – {nome}"))

    entradas.sort(key=lambda x: x[0])
    return entradas


def secao_por_pagina_vol3(mapa_perfis, num_pagina):
    """Devolve a seção (nome do perfil) vigente para a página dada, ou None
    se a página for anterior ao primeiro perfil."""
    secao = None
    for pagina_inicial, nome_secao in mapa_perfis:
        if num_pagina >= pagina_inicial:
            secao = nome_secao
        else:
            break
    return secao


def limpar_pagina(texto, numero_pagina, config):
    """Limpa o texto de uma página e tenta extrair pista de seção.

    Retorna (texto_limpo, secao_detectada_ou_None, eh_pagina_valida).
    """
    if not texto.strip():
        return "", None, False

    # sumário: página com muitos pontilhados (índice/sumário)
    if config["pular_sumario"] and len(PONTILHADO.findall(texto)) >= 3:
        return "", None, False

    secao_detectada = None

    # detecção de abertura de capítulo/texto (antes de remover linhas)
    abertura_secao = config["abertura_secao"]
    if abertura_secao is not None:
        m_abertura = abertura_secao.match(texto)
        if m_abertura:
            # título da seção: linhas seguintes até a próxima quebra dupla
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

    cabecalho_cnv = config["cabecalho_cnv"]
    linha_secao_corrida = config["linha_secao_corrida"]
    num_max_capitulos = config["num_max_capitulos"]

    # índices das linhas de "conteúdo real" (não vazias, e que não sejam o
    # cabeçalho CNV nem o número de página solto) — só a primeira e a última
    # dessas linhas podem ser cabeçalho/rodapé corrido de seção.
    linhas_brutas = texto.split("\n")
    indices_conteudo = [
        i
        for i, l in enumerate(linhas_brutas)
        if l.strip()
        and not cabecalho_cnv.match(l.strip())
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

        if cabecalho_cnv.match(linha_strip):
            continue

        if LINHA_SO_NUMERO.match(linha_strip):
            continue

        if linha_secao_corrida is not None:
            m_corrido = linha_secao_corrida.match(linha_strip)
            if m_corrido:
                num = int(m_corrido.group(1))
                eh_borda = i == primeira_idx or i == ultima_idx
                parece_referencia = PISTAS_REFERENCIA.search(m_corrido.group(2))
                if eh_borda and num <= num_max_capitulos and not parece_referencia:
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


def numero_pagina_real(indice_linha, numero_jsonl, config):
    """Páginas 1-14 do vol. I não têm numeração impressa: usamos a posição no
    JSONL. Demais volumes usam o número de página declarado no JSONL."""
    if config["paginacao_inicial_por_linha"] and numero_jsonl <= 14:
        return indice_linha  # 1-indexado, igual ao número da linha
    return numero_jsonl


def main():
    parser = argparse.ArgumentParser(
        description="Chunking de um volume do Relatório Final da CNV."
    )
    parser.add_argument(
        "slug",
        choices=sorted(CONFIGS_VOLUME.keys()),
        help="Identificador do volume (ex.: cnv-vol1, cnv-vol2, cnv-vol3).",
    )
    args = parser.parse_args()
    slug = args.slug
    config = CONFIGS_VOLUME[slug]

    entrada = RAIZ / "dados" / "extraido" / f"{slug}.jsonl"
    saida = RAIZ / "dados" / "chunks" / f"{slug}.jsonl"

    tokenizer = AutoTokenizer.from_pretrained(MODELO_TOKENIZER)

    def contar_tokens(texto):
        # contagem "crua" do conteúdo, sem o prefixo "passage: " (adicionado no passo 04)
        return len(tokenizer.encode(texto, add_special_tokens=True))

    mapa_perfis = None
    if config["indice_perfis"]:
        mapa_perfis = build_mapa_perfis_vol3(entrada)

    paginas = []  # lista de (numero_pagina, texto_limpo, secao)
    secao_atual = None

    with open(entrada, encoding="utf-8") as f:
        for indice, linha in enumerate(f, start=1):
            registro = json.loads(linha)
            num_pagina = numero_pagina_real(indice, registro["pagina"], config)
            texto_limpo, secao_detectada, valida = limpar_pagina(
                registro["texto"], num_pagina, config
            )
            if mapa_perfis is not None:
                secao_atual = secao_por_pagina_vol3(mapa_perfis, num_pagina)
            elif secao_detectada:
                secao_atual = secao_detectada
            if not valida:
                continue
            paginas.append((num_pagina, texto_limpo, secao_atual))

    # --- Montagem dos chunks -------------------------------------------------
    saida.parent.mkdir(parents=True, exist_ok=True)

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
        # mudança de seção: fecha o chunk corrente (não cruza fronteira de seção)
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
