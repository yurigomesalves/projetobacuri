"""
Gera fichas JSON para os perpetradores da Seção C do Cap. 16 da CNV (itens 175–377)
que ainda não têm arquivo em pipeline/dados/curadoria/biografias/.

Uso:
    python3 pipeline/11_gerar_fichas_cap16_secaoC.py [--dry-run] [--inicio N] [--fim N]

Flags:
    --dry-run     Imprime o primeiro item extraído sem gravar nada.
    --inicio N    Primeiro item a processar (padrão: 175).
    --fim N       Último item a processar (padrão: 377).
"""

import json
import os
import re
import sys
import unicodedata
from pathlib import Path

# ---------------------------------------------------------------------------
# Configuração
# ---------------------------------------------------------------------------
CHUNKS_FILE = Path(__file__).parent / "dados/chunks/cnv-vol1.jsonl"
BIO_DIR = Path(__file__).parent / "dados/curadoria/biografias"
FONTE_ID = "cc230d2d-c6b6-42bf-8c94-ef2d92194990"

TRECHO_24 = (
    "Atribui-se aos agentes públicos indicados na sequência, em ordem alfabética, "
    "a autoria direta de condutas ocasionadoras de graves violações de direitos "
    "humanos. Assim como nas seções anteriores, encontram-se descritos, para cada "
    "autor, os elementos considerados para inclusão na relação. Tratando-se de "
    "militar ou policial, a posição na carreira identificada tende a corresponder "
    "à da época dos fatos que ensejaram a indicação de autoria. Cabe mencionar, "
    "também, referência feita ao recebimento, pelos indicados nesta seção, da "
    "Medalha do Pacificador, condecoração que, no regime militar, foi conferida "
    "com frequência àqueles que atuaram em atividades de repressão política, sendo "
    "a Medalha do Pacificador com Palma reservada aos que o fizeram com maior "
    "destaque. Por fim, sendo esta seção dedicada à identificação da autoria direta "
    "de graves violações, houve a preocupação em indicar, em cada caso, mesmo que "
    "de modo não exaustivo, os nomes de vítimas que foram atingidas, com base em "
    "comprovação fáctica que se encontra registrada nos três volumes deste Relatório."
)

PARAGRAFO_IMPUNIDADE = (
    "Nenhum responsável por graves violações de direitos humanos durante a ditadura "
    "militar-empresarial foi até hoje julgado criminalmente no Brasil, em razão da "
    "interpretação da Lei de Anistia (Lei nº 6.683/1979) consolidada pelo Supremo "
    "Tribunal Federal no julgamento da ADPF 153 (2010). Essa interpretação foi "
    "considerada incompatível com o direito internacional pela Corte Interamericana "
    "de Direitos Humanos no caso Gomes Lund e outros vs. Brasil (2010)."
)

# ---------------------------------------------------------------------------
# Mapeamento órgão → (municipio, uf)
# Ordem: regras mais específicas primeiro.
# ---------------------------------------------------------------------------
ORGAO_LUGAR = [
    # IML / DOPS estaduais
    (r"IML/SP|IML do estado de S[ão]+ Paulo", "São Paulo", "SP"),
    (r"DOPS/SP|DOPS de S[ão]+ Paulo|DOI-CODI do II Ex[eé]r", "São Paulo", "SP"),
    (r"DOPS/PE|DOPS de Pernambuco|IV Ex[eé]r", "Recife", "PE"),
    (r"DOPS/GB|DOPS da Guanabara|DOPS do Rio|DOI-CODI do I Ex[eé]r|I Ex[eé]r", "Rio de Janeiro", "RJ"),
    (r"DOPS/MG|DOPS de Minas|II Setor|COVEMG", "Belo Horizonte", "MG"),
    (r"DOI-CODI do III Ex[eé]r|III Ex[eé]r|Brigada Militar", "Porto Alegre", "RS"),
    # Unidades específicas RJ
    (r"Ilha das Flores|Marinha.*Rio|CISA|Cenimar|Vila Militar.*Rio", "Rio de Janeiro", "RJ"),
    (r"Casa da Morte|Petr[oó]polis", "Petrópolis", "RJ"),
    # Araguaia
    (r"Araguaia|Guerrilha.*Par[aá]|Par[aá].*Guerrilha", "Marabá", "PA"),
    # Federal / sem estado claro
    (r"CIE|SNI|ESG|EMFA|Estado-Maior|Presidência|Pol[íi]cia Federal", "Brasília", "DF"),
    # Fallback SP (DOI-CODI sem exército identificado)
    (r"DOI-CODI", "São Paulo", "SP"),
]


