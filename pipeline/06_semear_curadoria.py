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
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client

RAIZ = Path(__file__).resolve().parent
DIR_BIOGRAFIAS = RAIZ / "dados" / "curadoria" / "biografias"
DIR_EVENTOS = RAIZ / "dados" / "curadoria" / "eventos"

# Vocabulários fechados — docs/taxonomia.md (seções 6, 6.2 e 6.3) e migrações 0006/0007/0008/0012.
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
    for origem, d in biografias:
        registro = {
            "slug": d["slug"], "nome": d["nome"], "tipo": d["tipo"],
            "resumo_1_linha": d["resumo_1_linha"], "texto_md": d["texto_md"],
            "municipio": d.get("municipio"), "uf": d.get("uf"),
            "status_curadoria": d.get("status_curadoria", "rascunho"),
        }
        resp = supabase.table("biografias").upsert(registro, on_conflict="slug").execute()
        bid = resp.data[0]["biografia_id"]
        ids_biografias[d["slug"]] = bid
        regravar_ligacoes(supabase, "biografia_fontes", "biografia_id", bid,
                          citacoes(d["fontes"], "biografia_id", bid, com_ordem=True))
        regravar_ligacoes(supabase, "biografia_marcadores", "biografia_id", bid,
                          citacoes(d.get("marcadores", []), "biografia_id", bid, com_ordem=False))
        print(f"  biografia: {d['slug']} ({d['status_curadoria']})")

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
