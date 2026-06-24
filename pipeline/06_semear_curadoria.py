"""Seed da curadoria (Fase 6): biografias e eventos_geo no Supabase.

Lê os arquivos curados em pipeline/dados/curadoria/{biografias,eventos}/*.json,
valida contra os vocabulários de docs/taxonomia.md e insere no banco.

Idempotente: biografias por `slug`, eventos por `slug` (campo só do arquivo;
no banco a chave de reaproveitamento é o `titulo`). Registro existente é
atualizado — citações e marcadores são regravados. Nada é apagado além das
linhas de ligação do próprio registro reprocessado.

Uso:
    .venv/bin/python 06_semear_curadoria.py
"""

import json
import os
import re
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client

RAIZ = Path(__file__).resolve().parent
DIR_BIOGRAFIAS = RAIZ / "dados" / "curadoria" / "biografias"
DIR_EVENTOS = RAIZ / "dados" / "curadoria" / "eventos"

# Vocabulários fechados — docs/taxonomia.md (seções 6, 6.2 e 6.3) e migrações 0006/0007/0008/0012/0013.
# `tipo` espelha o constraint biografias_tipo_check (migração 0012: 'sobrevivente'
# unificado em 'vitima'; 'perpetrador' habilitado para a fase de agentes da repressão).
TIPOS_BIOGRAFIA = {"vitima", "perpetrador", "local", "organizacao"}
MARCADORES = {
    "classe_trabalhadora", "campesinato", "classe_media",
    "negro", "indigena", "mulher", "lgbt", "estrangeiro_imigrante",
    "estudante", "religioso_a", "militar_oposicao", "jornalista", "advogado_a",
}
TIPOS_CRIME = {
    "prisao_ilegal_arbitraria", "tortura", "execucao_sumaria",
    "desaparecimento_forcado", "ocultacao_de_cadaver", "violencia_sexual",
    "violencia_contra_povos_indigenas", "perseguicao_exilio_banimento",
    "censura", "atentado_a_populacao_civil",
    "grilagem_de_territorio_indigena", "apagamento_de_registros_e_testemunhos",
}
TIPOS_EVENTO = {
    "caso_individual", "operacao_repressiva", "guerrilha_confronto",
    "violencia_institucional_coletiva", "ato_censura",
}
GEOMETRIAS = {"Point", "Polygon", "MultiPolygon"}


def validar_citacao(c: dict, origem: str) -> None:
    for campo in ("fonte_id", "paginas", "trecho"):
        if not c.get(campo):
            raise SystemExit(f"{origem}: citação sem campo obrigatório '{campo}'.")


def validar_biografia(d: dict, origem: str) -> None:
    if d["tipo"] not in TIPOS_BIOGRAFIA:
        raise SystemExit(f"{origem}: tipo inválido '{d['tipo']}'.")
    if not d.get("fontes"):
        raise SystemExit(f"{origem}: biografia sem fontes (princípio 3).")
    for c in d["fontes"]:
        validar_citacao(c, origem)
    for m in d.get("marcadores", []):
        if m["marcador"] not in MARCADORES:
            raise SystemExit(f"{origem}: marcador inválido '{m['marcador']}'.")
        validar_citacao(m, origem)  # ADR-001: marcador sempre com fonte
    validar_naturalidade_periodo(d, origem)
    validar_territorio_origem(d, origem)
    validar_vinculos(d, origem)


def validar_vinculos(d: dict, origem: str) -> None:
    """Vínculos a organizações (ADR-016, decisão 3; ADR-017).

    Cada vínculo cita uma fonte (princípio 3) e aponta para o `slug` de uma
    biografia tipo='organizacao'. `nota_vinculo` é obrigatória para perpetradores
    (vínculo a órgão repressivo) — espelha a constraint do banco (migração 0014).
    A existência e o tipo da organização são checados no segundo passo, quando os
    ids já estão resolvidos.
    """
    for v in d.get("organizacoes", []):
        if not v.get("slug"):
            raise SystemExit(f"{origem}: vínculo sem 'slug' de organização.")
        validar_citacao(v, origem)
        if d["tipo"] == "perpetrador" and not v.get("nota_vinculo"):
            raise SystemExit(
                f"{origem}: vínculo a '{v['slug']}' sem 'nota_vinculo' "
                f"(obrigatória para perpetrador — ADR-016)."
            )


