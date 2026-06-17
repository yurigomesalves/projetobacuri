"""Seed da tabela de referência `municipios_ibge` (ADR-016 / migração 0014).

Popula `municipios_ibge` (codigo_ibge, nome, uf, lat, lng) com TODOS os
municípios brasileiros atuais e as coordenadas da SEDE de cada um (nunca
endereço preciso — ADR-016, decisão 1/4).

Fonte (oficial, IBGE — única, atual e completa):
  Localidades do Brasil 2022, camada de localidades (shapefile).
  https://geoftp.ibge.gov.br/organizacao_do_territorio/estrutura_territorial/localidades/Localidades_do_Brasil/2022/Localidades_Brasil_shp.zip

Por que 2022 e não o cadastro de 2010: é a edição vigente do MESMO dataset
oficial (Localidades do Brasil), já com os municípios criados depois de 2010
(Mojuí dos Campos/PA, Pescaria Brava/SC, Balneário Rincão/SC, Pinto Bandeira/RS,
Paraíso das Águas/MS). Assim não há coordenada preenchida à mão: todos os 5.570
vêm da fonte oficial. Decisão registrada com o Yuri em 17/06/2026.

O arquivo de localidades 2022 já traz, por linha, a UF (SIGLA_UF, 2 letras), o
código do município de 7 dígitos (CD_MUN), o nome (NM_MUN), a categoria da
localidade (CT_LOCALID) e a coordenada (LAT_LOCALI/LONG_LOCAL, em texto). A SEDE
do município é a localidade de categoria "Cidade"; as 26 capitais aparecem duas
vezes ("Sede Municipal" e "Capital Estadual"), então preferimos a subcategoria
"Sede Municipal" para ter exatamente uma sede por município. O DBF é UTF-8 (.cpg).

Lê apenas o .dbf de dentro do zip (as colunas de coordenada já estão lá em texto;
não é preciso parsear a geometria binária do .shp).

Carga IDEMPOTENTE: INSERT em lotes com ON CONFLICT (codigo_ibge) DO UPDATE, via
DATABASE_URL (Session pooler do Supabase — conexão direta falha por IPv6). Pode
rodar de novo sem duplicar.

Uso:
    .venv/bin/python 09_semear_municipios_ibge.py
"""

import os
import struct
import urllib.request
import zipfile
from pathlib import Path

import psycopg
from dotenv import load_dotenv

RAIZ = Path(__file__).resolve().parent
load_dotenv(RAIZ.parent / ".env.local")
load_dotenv(RAIZ / ".env.local")

URL_IBGE = (
    "https://geoftp.ibge.gov.br/organizacao_do_territorio/estrutura_territorial/"
    "localidades/Localidades_do_Brasil/2022/Localidades_Brasil_shp.zip"
)
DIR_DADOS = RAIZ / "dados" / "ibge"
ZIP_LOCAL = DIR_DADOS / "Localidades_Brasil_shp.zip"
NOME_DBF = "BR_localidades_2022.dbf"
LOTE = 1000


def baixar_se_preciso() -> Path:
    """Baixa o zip oficial do IBGE uma vez; reusa o cache se já existir."""
    if ZIP_LOCAL.is_file() and ZIP_LOCAL.stat().st_size > 1_000_000:
        print(f"Usando cache: {ZIP_LOCAL} ({ZIP_LOCAL.stat().st_size // 1024} KB)")
        return ZIP_LOCAL
    DIR_DADOS.mkdir(parents=True, exist_ok=True)
    print(f"Baixando localidades do IBGE...\n  {URL_IBGE}")
    urllib.request.urlretrieve(URL_IBGE, ZIP_LOCAL)
    print(f"Salvo em {ZIP_LOCAL} ({ZIP_LOCAL.stat().st_size // 1024} KB)")
    return ZIP_LOCAL


def ler_campos_dbf(raw: bytes):
    """Devolve (nrec, hsize, rsize, {nome_campo: (offset, tamanho)}) do DBF."""
    nrec = struct.unpack("<I", raw[4:8])[0]
    hsize = struct.unpack("<H", raw[8:10])[0]
    rsize = struct.unpack("<H", raw[10:12])[0]
    campos = {}
    pos, off = 32, 1  # +1: byte de flag de deleção no início de cada registro
    while raw[pos : pos + 1] != b"\x0d":
        fd = raw[pos : pos + 32]
        nome = fd[0:11].split(b"\x00")[0].decode("latin-1")
        tam = fd[16]
        campos[nome] = (off, tam)
        off += tam
        pos += 32
    return nrec, hsize, rsize, campos


