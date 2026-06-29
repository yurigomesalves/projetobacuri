"""
Gera fichas JSON para vítimas do CNV vol. III que ainda não têm arquivo
em pipeline/dados/curadoria/biografias/.

O script extrai os 434 nomes do índice cronológico (páginas 7–14), busca os
chunks correspondentes de cada perfil, extrai dados estruturados do cabeçalho
(nome, datas, local, profissão, organização), concatena o conteúdo, limpa e
normaliza, e gera dois JSONs por vítima: biografia (tipo: vitima) e evento_geo
(se houver localidade).

Uso:
    python3 pipeline/12_gerar_fichas_cnv_vol3.py [--dry-run] [--inicio N] [--fim N] [--so-bio] [--so-eventos]

Flags:
    --dry-run       Processa apenas a primeira vítima faltante e imprime, sem gravar.
    --inicio N      Número cronológico inicial (padrão: 1).
    --fim N         Número cronológico final (padrão: 434).
    --so-bio        Só gera biografias (pula eventos).
    --so-eventos    Só gera eventos (assume biografias já existem).
"""

import json
import os
import re
import sys
import unicodedata
from pathlib import Path
from typing import Optional, Tuple

# ---------------------------------------------------------------------------
# Configuração
# ---------------------------------------------------------------------------
CHUNKS_FILE = Path(__file__).parent / "dados" / "chunks" / "cnv-vol3.jsonl"
BIO_DIR = Path(__file__).parent / "dados" / "curadoria" / "biografias"
EVENTOS_DIR = Path(__file__).parent / "dados" / "curadoria" / "eventos"
FONTE_ID = "13bfe3a0-41f1-46b8-bf8c-6852c847a4c8"

PARAGRAFO_IMPUNIDADE = (
    "Nenhum responsável por graves violações de direitos humanos durante a ditadura "
    "militar-empresarial foi até hoje julgado criminalmente no Brasil, em razão da "
    "interpretação da Lei de Anistia (Lei nº 6.683/1979) consolidada pelo Supremo "
    "Tribunal Federal no julgamento da ADPF 153 (2010). Essa interpretação foi "
    "considerada incompatível com o direito internacional pela Corte Interamericana "
    "de Direitos Humanos no caso Gomes Lund e outros vs. Brasil (2010)."
)

# Vocabulário de marcadores (conforme 06_semear_curadoria.py)
MARCADORES_VALIDOS = {
    "classe_trabalhadora", "campesinato", "classe_media",
    "negro", "indigena", "mulher", "lgbt", "estrangeiro_imigrante",
    "estudante", "religioso_a", "militar_oposicao", "jornalista", "advogado_a",
}

TIPOS_CRIME_VALIDOS = {
    "prisao_ilegal_arbitraria", "tortura", "execucao_sumaria",
    "desaparecimento_forcado", "ocultacao_de_cadaver", "violencia_sexual",
    "violencia_contra_povos_indigenas", "perseguicao_exilio_banimento",
    "censura", "atentado_a_populacao_civil",
    "grilagem_de_territorio_indigena", "apagamento_de_registros_e_testemunhos",
}


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
# Carrega cabeçalhos estruturados do jsonl bruto (pipeline/dados/extraido/)
# O cabeçalho aparece ao FINAL de cada página, no formato:
#   Nome Da Vítima
#   Filiação: ...
#   Data e local de nascimento: dd/mm/aaaa, Cidade (UF)
#   Atuação profissional: ...
#   Organização política: ...
#   Data e local de morte: dd/mm/aaaa, Cidade (UF)
# ---------------------------------------------------------------------------
EXTRAIDO_FILE = Path(__file__).parent / "dados" / "extraido" / "cnv-vol3.jsonl"