def validar_naturalidade_periodo(d: dict, origem: str) -> None:
    """Checagens leves dos campos do ADR-016 (todos opcionais)."""
    if d.get("municipio_natal") and not d.get("uf_natal"):
        # Sem UF não dá para casar com a municipios_ibge nem desambiguar homônimos.
        raise SystemExit(f"{origem}: 'municipio_natal' exige 'uf_natal' (ADR-016).")
    uf = d.get("uf_natal")
    if uf and not (isinstance(uf, str) and len(uf) == 2 and uf.isalpha()):
        raise SystemExit(f"{origem}: 'uf_natal' deve ter 2 letras (recebido '{uf}').")
    for campo in ("data_inicio", "data_fim"):
        v = d.get(campo)
        if v is not None and not re.fullmatch(r"\d{4}-\d{2}-\d{2}", str(v)):
            raise SystemExit(f"{origem}: '{campo}' deve ser YYYY-MM-DD (recebido '{v}').")
    ini, fim = d.get("data_inicio"), d.get("data_fim")
    if ini and fim and ini > fim:
        raise SystemExit(f"{origem}: 'data_inicio' ({ini}) posterior a 'data_fim' ({fim}).")


def validar_territorio_origem(d: dict, origem: str) -> None:
    """Checagens dos campos de origem territorial (migração 0016, ADR-016 decisão 1/2).

    Campos opcionais: povo_origem, terra_indigena_codigo, terra_indigena_nome,
    geometria_origem_ponto, geometria_origem_raio_km. Regras:
    - povo_origem: string não-vazia se presente
    - terra_indigena_codigo: inteiro positivo se presente
    - terra_indigena_nome: string não-vazia se presente
    - geometria_origem_ponto: [lat, lng] (dois floats) se presente
    - geometria_origem_raio_km: inteiro > 0 se presente
    - Via A (terra_indigena_codigo) e Via B (geometria_origem_ponto) são
      mutuamente exclusivas (não podem coexistir)
    - Raio sem ponto é inválido: se raio está preenchido, ponto obrigatório
    """
    povo = d.get("povo_origem")
    if povo is not None and (not isinstance(povo, str) or not povo.strip()):
        raise SystemExit(f"{origem}: 'povo_origem' deve ser string não-vazia (recebido '{povo}').")

    cod_ti = d.get("terra_indigena_codigo")
    if cod_ti is not None and (not isinstance(cod_ti, int) or cod_ti <= 0):
        raise SystemExit(f"{origem}: 'terra_indigena_codigo' deve ser inteiro > 0 (recebido '{cod_ti}').")

    nome_ti = d.get("terra_indigena_nome")
    if nome_ti is not None and (not isinstance(nome_ti, str) or not nome_ti.strip()):
        raise SystemExit(f"{origem}: 'terra_indigena_nome' deve ser string não-vazia (recebido '{nome_ti}').")

    geom_ponto = d.get("geometria_origem_ponto")
    if geom_ponto is not None:
        if not isinstance(geom_ponto, list) or len(geom_ponto) != 2:
            raise SystemExit(
                f"{origem}: 'geometria_origem_ponto' deve ser [lat, lng] (recebido '{geom_ponto}')."
            )
        if not all(isinstance(v, (int, float)) for v in geom_ponto):
            raise SystemExit(
                f"{origem}: 'geometria_origem_ponto' coordenadas devem ser números (recebido '{geom_ponto}')."
            )

    raio = d.get("geometria_origem_raio_km")
    if raio is not None and (not isinstance(raio, int) or raio <= 0):
        raise SystemExit(f"{origem}: 'geometria_origem_raio_km' deve ser inteiro > 0 (recebido '{raio}').")

    # Validação de exclusividade: Via A vs Via B
    if cod_ti is not None and geom_ponto is not None:
        raise SystemExit(
            f"{origem}: 'terra_indigena_codigo' e 'geometria_origem_ponto' "
            f"são mutuamente exclusivas (ADR-016). Especifique apenas uma via."
        )

    # Validação: raio sem ponto é inválido
    if raio is not None and geom_ponto is None:
        raise SystemExit(
            f"{origem}: 'geometria_origem_raio_km' exige 'geometria_origem_ponto' "
            f"(raio sem ponto é inválido)."
        )