def extrair_sedes(zip_path: Path) -> dict:
    """Lê o DBF e devolve {codigo_ibge: (nome, uf, lat, lng)} das sedes."""
    with zipfile.ZipFile(zip_path) as z:
        raw = z.read(NOME_DBF)
    nrec, hsize, rsize, campos = ler_campos_dbf(raw)
    body = raw[hsize:]

    def val(rec, nome):
        off, tam = campos[nome]
        return rec[off : off + tam].decode("utf-8").strip()

    sedes = {}  # codigo -> (nome, uf, lat, lng)
    capitais_sede = set()  # códigos já fixados pela subcategoria "Sede Municipal"
    for i in range(nrec):
        rec = body[i * rsize : (i + 1) * rsize]
        if rec[0:1] == b"*":  # registro deletado
            continue
        if val(rec, "CT_LOCALID") != "Cidade":
            continue
        cod = val(rec, "CD_MUN")
        sub = val(rec, "SCT_LOCALI")
        # Capitais têm duas linhas "Cidade"; "Sede Municipal" vence "Capital Estadual".
        if cod in capitais_sede:
            continue
        registro = (
            val(rec, "NM_MUN"),
            val(rec, "SIGLA_UF"),
            float(val(rec, "LAT_LOCALI")),
            float(val(rec, "LONG_LOCAL")),
        )
        sedes[int(cod)] = registro
        if sub == "Sede Municipal":
            capitais_sede.add(cod)
    return sedes


def gravar(sedes: dict) -> None:
    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        raise SystemExit("DATABASE_URL ausente — adicione a connection string ao .env.local.")
    linhas = [(cod, n, uf, lat, lng) for cod, (n, uf, lat, lng) in sorted(sedes.items())]
    sql = (
        "INSERT INTO municipios_ibge (codigo_ibge, nome, uf, lat, lng) VALUES "
        "{} ON CONFLICT (codigo_ibge) DO UPDATE SET "
        "nome = EXCLUDED.nome, uf = EXCLUDED.uf, lat = EXCLUDED.lat, lng = EXCLUDED.lng"
    )
    print(f"Gravando {len(linhas)} municípios em lotes de {LOTE}...")
    with psycopg.connect(dsn, connect_timeout=30) as conn:
        with conn.cursor() as cur:
            for ini in range(0, len(linhas), LOTE):
                lote = linhas[ini : ini + LOTE]
                marcadores = ",".join(["(%s,%s,%s,%s,%s)"] * len(lote))
                cur.execute(sql.format(marcadores), [v for linha in lote for v in linha])
                print(f"  lote {ini // LOTE + 1}: {len(lote)} linhas")
        conn.commit()
        with conn.cursor() as cur:
            cur.execute("SELECT count(*) FROM municipios_ibge")
            total = cur.fetchone()[0]
            cur.execute(
                "SELECT codigo_ibge, nome, uf, lat, lng FROM municipios_ibge "
                "WHERE codigo_ibge IN (2611606, 3550308, 5300108) ORDER BY codigo_ibge"
            )
            amostra = cur.fetchall()
    print(f"\nTotal na tabela após carga: {total}")
    print("Amostra (Recife, São Paulo, Brasília):")
    for r in amostra:
        print(f"  {r[0]} {r[1]}/{r[2]}  lat={r[3]} lng={r[4]}")


def main() -> None:
    zip_path = baixar_se_preciso()
    sedes = extrair_sedes(zip_path)
    print(f"Sedes municipais extraídas do IBGE 2022: {len(sedes)}")
    if not (5560 <= len(sedes) <= 5575):
        raise SystemExit(
            f"Contagem inesperada ({len(sedes)}); esperado ~5.570. Verifique a fonte antes de gravar."
        )
    gravar(sedes)
    print("Concluído.")


if __name__ == "__main__":
    main()