_DATA_REGEX = re.compile(r"(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})")
_LOCAL_UF_REGEX = re.compile(r"([A-ZÁÉÍÓÚÂÊÎÔÛÃÕÀÇ][^(]+?)\s*\(([A-Z]{2})\)")
# Rótulos de campo do cabeçalho — inclui "desaparecimento" como alias de "morte"
_CAMPO_ROTULO = re.compile(
    r"^(Filiação|Data e local de nascimento|Atuação profissional|Organização política|"
    r"Data e local de morte|Data e local de desaparecimento|"
    r"Data, local e circunstâncias da morte|Data e local de execução)\s*:\s*",
    re.IGNORECASE
)
# Início de cabeçalho: linha com nome próprio (maiúscula, 3-70 chars) seguida de "Filiação:"
_INICIO_CABECALHO = re.compile(
    r"([A-ZÁÉÍÓÚÂÊÎÔÛÃÕÀÇ][^\n]{2,70})\nFiliação\s*:",
    re.MULTILINE
)


def _parse_data(s: str) -> Optional[str]:
    m = _DATA_REGEX.search(s)
    if not m:
        return None
    dia, mes, ano = m.groups()
    ano_int = int(ano)
    if ano_int < 60:
        ano_int += 2000
    elif ano_int < 100:
        ano_int += 1900
    return f"{ano_int:04d}-{mes.zfill(2)}-{dia.zfill(2)}"


def _parse_local(s: str) -> Tuple[Optional[str], Optional[str]]:
    """Retorna (municipio, uf) ou (None, None) a partir de string de local."""
    s = s.strip()
    s = _DATA_REGEX.sub("", s).strip().lstrip(",").strip()
    sem_loc = {"exterior", "desconhecido", "não identificado", "não identificada",
               "não se aplica", "ignorado", ""}
    if s.lower() in sem_loc:
        return None, None
    m = _LOCAL_UF_REGEX.search(s)
    if m:
        return m.group(1).strip().rstrip(","), m.group(2)
    # Sem UF explícita: retorna cidade sem UF
    return s.strip().rstrip(",") or None, None


def _extrair_campos_pagina(texto: str, pagina: int) -> list:
    """
    Extrai cabeçalhos estruturados de uma página do jsonl bruto.
    Cada cabeçalho começa com 'Nome\\nFiliação: ...' e tem até 6 campos.
    Retorna lista de dicts com os campos extraídos.
    """
    resultados = []

    # Encontra todas as posições onde começa um cabeçalho
    for m_inicio in _INICIO_CABECALHO.finditer(texto):
        nome_raw = m_inicio.group(1).strip()
        start = m_inicio.start()

        # Extrai bloco a partir do nome até ~500 chars depois
        bloco = texto[start:start + 600]
        linhas = bloco.split("\n")

        campos = {}
        campo_atual = None
        valor_atual = []

        for linha in linhas[1:]:  # Pula a linha do nome
            linha_strip = linha.strip()
            if not linha_strip:
                if campo_atual and valor_atual:
                    campos[campo_atual] = " ".join(valor_atual)
                    campo_atual = None
                    valor_atual = []
                continue

            m_rotulo = _CAMPO_ROTULO.match(linha_strip)
            if m_rotulo:
                # Salva campo anterior
                if campo_atual and valor_atual:
                    campos[campo_atual] = " ".join(valor_atual)
                campo_atual = m_rotulo.group(1).strip().lower()
                # Normaliza nome do campo
                if "nascimento" in campo_atual and "falecimento" not in campo_atual:
                    campo_atual = "nascimento"
                elif "morte" in campo_atual or "desaparecimento" in campo_atual or "execução" in campo_atual or "execucao" in campo_atual or "falecimento" in campo_atual:
                    campo_atual = "morte"
                elif "profissional" in campo_atual:
                    campo_atual = "profissao"
                elif "política" in campo_atual or "politica" in campo_atual:
                    campo_atual = "organizacao"
                elif "filiação" in campo_atual or "filiacao" in campo_atual:
                    campo_atual = "filiacao"
                valor_atual = [linha_strip[m_rotulo.end():].strip()]
            elif campo_atual:
                # Continuação de linha
                valor_atual.append(linha_strip)
            else:
                break  # Saiu do bloco do cabeçalho

        # Salva último campo
        if campo_atual and valor_atual:
            campos[campo_atual] = " ".join(valor_atual)

        if "morte" in campos:
            morte_str = campos.get("morte", "")
            nasc_str = campos.get("nascimento", "")
            profissao = campos.get("profissao", "")
            org = campos.get("organizacao", "")

            local_nasc, uf_nasc = _parse_local(nasc_str)
            local_morte, uf_morte = _parse_local(morte_str)
            data_nasc = _parse_data(nasc_str)
            data_morte = _parse_data(morte_str)

            NAO_APLICA = {"não se aplica", "não identificado", "não identificada", ""}
            resultados.append({
                "nome_raw": nome_raw,
                "filiacao": campos.get("filiacao", ""),
                "profissao": profissao if profissao.lower() not in NAO_APLICA else None,
                "organizacao": org if org.lower() not in NAO_APLICA else None,
                "data_nascimento": data_nasc,
                "local_nascimento": local_nasc,
                "uf_nascimento": uf_nasc,
                "data_morte": data_morte,
                "local_morte": local_morte,
                "uf_morte": uf_morte,
                "pagina": pagina,
            })

    return resultados


