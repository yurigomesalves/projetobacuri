"""Aplica um arquivo de migração SQL no Postgres do Supabase via conexão direta.

Uso:
    .venv/bin/python aplicar_migracao.py ../supabase/migrations/0013_tipos_crime_invisibilizacao_indigena.sql

Lê a connection string de DATABASE_URL (em .env.local). Executa o arquivo
inteiro numa única transação: ou tudo é aplicado, ou nada (rollback em erro).
Não imprime a senha.
"""
import sys
import pathlib
import psycopg
from dotenv import load_dotenv
import os

RAIZ = pathlib.Path(__file__).resolve().parent
load_dotenv(RAIZ.parent / ".env.local")
load_dotenv(RAIZ / ".env.local")

dsn = os.environ.get("DATABASE_URL")
if not dsn:
    raise SystemExit("DATABASE_URL ausente — adicione a connection string do Postgres ao .env.local.")

if len(sys.argv) != 2:
    raise SystemExit("Informe o caminho do arquivo .sql da migração.")

arq = pathlib.Path(sys.argv[1])
if not arq.is_file():
    raise SystemExit(f"Arquivo não encontrado: {arq}")

sql = arq.read_text()
print(f"Aplicando {arq.name} ...")
with psycopg.connect(dsn, connect_timeout=15) as conn:
    with conn.cursor() as cur:
        cur.execute(sql)
    conn.commit()
print("Migração aplicada com sucesso (commit).")
