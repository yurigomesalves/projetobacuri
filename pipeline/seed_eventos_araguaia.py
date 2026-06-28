"""Seed direcionado dos 3 eventos do Araguaia (vítimas negras), reusando as
funções do 06_semear_curadoria.py. Liga cada evento à biografia já existente.
Idempotente por titulo. Uso: python3 pipeline/seed_eventos_araguaia.py
"""

import importlib.util
import json
import os
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client

RAIZ = Path(__file__).resolve().parent
load_dotenv(RAIZ.parent / ".env.local")

spec = importlib.util.spec_from_file_location("semear", RAIZ / "06_semear_curadoria.py")
semear = importlib.util.module_from_spec(spec)
spec.loader.exec_module(semear)

SLUGS = ["araguaia-francisco-manoel-chaves", "araguaia-lucia-maria-de-souza",
         "araguaia-dermeval-da-silva-pereira"]


def main():
    sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])
    base = RAIZ / "dados" / "curadoria" / "eventos"
    eventos = [(s + ".json", json.loads((base / f"{s}.json").read_text(encoding="utf-8")))
               for s in SLUGS]

    # resolve biografia_id das vítimas no banco
    vit_slugs = {v for _, d in eventos for v in d.get("vitimas", [])}
    ids = {}
    for vs in vit_slugs:
        r = sb.table("biografias").select("biografia_id").eq("slug", vs).execute()
        if not r.data:
            raise SystemExit(f"vítima '{vs}' não existe no banco — semeie a biografia antes.")
        ids[vs] = r.data[0]["biografia_id"]

    for origem, d in eventos:
        semear.validar_evento(d, origem, set(d.get("vitimas", [])))

    for origem, d in eventos:
        registro = {
            "titulo": d["titulo"], "data": d["data"],
            "municipio": d["municipio"], "uf": d["uf"],
            "geometria": d["geometria"], "descricao_md": d["descricao_md"],
            "tipo_evento": d["tipo_evento"], "tipos_crime": d["tipos_crime"],
            "status_curadoria": d.get("status_curadoria", "rascunho"),
        }
        existe = sb.table("eventos_geo").select("evento_id").eq("titulo", d["titulo"]).execute()
        if existe.data:
            eid = existe.data[0]["evento_id"]
            sb.table("eventos_geo").update(registro).eq("evento_id", eid).execute()
        else:
            eid = sb.table("eventos_geo").insert(registro).execute().data[0]["evento_id"]
        semear.regravar_ligacoes(sb, "evento_fontes", "evento_id", eid,
                                 semear.citacoes(d["fontes"], "evento_id", eid, com_ordem=True))
        semear.regravar_ligacoes(sb, "evento_marcadores", "evento_id", eid,
                                 semear.citacoes(d.get("marcadores", []), "evento_id", eid, com_ordem=False))
        vit = [{"evento_id": eid, "biografia_id": ids[s]} for s in d.get("vitimas", [])]
        semear.regravar_ligacoes(sb, "evento_vitimas", "evento_id", eid, vit)
        print(f"  evento: {d['slug']} ({d['status_curadoria']})")
    print("Seed de eventos do Araguaia concluído.")


if __name__ == "__main__":
    main()