def carregar_cabecalhos_brutos() -> dict:
    """Lê o jsonl bruto e extrai cabeçalhos estruturados por slug do nome."""
    cabecalhos = {}
    if not EXTRAIDO_FILE.exists():
        print(f"AVISO: {EXTRAIDO_FILE} não encontrado — dados de cabeçalho indisponíveis.")
        return cabecalhos

    with open(EXTRAIDO_FILE) as f:
        for line in f:
            if not line.strip():
                continue
            d = json.loads(line)
            texto = d.get("texto", "")
            if not texto or "Filiação" not in texto:
                continue
            for cab in _extrair_campos_pagina(texto, d.get("pagina", 0)):
                sl = slugify(cab["nome_raw"])
                if sl not in cabecalhos:
                    cabecalhos[sl] = cab

    return cabecalhos


# ---------------------------------------------------------------------------
# Extrai nomes do índice (páginas 7-14)
# ---------------------------------------------------------------------------
def extrair_nomes_indice(chunks: list) -> dict:
    """Retorna dict {numero_int: nome_str} do índice cronológico."""
    # Filtra chunks das páginas 7-14
    indice_chunks = []
    for c in chunks:
        paginas_str = str(c.get("paginas", ""))
        if paginas_str:
            pags = re.findall(r"\d+", paginas_str)
            if pags and int(pags[0]) in range(7, 15):
                indice_chunks.append(c)

    indice_texto = "\n".join([c.get("conteudo", "") for c in indice_chunks])
    linhas = indice_texto.split("\n")

    nomes_por_num = {}
    i = 0
    while i < len(linhas):
        linha = linhas[i].strip()

        # Procura por "número." em linha própria
        if re.match(r"^\d+\.$", linha):
            num = int(linha[:-1])

            # Nome está na linha anterior (antes de números de página)
            j = i - 1
            while j >= 0 and (linhas[j].strip() == "" or linhas[j].strip().isdigit()):
                j -= 1

            if j >= 0:
                nome_sujo = linhas[j].strip()
                # Remove pontos de alinhamento (...)
                nome = re.sub(r"\.{3,}.*$", "", nome_sujo).strip()

                if nome and len(nome) > 3 and 1 <= num <= 434:
                    nomes_por_num[num] = nome

        i += 1

    return nomes_por_num


# ---------------------------------------------------------------------------
# Carrega chunks e os organiza por perfil (secao)
# ---------------------------------------------------------------------------
def carregar_chunks_por_perfil(chunks: list) -> dict:
    """Retorna dict {nome_perfil: [chunks]} para chunks com secao="Perfil – Nome"."""
    chunks_por_perfil = {}

    for c in chunks:
        secao = c.get("secao", "")
        if secao and secao.startswith("Perfil – "):
            nome_perfil = secao.replace("Perfil – ", "").strip()
            if nome_perfil not in chunks_por_perfil:
                chunks_por_perfil[nome_perfil] = []
            chunks_por_perfil[nome_perfil].append(c)

    return chunks_por_perfil