def validar_evento(d: dict, origem: str, slugs_biografias: set) -> None:
    if d["tipo_evento"] not in TIPOS_EVENTO:
        raise SystemExit(f"{origem}: tipo_evento inválido '{d['tipo_evento']}'.")
    invalidos = set(d["tipos_crime"]) - TIPOS_CRIME
    if invalidos or not d["tipos_crime"]:
        raise SystemExit(f"{origem}: tipos_crime inválidos {sorted(invalidos)}.")
    if d["geometria"].get("type") not in GEOMETRIAS:
        raise SystemExit(f"{origem}: geometria deve ser Point/Polygon/MultiPolygon (ADR-003).")
    if not d.get("fontes"):
        raise SystemExit(f"{origem}: evento sem fontes (princípio 3).")
    for c in d["fontes"]:
        validar_citacao(c, origem)
    for m in d.get("marcadores", []):
        if m["marcador"] not in MARCADORES:
            raise SystemExit(f"{origem}: marcador inválido '{m['marcador']}'.")
        validar_citacao(m, origem)
    desconhecidas = set(d.get("vitimas", [])) - slugs_biografias
    if desconhecidas:
        raise SystemExit(f"{origem}: vítimas sem biografia no lote/banco: {sorted(desconhecidas)}.")


def carregar(diretorio: Path) -> list[tuple[str, dict]]:
    return [
        (arq.name, json.loads(arq.read_text(encoding="utf-8")))
        for arq in sorted(diretorio.glob("*.json"))
    ]


def regravar_ligacoes(supabase, tabela: str, coluna_id: str, valor_id: str, linhas: list[dict]) -> None:
    supabase.table(tabela).delete().eq(coluna_id, valor_id).execute()
    if linhas:
        supabase.table(tabela).insert(linhas).execute()


def resolver_organizacao(supabase, slug: str, ids: dict, tipos: dict, origem: str) -> str:
    """Resolve o slug de uma organização para seu id, exigindo tipo='organizacao'.

    Procura primeiro no lote em processamento; se não estiver, consulta o banco
    (a organização pode já existir de uma rodada anterior). A FK composta de
    pessoa_organizacoes também barra organizações de outro tipo no banco; esta
    checagem dá uma mensagem de erro clara antes do insert.
    """
    if slug in ids:
        if tipos.get(slug) != "organizacao":
            raise SystemExit(
                f"{origem}: vínculo aponta para '{slug}', que é "
                f"'{tipos.get(slug)}', não 'organizacao'."
            )
        return ids[slug]
    resp = (
        supabase.table("biografias").select("biografia_id, tipo")
        .eq("slug", slug).execute()
    )
    if not resp.data:
        raise SystemExit(f"{origem}: organização '{slug}' não existe (nem no lote nem no banco).")
    if resp.data[0]["tipo"] != "organizacao":
        raise SystemExit(
            f"{origem}: vínculo aponta para '{slug}', que é "
            f"'{resp.data[0]['tipo']}', não 'organizacao'."
        )
    return resp.data[0]["biografia_id"]


def citacoes(linhas: list[dict], coluna_id: str, valor_id: str, com_ordem: bool) -> list[dict]:
    saida = []
    for i, c in enumerate(linhas, start=1):
        linha = {
            coluna_id: valor_id,
            "fonte_id": c["fonte_id"],
            "paginas": c["paginas"],
            "trecho": c["trecho"],
            "secao": c.get("secao"),
        }
        if com_ordem:
            linha["ordem"] = i
        if "marcador" in c:
            linha["marcador"] = c["marcador"]
        saida.append(linha)
    return saida


