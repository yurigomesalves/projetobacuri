"""Seed da tabela `terras_indigenas` (migração 0016).

Popula `terras_indigenas` (codigo_funai, nome, etnias, uf, geometria, fonte,
atualizado_em) com os polígonos de Terras Indígenas da FUNAI, obtidos via WFS
do TerraBrasilis/INPE (fonte secundária confiável que espelha os dados da FUNAI).

Fonte primária utilizada:
  TerraBrasilis — INPE (https://terrabrasilis.dpi.inpe.br)
  WFS público, WGS-84, GeoJSON. Dados originalmente da FUNAI.
  Camadas por bioma combinadas e deduplicadas pelo código FUNAI (terrai_cod).

Por que TerraBrasilis e não o GeoServer da FUNAI:
  O GeoServer direto da FUNAI (geoserver.funai.gov.br) apresenta instabilidade
  crônica (403/timeout). O TerraBrasilis é o repositório oficial de dados de
  monitoramento ambiental do INPE e publica o mesmo dataset da FUNAI por bioma.

Camadas baixadas (soma: ~674 features antes da deduplicação):
  - prodes-amazon-nb:indigenous_area_amazon_biome          (Amazônia, ~332)
  - prodes-cerrado-nb:indigenous_area_cerrado_biome        (Cerrado, ~118)
  - prodes-mata-atlantica-nb:indigenous_area_mata_atlantica_biome (Mata Atlântica, ~156)
  - prodes-caatinga-nb:indigenous_area_caatinga_biome      (Caatinga, ~50)
  - prodes-pampa-nb:indigenous_area_pampa_biome            (Pampa, ~10)
  - prodes-pantanal-nb:indigenous_area_pantanal_biome      (Pantanal, ~8)

Simplificação: shapely.simplify(tolerance=0.01, preserve_topology=True).
  Tolerância de 0.01° (~1 km) reduz vértices sem distorcer a forma geral.
  Apropriada para exibição no mapa; não usar para análise geodésica.

Carga IDEMPOTENTE: ON CONFLICT (codigo_funai) DO UPDATE, lotes de 50.
  Conexão via DATABASE_URL (Session pooler — conexão direta falha por IPv6).

Uso:
    .venv/bin/python 11_semear_terras_indigenas.py
"""

import json
import os
import time
import urllib.request
from datetime import date
from pathlib import Path

import psycopg
from dotenv import load_dotenv
from shapely.geometry import shape, mapping

RAIZ = Path(__file__).resolve().parent
load_dotenv(RAIZ.parent / ".env.local")
load_dotenv(RAIZ / ".env.local")

BASE_WFS = "https://terrabrasilis.dpi.inpe.br/geoserver/ows"
CAMADAS = [
    "prodes-amazon-nb:indigenous_area_amazon_biome",
    "prodes-cerrado-nb:indigenous_area_cerrado_biome",
    "prodes-mata-atlantica-nb:indigenous_area_mata_atlantica_biome",
    "prodes-caatinga-nb:indigenous_area_caatinga_biome",
    "prodes-pampa-nb:indigenous_area_pampa_biome",
    "prodes-pantanal-nb:indigenous_area_pantanal_biome",
]
LOTE = 50
TOLERANCE_SIMPLIFY = 0.01
DIR_CACHE = RAIZ / "dados" / "funai"


def url_camada(layer: str) -> str:
    return (
        f"{BASE_WFS}?service=WFS&version=2.0.0&request=GetFeature"
        f"&typeNames={layer}&outputFormat=application/json"
    )


def baixar_camada(layer: str) -> list[dict]:
    """Baixa GeoJSON de uma camada do TerraBrasilis."""
    cache = DIR_CACHE / f"{layer.replace(':', '_').replace('-', '_')}.json"
    if cache.is_file() and cache.stat().st_size > 10_000:
        print(f"  cache: {cache.name} ({cache.stat().st_size // 1024} KB)")
        with cache.open(encoding="utf-8") as f:
            return json.load(f)["features"]

    print(f"  baixando {layer}...")
    url = url_camada(layer)
    with urllib.request.urlopen(url, timeout=120) as resp:
        conteudo = resp.read()

    dados = json.loads(conteudo)
    DIR_CACHE.mkdir(parents=True, exist_ok=True)
    with cache.open("w", encoding="utf-8") as f:
        json.dump(dados, f)
    print(f"  {len(dados['features'])} feições, salvo em {cache.name}")
    return dados["features"]


