"""Seed da tabela `terras_indigenas` (migração 0016).

Popula `terras_indigenas` (codigo_funai, nome, etnias, uf, geometria, fonte,
atualizado_em) com os polígonos oficiais de Terras Indígenas homologadas,
regularizadas, declaradas e delimitadas da FUNAI.

Fonte (oficial, FUNAI):
  Shapefile das Terras Indígenas via GeoServer da FUNAI.
  https://geoserver.funai.gov.br/geoserver/Funai/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=Funai:Terras_Indigenas_Declaradas_Delimitadas_Homologadas_Regularizadas&outputFormat=SHAPE-ZIP

  Fallback (se o GeoServer da FUNAI estiver indisponível):
  https://geoftp.ibge.gov.br/informacoes_socioeconomicas/indigenas/terras_indigenas_2010.zip

IMPORTANTE: O GeoServer da FUNAI tem instabilidade histórica. Antes de rodar este
script, VERIFIQUE se a URL acima ainda funciona (teste no navegador ou com curl).
O shapefile contém os campos:
  - codigo_ti (ou cod_ti, varia por versão): código FUNAI da terra indígena
  - terrai_nom (ou similar): nome da TI
  - etnia_nome (ou lista de etnias): povos que habitam
  - geometria: Polygon ou MultiPolygon (em WGS84 — EPSG:4326)

Simplificação de geometria: usa shapely.simplify(tolerance=0.01, preserve_topology=True)
para reduzir vértices mantendo a forma geral. A tolerância de 0.01 graus (~1 km no
equador) é apropriada para polígonos de TI — curador pode ajustar se precisar.

Carga IDEMPOTENTE: INSERT em lotes com ON CONFLICT (codigo_funai) DO UPDATE, via
DATABASE_URL (Session pooler do Supabase — conexão direta falha por IPv6). Pode
rodar de novo sem duplicar.

Uso:
    .venv/bin/python 11_semear_terras_indigenas.py
"""

import json
import os
import urllib.request
import zipfile
from pathlib import Path

import psycopg
import shapefile
from dotenv import load_dotenv
from shapely.geometry import shape

RAIZ = Path(__file__).resolve().parent
load_dotenv(RAIZ.parent / ".env.local")
load_dotenv(RAIZ / ".env.local")

URL_FUNAI = (
    "https://geoserver.funai.gov.br/geoserver/Funai/ows?service=WFS&version=1.0.0"
    "&request=GetFeature&typeName=Funai:Terras_Indigenas_Declaradas_Delimitadas_"
    "Homologadas_Regularizadas&outputFormat=SHAPE-ZIP"
)
URL_FALLBACK_IBGE = (
    "https://geoftp.ibge.gov.br/informacoes_socioeconomicas/indigenas/"
    "terras_indigenas_2010.zip"
)
DIR_DADOS = RAIZ / "dados" / "funai"
ZIP_LOCAL = DIR_DADOS / "terras_indigenas.zip"
LOTE = 100
TOLERANCE_SIMPLIFY = 0.01


def baixar_se_preciso(url: str, caminho: Path) -> Path:
    """Baixa o zip uma vez; reusa o cache se já existir (>5MB)."""
    if caminho.is_file() and caminho.stat().st_size > 5_000_000:
        print(f"Usando cache: {caminho} ({caminho.stat().st_size // 1024} KB)")
        return caminho
    DIR_DADOS.mkdir(parents=True, exist_ok=True)
    print(f"Baixando terras indígenas...\n  {url}")
    try:
        urllib.request.urlretrieve(url, caminho)
        print(f"Salvo em {caminho} ({caminho.stat().st_size // 1024} KB)")
        return caminho
    except Exception as e:
        print(f"Erro ao baixar {url}: {e}")
        if url != URL_FALLBACK_IBGE:
            print("Tentando fallback do IBGE...")
            return baixar_se_preciso(URL_FALLBACK_IBGE, caminho)
        raise


def encontrar_shapefile_no_zip(zip_path: Path) -> tuple[zipfile.ZipFile, str, str]:
    """Localiza .shp e .dbf dentro do zip.

    O zip da FUNAI pode ter subdiretórios. Retorna (zf aberto, caminho_shp, caminho_dbf).
    """
    with zipfile.ZipFile(zip_path) as zf:
        arquivos = zf.namelist()
        shp_file = next((a for a in arquivos if a.endswith(".shp")), None)
        dbf_file = next((a for a in arquivos if a.endswith(".dbf")), None)
        if not shp_file or not dbf_file:
            raise SystemExit(
                f"Shapefile incompleto no zip: esperado .shp e .dbf, "
                f"encontrado {shp_file}, {dbf_file}"
            )
    return zipfile.ZipFile(zip_path), shp_file, dbf_file


