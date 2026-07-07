"""
Gera fichas JSON para vítimas e perpetradores da Comissão da Verdade de
Minas Gerais (Covemg) que ainda não têm arquivo em
pipeline/dados/curadoria/.

Fontes processadas:
  1. Planilha de mineiros mortos/desaparecidos (handle 502) → vítimas
  2. Lista de torturadores com fontes (handle 316) → perpetradores
  3. Lista de acontecimentos (handle 341) → perfis detalhados complementares

Uso:
    python3 pipeline/13_gerar_fichas_covemg.py [--dry-run] [--so-bio] [--so-eventos]

Flags:
    --dry-run       Processa apenas a primeira entrada e imprime, sem gravar.
    --so-bio        Só gera biografias (pula eventos).
    --so-eventos    Só gera eventos (assume biografias já existem).
"""

import json
import re
import sys
import unicodedata
from pathlib import Path
from typing import Optional, Tuple

# ---------------------------------------------------------------------------
# Configuração
# ---------------------------------------------------------------------------
BASE = Path(__file__).parent
EXTRAIDO = BASE / "dados" / "extraido"
CHUNKS = BASE / "dados" / "chunks"
BIO_DIR = BASE / "dados" / "curadoria" / "biografias"
EVENTOS_DIR = BASE / "dados" / "curadoria" / "eventos"

# fonte_ids serão resolvidos dinamicamente via Supabase na semeadura
# (06_semear_curadoria.py). Usamos slugs para identificar a fonte.
FONTE_COVEMG_RELATORIO = "cev-mg-covemg-relatorio-final-2017"
FONTE_COVEMG_PLANILHA = "cev-mg-covemg-502-planilha-mineiros-mortos-desaparecidos"
FONTE_COVEMG_TORTURADORES = "cev-mg-covemg-316-lista-torturadores-fontes-consultadas"
FONTE_COVEMG_ACONTECIMENTOS = "cev-mg-covemg-341-acontecimentos-envolvendo-mortes-desaparecimentos"

BIO_DIR.mkdir(parents=True, exist_ok=True)
EVENTOS_DIR.mkdir(parents=True, exist_ok=True)

PARAGRAFO_IMPUNIDADE = (
    "Nenhum responsável por graves violações de direitos humanos durante a ditadura "
    "militar-empresarial foi até hoje julgado criminalmente no Brasil, em razão da "
    "interpretação da Lei de Anistia (Lei nº 6.683/1979) consolidada pelo Supremo "
    "Tribunal Federal no julgamento da ADPF 153 (2010). Essa interpretação foi "
    "considerada incompatível com o direito internacional pela Corte Interamericana "
    "de Direitos Humanos no caso Gomes Lund e outros vs. Brasil (2010)."
)

# Vocabulários de marcadores (conforme 06_semear_curadoria.py)
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
# Utilidades
# ---------------------------------------------------------------------------
def slugify(nome: str) -> str:
    nome = unicodedata.normalize("NFD", nome)
    nome = "".join(c for c in nome if unicodedata.category(c) != "Mn")
    nome = nome.lower()
    nome = re.sub(r"[^a-z0-9]+", "-", nome)
    return nome.strip("-")


def normalizar_nome(nome: str) -> str:
    """Converte nome UPPERCASE para Title Case, preservando partículas."""
    if not nome:
        return nome
    # Se já está em title case, retorna como está
    if nome[0].isupper() and not nome.isupper():
        return nome.strip()
    # Converte para title case
    partes = nome.strip().split()
    resultado = []
    minusculas = {"de", "da", "do", "das", "dos", "e", "em", "no", "na", "nos", "nas"}
    for i, p in enumerate(partes):
        p_lower = p.lower()
        if p_lower in minusculas and i > 0:
            resultado.append(p_lower)
        else:
            resultado.append(p.capitalize())
    nome_title = " ".join(resultado)
    # Corrige acentos que podem ter sido perdidos
    nome_title = nome_title.replace("Av.", "Av.")
    return nome_title


CORRECOES_NOMES = {
    "JUSCELINO KUBITSCHEK DE OLIVEIRA": "Juscelino Kubitschek",
    "JUSCELINO KUBITSCHEK": "Juscelino Kubitschek",
    "NATIVO DA NATIVIDADE DE OLIVEIRA": "Nativo da Natividade de Oliveira",
}

CORRECOES_MUNICIPIOS = {
    "JOÃO FORTUNATO VIDIGAL": ("Rio de Janeiro", "RJ"),
    "JOSÉ CARLOS NOVAES DA MATA": ("Rio de Janeiro", "RJ"),
    "NATIVO DA NATIVIDADE DE OLIVEIRA": ("Rio de Janeiro", "RJ"),
}