# ---------------------------------------------------------------------------
# Extrai dados do cabeçalho estruturado do perfil
# ---------------------------------------------------------------------------
def extrair_cabecalho(conteudo_primeiro_chunk: str) -> dict:
    """
    Extrai: nome, filiação, data/local nascimento, profissão, org política,
    data/local morte do cabeçalho estruturado do perfil.

    Formato esperado:
        [Nome]
        Filiação: [pais]
        Data e local de nascimento: dd/mm/aaaa, Cidade (UF)
        Atuação profissional: [profissão]
        Organização política: [org]
        Data e local de morte: dd/mm/aaaa, Cidade (UF)
    """
    resultado = {
        "filiacao": None,
        "data_nascimento": None,
        "local_nascimento": None,
        "uf_nascimento": None,
        "profissao": None,
        "organizacao": None,
        "data_morte": None,
        "local_morte": None,
        "uf_morte": None,
    }

    linhas = conteudo_primeiro_chunk.split("\n")

    for i, linha in enumerate(linhas):
        linha_lower = linha.lower()

        # Filiação
        if "filiação" in linha_lower:
            resultado["filiacao"] = re.sub(r"^[^:]*:\s*", "", linha).strip()

        # Data e local de nascimento
        if "data e local de nascimento" in linha_lower:
            match = re.search(
                r"(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})[,\s]+([A-ZÁÉÍÓÚÂÊÎÔÛÃÕÀÇ][^(]+)\s*\(([A-Z]{2})\)",
                linha
            )
            if match:
                dia, mes, ano, cidade, uf = match.groups()
                # Normaliza ano
                ano_int = int(ano)
                if ano_int < 60:
                    ano_int += 2000
                elif ano_int < 100:
                    ano_int += 1900
                resultado["data_nascimento"] = f"{ano_int:04d}-{mes.zfill(2)}-{dia.zfill(2)}"
                resultado["local_nascimento"] = cidade.strip().rstrip(",")
                resultado["uf_nascimento"] = uf

        # Atuação profissional
        if "atuação profissional" in linha_lower:
            resultado["profissao"] = re.sub(r"^[^:]*:\s*", "", linha).strip()

        # Organização política
        if "organização política" in linha_lower:
            org = re.sub(r"^[^:]*:\s*", "", linha).strip()
            if org.lower() != "não se aplica":
                resultado["organizacao"] = org

        # Data e local de morte
        if "data e local de morte" in linha_lower:
            match = re.search(
                r"(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})[,\s]+(.+?)(?:\s*$|\n)",
                linha
            )
            if match:
                dia, mes, ano, local_str = match.groups()
                # Normaliza ano
                ano_int = int(ano)
                if ano_int < 60:
                    ano_int += 2000
                elif ano_int < 100:
                    ano_int += 1900
                resultado["data_morte"] = f"{ano_int:04d}-{mes.zfill(2)}-{dia.zfill(2)}"

                # Extrai cidade e UF
                m_local = re.search(r"([A-ZÁÉÍÓÚÂÊÎÔÛÃÕÀÇ][^(]+)\s*\(([A-Z]{2})\)", local_str)
                if m_local:
                    cidade, uf = m_local.groups()
                    resultado["local_morte"] = cidade.strip().rstrip(",")
                    resultado["uf_morte"] = uf
                else:
                    # Sem UF: marca como Exterior ou Desconhecido
                    local_limpo = local_str.strip().rstrip(")")
                    if local_limpo.lower() in ("exterior", "desconhecido", "não identificado"):
                        resultado["local_morte"] = None
                        resultado["uf_morte"] = None
                    else:
                        resultado["local_morte"] = local_limpo
                        resultado["uf_morte"] = None

    return resultado


# ---------------------------------------------------------------------------
# Limpa e formata o texto bruto do perfil
# ---------------------------------------------------------------------------
def _juntar_linhas_quebradas(bloco: str) -> str:
    """Une linhas quebradas pelo OCR/PDF."""
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


