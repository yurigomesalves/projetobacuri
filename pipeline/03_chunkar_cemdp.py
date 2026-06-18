r"""
Chunking do livro-relatório "Direito à Memória e à Verdade" (CEMDP, 2007).

Uso: python 03_chunkar_cemdp.py

Lê pipeline/dados/extraido/cemdp-direito-memoria-verdade.jsonl (uma linha
JSON por página, texto nativo do PDF, sem OCR) e produz
pipeline/dados/chunks/cemdp-direito-memoria-verdade.jsonl, um chunk por
linha, no MESMO formato usado para os volumes da CNV (ver 03_chunkar.py):
campos "ordem", "conteudo", "paginas", "secao", "tipo_chunk".

=============================================================================
ESTRUTURA DO DOCUMENTO (502 páginas no JSONL = páginas físicas do PDF)
=============================================================================
- Páginas 1-15: capa, ficha catalográfica, epígrafe, apresentação,
  composição da comissão e sumário. Maior parte vazia (páginas em branco
  entre seções no PDF original). Página 14 é o sumário (lista "N Capítulo
  X – título"), descartada (não tem conteúdo de prosa para indexar).
- Páginas 16-46: Capítulos 1-3 (ensaio: "Direito à memória e à verdade",
  "Contexto histórico", "A história da Comissão Especial").
- Páginas 47-460: Capítulo 4 "Casos da Comissão" — centenas de perfis
  individuais de vítimas, cada um abrindo com uma linha no padrão
  "NOME EM MAIÚSCULAS (ano-ano)" seguida de campos estruturados (Número do
  processo, Filiação, Data e local de nascimento etc.) e texto narrativo.
  Dentro do capítulo há subtítulos cronológicos/temáticos (ex.: "Casos
  anteriores a abril de 1964", "1969", "Guerrilha do Araguaia", "Argentinos
  desaparecidos no Brasil", "Casos enviados para a Comissão de Anistia")
  que NÃO são tratados como seção própria — cada perfil já é uma seção
  suficientemente específica para citação.
- Páginas 462-486: "As Organizações de Esquerda" (verbetes de organizações,
  mesmo padrão "SIGLA - Nome completo" no início da linha) e Glossário de
  siglas (lista curta, mantida dentro da seção "Glossário").
- Páginas 487-494: Índice remissivo (nome da pessoa + lista de números de
  página). Descartado: é só uma lista de referências cruzadas, sem prosa,
  sem valor para busca semântica e potencialmente ruidoso (centenas de
  nomes próprios sem contexto).
- Páginas 495-499: Anexos (Lei da Anistia, Lei 9.140/95, listas de nomes
  com tabela de indenização).
- Páginas 500-502: vazias / lixo de OCR de contracapa (página 501 tem
  caracteres ilegíveis — fonte decorativa não extraível; descartada).

=============================================================================
LIMPEZA
=============================================================================
1. Remover as duas variantes de cabeçalho corrido (alternam por página
   par/ímpar no PDF original):
   - "DIREITO À MEMÓRIA E À VERDADE" (maiúsculas, linha isolada)
   - "COMISSÃO ESPECIAL SOBRE MORTOS E DESAPARECIDOS POLÍTICOS" (idem)
2. Remover marcadores de número de página no formato "| N |" (a numeração
   impressa no PDF é a página do JSONL + 1, já que a capa não é numerada).
3. Desfazer hifenização de quebra de linha: "agremia-\nção" -> "agremiação".
4. Descartar páginas vazias, o sumário (pág. 14), o índice remissivo
   (págs. 487-494) e a página 501 (lixo de fonte decorativa).

=============================================================================
DETECÇÃO DE SEÇÃO
=============================================================================
- Capítulos 1-3: padrão "Capítulo N\n<título>" no início da página define a
  seção "Capítulo N – título", mantida até a próxima mudança (mesma regra
  "não inventamos" da CNV: se nada for detectado ainda, secao = None).
- Capítulo 4 e "As Organizações de Esquerda": cada linha que casa com
  PERFIL_PESSOA ("NOME EM MAIÚSCULAS (ano?-ano?)") ou PERFIL_ORGANIZACAO
  ("SIGLA - Nome da organização", maiúsculas + hífen) abre uma nova seção
  "Perfil – <nome>". A seção permanece até o próximo perfil.
- "Glossário" (pág. 485-486): seção fixa "Glossário".
- "Anexos" (pág. 495-499): seção fixa "Anexos".
- Transição de capítulo 3 (ensaio) para capítulo 4 (perfis): a página 47
  abre com "Em 11 anos de trabalho..." (texto corrido do capítulo 4, sem
  título próprio de perfil) — recebe secao = "Capítulo 4 – Casos da
  Comissão" via CABECALHO_CAP4, fixado manualmente porque o sumário lista
  "48 Capítulo 4 – Casos da Comissão" mas o texto do capítulo já começa na
  página 47 (a numeração do sumário aponta para a primeira página com
  numeração impressa visível, a 48; o parágrafo de abertura começa um
  pouco antes).

=============================================================================
CHUNKING (idêntico ao 03_chunkar.py)
=============================================================================
- Alvo de ~395 tokens (tokenizer do intfloat/multilingual-e5-small),
  sobreposição de ~80 tokens, limite de 512 tokens.
- Nunca cruza fronteira de seção: ao mudar de seção, o chunk corrente é
  fechado mesmo que não tenha atingido o alvo de tokens.
- tipo_chunk é sempre "corpo" — este documento não tem um bloco de notas de
  rodapé numeradas como a CNV.
- Cada chunk registra a faixa de páginas que cobre ("N" ou "N-M"), usando o
  número de página do JSONL (= número de página impresso - 1).
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

SLUG = "cemdp-direito-memoria-verdade"

# --- Padrões de limpeza -------------------------------------------------------

HEADER_DIREITO = re.compile(r"^DIREITO À MEMÓRIA E À VERDADE\s*$", re.MULTILINE)
HEADER_COMISSAO = re.compile(
    r"^COMISSÃO ESPECIAL SOBRE MORTOS E DESAPARECIDOS POLÍTICOS\s*$", re.MULTILINE
)
NUM_PAGINA_IMPRESSA = re.compile(r"^\s*\|\s*\d{1,4}\s*\|\s*$", re.MULTILINE)

# Páginas descartadas integralmente (1-indexado, número do JSONL)
PAGINAS_DESCARTADAS = set(range(487, 495)) | {14, 501}

# Capítulos 1-3 (ensaio)
ABERTURA_CAPITULO = re.compile(r"^Capítulo (\d)\n(.+)$", re.MULTILINE)

# Perfil de vítima: linha em maiúsculas terminando com "(ano?-ano?)" ou "(ano?–ano?)"
# Ex.: "GERALDO DA ROCHA GUALBERTO (1935-1963)", "OTÁVIO SOARES FERREIRA DA CUNHA (1898 - 1964)"
PERFIL_PESSOA = re.compile(
    r"^([A-ZÀ-Ý][A-ZÀ-Ý0-9 \.\-'çÇ]{2,80})\s*\(\??\d{0,4}\s*[-–]\s*\??\d{0,4}\)\s*$",
    re.MULTILINE,
)

# Perfil de organização (capítulo "As Organizações de Esquerda"):
# "SIGLA - Nome completo da organização" no início da linha.
PERFIL_ORGANIZACAO = re.compile(
    r"^([A-ZÀ-Ý][A-ZÀ-Ý0-9/\-]{1,15}\s*-\s*[A-ZÀ-Üa-zà-ü].{3,90})$", re.MULTILINE
)

# Linha que é apenas a continuação de um nome quebrado em duas linhas físicas
# (só maiúsculas e pontuação de nome, sem dígitos, sem dois-pontos): nas páginas
# do CEMDP, nomes longos às vezes ocupam duas linhas e a primeira fica sozinha
# antes do cabeçalho com os anos. Ex.: "ANTÔNIO EXPEDITO CARVALHO" + "PERERA (1931 – 1971)".
CONTINUACAO_NOME = re.compile(r"^[A-ZÀ-Ý][A-ZÀ-Ý \.\-'çÇ]{1,60}$")

# Subtítulos do Capítulo 4 que aparecem em caixa-alta e poderiam ser confundidos
# com um fragmento de nome quando precedem o cabeçalho de uma vítima (ex.: o
# subtítulo "ARGENTINOS DESAPARECIDOS NO BRASIL" vem logo antes de NORBERTO
# ARMANDO HABEGGER). Não devem ser anexados ao nome da vítima.
SUBTITULOS_CAP4 = {"ARGENTINOS DESAPARECIDOS NO BRASIL"}

ABERTURA_ORGANIZACOES = re.compile(r"^As Organizações de Esquerda\s*$", re.MULTILINE)
ABERTURA_GLOSSARIO_PAGINA = 485  # JSONL: glossário começa na página 485
ABERTURA_ANEXOS = re.compile(r"^ANEXOS\s*$", re.MULTILINE)

# Capítulo 4 abre sem título de perfil próprio na página 47 (ver docstring)
PAGINA_ABERTURA_CAP4 = 47
SECAO_CAP4 = "Capítulo 4 – Casos da Comissão"


def limpar_pagina(texto, numero_pagina):
    """Limpa o texto de uma página e tenta extrair pista de seção.

    Retorna (texto_limpo, secao_detectada_ou_None, eh_pagina_valida).
    """
    if numero_pagina in PAGINAS_DESCARTADAS:
        return "", None, False

    if not texto.strip():
        return "", None, False

    secao_detectada = None

    # Capítulos 1-3: abertura "Capítulo N\n<título>"
    m_cap = ABERTURA_CAPITULO.match(texto.strip())
    if m_cap:
        titulo = m_cap.group(2).strip()
        secao_detectada = f"Capítulo {m_cap.group(1)} – {titulo}"

    if numero_pagina == PAGINA_ABERTURA_CAP4:
        secao_detectada = SECAO_CAP4

    if ABERTURA_ORGANIZACOES.search(texto):
        secao_detectada = "As Organizações de Esquerda"

    if numero_pagina == ABERTURA_GLOSSARIO_PAGINA:
        secao_detectada = "Glossário"

    if ABERTURA_ANEXOS.search(texto):
        secao_detectada = "Anexos"

    # Remover cabeçalhos corridos e numeração de página
    texto_limpo = HEADER_DIREITO.sub("", texto)
    texto_limpo = HEADER_COMISSAO.sub("", texto_limpo)
    texto_limpo = NUM_PAGINA_IMPRESSA.sub("", texto_limpo)

    # Desfazer hifenização de quebra de linha
    texto_limpo = re.sub(r"(\w)-\n(\w)", r"\1\2", texto_limpo)

    # Normalizar múltiplas linhas em branco
    texto_limpo = re.sub(r"\n{3,}", "\n\n", texto_limpo)
    texto_limpo = texto_limpo.strip()

    if not texto_limpo:
        return "", secao_detectada, False

    return texto_limpo, secao_detectada, True


def isolar_cabecalhos_de_perfil(texto, organizacoes):
    """Garante que todo cabeçalho de perfil (pessoa/organização) fique numa
    linha isolada por linhas em branco.

    Motivo: a detecção de seção olha só a primeira linha de cada parágrafo
    (bloco separado por linha em branco). Muitas páginas do CEMDP usam quebra
    de linha simples e não deixam linha em branco antes do cabeçalho do próximo
    perfil; sem este isolamento, o cabeçalho fica embutido no meio do parágrafo
    e a seção do perfil anterior vaza para a vítima seguinte.

    Também junta o fragmento anterior quando um nome longo foi quebrado em duas
    linhas físicas (a primeira só com maiúsculas, a segunda com os anos)."""
    linhas = texto.split("\n")
    saida = []
    for linha in linhas:
        s = linha.strip()
        eh_perfil = PERFIL_PESSOA.match(s) or (
            organizacoes and PERFIL_ORGANIZACAO.match(s)
        )
        if not eh_perfil:
            saida.append(linha)
            continue

        # nome quebrado em duas linhas: anexa o fragmento em maiúsculas anterior
        j = len(saida) - 1
        while j >= 0 and not saida[j].strip():
            j -= 1
        if (
            j >= 0
            and CONTINUACAO_NOME.match(saida[j].strip())
            and saida[j].strip() not in SUBTITULOS_CAP4
        ):
            fragmento = saida[j].strip()
            del saida[j:]
            s = f"{fragmento} {s}"

        # isola o cabeçalho com linhas em branco antes e depois
        if saida and saida[-1].strip():
            saida.append("")
        saida.append(s)
        saida.append("")
    return "\n".join(saida)


def detectar_perfis_na_pagina(texto_limpo, em_capitulo4_ou_organizacoes):
    """Devolve lista de (offset_no_texto, "Perfil – Nome") para cada cabeçalho
    de perfil (pessoa ou organização) encontrado na página, na ordem em que
    aparecem. Só procura se a página estiver dentro do capítulo 4 ou do
    capítulo "As Organizações de Esquerda" (heurística: evita falsos positivos
    em outras seções, ex. siglas isoladas em listas)."""
    if not em_capitulo4_ou_organizacoes:
        return []
    achados = []
    for m in PERFIL_PESSOA.finditer(texto_limpo):
        achados.append((m.start(), f"Perfil – {m.group(1).strip()}"))
    for m in PERFIL_ORGANIZACAO.finditer(texto_limpo):
        # evita duplicar se a mesma linha já casou com PERFIL_PESSOA (não
        # deveria, padrões são mutuamente exclusivos, mas por segurança)
        if not any(abs(m.start() - a[0]) < 3 for a in achados):
            achados.append((m.start(), f"Perfil – {m.group(1).strip()}"))
    achados.sort(key=lambda x: x[0])
    return achados


def main():
    entrada = RAIZ / "dados" / "extraido" / f"{SLUG}.jsonl"
    saida = RAIZ / "dados" / "chunks" / f"{SLUG}.jsonl"

    tokenizer = AutoTokenizer.from_pretrained(MODELO_TOKENIZER)

    def contar_tokens(texto):
        return len(tokenizer.encode(texto, add_special_tokens=True))

    # --- Leitura e limpeza por página, com parágrafos já etiquetados de seção --
    # Cada item: (numero_pagina, [(paragrafo_texto, secao), ...])
    paginas_paragrafos = []
    secao_atual = None
    capitulo4_iniciado = False
    organizacoes_iniciado = False

    with open(entrada, encoding="utf-8") as f:
        for numero_pagina, linha in enumerate(f, start=1):
            registro = json.loads(linha)
            texto_limpo, secao_detectada, valido = limpar_pagina(
                registro["texto"], numero_pagina
            )

            if secao_detectada:
                secao_atual = secao_detectada
                if secao_detectada == SECAO_CAP4:
                    capitulo4_iniciado = True
                if secao_detectada == "As Organizações de Esquerda":
                    organizacoes_iniciado = True
                if secao_detectada in ("Glossário", "Anexos"):
                    # saímos do regime de detecção de perfis
                    capitulo4_iniciado = False
                    organizacoes_iniciado = False

            if not valido:
                continue

            em_perfis = capitulo4_iniciado or organizacoes_iniciado

            # isola cabeçalhos de perfil embutidos no meio de parágrafos
            if em_perfis:
                texto_limpo = isolar_cabecalhos_de_perfil(
                    texto_limpo, organizacoes_iniciado
                )

            # divide a página em parágrafos
            paragrafos_brutos = [p.strip() for p in texto_limpo.split("\n\n") if p.strip()]

            paragrafos_com_secao = []
            for paragrafo in paragrafos_brutos:
                # checa se este parágrafo abre um novo perfil (pessoa/org).
                # Como cada parágrafo já é uma unidade separada por linha em
                # branco no PDF, basta checar a primeira linha do parágrafo.
                primeira_linha = paragrafo.split("\n", 1)[0].strip()
                if em_perfis:
                    if PERFIL_PESSOA.match(primeira_linha):
                        secao_atual = f"Perfil – {PERFIL_PESSOA.match(primeira_linha).group(1).strip()}"
                    elif organizacoes_iniciado and PERFIL_ORGANIZACAO.match(primeira_linha):
                        secao_atual = f"Perfil – {PERFIL_ORGANIZACAO.match(primeira_linha).group(1).strip()}"

                paragrafos_com_secao.append((paragrafo, secao_atual))

            paginas_paragrafos.append((numero_pagina, paragrafos_com_secao))

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

    for numero_pagina, paragrafos_com_secao in paginas_paragrafos:
        for paragrafo, secao in paragrafos_com_secao:
            # mudança de seção: fecha o chunk corrente (não cruza fronteira)
            if secao_buffer is not None and secao != secao_buffer and buffer_unidades:
                fechar_chunk()

            secao_buffer = secao

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
                    buffer_unidades.append((tokens_pedaco, pedaco, numero_pagina))
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

            buffer_unidades.append((tokens_par, paragrafo, numero_pagina))

    fechar_chunk()

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