def _parse_data(s: str) -> Optional[str]:
    """Converte data M/D/YYYY ou D/M/YYYY para ISO."""
    m = re.search(r"(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})", s)
    if not m:
        return None
    a, b, ano = m.groups()
    # Heurística: se um número > 12, é o dia
    a_int, b_int = int(a), int(b)
    if a_int > 12:
        dia, mes = a, b
    elif b_int > 12:
        dia, mes = b, a
    else:
        # Ambos <= 12: americano M/D/Y por ser o padrão da planilha Covemg
        dia, mes = b, a
    ano_int = int(ano)
    if ano_int < 60:
        ano_int += 2000
    elif ano_int < 100:
        ano_int += 1900
    return f"{ano_int:04d}-{mes.zfill(2)}-{dia.zfill(2)}"


def _parse_local(s: str) -> Tuple[Optional[str], Optional[str]]:
    """Extrai (municipio, uf) de string como 'Belo Horizonte (MG)' ou 'Araguaia (PA)'."""
    s = s.strip()
    if not s or s.lower() in ("exterior", "desconhecido", "não identificado", "não se aplica", ""):
        return None, None
    m = re.search(r"([A-ZÁÉÍÓÚÂÊÎÔÛÃÕÀÇ][^(]+?)\s*\(([A-Z]{2})\)", s)
    if m:
        return m.group(1).strip().rstrip(","), m.group(2)
    return s.strip().rstrip(","), None


def inferir_marcadores(nome: str, profissao: str, organizacao: str) -> list:
    marcadores = set()
    txt = f"{profissao} {organizacao}".lower()

    if re.search(r"estudante", txt):
        marcadores.add("estudante")
    if re.search(r"oper[aá]ri[oa]|trabalhador", txt):
        marcadores.add("classe_trabalhadora")
    if re.search(r"campon[eê]s|rural", txt):
        marcadores.add("campesinato")
    if re.search(r"militar", txt):
        marcadores.add("militar_oposicao")
    if re.search(r"profissional liberal", txt):
        marcadores.add("classe_media")
    if re.search(r"jornalista", txt):
        marcadores.add("jornalista")
    if re.search(r"advogad[oa]", txt):
        marcadores.add("advogado_a")

    if nome.split()[-1].lower().endswith("a"):
        marcadores.add("mulher")

    return [m for m in marcadores if m in MARCADORES_VALIDOS]


def inferir_tipos_crime(org: str) -> list:
    org_lower = (org or "").lower()
    tipos = []
    if "guerrilha" in org_lower or "araguaia" in org_lower:
        tipos.append("desaparecimento_forcado")
    else:
        tipos.append("execucao_sumaria")
    tipos.append("tortura")
    tipos.append("prisao_ilegal_arbitraria")
    return [t for t in tipos if t in TIPOS_CRIME_VALIDOS]


# ===================================================================
# PARSER: Planilha de mineiros mortos/desaparecidos (handle 502)
# ===================================================================
# Formato de cada entrada:
#   <numero>
#   <NOME COMPLETO>
#   <organizacao> (pode ocupar 1-3 linhas)
#   <S/N>  (campo A)
#   <S/N>  (campo B)
#   <1-7>  (campo C)
#   <X>    (campo D, opcional)
#   <X>    (campo E, opcional)
#   <data_nascimento M/D/YYYY>
#   <cidade_natal>
#   <M/F>
#   <clandestinidade>
#   <profissao>
#   <idade>
#   <ano_morte>
#   <local_morte (UF)>
#   <X>
#   <referencias> (opcional, até a próxima entrada)

_RE_INICIO_ENTRADA = re.compile(r"^\s*(\d{1,3})\s*$")
_RE_DATA = re.compile(r"^\d{1,2}/\d{1,2}/\d{2,4}\s*$")
_RE_LOCAL_MORTE = re.compile(r".*\([A-Z]{2}\)")