def gerar_texto_md(nome: str, chunks_perfil: list) -> str:
    """Concatena e limpa conteúdo de todos os chunks do perfil."""
    # Concatena conteúdo de todos os chunks
    conteudos = [c.get("conteudo", "") for c in chunks_perfil]
    texto_bruto = "\n".join(conteudos)

    # Remove cabeçalho estruturado (linhas com rótulos como "Filiação:", etc.)
    texto_bruto = re.sub(
        r"(Filiação|Data e local de nascimento|Atuação profissional|Organização política|Data e local de morte)[^:\n]*:[^\n]*",
        "",
        texto_bruto,
        flags=re.IGNORECASE
    )

    # Remove linhas com nome da instituição repetida
    texto_bruto = re.sub(
        r"comissão nacional da verdade[^\n]*relatório[^\n]*volume[^\n]*iii[^\n]*",
        "",
        texto_bruto,
        flags=re.IGNORECASE
    )

    # Desfaz hifenização de quebra de linha
    texto_bruto = re.sub(r"-\n(\w)", r"\1", texto_bruto)

    # Remove linhas soltas de números (páginas)
    texto_bruto = re.sub(r"^\s*\d{1,3}\s*$", "", texto_bruto, flags=re.MULTILINE)

    # Junta linhas quebradas
    texto = _juntar_linhas_quebradas(texto_bruto)

    # Separa por parágrafos
    paragrafos = [p.strip() for p in texto.split("\n\n") if p.strip()]

    # Monta o texto final
    partes = paragrafos.copy()
    partes.append(PARAGRAFO_IMPUNIDADE)

    return "\n\n".join(partes)


# ---------------------------------------------------------------------------
# Infere marcadores automáticos
# ---------------------------------------------------------------------------
def inferir_marcadores(conteudo_total: str, nome: str) -> list:
    """Infere marcadores a partir de pistas no texto."""
    marcadores = []
    txt_lower = conteudo_total.lower()

    if re.search(r"\bestudante\b", txt_lower):
        marcadores.append("estudante")
    if re.search(r"\bcampon[eê]s|trabalhador rural\b", txt_lower):
        marcadores.append("campesinato")
    if re.search(r"\boper[aá]ri[oa]\b|\btrabalhador[a]?\b", txt_lower):
        marcadores.append("classe_trabalhadora")
    if re.search(r"\b[íi]ndi[oa]\b|\bind[íi]gena\b", txt_lower):
        marcadores.append("indigena")

    # Gênero feminino pelo nome ou filiação
    if re.search(r"\b(filha|nascida|militante .+a\b)", txt_lower) or nome.split()[-1].endswith("a"):
        marcadores.append("mulher")

    # Remove duplicados e valida
    marcadores = list(set(marcadores))
    marcadores = [m for m in marcadores if m in MARCADORES_VALIDOS]

    return marcadores


# ---------------------------------------------------------------------------
# Infere tipo de crime a partir do conteúdo
# ---------------------------------------------------------------------------
def inferir_tipos_crime(conteudo_total: str) -> list:
    """Infere tipos de crime a partir do conteúdo."""
    txt_lower = conteudo_total.lower()
    tipos = []

    if re.search(r"\bdesaparec", txt_lower):
        tipos.append("desaparecimento_forcado")
    else:
        tipos.append("execucao_sumaria")

    if re.search(r"\btor\w+", txt_lower):
        tipos.append("tortura")

    if re.search(r"\bprís|presos|prisão", txt_lower):
        tipos.append("prisao_ilegal_arbitraria")

    # Remove duplicados e valida
    tipos = list(set(tipos))
    tipos = [t for t in tipos if t in TIPOS_CRIME_VALIDOS]

    return tipos if tipos else ["execucao_sumaria"]


# ---------------------------------------------------------------------------
# Monta JSON de biografia
# ---------------------------------------------------------------------------
def montar_biografia(
    nome: str, chunks_perfil: list, numero_cronologico: int, cabecalho: dict
) -> dict:
    """Monta o JSON completo de uma ficha de vítima."""
    slug = slugify(nome)

    # Concatena conteúdo para resumo e marcadores
    conteudo_total = "\n".join([c.get("conteudo", "") for c in chunks_perfil])

    # Extrai página do primeiro chunk
    pagina = str(chunks_perfil[0].get("paginas", ""))

    # Resumo de 1 linha
    profissao = cabecalho.get("profissao") or "vítima da repressão"
    municipio = cabecalho.get("local_morte") or "município desconhecido"
    uf = cabecalho.get("uf_morte") or ""

    resumo = f"{nome}, {profissao}, morto em {municipio}"
    if uf:
        resumo += f"/{uf}"
    resumo += "."

    if len(resumo) > 200:
        resumo = resumo[:197] + "..."

    # Gera texto_md
    texto_md = gerar_texto_md(nome, chunks_perfil)

    # Infere marcadores
    marcadores = inferir_marcadores(conteudo_total, nome)

    # Trecho do cabeçalho para fontes
    trecho_cabecalho = chunks_perfil[0].get("conteudo", "")[:500].strip()

    return {
        "slug": slug,
        "nome": nome,
        "tipo": "vitima",
        "resumo_1_linha": resumo,
        "municipio": cabecalho.get("local_morte"),
        "uf": cabecalho.get("uf_morte"),
        "municipio_natal": cabecalho.get("local_nascimento"),
        "uf_natal": cabecalho.get("uf_nascimento"),
        "data_inicio": cabecalho.get("data_morte"),
        "data_fim": cabecalho.get("data_morte"),
        "status_curadoria": "publicada",
        "texto_md": texto_md,
        "fontes": [
            {
                "fonte_id": FONTE_ID,
                "paginas": pagina,
                "trecho": trecho_cabecalho,
                "secao": f"Perfil – {nome}",
            }
        ],
        "marcadores": [],
    }