def extrair_poligonos(zip_path: Path) -> dict:
    """Lê o shapefile de dentro do zip, extrai campos, simplifica geometria.

    Retorna {codigo_funai: (nome, etnias, uf, geojson_dict)}.
    """
    zf, shp_file, dbf_file = encontrar_shapefile_no_zip(zip_path)

    with zf:
        shp_data = zf.read(shp_file)
        dbf_data = zf.read(dbf_file)

    # Cria files-like objects temporários para pyshp ler do zip
    import io
    shp_io = io.BytesIO(shp_data)
    dbf_io = io.BytesIO(dbf_data)

    reader = shapefile.Reader(shp=shp_io, dbf=dbf_io)

    tis = {}
    for rec in reader.records():
        # Campos variam por versão. Tenta vários nomes.
        fields = {f[0]: i for i, f in enumerate(reader.fields[1:])}

        cod_names = [n for n in fields if n.lower() in ("codigo_ti", "cod_ti", "codigo_funai")]
        nome_names = [n for n in fields if n.lower() in ("terrai_nom", "nome", "nome_ti")]
        etnia_names = [n for n in fields if n.lower() in ("etnia_nome", "etnias", "povos")]
        uf_names = [n for n in fields if n.lower() in ("uf", "estado", "sigla")]

        cod = rec[fields[cod_names[0]]] if cod_names else None
        nome = rec[fields[nome_names[0]]] if nome_names else None
        etnias = rec[fields[etnia_names[0]]] if etnia_names else None
        uf = rec[fields[uf_names[0]]] if uf_names else None

        if not cod or not nome:
            continue

        # Geometria: rec.shape é o shapely Shape
        try:
            geom = rec.shape
            # Simplificar para reduzir tamanho do JSON
            geom_simpl = geom.simplify(TOLERANCE_SIMPLIFY, preserve_topology=True)
            geojson_dict = json.loads(geom_simpl.geom_type)  # fallback
            if hasattr(geom_simpl, "__geo_interface__"):
                geojson_dict = geom_simpl.__geo_interface__
            else:
                # shapely 2.0+: use mapping
                from shapely.geometry import mapping
                geojson_dict = mapping(geom_simpl)
        except Exception as e:
            print(f"Aviso: erro ao extrair geometria de {nome}: {e}")
            continue

        tis[int(cod)] = (
            str(nome).strip(),
            str(etnias).strip() if etnias else None,
            str(uf).strip().upper() if uf else None,
            geojson_dict,
        )

    return tis


def gravar(tis: dict) -> None:
    """Insere em lotes com ON CONFLICT ... DO UPDATE."""
    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        raise SystemExit("DATABASE_URL ausente — adicione a connection string ao .env.local.")

    linhas = [
        (cod, nome, etnias, uf, json.dumps(geojson))
        for cod, (nome, etnias, uf, geojson) in sorted(tis.items())
    ]

    sql = (
        "INSERT INTO terras_indigenas (codigo_funai, nome, etnias, uf, geometria, fonte, atualizado_em) "
        "VALUES {geo} ON CONFLICT (codigo_funai) DO UPDATE SET "
        "nome = EXCLUDED.nome, etnias = EXCLUDED.etnias, uf = EXCLUDED.uf, "
        "geometria = EXCLUDED.geometria, atualizado_em = EXCLUDED.atualizado_em"
    )

    print(f"Gravando {len(linhas)} terras indígenas em lotes de {LOTE}...")
    from datetime import date
    hoje = date.today().isoformat()

    with psycopg.connect(dsn, connect_timeout=30) as conn:
        with conn.cursor() as cur:
            for ini in range(0, len(linhas), LOTE):
                lote = linhas[ini : ini + LOTE]
                placeholders = ",".join(
                    [f"(%s,%s,%s,%s,%s,'FUNAI','{hoje}')"] * len(lote)
                )
                sql_lote = (
                    "INSERT INTO terras_indigenas (codigo_funai, nome, etnias, uf, geometria, fonte, atualizado_em) "
                    f"VALUES {placeholders} ON CONFLICT (codigo_funai) DO UPDATE SET "
                    "nome = EXCLUDED.nome, etnias = EXCLUDED.etnias, uf = EXCLUDED.uf, "
                    "geometria = EXCLUDED.geometria, atualizado_em = EXCLUDED.atualizado_em"
                )
                cur.execute(sql_lote, [v for linha in lote for v in linha[:5]])
                print(f"  lote {ini // LOTE + 1}: {len(lote)} linhas")
        conn.commit()

        # Verificação
        with conn.cursor() as cur:
            cur.execute("SELECT count(*) FROM terras_indigenas")
            total = cur.fetchone()[0]
            # Amostras: Waimiri-Atroari, Xingu, Yanomami (se existirem)
            cur.execute(
                "SELECT codigo_funai, nome, uf FROM terras_indigenas "
                "WHERE nome ILIKE '%Waimiri%' OR nome ILIKE '%Xingu%' OR nome ILIKE '%Yanomami%' "
                "ORDER BY nome LIMIT 5"
            )
            amostra = cur.fetchall()

    print(f"\nTotal na tabela após carga: {total}")
    if amostra:
        print("Amostra (Waimiri-Atroari, Xingu, Yanomami):")
        for cod, nome, uf in amostra:
            print(f"  {cod} {nome}/{uf}")


def main() -> None:
    zip_path = baixar_se_preciso(URL_FUNAI, ZIP_LOCAL)
    tis = extrair_poligonos(zip_path)
    print(f"Terras indígenas extraídas: {len(tis)}")
    if not (400 <= len(tis) <= 1000):
        raise SystemExit(
            f"Contagem inesperada ({len(tis)}); esperado ~750. "
            f"Verifique a fonte antes de gravar."
        )
    gravar(tis)
    print("Concluído.")


if __name__ == "__main__":
    main()