def _parse_planilha_502() -> list:
    """Retorna lista de dicts com dados das vítimas."""
    jsonl = EXTRAIDO / f"{FONTE_COVEMG_PLANILHA}.jsonl"
    if not jsonl.exists():
        print(f"AVISO: {jsonl} não encontrado.")
        return []

    with open(jsonl) as f:
        lines = [json.loads(l) for l in f if l.strip()]
    texto = "\n".join([l["texto"] for l in lines])
    linhas = texto.split("\n")

    entradas = []
    estado = "fora"  # fora, em_entrada
    num_atual = None
    campos = []

    i = 0
    while i < len(linhas):
        linha = linhas[i].strip()

        # Detecta início de nova entrada: número sozinho + próxima linha é nome
        m_inicio = _RE_INICIO_ENTRADA.match(linha)
        if m_inicio and i + 1 < len(linhas):
            prox = linhas[i + 1].strip()
            if prox and prox[0].isupper() and len(prox) > 5 and not prox[0].isdigit():
                # Salva entrada anterior
                if num_atual is not None and len(campos) >= 10:
                    entradas.append({"numero": num_atual, "campos": list(campos)})
                # Nova entrada
                num_atual = int(m_inicio.group(1))
                campos = [prox]  # Nome
                i += 2
                continue

        if num_atual is not None:
            campos.append(linha)
        i += 1

    # Última entrada
    if num_atual is not None and len(campos) >= 10:
        entradas.append({"numero": num_atual, "campos": list(campos)})

    # Extrai dados estruturados de cada entrada
    vitimas = []
    for e in entradas:
        nome = e["campos"][0].strip()
        # Remove sufixo (GA) do nome
        nome_limpo = re.sub(r"\s*\(GA\)\s*$", "", nome).strip()
        campos = e["campos"][1:]

        # Encontra posições-chave: data nascimento, cidade natal, local morte
        data_nasc_idx = None
        local_morte_idx = None
        sexo = None
        profissao = None

        for idx, c in enumerate(campos):
            c_strip = c.strip()
            if _RE_DATA.match(c_strip) and data_nasc_idx is None:
                data_nasc_idx = idx
            if _RE_LOCAL_MORTE.match(c_strip) and local_morte_idx is None:
                local_morte_idx = idx
            if c_strip in ("M", "F") and sexo is None:
                sexo = c_strip

        # Organização: campos entre nome e data_nascimento, excluindo S/N/X/etc
        if data_nasc_idx is not None and data_nasc_idx > 0:
            org_campos = []
            for c in campos[:data_nasc_idx]:
                cs = c.strip()
                if cs in ("S", "N", "X", "-", "") or re.match(r"^\d+$", cs):
                    continue
                org_campos.append(cs)
            organizacao = " ".join(org_campos).strip()
        else:
            organizacao = "Não se aplica"

        # Data de nascimento
        data_nasc = None
        if data_nasc_idx is not None:
            data_nasc = _parse_data(campos[data_nasc_idx])

        # Cidade natal (campo seguinte à data de nascimento)
        cidade_natal = None
        if data_nasc_idx is not None and data_nasc_idx + 1 < len(campos):
            nat_candidata = campos[data_nasc_idx + 1].strip()
            if nat_candidata not in ("M", "F", "X", "-", "") and not nat_candidata.isdigit():
                cidade_natal = nat_candidata

        # Profissão (entre sexo e idade, aproximadamente)
        if data_nasc_idx is not None:
            for c in campos[data_nasc_idx + 2:]:
                cs = c.strip()
                if cs in ("M", "F", "X", "-", "") or cs.isdigit():
                    continue
                if "clandestin" in cs.lower():
                    continue
                if not profissao:
                    profissao = cs
                    break

        # Local de morte (último campo com padrão (UF))
        local_morte = None
        uf_morte = None
        if local_morte_idx is not None:
            local_morte, uf_morte = _parse_local(campos[local_morte_idx])

        # Ano de morte (campo numérico antes do local de morte)
        ano_morte = None
        if local_morte_idx is not None and local_morte_idx > 0:
            ano_cand = campos[local_morte_idx - 1].strip()
            if re.match(r"^\d{4}$", ano_cand):
                ano_morte = int(ano_cand)

        # Data de morte (aproximada)
        data_morte = f"{ano_morte}-01-01" if ano_morte else None

        # Resumo
        prof_str = profissao or "vítima da repressão"
        loc_str = f"{local_morte}/{uf_morte}" if local_morte and uf_morte else (local_morte or "local desconhecido")
        cidade_natal_str = f"{cidade_natal}/MG" if cidade_natal else "Minas Gerais"

        slug = slugify(nome_limpo)

        vitimas.append({
            "slug": slug,
            "nome": nome_limpo,
            "numero": e["numero"],
            "organizacao": organizacao if organizacao.lower() != "não se aplica" else None,
            "data_nascimento": data_nasc,
            "cidade_natal": cidade_natal,
            "data_morte": data_morte,
            "ano_morte": ano_morte,
            "local_morte": local_morte,
            "uf_morte": uf_morte,
            "sexo": sexo,
            "profissao": profissao if profissao and profissao.lower() != "não se aplica" else None,
            "fonte_slug": FONTE_COVEMG_PLANILHA,
            "fonte_pagina": f"Planilha de mineiros mortos e desaparecidos, entrada {e['numero']}",
        })

    return vitimas


