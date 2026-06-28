"""Seed DIRECIONADO do lote de vítimas negras (9 fichas), reusando a validação e
as funções do 06_semear_curadoria.py. Evita reprocessar as 536 biografias do
diretório (economia de chamadas no free tier). Idempotente por slug.

Uso: python3 pipeline/seed_lote_negras.py
"""

import importlib.util
import json
import os
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client

RAIZ = Path(__file__).resolve().parent
load_dotenv(RAIZ.parent / ".env.local")

# importa o 06_semear (nome começa com dígito -> importlib por caminho)
spec = importlib.util.spec_from_file_location("semear", RAIZ / "06_semear_curadoria.py")
semear = importlib.util.module_from_spec(spec)
spec.loader.exec_module(semear)

SLUGS = [
    "robson-silveira-da-luz", "francisco-manoel-chaves", "raimundo-eduardo-da-silva",
    "lucia-maria-de-souza", "ieda-santos-delgado", "alceri-maria-gomes-da-silva",
    "joel-vasconcelos-dos-santos", "roberto-cieto", "dermeval-da-silva-pereira",
]


def main():
    supabase = create_client(
        os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    )
    base = RAIZ / "dados" / "curadoria" / "biografias"
    fichas = [(s + ".json", json.loads((base / f"{s}.json").read_text(encoding="utf-8")))
              for s in SLUGS]

    for origem, d in fichas:
        semear.validar_biografia(d, origem)
        if d.get("organizacoes"):
            raise SystemExit(f"{origem}: tem 'organizacoes' — use o 06_semear completo.")
    print(f"Validação ok: {len(fichas)} biografias.")

    for origem, d in fichas:
        registro = {
            "slug": d["slug"], "nome": d["nome"], "tipo": d["tipo"],
            "resumo_1_linha": d["resumo_1_linha"], "texto_md": d["texto_md"],
            "municipio": d.get("municipio"), "uf": d.get("uf"),
            "municipio_natal": d.get("municipio_natal"),
            "uf_natal": d["uf_natal"].upper() if d.get("uf_natal") else None,
            "data_inicio": d.get("data_inicio"), "data_fim": d.get("data_fim"),
            "status_curadoria": d.get("status_curadoria", "rascunho"),
        }
        resp = supabase.table("biografias").upsert(registro, on_conflict="slug").execute()
        bid = resp.data[0]["biografia_id"]
        semear.regravar_ligacoes(
            supabase, "biografia_fontes", "biografia_id", bid,
            semear.citacoes(d["fontes"], "biografia_id", bid, com_ordem=True))
        semear.regravar_ligacoes(
            supabase, "biografia_marcadores", "biografia_id", bid,
            semear.citacoes(d.get("marcadores", []), "biografia_id", bid, com_ordem=False))
        print(f"  biografia: {d['slug']} ({d['status_curadoria']})  natal="
              f"{d.get('municipio_natal')}/{d.get('uf_natal')}")
    print("Seed direcionado concluído.")


if __name__ == "__main__":
    main()