def inferir_lugar(texto: str):
    for padrao, mun, uf in ORGAO_LUGAR:
        if re.search(padrao, texto, re.IGNORECASE):
            return mun, uf
    return "Brasília", "DF"


# ---------------------------------------------------------------------------
# Slugify
# ---------------------------------------------------------------------------
def slugify(nome: str) -> str:
    nome = unicodedata.normalize("NFD", nome)
    nome = "".join(c for c in nome if unicodedata.category(c) != "Mn")
    nome = nome.lower()
    nome = re.sub(r"[^a-z0-9]+", "-", nome)
    return nome.strip("-")


# ---------------------------------------------------------------------------
# Carrega e concatena os chunks do Cap. 16
# ---------------------------------------------------------------------------
def carregar_chunks_cap16():
    with open(CHUNKS_FILE) as f:
        chunks = [json.loads(l) for l in f if l.strip()]

    cap16 = [
        c for c in chunks
        if "16" in str(c.get("secao", "")) or "autoria" in str(c.get("secao", "")).lower()
    ]

    def pag_min(c):
        nums = re.findall(r"\d+", str(c.get("paginas", "")))
        return int(nums[0]) if nums else 9999

    cap16.sort(key=lambda c: (pag_min(c), c.get("ordem", 0)))
    return cap16


# ---------------------------------------------------------------------------
# Extrai o texto de cada item numerado
# ---------------------------------------------------------------------------
def extrair_itens(chunks):
    """Retorna dict {numero_int: (nome, texto_bruto, pagina_str)}."""
    # Concatena tudo mantendo rastreamento de página por offset
    partes = []
    pag_por_offset = []  # lista de (offset_inicio, pagina_str)

    pos = 0
    for c in chunks:
        pg = str(c.get("paginas", ""))
        pag_por_offset.append((pos, pg))
        bloco = "\n" + c.get("conteudo", "") + "\n"
        partes.append(bloco)
        pos += len(bloco)

    full_text = "".join(partes)

    # Marcadores primários: itens com 3 dígitos (ex: "175) Carlos de Brito")
    marcadores = list(re.finditer(r"\n\s*(\d{3})\)\s+([^\n]+)", full_text))

    # Marcadores secundários: cross-references com ≤3 dígitos entre parênteses
    # ex: "(74) Carlos Sergio Torres (indicado também na Seção B)"
    # Esses delimitam o fim do item anterior mas não são itens próprios a extrair.
    cross_refs = list(re.finditer(r"\n\s*\((\d{1,3})\)\s+[A-ZÁÉÍÓÚÀÂÊÔÃÕÜÇ]", full_text))
    # Conjunto de offsets de separadores (primários + cross-refs)
    separadores = sorted(
        [(m.start(), "item", int(m.group(1))) for m in marcadores]
        + [(m.start(), "cross", int(m.group(1))) for m in cross_refs],
        key=lambda x: x[0],
    )

    def pag_em(offset):
        """Retorna a string de página mais próxima ao offset dado."""
        pag = ""
        for off, pg in pag_por_offset:
            if off <= offset:
                pag = pg
            else:
                break
        return pag

    itens = {}
    # Só os marcadores de item primário importam como chave
    item_offsets = [(m.start(), int(m.group(1)), m.group(2).strip()) for m in marcadores]

    for i, (off_ini, num, nome_linha) in enumerate(item_offsets):
        # Fim = próximo separador (item OU cross-ref), qualquer que venha primeiro
        offs_frente = [s[0] for s in separadores if s[0] > off_ini]
        fim = offs_frente[0] if offs_frente else len(full_text)
        bloco = full_text[off_ini:fim].strip()
        pagina = pag_em(off_ini)
        itens[num] = (nome_linha, bloco, pagina)

    return itens


# ---------------------------------------------------------------------------
# Extrai anos de vítimas do texto
# ---------------------------------------------------------------------------
def extrair_anos(texto: str):
    """Retorna (ano_min, ano_max) dos anos de vítimas mencionados."""
    # Padrão: (1969) ou (1969 e 1970) ou (1969-1970) no contexto de vítimas
    anos = [int(a) for a in re.findall(r"\b(196\d|197\d|198[0-5])\b", texto)]
    if not anos:
        return None, None
    return min(anos), max(anos)


# ---------------------------------------------------------------------------
# Infere página do item a partir da string de página do chunk
# ---------------------------------------------------------------------------
def pagina_item(pagina_str: str) -> str:
    """Retorna a primeira página do intervalo."""
    nums = re.findall(r"\d+", pagina_str)
    return nums[0] if nums else pagina_str


