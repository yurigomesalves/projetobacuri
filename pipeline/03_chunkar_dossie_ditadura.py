r"""
Chunking do "Dossiê Ditadura: Mortos e Desaparecidos Políticos no Brasil
(1964-1985)" (edição 2009, Grupo Tortura Nunca Mais/RJ + Comissão de
Familiares/IEVE-SP; publicado como Tomo II do Relatório Final da CEV-SP
'Rubens Paiva').

Uso: python 03_chunkar_dossie_ditadura.py

Lê pipeline/dados/extraido/dossie-ditadura-cevsp.jsonl (uma linha JSON
por página, gerado pelo 02_extrair.py) e produz
pipeline/dados/chunks/dossie-ditadura-cevsp.jsonl, um chunk por linha,
no mesmo formato dos demais scripts de chunking do projeto.

=============================================================================
ESTRUTURA DO DOCUMENTO (762 páginas)
=============================================================================
- Páginas 1-12: capa, folha de rosto, ficha catalográfica, sumário.
  Descartadas — sem prosa indexável.
- Páginas 13-16: Prefácio à nova edição (Fábio Konder Comparato).
- Páginas 17-18: Prefácio à 1ª edição (D. Paulo Evaristo Arns).
- Páginas 19-20: Apresentação.
- Páginas 21-52: Introdução — histórico das lutas por verdade e memória.
- Páginas 53-724: Corpo principal — perfis cronológicos das vítimas,
  organizados por seções anuais (1962-1963, 1964, 1965 ... 1985) e
  seções temáticas intercaladas ("A Guerrilha do Araguaia",
  "O 'milagre econômico'", "A repressão política e a formação dos
  DOI-CODI", etc.).
- Páginas 725-756: Índice de nomes em ordem alfabética.
  Descartado — lista de referências sem prosa narrativa.
- Páginas 757-762: Anexos — lista cronológica de mortos/desaparecidos
  com datas e local de óbito (sem narrativa detalhada).
  Mantido como seção "Anexos" (informação factual útil).

=============================================================================
LIMPEZA
=============================================================================
1. Remover cabeçalho corrido principal:
   "DOSSIÊ DITADURA: MORTOS E DESAPARECIDOS POLÍTICOS NO BRASIL (1964-1985)"
2. Remover cabeçalhos secundários de seção corridos (alternados par/ímpar):
   "INTRODUÇÃO", "PREFÁCIO", "APRESENTAÇÃO", e títulos de seções cronológicas
   que se repetem como cabeçalho (ex.: "1 9 6 4", "1 9 7 0", etc.).
3. Remover marcadores InDesign: "Livro DH Final.indd N" (onde N é um número).
4. Remover timestamps: padrão "DD.MM.YY HH:MM:SS".
5. Remover números de página isolados (linhas com apenas dígitos).
6. Desfazer hifenização de quebra de linha: "agremia-\nção" → "agremiação".
7. Descartar páginas vazias e o sumário/índice (págs. 1-12 e 725-756).

=============================================================================
DETECÇÃO DE SEÇÃO
=============================================================================
- Seções iniciais: "Prefácio à nova edição", "Prefácio à 1ª edição",
  "Apresentação", "Introdução" — detectadas na primeira linha da página
  ou por número de página.
- Seções cronológicas: ano isolado na linha ("1962-1963", "1964" … "1985"),
  ou com espaçamento tipográfico ("1 9 6 4") — normalizados para "1964" etc.
- Seções temáticas intercaladas detectadas por regex no texto:
  "A Guerrilha do Araguaia", "O 'milagre econômico'",
  "A repressão política e a formação dos DOI-CODI",
  "O XXX Congresso da UNE em Ibiúna",
  "O Ato Institucional nº 5", etc.
- Seção "Anexos" (págs. 757-762): detectada por cabeçalho na página.
- Perfis individuais: linha isolada com nome próprio em Caso Título
  (primeira letra maiúscula, demais letras minúsculas normais),
  SEM pontuação de parágrafo, com comprimento entre 5 e 70 caracteres.
  DIFERENTE do CEMDP onde os nomes são ALL CAPS — aqui são em Caso
  Título (ex.: "João Pedro Teixeira", "Carlos Marighella").

=============================================================================
CHUNKING (idêntico aos demais scripts do projeto)
=============================================================================
- Alvo de ~395 tokens (tokenizer intfloat/multilingual-e5-small),
  sobreposição de ~80 tokens, limite de 512 tokens.
- Nunca cruza fronteira de seção: ao mudar de seção o chunk corrente
  é fechado mesmo que não tenha atingido o alvo de tokens.
- tipo_chunk é sempre "corpo".
- Cada chunk registra a faixa de páginas que cobre.
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

SLUG = "dossie-ditadura-cevsp"

# ---------------------------------------------------------------------------
# Páginas descartadas (numeração JSONL, começando em 1)
# ---------------------------------------------------------------------------
# Sumário/capa/folha: 1-12
# Índice de nomes em ordem alfabética: 725-756
PAGINAS_DESCARTADAS = set(range(1, 13)) | set(range(725, 757))

# Página onde começa a seção de Anexos (lista cronológica)
PAGINA_INICIO_ANEXOS = 757

# ---------------------------------------------------------------------------
# Padrões de limpeza
# ---------------------------------------------------------------------------

# Cabeçalho corrido principal (linha isolada, qualquer número de espaços)
HEADER_DOSSIE = re.compile(
    r"^DOSSIÊ DITADURA:?\s*MORTOS E DESAPARECIDOS POLÍTICOS NO BRASIL\s*\(1964[-–]1985\)\s*$",
    re.MULTILINE | re.IGNORECASE,
)

# Marcadores InDesign: "Livro DH Final.indd 123"
HEADER_INDESIGN = re.compile(r"^Livro DH Final\.indd\s*\d+\s*$", re.MULTILINE)

# Timestamps: "02.03.09 18:33:23"
TIMESTAMP = re.compile(r"^\d{2}\.\d{2}\.\d{2}\s+\d{2}:\d{2}:\d{2}\s*$", re.MULTILINE)

# Número de página isolado (linha com apenas dígitos, possivelmente espaços)
NUM_PAGINA = re.compile(r"^\s*\d{1,4}\s*$", re.MULTILINE)

# Ano com espaçamento tipográfico ("1 9 6 4") → detectar e normalizar
ANO_ESPACADO = re.compile(r"^(1\s9\s[6-8]\s\d)\s*$", re.MULTILINE)

# Cabeçalhos secundários corridos (seção repetida como cabeçalho de página)
# Inclui nomes de seções que aparecem no topo das páginas pares/ímpares
HEADERS_SECUNDARIOS = re.compile(
    r"^(INTRODUÇÃO|PREFÁCIO|APRESENTAÇÃO|"
    r"1\s*9\s*[6-8]\s*\d|"  # anos espacados como cabeçalho (ex: "1 9 6 4")
    r"Anexos)\s*$",
    re.MULTILINE,
)

# ---------------------------------------------------------------------------
# Padrões de detecção de seção
# ---------------------------------------------------------------------------

# Seções iniciais por título no início da página
ABERTURA_PREFACIO_NOVO = re.compile(r"^Prefácio à nova edição", re.MULTILINE)
ABERTURA_PREFACIO_1 = re.compile(r"^Prefácio à 1[ªa]\s*edição", re.MULTILINE)
ABERTURA_APRESENTACAO = re.compile(r"^Apresentação\s*$", re.MULTILINE)
ABERTURA_INTRODUCAO = re.compile(r"^Introdução\s*$", re.MULTILINE)

# Seção cronológica: ano isolado (com ou sem hífen/espaçamento)
# Ex.: "1964", "1962-1963", "1977-1979", "1980-1985"
SECAO_ANO = re.compile(
    r"^(196[2-9]|197[0-9]|198[0-5])(?:[-–](196[2-9]|197[0-9]|198[0-5]))?\s*$",
    re.MULTILINE,
)

# Seção cronológica com espaçamento tipográfico
SECAO_ANO_ESPACADO = re.compile(
    r"^(1\s9\s[6-8]\s\d)\s*$",
    re.MULTILINE,
)

# Seções temáticas intercaladas (texto que abre uma subseção narrativa)
SECOES_TEMATICAS = [
    (re.compile(r"^A Guerrilha do Araguaia\s*$", re.MULTILINE),
     "A Guerrilha do Araguaia"),
    (re.compile(r'^O "milagre econômico"', re.MULTILINE),
     'O "milagre econômico"'),
    (re.compile(r"^A Comissão Justiça e Paz\s*$", re.MULTILINE),
     "A Comissão Justiça e Paz"),
    (re.compile(r"^O XXX Congresso da UNE em Ibiúna\s*$", re.MULTILINE),
     "O XXX Congresso da UNE em Ibiúna"),
    (re.compile(r"^O Ato Institucional nº 5\s*$", re.MULTILINE),
     "O Ato Institucional nº 5"),
    (re.compile(r"^A repressão política e a formação\s*\ndos DOI-CODI", re.MULTILINE),
     "A repressão política e a formação dos DOI-CODI"),
    (re.compile(r"^Desaparecidos no DOI-CODI", re.MULTILINE),
     "Desaparecidos no DOI-CODI/RJ"),
    (re.compile(r"^As Caravanas à região da Guerrilha", re.MULTILINE),
     "As Caravanas à região da Guerrilha do Araguaia"),
    (re.compile(r"^Os desaparecidos da Guerrilha do Araguaia\s*$", re.MULTILINE),
     "Os desaparecidos da Guerrilha do Araguaia"),
]

# Perfil individual: linha isolada com nome próprio em Caso Título.
# Critérios:
# - Começa com letra maiúscula
# - Contém pelo menos um espaço (nome + sobrenome)
# - Entre 5 e 75 caracteres
# - Não termina com pontuação de parágrafo (. : ; ?)
# - Não é uma linha de cabeçalho de seção conhecida
# - Pode conter apelidos entre parênteses: "Carlos Marighella (Miguel)"
# - Pode ter preposições: "Antônio Henrique Pereira Neto (Padre)"
PERFIL_PESSOA = re.compile(
    r"^([A-ZÁÀÂÃÉÊÍÓÔÕÚÜÇÑ][a-záàâãéêíóôõúüçñA-ZÁÀÂÃÉÊÍÓÔÕÚÜÇÑ\s'\.\-]"
    r"{4,70}(?:\s+\([^)]{1,40}\))?)$",
    re.MULTILINE,
)

# Palavras que NÃO são nomes de perfil mesmo que casem com o regex acima
# (títulos de subseção, frases de texto corrido que ficam isoladas, etc.)
PALAVRAS_NAO_PERFIL = {
    "Documentos consultados",
    "Documentos consultados:",
    "Fontes consultadas",
    "Fontes consultadas:",
    "Introdução",
    "Apresentação",
    "Prefácio",
    "Anexos",
    "Sumário",
    "Referências",
    "Notas",
    "Nota",
    "Obs",
    "Ver também",
    "Veja também",
    "Nota dos autores",
    "Nota da edição",
}


def _normalizar_ano_espacado(m):
    """Converte "1 9 6 4" → "1964" para o texto de seção."""
    return m.group(1).replace(" ", "")


def limpar_pagina(texto, numero_pagina):
    """Limpa o texto de uma página e tenta extrair pista de seção.

    Retorna (texto_limpo, secao_detectada_ou_None, eh_pagina_valida).
    """
    if numero_pagina in PAGINAS_DESCARTADAS:
        return "", None, False

    if not texto.strip():
        return "", None, False

    secao_detectada = None

    # --- Detecção de seção ANTES da limpeza (cabeçalhos podem ser removidos) --

    # Seções iniciais
    if numero_pagina <= 52:
        if ABERTURA_PREFACIO_NOVO.search(texto):
            secao_detectada = "Prefácio à nova edição"
        elif ABERTURA_PREFACIO_1.search(texto):
            secao_detectada = "Prefácio à 1ª edição"
        elif ABERTURA_APRESENTACAO.search(texto):
            secao_detectada = "Apresentação"
        elif ABERTURA_INTRODUCAO.search(texto):
            secao_detectada = "Introdução"

    # Seção de Anexos
    if numero_pagina >= PAGINA_INICIO_ANEXOS:
        secao_detectada = "Anexos"

    # Seções cronológicas (ano isolado)
    if secao_detectada is None:
        for m in SECAO_ANO.finditer(texto):
            ano_str = m.group(0).strip()
            secao_detectada = f"Seção {ano_str}"
            break  # pega só o primeiro

    # Anos com espaçamento tipográfico
    if secao_detectada is None:
        for m in SECAO_ANO_ESPACADO.finditer(texto):
            ano_norm = m.group(1).replace(" ", "")
            secao_detectada = f"Seção {ano_norm}"
            break

    # Seções temáticas
    if secao_detectada is None:
        for padrao, nome_secao in SECOES_TEMATICAS:
            if padrao.search(texto):
                secao_detectada = nome_secao
                break

    # --- Limpeza do texto ---------------------------------------------------
    texto_limpo = HEADER_DOSSIE.sub("", texto)
    texto_limpo = HEADER_INDESIGN.sub("", texto_limpo)
    texto_limpo = TIMESTAMP.sub("", texto_limpo)
    texto_limpo = HEADERS_SECUNDARIOS.sub("", texto_limpo)
    texto_limpo = NUM_PAGINA.sub("", texto_limpo)

    # Normalizar anos espacados no texto corrido ("1 9 6 4" → "1964")
    # Faz isso DEPOIS de remover cabeçalhos para evitar remover conteúdo
    texto_limpo = ANO_ESPACADO.sub(lambda m: m.group(1).replace(" ", ""), texto_limpo)

    # Desfazer hifenização de quebra de linha
    texto_limpo = re.sub(r"(\w)-\n(\w)", r"\1\2", texto_limpo)

    # Normalizar múltiplas linhas em branco
    texto_limpo = re.sub(r"\n{3,}", "\n\n", texto_limpo)
    texto_limpo = texto_limpo.strip()

    if not texto_limpo:
        return "", secao_detectada, False

    return texto_limpo, secao_detectada, True


def _eh_nome_perfil(linha):
    """Decide se uma linha isolada é um cabeçalho de perfil individual.

    Regras heurísticas calibradas para este documento:
    - Casa com PERFIL_PESSOA
    - Não está na lista de não-perfis
    - Não é apenas uma palavra (exceto "Apresentação", já filtrada acima)
    - Não começa com artigo/preposição minúsculo
    - Não termina em pontuação de frase (descarta prosa)
    - TODO token é Capitalizado ou um conectivo de nome (de, da, do, e…)
      — isso é o que separa um cabeçalho ("Sebastião Tomé da Silva") de uma
      linha de prosa em Caso Título ("Tereza da Rocha. Era alfaiate.").
    """
    linha = linha.strip()
    if not linha:
        return False
    if linha in PALAVRAS_NAO_PERFIL:
        return False
    if not PERFIL_PESSOA.match(linha):
        return False
    # Deve ter ao menos uma letra minúscula após a primeira (Caso Título)
    # — isso exclui siglas e acrônimos soltos como "PCdoB"
    if linha.upper() == linha:
        return False
    # Deve ter ao menos um espaço (nome composto)
    if " " not in linha:
        return False
    # Não pode terminar em pontuação de frase (prosa, não cabeçalho)
    if linha[-1] in ".,:;!?":
        return False

    # Remove um apelido entre parênteses no fim ("Carlos Marighella (Miguel)")
    # antes de validar os tokens do nome propriamente dito.
    nome = re.sub(r"\s*\([^)]*\)\s*$", "", linha).strip()

    # Pontuação de frase no meio do nome indica referência/título, não cabeçalho
    # (ex.: "Sérgio Paranhos Fleury. São", "Exmo. Sr. Ministro Armando Falcão").
    if any(ch in ".,:;!?" for ch in nome):
        return False

    partes = nome.split()

    # Não pode começar com artigo ou preposição
    if partes[0].lower() in {"a", "o", "as", "os", "de", "da", "do",
                              "em", "na", "no", "para", "com", "por",
                              "e", "ou", "que", "se"}:
        return False

    # Quantidade plausível de palavras para um nome (evita linhas longas de prosa)
    if not (2 <= len(partes) <= 6):
        return False

    # Cada palavra precisa ser Capitalizada (começa maiúscula) ou um conectivo
    # minúsculo de nome. Uma única palavra fora desse padrão (um verbo, um
    # substantivo comum) já indica prosa, não cabeçalho.
    conectivos = {"de", "da", "do", "dos", "das", "e"}
    for palavra in partes:
        if palavra.lower() in conectivos:
            continue
        if not palavra[0].isupper():
            return False
    return True


def isolar_cabecalhos_de_perfil(texto):
    """Garante que todo cabeçalho de perfil fique numa linha isolada por linhas
    em branco.

    Motivo: a detecção de seção no main() olha só a primeira linha de cada
    parágrafo (bloco separado por linha em branco). No corpo do dossiê os perfis
    vêm em fluxo contínuo — o nome da vítima está numa linha própria, mas SEM
    linha em branco antes (ver pág. 54: "vado por unanimidade." seguido direto de
    "Sebastião Tomé da Silva"). Sem este isolamento, o cabeçalho fica embutido no
    meio do parágrafo e a seção da vítima anterior vaza para a seguinte.

    Espelha a função homônima de 03_chunkar_cemdp.py, mas usa o _eh_nome_perfil()
    já apertado (nomes em Caso Título colidem com prosa) e NÃO tenta remontar
    nomes quebrados em duas linhas físicas — lógica que no CEMDP dependia de
    caixa-alta e que aqui geraria junções erradas.
    """
    linhas = texto.split("\n")
    saida = []
    for linha in linhas:
        if not _eh_nome_perfil(linha.strip()):
            saida.append(linha)
            continue
        # isola o cabeçalho com linhas em branco antes e depois
        if saida and saida[-1].strip():
            saida.append("")
        saida.append(linha.strip())
        saida.append("")
    return "\n".join(saida)


def main():
    entrada = RAIZ / "dados" / "extraido" / f"{SLUG}.jsonl"
    saida = RAIZ / "dados" / "chunks" / f"{SLUG}.jsonl"

    if not entrada.exists():
        print(f"Arquivo não encontrado: {entrada}")
        print("Execute primeiro: python 02_extrair.py dossie-ditadura-cevsp")
        return

    tokenizer = AutoTokenizer.from_pretrained(MODELO_TOKENIZER)

    def contar_tokens(texto):
        return len(tokenizer.encode(texto, add_special_tokens=True))

    # --- Leitura e limpeza por página, etiquetando parágrafos com seção -----
    paginas_paragrafos = []
    secao_atual = None
    em_corpo_principal = False  # True a partir das seções de perfis (pág. 53+)

    with open(entrada, encoding="utf-8") as f:
        for numero_pagina, linha in enumerate(f, start=1):
            registro = json.loads(linha)
            texto_limpo, secao_detectada, valido = limpar_pagina(
                registro["texto"], numero_pagina
            )

            if secao_detectada:
                secao_atual = secao_detectada
                # Seção cronológica ou temática indica que estamos no corpo
                if secao_atual.startswith("Seção ") or secao_atual in {
                    s for _, s in SECOES_TEMATICAS
                }:
                    em_corpo_principal = True

            if not valido:
                continue

            # Isola cabeçalhos de perfil embutidos no meio dos parágrafos
            # (só no corpo de perfis), para que a detecção por-parágrafo abaixo
            # consiga enxergá-los e não deixe a seção da vítima anterior vazar.
            if em_corpo_principal:
                texto_limpo = isolar_cabecalhos_de_perfil(texto_limpo)

            # Divide a página em parágrafos
            paragrafos_brutos = [p.strip() for p in texto_limpo.split("\n\n") if p.strip()]

            paragrafos_com_secao = []
            for paragrafo in paragrafos_brutos:
                # Checa se a PRIMEIRA LINHA do parágrafo abre um novo perfil
                primeira_linha = paragrafo.split("\n", 1)[0].strip()

                if em_corpo_principal and _eh_nome_perfil(primeira_linha):
                    secao_atual = f"Perfil – {primeira_linha}"

                paragrafos_com_secao.append((paragrafo, secao_atual))

            paginas_paragrafos.append((numero_pagina, paragrafos_com_secao))

    # --- Montagem dos chunks ------------------------------------------------
    saida.parent.mkdir(parents=True, exist_ok=True)

    chunks = []
    ordem = 0
    buffer_unidades = []   # lista de (token_ids, texto, pagina)
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
            # Mudança de seção: fecha o chunk corrente (não cruza fronteira)
            if secao_buffer is not None and secao != secao_buffer and buffer_unidades:
                fechar_chunk()

            secao_buffer = secao

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
                    buffer_unidades.append((tokens_pedaco, pedaco, numero_pagina))
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

            buffer_unidades.append((tokens_par, paragrafo, numero_pagina))

    fechar_chunk()

    # --- Estatísticas e gravação --------------------------------------------
    tamanhos = []
    with open(saida, "w", encoding="utf-8") as f:
        for chunk in chunks:
            tam = contar_tokens(chunk["conteudo"])
            tamanhos.append(tam)
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
    com_secao = sum(1 for c in chunks if c["secao"])
    pct = 100 * com_secao / len(chunks) if chunks else 0
    print(f"Chunks com seção preenchida: {com_secao} ({pct:.1f}%)")
    print(f"Arquivo de saída: {saida}")


if __name__ == "__main__":
    main()