# ===================================================================
# PARSER: Lista de torturadores (handle 316)
# ===================================================================
def _parse_torturadores_316() -> list:
    """Retorna lista de dicts com nomes de torturadores e número de citações.

    Formato do documento: cabeçalho de 4 linhas, depois blocos de 3 linhas:
      NOME
      FONTES (ex: 1,2,3)
      CITAÇÕES (número)
    """
    jsonl = EXTRAIDO / f"{FONTE_COVEMG_TORTURADORES}.jsonl"
    if not jsonl.exists():
        print(f"AVISO: {jsonl} não encontrado.")
        return []

    with open(jsonl) as f:
        lines = [json.loads(l) for l in f if l.strip()]
    texto = "\n".join([l["texto"] for l in lines])
    linhas = [l.strip() for l in texto.split("\n") if l.strip()]

    torturadores = []
    # Pula cabeçalho (4 linhas)
    idx = 0
    while idx < len(linhas) and not _eh_nome_torturador(linhas[idx]):
        idx += 1

    while idx + 2 < len(linhas):
        nome = linhas[idx]
        fontes = linhas[idx + 1]
        try:
            citacoes = int(linhas[idx + 2])
        except ValueError:
            idx += 1
            continue

        # Valida que parece um nome (maiúsculas com acentos, 5+ chars)
        if _eh_nome_torturador(nome):
            torturadores.append({
                "nome": nome.strip(),
                "fontes_str": fontes.strip(),
                "citacoes": citacoes,
            })
            idx += 3
        else:
            idx += 1

    return torturadores


def _eh_nome_torturador(s: str) -> bool:
    """Verifica se uma string parece um nome de torturador (maiúsculas, 6+ chars)."""
    s = s.strip()
    if len(s) < 6:
        return False
    if not s[0].isalpha():
        return False
    # Deve ter maioria de maiúsculas e acentos
    upper_count = sum(1 for c in s if c.isupper() or c in "ÁÉÍÓÚÂÊÎÔÛÃÕÀÇ")
    return upper_count > len(s) * 0.5


# ===================================================================
# PARSER: Perfis detalhados da lista de acontecimentos (handle 341)
# ===================================================================
_RE_PERFIL = re.compile(
    r"([A-ZÁÉÍÓÚÂÊÎÔÛÃÕÀÇ][A-ZÁÉÍÓÚÂÊÎÔÛÃÕÀÇ\s\.\(\)\,\-]{4,60})\n"
    r"Data e local de nascimento:\s*(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})[,\s]+([^\n]+)",
)

def _parse_perfis_341() -> list:
    """Extrai perfis com cabeçalho estruturado do handle 341."""
    jsonl = EXTRAIDO / f"{FONTE_COVEMG_ACONTECIMENTOS}.jsonl"
    if not jsonl.exists():
        print(f"AVISO: {jsonl} não encontrado.")
        return []

    with open(jsonl) as f:
        lines = [json.loads(l) for l in f if l.strip()]
    texto = "\n".join([l["texto"] for l in lines])

    perfis = []
    for m in _RE_PERFIL.finditer(texto):
        nome = m.group(1).strip()
        data_nasc_str = m.group(2).strip()
        local_nasc_str = m.group(3).strip()
        data_nasc = _parse_data(data_nasc_str)
        local_nasc, uf_nasc = _parse_local(local_nasc_str)

        perfis.append({
            "nome": nome,
            "data_nascimento": data_nasc,
            "local_nascimento": local_nasc,
            "uf_nascimento": uf_nasc,
        })

    return perfis


# ===================================================================
# MONTADORES DE JSON
# ===================================================================
def montar_biografia_vitima(v: dict, fonte_id: str) -> dict:
    """Monta biografia de vítima a partir dos dados estruturados."""
    nome_raw = v["nome"]
    # Aplica correções manuais e normalização
    nome = CORRECOES_NOMES.get(nome_raw, normalizar_nome(nome_raw))
    slug = slugify(nome)

    # Município: prioriza correção manual, depois dados extraídos
    if nome_raw in CORRECOES_MUNICIPIOS:
        municipio, uf = CORRECOES_MUNICIPIOS[nome_raw]
    else:
        municipio = v.get("local_morte") or v.get("cidade_natal")
        uf = v.get("uf_morte") or "MG"

    # Filtra municípios inválidos
    municipios_invalidos = {
        "não se aplica", "partido dos trabalhadores", "pt", "pcb", "pc do b",
        "aln", "vpr", "var-palmares", "externo",
    }
    if municipio and municipio.lower() in municipios_invalidos:
        municipio = v.get("cidade_natal")

    prof = v.get("profissao") or "vítima da repressão"
    org = v.get("organizacao")
    org_str = f", militante da {org}" if org else ""
    local_morte_str = f"{municipio}/{uf}" if municipio and uf else (municipio or "local desconhecido")
    cidade_natal_str = v.get("cidade_natal") or "Minas Gerais"

    resumo = f"{nome}, {prof}{org_str}, morto/a em {local_morte_str}."

    # Texto markdown
    nasc = f"{v['data_nascimento']}" if v.get("data_nascimento") else "desconhecida"
    cidade_str = f"{cidade_natal_str}/MG" if v.get("cidade_natal") else "Minas Gerais"
    texto = (
        f"{nome} nasceu em {nasc} em {cidade_str}."
    )
    if org:
        texto += f" Militou na {org}."
    if prof and prof.lower() != "não se aplica":
        texto += f" Atuou como {prof.lower()}."
    if v.get("data_morte"):
        texto += f" Foi morto/a em {v['data_morte']} em {local_morte_str}."
    texto += f"\n\nDados extraídos da planilha de mineiros mortos e desaparecidos políticos da Comissão da Verdade em Minas Gerais (Covemg)."
    texto += f"\n\n{PARAGRAFO_IMPUNIDADE}"

    marcadores = inferir_marcadores(nome, prof, org or "")

    return {
        "slug": slug,
        "nome": nome,
        "tipo": "vitima",
        "resumo_1_linha": resumo[:200],
        "municipio": municipio,
        "uf": uf,
        "municipio_natal": v.get("cidade_natal"),
        "uf_natal": "MG",
        "data_inicio": v.get("data_morte"),
        "data_fim": v.get("data_morte"),
        "status_curadoria": "publicada",
        "texto_md": texto,
        "fontes": [
            {
                "fonte_id": fonte_id,
                "paginas": v.get("fonte_pagina", ""),
                "trecho": f"{nome} — {v.get('fonte_pagina', '')}",
                "secao": "Planilha de mineiros mortos e desaparecidos políticos",
            }
        ],
        "marcadores": [],
    }