def main() -> None:
    load_dotenv(RAIZ.parent / ".env.local")
    supabase = create_client(
        os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    )

    biografias = carregar(DIR_BIOGRAFIAS)
    eventos = carregar(DIR_EVENTOS)
    slugs = {d["slug"] for _, d in biografias}

    for origem, d in biografias:
        validar_biografia(d, origem)
    for origem, d in eventos:
        validar_evento(d, origem, slugs)
    print(f"Validação ok: {len(biografias)} biografias, {len(eventos)} eventos.")

    ids_biografias: dict[str, str] = {}
    tipos_biografias: dict[str, str] = {}
    for origem, d in biografias:
        # geometria_origem_ponto: JSON vem como [lat, lng]; converter para GeoJSON Point.
        # GeoJSON usa [lng, lat] — inverter!
        geom_ponto_geojson = None
        if d.get("geometria_origem_ponto"):
            lat, lng = d["geometria_origem_ponto"]
            geom_ponto_geojson = {"type": "Point", "coordinates": [lng, lat]}

        registro = {
            "slug": d["slug"], "nome": d["nome"], "tipo": d["tipo"],
            "resumo_1_linha": d["resumo_1_linha"], "texto_md": d["texto_md"],
            "municipio": d.get("municipio"), "uf": d.get("uf"),
            # ADR-016: naturalidade e período de atuação/perseguição (curadoria,
            # opcionais). As coordenadas lat_natal/lng_natal NÃO vêm do JSON —
            # são derivadas da municipios_ibge pelo 10_preencher_naturalidades.py.
            "municipio_natal": d.get("municipio_natal"),
            "uf_natal": d["uf_natal"].upper() if d.get("uf_natal") else None,
            "data_inicio": d.get("data_inicio"),
            "data_fim": d.get("data_fim"),
            # Origem territorial (migração 0016, ADR-016 decisão 1/2): opcionais.
            "povo_origem": d.get("povo_origem"),
            "terra_indigena_codigo": d.get("terra_indigena_codigo"),
            "terra_indigena_nome": d.get("terra_indigena_nome"),
            "geometria_origem_ponto": geom_ponto_geojson,
            "geometria_origem_raio_km": d.get("geometria_origem_raio_km"),
            "status_curadoria": d.get("status_curadoria", "rascunho"),
        }
        resp = supabase.table("biografias").upsert(registro, on_conflict="slug").execute()
        bid = resp.data[0]["biografia_id"]
        ids_biografias[d["slug"]] = bid
        tipos_biografias[d["slug"]] = d["tipo"]
        regravar_ligacoes(supabase, "biografia_fontes", "biografia_id", bid,
                          citacoes(d["fontes"], "biografia_id", bid, com_ordem=True))
        regravar_ligacoes(supabase, "biografia_marcadores", "biografia_id", bid,
                          citacoes(d.get("marcadores", []), "biografia_id", bid, com_ordem=False))
        print(f"  biografia: {d['slug']} ({d['status_curadoria']})")

    # Segundo passo: vínculos pessoa→organização (ADR-016 decisão 3; ADR-017).
    # Feito após o upsert de todas as biografias, para que os ids das organizações
    # já existam. Idempotente: regrava as linhas da própria pessoa.
    for origem, d in biografias:
        if not d.get("organizacoes"):
            continue
        pessoa_id = ids_biografias[d["slug"]]
        linhas = []
        for v in d["organizacoes"]:
            org_id = resolver_organizacao(
                supabase, v["slug"], ids_biografias, tipos_biografias, origem
            )
            linhas.append({
                "pessoa_id": pessoa_id,
                "pessoa_tipo": d["tipo"],
                "organizacao_id": org_id,
                "organizacao_tipo": "organizacao",
                "fonte_id": v["fonte_id"],
                "paginas": v["paginas"],
                "trecho": v["trecho"],
                "secao": v.get("secao"),
                "nota_vinculo": v.get("nota_vinculo"),
            })
        regravar_ligacoes(supabase, "pessoa_organizacoes", "pessoa_id", pessoa_id, linhas)
        print(f"  vínculos: {d['slug']} → {len(linhas)} organização(ões)")

    for origem, d in eventos:
        registro = {
            "titulo": d["titulo"], "data": d["data"],
            "municipio": d["municipio"], "uf": d["uf"],
            "geometria": d["geometria"], "descricao_md": d["descricao_md"],
            "tipo_evento": d["tipo_evento"], "tipos_crime": d["tipos_crime"],
            "status_curadoria": d.get("status_curadoria", "rascunho"),
        }
        existente = (
            supabase.table("eventos_geo").select("evento_id")
            .eq("titulo", d["titulo"]).execute()
        )
        if existente.data:
            eid = existente.data[0]["evento_id"]
            supabase.table("eventos_geo").update(registro).eq("evento_id", eid).execute()
        else:
            eid = supabase.table("eventos_geo").insert(registro).execute().data[0]["evento_id"]
        regravar_ligacoes(supabase, "evento_fontes", "evento_id", eid,
                          citacoes(d["fontes"], "evento_id", eid, com_ordem=True))
        regravar_ligacoes(supabase, "evento_marcadores", "evento_id", eid,
                          citacoes(d.get("marcadores", []), "evento_id", eid, com_ordem=False))
        vitimas = [
            {"evento_id": eid, "biografia_id": ids_biografias[s]}
            for s in d.get("vitimas", [])
        ]
        regravar_ligacoes(supabase, "evento_vitimas", "evento_id", eid, vitimas)
        print(f"  evento: {d['slug']} ({d['status_curadoria']})")

    print("Seed concluído.")


if __name__ == "__main__":
    main()