# ---------------------------------------------------------------------------
# Gera texto_md a partir do bloco bruto do CNV
# ---------------------------------------------------------------------------
def _juntar_linhas_quebradas(bloco: str) -> str:
    """Une linhas quebradas pelo OCR/PDF: linha sem ponto final + próxima não-vazia."""
    linhas = bloco.split("\n")
    resultado = []
    buf = ""
    for linha in linhas:
        linha_strip = linha.strip()
        if not linha_strip:
            if buf:
                resultado.append(buf)
                buf = ""
            resultado.append("")
            continue
        if buf:
            # Continua o buffer se a linha anterior não termina com pontuação
            buf_strip = buf.rstrip()
            if buf_strip and buf_strip[-1] not in ".!?:":
                buf = buf_strip + " " + linha_strip
            else:
                resultado.append(buf)
                buf = linha_strip
        else:
            buf = linha_strip
    if buf:
        resultado.append(buf)
    # Remove múltiplas linhas vazias
    saida = re.sub(r"\n{3,}", "\n\n", "\n".join(resultado))
    return saida.strip()


def gerar_texto_md(nome: str, bloco_cnv: str, pagina: str) -> str:
    # Remove o marcador inicial (ex: "175) Carlos de Brito\n")
    texto_bruto = re.sub(r"^\d{3}\)\s+[^\n]+\n?", "", bloco_cnv).strip()
    # Junta linhas quebradas para poder extrair frases completas
    texto = _juntar_linhas_quebradas(texto_bruto)

    pg = pagina_item(pagina)
    ref = f"(CNV, vol. I, p. {pg})"

    # Paragráfos separados por linha vazia
    paragrafos = [p.strip() for p in texto.split("\n\n") if p.strip()]
    primeiro_par = paragrafos[0] if paragrafos else ""

    # Tenta extrair ano de nascimento e cargo do primeiro parágrafo
    # Padrão A: "(1940-) Delegado de polícia no estado X."
    # Padrão B: "Delegado da Polícia."  (sem ano de nascimento)
    m_com_ano = re.match(r"^\(([^)]+)\)\s*(.+)", primeiro_par, re.DOTALL)

    if m_com_ano:
        anos_bio = m_com_ano.group(1)
        cargo_frase = m_com_ano.group(2).strip().rstrip(".")
        if not cargo_frase and len(paragrafos) > 1:
            # Formato anômalo: "(1911-1976)." sem cargo na mesma linha
            cargo_frase = paragrafos[1].rstrip(".")
            intro = f"{nome} ({anos_bio}) foi {cargo_frase[0].lower()}{cargo_frase[1:]}."
            corpo_pars = paragrafos[2:]
        else:
            intro = f"{nome} ({anos_bio}) foi {cargo_frase[0].lower()}{cargo_frase[1:]}."
            corpo_pars = paragrafos[1:]
    else:
        # Sem ano: primeiro parágrafo é o cargo
        cargo_frase = primeiro_par.rstrip(".")
        if re.match(r"^[A-ZÁÉÍÓÚ]", cargo_frase):
            intro = f"{nome} foi {cargo_frase[0].lower()}{cargo_frase[1:]}."
            corpo_pars = paragrafos[1:]
        else:
            intro = f"{nome} foi identificado pela Comissão Nacional da Verdade como autor direto de graves violações de direitos humanos."
            corpo_pars = paragrafos

    # Referência à CNV e Seção C
    ref_cnv = (
        " A Comissão Nacional da Verdade o relaciona na Seção C do Capítulo 16 de "
        "seu relatório — dedicada à responsabilidade pela autoria direta de condutas "
        "que ocasionaram graves violações de direitos humanos "
        f"— {ref}."
    )

    partes = [intro + ref_cnv]
    partes.extend(corpo_pars)
    partes.append(PARAGRAFO_IMPUNIDADE)

    return "\n\n".join(partes)