def montar_evento_vitima(v: dict, fonte_id: str) -> Optional[dict]:
    """Monta evento_geo se houver localidade de morte."""
    if not v.get("local_morte"):
        return None

    nome_raw = v["nome"]
    nome = CORRECOES_NOMES.get(nome_raw, normalizar_nome(nome_raw))
    slug_vitima = slugify(nome)
    slug_evento = f"morte-{slug_vitima}"

    tipos = inferir_tipos_crime(v.get("organizacao", ""))

    return {
        "slug": slug_evento,
        "titulo": f"Morte de {nome}",
        "tipo_evento": "caso_individual",
        "tipos_crime": tipos,
        "data": v.get("data_morte"),
        "municipio": v.get("local_morte"),
        "uf": v.get("uf_morte"),
        "status_curadoria": "rascunho",
        "descricao": v.get("profissao") or "vítima da repressão",
        "vitimas": [slug_vitima],
        "fontes": [
            {
                "fonte_id": fonte_id,
                "paginas": v.get("fonte_pagina", ""),
                "trecho": f"{nome}",
                "secao": "Planilha de mineiros mortos e desaparecidos políticos",
            }
        ],
    }


def montar_biografia_perpetrador(t: dict, fonte_id: str) -> dict:
    """Monta biografia de perpetrador a partir da lista de torturadores."""
    nome_raw = t["nome"]
    nome = normalizar_nome(nome_raw)
    slug = slugify(nome)

    resumo = (
        f"{nome} — listado pela Comissão da Verdade em Minas Gerais como torturador. "
        f"{t['citacoes']} citações em fontes da Covemg."
    )
    texto = (
        f"{nome} foi identificado pela Comissão da Verdade em Minas Gerais (Covemg) "
        f"como torturador durante a ditadura militar-empresarial. "
        f"Seu nome consta da Lista de Torturadores da Covemg, com {t['citacoes']} "
        f"citações nas fontes consultadas pela comissão.\n\n"
        f"A lista foi elaborada a partir do cruzamento de declarações de presos "
        f"políticos, dos registros do Conselho Estadual de Direitos Humanos (CONEDH), "
        f"dos volumes do projeto Brasil Nunca Mais e de outros documentos do acervo "
        f"da Covemg.\n\n"
        f"{PARAGRAFO_IMPUNIDADE}"
    )

    return {
        "slug": slug,
        "nome": nome,
        "tipo": "perpetrador",
        "resumo_1_linha": resumo[:200],
        "municipio": "Belo Horizonte",
        "uf": "MG",
        "status_curadoria": "publicada",
        "texto_md": texto,
        "fontes": [
            {
                "fonte_id": fonte_id,
                "paginas": "Lista de Torturadores da Covemg",
                "trecho": f"{nome} — {t['citacoes']} citações — Fontes: {t['fontes_str']}",
                "secao": "Lista de torturadores com fontes consultadas",
            }
        ],
        "marcadores": [],
    }


# ===================================================================
# MAIN
# ===================================================================
def _carregar_fonte_ids() -> dict:
    """Retorna mapeamento de fonte_id para cada documento Covemg.

    O fonte_id do Relatório Final da Covemg foi extraído de biografias existentes
    que já referenciam essa fonte no banco. Os demais documentos usam o mesmo
    fonte_id porque seus dados (planilha, lista de torturadores) estão contidos
    ou referenciados no próprio Relatório Final.
    """
    FONTE_ID_COVEMG = "faa5ff3d-b4dc-4873-8b6c-2206816baee1"
    return {
        FONTE_COVEMG_PLANILHA: FONTE_ID_COVEMG,
        FONTE_COVEMG_TORTURADORES: FONTE_ID_COVEMG,
        FONTE_COVEMG_ACONTECIMENTOS: FONTE_ID_COVEMG,
        FONTE_COVEMG_RELATORIO: FONTE_ID_COVEMG,
    }