# ---------------------------------------------------------------------------
# Monta JSON de evento_geo
# ---------------------------------------------------------------------------
def montar_evento_geo(nome: str, numero_cronologico: int, cabecalho: dict, chunks_perfil: list) -> Optional[dict]:
    """Monta evento_geo se houver localidade de morte."""
    # Pula se não houver localidade
    if not cabecalho.get("local_morte") or not cabecalho.get("uf_morte"):
        return None

    slug_vitima = slugify(nome)
    slug_evento = f"morte-{slug_vitima}"

    # Extrai página e trecho
    pagina = str(chunks_perfil[0].get("paginas", ""))
    trecho = chunks_perfil[0].get("conteudo", "")[:300].strip()

    # Resumo/descrição
    descricao = cabecalho.get("profissao") or "vítima da repressão"

    # Tipos de crime
    conteudo_total = "\n".join([c.get("conteudo", "") for c in chunks_perfil])
    tipos_crime = inferir_tipos_crime(conteudo_total)

    return {
        "slug": slug_evento,
        "titulo": f"Morte de {nome}",
        "tipo_evento": "caso_individual",
        "tipos_crime": tipos_crime,
        "data": cabecalho.get("data_morte"),
        "municipio": cabecalho.get("local_morte"),
        "uf": cabecalho.get("uf_morte"),
        "descricao": descricao,
        "vitimas": [slug_vitima],
        "fontes": [
            {
                "fonte_id": FONTE_ID,
                "paginas": pagina,
                "trecho": trecho,
                "secao": f"Perfil – {nome}",
            }
        ],
    }


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    # Parse argumentos
    dry_run = "--dry-run" in sys.argv
    so_bio = "--so-bio" in sys.argv
    so_eventos = "--so-eventos" in sys.argv
    inicio = 1
    fim = 434

    for i, arg in enumerate(sys.argv):
        if arg == "--inicio" and i + 1 < len(sys.argv):
            inicio = int(sys.argv[i + 1])
        if arg == "--fim" and i + 1 < len(sys.argv):
            fim = int(sys.argv[i + 1])

    print(f"Carregando chunks…")
    with open(CHUNKS_FILE) as f:
        chunks = [json.loads(l) for l in f if l.strip()]
    print(f"  {len(chunks)} chunks carregados.")

    print(f"Extraindo nomes do índice…")
    nomes_indice = extrair_nomes_indice(chunks)
    print(f"  {len(nomes_indice)} nomes extraídos (range: {min(nomes_indice)}–{max(nomes_indice)}).")

    print(f"Indexando chunks por perfil…")
    chunks_por_perfil = carregar_chunks_por_perfil(chunks)
    print(f"  {len(chunks_por_perfil)} perfis únicos nos chunks.")

    print(f"Carregando cabeçalhos do jsonl bruto…")
    cabecalhos_brutos = carregar_cabecalhos_brutos()
    print(f"  {len(cabecalhos_brutos)} cabeçalhos estruturados extraídos.")

    # Identifica biografias já existentes do CNV vol3 (por slug do nome, não por fonte_id)
    print(f"Verificando biografias já existentes…")
    bios_existentes = set(f.stem for f in BIO_DIR.glob("*.json"))
    print(f"  {len(bios_existentes)} arquivos de biografia existem.")

    # Filtra alvo
    alvo = {n: v for n, v in nomes_indice.items() if inicio <= n <= fim}
    print(f"  Alvo: {len(alvo)} nomes ({inicio}–{fim}).")

    # Processa
    criadas_bio = 0
    criados_eventos = 0
    puladas_bio = 0
    pulados_eventos = 0
    sem_localidade = 0
    erros = []
    nomes_sem_chunks = []

    for num in sorted(alvo.keys()):
        nome = alvo[num]
        slug = slugify(nome)

        # Pula se já tem biografia (e não for --so-eventos)
        if not so_eventos and slug in bios_existentes:
            puladas_bio += 1
            continue

        # Procura chunks correspondentes
        nome_perfil_slug = slug
        chunks_perfil = None

        for secao_nome in chunks_por_perfil:
            if slugify(secao_nome) == nome_perfil_slug:
                chunks_perfil = chunks_por_perfil[secao_nome]
                break

        if not chunks_perfil:
            nomes_sem_chunks.append(f"{num}. {nome}")
            continue

        # Cabeçalho: prioriza bruto (jsonl extraido), fallback para extração dos chunks
        cabecalho = cabecalhos_brutos.get(slug) or extrair_cabecalho(chunks_perfil[0].get("conteudo", ""))

        if dry_run:
            print(f"\n=== DRY-RUN: item {num} — {nome} ===")
            print(f"Cabeçalho extraído:")
            for k, v in (cabecalho or {}).items():
                if v:
                    print(f"  {k}: {v}")

            bio = montar_biografia(nome, chunks_perfil, num, cabecalho)
            print(f"\nBiografia (primeiros 1000 chars):")
            print(json.dumps(bio, ensure_ascii=False, indent=2)[:1000])

            evento = montar_evento_geo(nome, num, cabecalho, chunks_perfil)
            if evento:
                print(f"\nEvento:")
                print(json.dumps(evento, ensure_ascii=False, indent=2)[:500])

            print("\n(dry-run: nenhum arquivo gravado)")
            return

        try:
            if not so_eventos:
                destino_bio = BIO_DIR / f"{slug}.json"
                bio = montar_biografia(nome, chunks_perfil, num, cabecalho)
                destino_bio.write_text(json.dumps(bio, ensure_ascii=False, indent=2), encoding="utf-8")
                criadas_bio += 1

            # Gera evento_geo se não for --so-bio
            if not so_bio:
                evento = montar_evento_geo(nome, num, cabecalho, chunks_perfil)
                if evento:
                    destino_evento = EVENTOS_DIR / f"{evento['slug']}.json"
                    destino_evento.write_text(json.dumps(evento, ensure_ascii=False, indent=2), encoding="utf-8")
                    criados_eventos += 1
                else:
                    sem_localidade += 1

            if (criadas_bio + puladas_bio) % 50 == 0:
                print(f"  … processadas {criadas_bio + puladas_bio} vítimas")

        except Exception as e:
            erros.append((num, nome, str(e)))
            print(f"  ERRO item {num} {nome}: {e}")

    # Relatório
    print(f"\n=== Resultado ===")
    print(f"Vítimas processadas: {len(alvo)}")
    print(f"  Biografias geradas: {criadas_bio}  (puladas: {puladas_bio} por já existir)")
    print(f"  Eventos gerados: {criados_eventos}")
    print(f"  Sem localidade: {sem_localidade}")
    print(f"  Erros: {len(erros)}")

    if nomes_sem_chunks:
        print(f"\nNomes sem chunks nos dados ({len(nomes_sem_chunks)}):")
        for nome_faltante in nomes_sem_chunks[:10]:
            print(f"  {nome_faltante}")
        if len(nomes_sem_chunks) > 10:
            print(f"  … e mais {len(nomes_sem_chunks) - 10}")

    if erros:
        print(f"\nErros detalhados:")
        for num, nome, msg in erros[:10]:
            print(f"  {num}. {nome}: {msg}")
        if len(erros) > 10:
            print(f"  … e mais {len(erros) - 10}")


if __name__ == "__main__":
    main()