# ---------------------------------------------------------------------------
# Monta o JSON completo de uma ficha
# ---------------------------------------------------------------------------
def montar_ficha(num: int, nome: str, bloco_cnv: str, pagina: str) -> dict:
    slug = slugify(nome)
    municipio, uf = inferir_lugar(bloco_cnv)
    ano_ini, ano_fim = extrair_anos(bloco_cnv)

    data_inicio = f"{ano_ini}-01-01" if ano_ini else None
    data_fim = f"{ano_fim}-12-31" if ano_fim else None

    pg = pagina_item(pagina)

    # Resumo de 1 linha: extrai cargo usando a mesma lógica do texto_md
    bloco_sem_marcador = re.sub(r"^\d{3}\)\s+[^\n]+\n?", "", bloco_cnv).strip()
    texto_norm = _juntar_linhas_quebradas(bloco_sem_marcador)
    primeiro_par = [p.strip() for p in texto_norm.split("\n\n") if p.strip()]
    primeiro_par = primeiro_par[0] if primeiro_par else ""
    pars_norm = [p.strip() for p in texto_norm.split("\n\n") if p.strip()]
    m_com_ano = re.match(r"^\(([^)]+)\)\s*(.+)", primeiro_par, re.DOTALL)
    if m_com_ano:
        cargo_resumo = m_com_ano.group(2).strip().rstrip(".")
        if not cargo_resumo and len(pars_norm) > 1:
            cargo_resumo = pars_norm[1].rstrip(".")
        # Pega só a primeira sentença
        m_sent = re.match(r"^([^\.]+\.)", cargo_resumo)
        if m_sent:
            cargo_resumo = m_sent.group(1).rstrip(".")
    elif re.match(r"^[A-ZÁÉÍÓÚ]", primeiro_par):
        cargo_resumo = primeiro_par.rstrip(".")
    else:
        cargo_resumo = "Agente do Estado"
    resumo = (
        f"{nome} — {cargo_resumo[0].lower()}{cargo_resumo[1:]} — "
        f"indicado pela CNV como autor direto de graves violações de direitos humanos "
        f"(Seção C, Cap. 16, item {num}, p. {pg})."
    )

    # Trecho literal do item no CNV (primeiros 800 chars do bloco)
    trecho_item = bloco_cnv[:800].strip()

    texto_md = gerar_texto_md(nome, bloco_cnv, pagina)

    return {
        "slug": slug,
        "nome": nome,
        "tipo": "perpetrador",
        "resumo_1_linha": resumo,
        "municipio": municipio,
        "uf": uf,
        "data_inicio": data_inicio,
        "data_fim": data_fim,
        "status_curadoria": "publicada",
        "texto_md": texto_md,
        "fontes": [
            {
                "fonte_id": FONTE_ID,
                "paginas": "873-874",
                "trecho": TRECHO_24,
                "secao": "Capítulo 16, Seção C — Responsabilidade pela autoria direta (§24)",
            },
            {
                "fonte_id": FONTE_ID,
                "paginas": pagina,
                "trecho": trecho_item,
                "secao": f"Capítulo 16, Seção C — Responsabilidade pela autoria direta (item {num})",
            },
        ],
        "marcadores": [],
    }


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    dry_run = "--dry-run" in sys.argv
    inicio = 175
    fim = 377

    for i, arg in enumerate(sys.argv):
        if arg == "--inicio" and i + 1 < len(sys.argv):
            inicio = int(sys.argv[i + 1])
        if arg == "--fim" and i + 1 < len(sys.argv):
            fim = int(sys.argv[i + 1])

    print(f"Carregando chunks do Cap. 16…")
    chunks = carregar_chunks_cap16()
    print(f"  {len(chunks)} chunks carregados.")

    print("Extraindo itens…")
    itens = extrair_itens(chunks)
    print(f"  {len(itens)} itens encontrados (range: {min(itens)}–{max(itens)}).")

    alvo = {n: v for n, v in itens.items() if inicio <= n <= fim}
    print(f"  Alvo: {len(alvo)} itens ({inicio}–{fim}).")

    criados = 0
    pulados = 0
    erros = []

    for num in sorted(alvo.keys()):
        nome, bloco, pagina = alvo[num]
        slug = slugify(nome)
        destino = BIO_DIR / f"{slug}.json"

        if destino.exists():
            pulados += 1
            continue

        if dry_run:
            print(f"\n=== DRY-RUN: item {num} — {nome} (p.{pagina}) ===")
            ficha = montar_ficha(num, nome, bloco, pagina)
            print(json.dumps(ficha, ensure_ascii=False, indent=2))
            print("\n(dry-run: nenhum arquivo gravado)")
            return

        try:
            ficha = montar_ficha(num, nome, bloco, pagina)
            destino.write_text(json.dumps(ficha, ensure_ascii=False, indent=2), encoding="utf-8")
            criados += 1
            if criados % 20 == 0:
                print(f"  … {criados} fichas criadas até agora (último: {num} {nome})")
        except Exception as e:
            erros.append((num, nome, str(e)))
            print(f"  ERRO item {num} {nome}: {e}")

    print(f"\nConcluído: {criados} fichas criadas, {pulados} já existiam, {len(erros)} erros.")
    if erros:
        print("Erros:")
        for num, nome, msg in erros:
            print(f"  {num}) {nome}: {msg}")


if __name__ == "__main__":
    main()