# ===================================================================
# PARSER: Locais de repressão e tortura (Relatório Final, Cap. 4)
# ===================================================================
def _parse_locais_repressao() -> list:
    """Extrai locais de repressão do Capítulo 4 do Relatório Final Covemg.

    Estratégia:
    1. Tabelas Nome/Cidade (páginas 300-301): pares alternados
    2. Lista de BH (páginas 301-302): só nomes, cidade = Belo Horizonte
    3. Listas numeradas (páginas 307-309): itens tipo '1- Delegacia de Além-Paraíba'
    4. Subtítulos de seções 4.4+ (páginas 309+): locais emblemáticos
    """
    jsonl = CHUNKS / f"{FONTE_COVEMG_RELATORIO}.jsonl"
    if not jsonl.exists():
        print(f"AVISO: {jsonl} não encontrado.")
        return []

    with open(jsonl) as f:
        chunks = [json.loads(l) for l in f if l.strip()]

    cap4 = [c for c in chunks if c.get("secao") and "4." in str(c["secao"]) and "Locais" in str(c["secao"])]

    locais = {}

    _NOME_INSTITUICAO = re.compile(
        r"^(?:Delegacia|Cadeia Pública|Penitenciária|Batalhão|Quartel|"
        r"Colônia Penal|Reformatório|Presídio|Base Aérea|Capitania|"
        r"Complexo Penitenciário|Regimento|Casa de Detenção|DOI|DOPS|"
        r"CENIMAR|Auditoria|Penitenciária Feminina|Cooperativa dos Médicos|"
        r"Casa de Saúde|Hospital|Departamento de|Secretaria de|Hotel|"
        r"Instituto|Pronto[- ]Socorro|Grupo Escolar|Sindicato dos|"
        r"Associação|Colégio|Faculdade|Universidade|Sede|Aeroporto|"
        r"Granja|Sítio|Fazenda|Estação|Fórum)",
        re.IGNORECASE,
    )

    _CIDADE = re.compile(
        r"^(?:[A-ZÁÉÍÓÚÂÊÎÔÛÃÕÀÇ][a-záéíóúâêîôûãõàç]+(?:\s+(?:de|da|do|das|dos)\s+[A-ZÁÉÍÓÚÂÊÎÔÛÃÕÀÇ][a-záéíóúâêîôûãõàç]+)*)$"
    )

    for c in cap4:
        pag = str(c.get("paginas", ""))
        nums = re.findall(r"\d+", pag)
        pagina = int(nums[0]) if nums else 0

        linhas = c["conteudo"].split("\n")

        if 300 <= pagina <= 302:
            # Tabela de interior: pares alternados Nome / Cidade
            i = 0
            while i < len(linhas):
                linha = linhas[i].strip()
                if _NOME_INSTITUICAO.match(linha) and i + 1 < len(linhas):
                    prox = linhas[i + 1].strip()
                    if _CIDADE.match(prox) and len(prox) > 2:
                        locais[linha] = (prox, "MG")
                        i += 2
                        continue
                    elif prox in ("Bairro Serra", "Bairro São Lucas", "Bairro Santa Efigênia",
                                  "Bairro Nova Suíssa", "Bairro Floresta", "Bairro Lagoinha",
                                  "Bairro Santo Antônio", "Bairro Santa Tereza", "Bairro Funcionários",
                                  "Centro", "Praça da Liberdade"):
                        locais[linha] = ("Belo Horizonte", "MG")
                        i += 2
                        continue
                i += 1

        if pagina >= 307 and pagina <= 309:
            # Listas numeradas
            for linha in linhas:
                m = re.match(r"^\d+[-–]\s*(.+)", linha.strip())
                if m:
                    nome = m.group(1).strip()
                    if _NOME_INSTITUICAO.match(nome) or any(
                        kw in nome.lower() for kw in (
                            "delegacia", "cadeia", "batalhão", "penitenciária",
                            "colônia", "regimento", "reformatório", "quartel",
                            "presídio", "capitania", "complexo", "base",
                        )
                    ):
                        # Tenta inferir cidade pelo nome do local
                        cidade = _extrair_cidade_de_nome(nome)
                        locais[nome] = cidade

        # Locais emblemáticos (seções 4.4+)
        if pagina >= 309:
            for linha in linhas:
                linha = linha.strip()
                if re.match(r"^\d+\.\d+\s", linha):
                    # Subtítulo de seção: extrai nome do local
                    nome = re.sub(r"^\d+\.\d+\s*", "", linha).strip()
                    if len(nome) > 5 and len(nome) < 100:
                        cidade = _extrair_cidade_de_nome(nome)
                        locais[nome] = cidade

    # Instituições de BH (páginas 300-302) sem cidade explícita
    for c in cap4:
        pag = str(c.get("paginas", ""))
        nums = re.findall(r"\d+", pag)
        pagina = int(nums[0]) if nums else 0
        if 300 <= pagina <= 302:
            linhas = c["conteudo"].split("\n")
            for i, linha in enumerate(linhas):
                linha = linha.strip()
                if _NOME_INSTITUICAO.match(linha) and linha not in locais:
                    # Verifica se a próxima linha é um bairro (BH)
                    if i + 1 < len(linhas):
                        prox = linhas[i + 1].strip()
                        if prox.startswith("Bairro ") or prox in (
                            "Centro", "Praça da Liberdade", "Funcionários",
                        ):
                            locais[linha] = ("Belo Horizonte", "MG")

    # Converte para lista de dicts
    resultado = []
    for nome, (municipio, uf) in locais.items():
        # Limpa nome
        nome_limpo = re.sub(r"\s{2,}", " ", nome).strip()
        slug = slugify(f"local-repressao-{nome_limpo}")
        resultado.append({
            "slug": slug,
            "nome": nome_limpo,
            "municipio": municipio,
            "uf": uf,
        })

    return resultado