def simplificar(geojson_dict: dict) -> dict:
    """Simplifica geometria GeoJSON com Shapely e devolve GeoJSON dict."""
    try:
        geom = shape(geojson_dict)
        simpl = geom.simplify(TOLERANCE_SIMPLIFY, preserve_topology=True)
        return mapping(simpl)
    except Exception:
        return geojson_dict  # retorna original se simplificação falhar


def extrair_tis(features: list[dict]) -> dict[int, dict]:
    """Extrai {codigo_funai: {...}} das feições GeoJSON do TerraBrasilis."""
    tis = {}
    for feat in features:
        props = feat.get("properties", {})
        cod = props.get("terrai_cod")
        if not cod:
            continue
        try:
            cod = int(cod)
        except (ValueError, TypeError):
            continue
        geom = feat.get("geometry")
        if not geom:
            continue
        geom_simpl = simplificar(geom)
        tis[cod] = {
            "nome": (props.get("terrai_nom") or "").strip(),
            "etnias": (props.get("etnia_nome") or "").strip() or None,
            "geometria": geom_simpl,
        }
    return tis


def gravar(tis: dict[int, dict]) -> None:
    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        raise SystemExit("DATABASE_URL ausente.")

    fonte = "FUNAI/TerraBrasilis-INPE"
    hoje = date.today().isoformat()
    linhas = sorted(tis.items())

    sql = (
        "INSERT INTO terras_indigenas (codigo_funai, nome, etnias, geometria, fonte, atualizado_em) "
        "VALUES (%s, %s, %s, %s, %s, %s) "
        "ON CONFLICT (codigo_funai) DO UPDATE SET "
        "nome = EXCLUDED.nome, etnias = EXCLUDED.etnias, "
        "geometria = EXCLUDED.geometria, fonte = EXCLUDED.fonte, "
        "atualizado_em = EXCLUDED.atualizado_em"
    )

    print(f"Gravando {len(linhas)} TIs em lotes de {LOTE}...")
    with psycopg.connect(dsn, connect_timeout=30) as conn:
        with conn.cursor() as cur:
            for ini in range(0, len(linhas), LOTE):
                lote = linhas[ini : ini + LOTE]
                for cod, d in lote:
                    cur.execute(
                        sql,
                        (cod, d["nome"], d["etnias"], json.dumps(d["geometria"]), fonte, hoje),
                    )
                print(f"  lote {ini // LOTE + 1}: {len(lote)} linhas")
        conn.commit()

        with conn.cursor() as cur:
            cur.execute("SELECT count(*) FROM terras_indigenas")
            total = cur.fetchone()[0]
            # Amostra: Waimiri-Atroari, Xingu, Yanomami
            cur.execute(
                "SELECT codigo_funai, nome, etnias FROM terras_indigenas "
                "WHERE lower(nome) SIMILAR TO "
                "'%(waimiri|xingu|yanomami)%' ORDER BY nome LIMIT 5"
            )
            amostra = cur.fetchall()

    print(f"\nTotal na tabela após carga: {total}")
    if amostra:
        print("Amostra:")
        for row in amostra:
            print(f"  {row[0]}  {row[1]}  ({row[2] or '—'})")


def main() -> None:
    DIR_CACHE.mkdir(parents=True, exist_ok=True)
    print(f"Fonte: TerraBrasilis/INPE — {len(CAMADAS)} camadas por bioma")
    print(f"Simplificação: tolerance={TOLERANCE_SIMPLIFY}°\n")

    tis_combinadas: dict[int, dict] = {}
    for layer in CAMADAS:
        features = baixar_camada(layer)
        novas = extrair_tis(features)
        antes = len(tis_combinadas)
        tis_combinadas.update(novas)  # deduplicação por codigo_funai
        print(f"  {layer.split(':')[1]}: {len(novas)} TIs (+{len(tis_combinadas)-antes} novas)")
        time.sleep(0.5)  # pausa entre requisições ao WFS

    print(f"\nTotal único por codigo_funai: {len(tis_combinadas)}")

    if len(tis_combinadas) < 400:
        raise SystemExit(
            f"Contagem suspeita ({len(tis_combinadas)}); esperado ≥400. "
            "Verifique se o TerraBrasilis está acessível antes de gravar."
        )

    gravar(tis_combinadas)
    print("\nConcluído.")


if __name__ == "__main__":
    main()