def _extrair_cidade_de_nome(nome: str) -> tuple:
    """Tenta extrair cidade do nome do local. Fallback: Belo Horizonte."""
    nome = nome.strip().rstrip(".")
    # Padrões: "Delegacia de Barbacena" → Barbacena
    m = re.search(r"(?:de|da|do|das|dos)\s+([A-ZÁÉÍÓÚÂÊÎÔÛÃÕÀÇ][^\n,]{2,40})$", nome)
    if m:
        cidade = m.group(1).strip()
        if cidade.lower() not in ("minas gerais", "belo horizonte", "polícia", "combate"):
            return (cidade, "MG")
    # Padrão: "Penitenciária X em Y" ou "Penitenciária X - Y"
    m = re.search(r"(?:em|[-–])\s+([A-ZÁÉÍÓÚÂÊÎÔÛÃÕÀÇ][^\n,]{2,40})$", nome)
    if m:
        cidade = m.group(1).strip()
        return (cidade, "MG")
    return ("Belo Horizonte", "MG")


def montar_evento_local_repressao(local: dict, fonte_id: str) -> dict:
    """Monta evento_geo para local de repressão."""
    return {
        "slug": local["slug"],
        "titulo": local["nome"],
        "tipo_evento": "violencia_institucional_coletiva",
        "tipos_crime": ["tortura", "prisao_ilegal_arbitraria", "desaparecimento_forcado"],
        "data": "1964-04-01",
        "municipio": local["municipio"],
        "uf": local["uf"],
        "status_curadoria": "rascunho",
        "descricao": (
            f"{local['nome']} foi identificado pela Comissão da Verdade em Minas Gerais "
            f"(Covemg) como local utilizado para repressão, detenção e/ou tortura de "
            f"opositores políticos durante a ditadura militar-empresarial (1964–1985). "
            f"Consta do Capítulo 4 do Relatório Final da Covemg, dedicado aos "
            f"\"Locais de Repressão e Tortura\"."
        ),
        "vitimas": [],
        "fontes": [
            {
                "fonte_id": fonte_id,
                "paginas": "294-310",
                "trecho": f"{local['nome']} — Capítulo 4 — Locais de Repressão e Tortura",
                "secao": "Capítulo 4 — Locais de Repressão e Tortura",
            }
        ],
    }


def main():
    dry_run = "--dry-run" in sys.argv
    so_bio = "--so-bio" in sys.argv
    so_eventos = "--so-eventos" in sys.argv

    print("=" * 60)
    print("GERADOR DE FICHAS COVEMG")
    print("=" * 60)

    # --- Planilha de mineiros (vítimas) ---
    print("\n[1/4] Parseando planilha de mineiros mortos/desaparecidos...")
    vitimas = _parse_planilha_502()
    print(f"  {len(vitimas)} vítimas encontradas.")

    # --- Lista de torturadores (perpetradores) ---
    print("\n[2/4] Parseando lista de torturadores...")
    torturadores = _parse_torturadores_316()
    print(f"  {len(torturadores)} torturadores encontrados.")

    # --- Perfis complementares ---
    print("\n[3/4] Parseando perfis detalhados...")
    perfis = _parse_perfis_341()
    print(f"  {len(perfis)} perfis encontrados.")

    # --- Locais de repressão ---
    print("\n[4/4] Parseando locais de repressão e tortura...")
    locais_repressao = _parse_locais_repressao()
    print(f"  {len(locais_repressao)} locais de repressão encontrados.")

    # --- Carrega fonte_ids ---
    fonte_ids = _carregar_fonte_ids()

    # --- Verifica existentes ---
    bios_existentes = set(f.stem for f in BIO_DIR.glob("*.json"))
    eventos_existentes = set(f.stem for f in EVENTOS_DIR.glob("*.json"))
    print(f"\nBiografias já existentes: {len(bios_existentes)}")
    print(f"Eventos já existentes: {len(eventos_existentes)}")

    # --- Gera biografias de vítimas ---
    criadas_bio = 0
    criados_eventos = 0
    puladas_bio = 0
    pulados_eventos = 0
    sem_localidade = 0

    FONTE_ID = fonte_ids.get(FONTE_COVEMG_PLANILHA, "faa5ff3d-b4dc-4873-8b6c-2206816baee1")
    fonte_id_planilha = FONTE_ID
    fonte_id_tort = FONTE_ID

    if not so_eventos:
        print("\n--- Gerando biografias de vítimas ---")
        for v in vitimas:
            slug = v.get("slug") or slugify(v["nome"])
            if slug in bios_existentes:
                puladas_bio += 1
                continue

            if dry_run:
                bio = montar_biografia_vitima(v, fonte_id_planilha)
                print(f"\n=== DRY-RUN: {v['nome']} ===")
                print(json.dumps(bio, ensure_ascii=False, indent=2)[:1000])
                print("(dry-run: nenhum arquivo gravado)")
                return

            bio = montar_biografia_vitima(v, fonte_id_planilha)
            destino = BIO_DIR / f"{slug}.json"
            destino.write_text(json.dumps(bio, ensure_ascii=False, indent=2), encoding="utf-8")
            criadas_bio += 1

            if criadas_bio % 20 == 0:
                print(f"  ... {criadas_bio} biografias criadas (último: {v['nome']})")

    if not so_bio:
        print("\n--- Gerando eventos de vítimas ---")
        for v in vitimas:
            slug_evento = f"morte-{slugify(v['nome'])}"
            if slug_evento in eventos_existentes:
                pulados_eventos += 1
                continue

            if dry_run:
                ev = montar_evento_vitima(v, fonte_id_planilha)
                if ev:
                    print(f"\nEvento: {ev['titulo']}")
                    print(json.dumps(ev, ensure_ascii=False, indent=2)[:500])
                return

            ev = montar_evento_vitima(v, fonte_id_planilha)
            if ev:
                destino = EVENTOS_DIR / f"{slug_evento}.json"
                destino.write_text(json.dumps(ev, ensure_ascii=False, indent=2), encoding="utf-8")
                criados_eventos += 1
            else:
                sem_localidade += 1

    # --- Gera biografias de perpetradores ---
    if not so_eventos:
        print("\n--- Gerando biografias de perpetradores ---")
        for t in torturadores:
            slug = slugify(t["nome"])
            if slug in bios_existentes:
                puladas_bio += 1
                continue

            if dry_run:
                bio = montar_biografia_perpetrador(t, fonte_id_tort)
                print(f"\n=== DRY-RUN perpetrador: {t['nome']} ===")
                print(json.dumps(bio, ensure_ascii=False, indent=2)[:800])
                return

            bio = montar_biografia_perpetrador(t, fonte_id_tort)
            destino = BIO_DIR / f"{slug}.json"
            destino.write_text(json.dumps(bio, ensure_ascii=False, indent=2), encoding="utf-8")
            criadas_bio += 1

            if criadas_bio % 20 == 0:
                print(f"  ... {criadas_bio} biografias criadas (último perpetrador: {t['nome']})")

    # --- Gera eventos de locais de repressão ---
    if not so_bio:
        print("\n--- Gerando eventos de locais de repressão ---")
        for local in locais_repressao:
            slug = local["slug"]
            if slug in eventos_existentes:
                pulados_eventos += 1
                continue

            ev = montar_evento_local_repressao(local, fonte_id_planilha)
            destino = EVENTOS_DIR / f"{slug}.json"
            destino.write_text(json.dumps(ev, ensure_ascii=False, indent=2), encoding="utf-8")
            criados_eventos += 1

    # --- Relatório ---
    print(f"\n{'=' * 60}")
    print("RESULTADO")
    print(f"  Vítimas parseadas: {len(vitimas)}")
    print(f"  Torturadores parseados: {len(torturadores)}")
    print(f"  Locais de repressão: {len(locais_repressao)}")
    print(f"  Biografias geradas: {criadas_bio}  (puladas: {puladas_bio})")
    print(f"  Eventos gerados: {criados_eventos}  (pulados: {pulados_eventos})")
    print(f"  Sem localidade: {sem_localidade}")
    print(f"\nPróximo passo: rodar 06_semear_curadoria.py para enviar ao Supabase.")


if __name__ == "__main__":
    main()
