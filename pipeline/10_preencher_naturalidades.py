"""Preenche as coordenadas de naturalidade das biografias (ADR-016, decisão 1/4).

A naturalidade em si (`municipio_natal`/`uf_natal`) é decisão de CURADORIA e vem
dos arquivos em pipeline/dados/curadoria/biografias/*.json, gravada no banco pelo
06_semear_curadoria.py. Este script NÃO infere naturalidade (ADR-016 proíbe): ele
faz só a parte mecânica — casar município+UF com a tabela de referência
`municipios_ibge` e gravar a coordenada da SEDE do município em
`lat_natal`/`lng_natal`. Sede do município, nunca endereço preciso.

O casamento é por (UF, nome normalizado): minúsculas, sem acentos, espaços
colapsados — assim "Mãe d'Água"/"MAE D AGUA" batem com o cadastro do IBGE. Dentro
de uma mesma UF o nome do município é único no IBGE, então (UF, nome) desambigua.

Fichas cujo município não casa são REPORTADAS (provável erro de grafia para a
curadoria corrigir no JSON) e ficam sem coordenada — nunca chutamos a sede errada.

Idempotente: só escreve quando a coordenada está ausente ou diferente. Conexão via
DATABASE_URL (Session pooler do Supabase — conexão direta falha por IPv6).

Pré-requisito: rodar antes o 06_semear_curadoria.py (grava municipio_natal/uf_natal)
e o 09_semear_municipios_ibge.py (popula a tabela de referência).

Uso:
    .venv/bin/python 10_preencher_naturalidades.py
"""

import os
import unicodedata
from pathlib import Path

import psycopg
from dotenv import load_dotenv

RAIZ = Path(__file__).resolve().parent
load_dotenv(RAIZ.parent / ".env.local")
load_dotenv(RAIZ / ".env.local")


def normalizar(nome: str) -> str:
    """minúsculas, sem acentos, sem pontuação leve, espaços colapsados."""
    sem_acento = "".join(
        c for c in unicodedata.normalize("NFKD", nome) if not unicodedata.combining(c)
    )
    # troca tudo que não for letra/dígito por espaço (apóstrofos, hífens, pontos)
    limpo = "".join(c if c.isalnum() else " " for c in sem_acento.lower())
    return " ".join(limpo.split())


def main() -> None:
    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        raise SystemExit("DATABASE_URL ausente — adicione a connection string ao .env.local.")

    with psycopg.connect(dsn, connect_timeout=30) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT nome, uf, lat, lng FROM municipios_ibge")
            ref = {
                (uf.upper(), normalizar(nome)): (lat, lng)
                for nome, uf, lat, lng in cur.fetchall()
            }
            if not ref:
                raise SystemExit(
                    "municipios_ibge vazia — rode antes o 09_semear_municipios_ibge.py."
                )
            print(f"Referência IBGE carregada: {len(ref)} municípios.")

            cur.execute(
                "SELECT biografia_id, nome, municipio_natal, uf_natal, lat_natal, lng_natal "
                "FROM biografias WHERE municipio_natal IS NOT NULL"
            )
            fichas = cur.fetchall()
            print(f"Biografias com naturalidade informada: {len(fichas)}.")

            atualizadas = 0
            ja_corretas = 0
            sem_uf = []
            sem_correspondencia = []
            for bid, nome, mun, uf, lat_atual, lng_atual in fichas:
                if not uf:
                    sem_uf.append(nome)
                    continue
                chave = (uf.upper(), normalizar(mun))
                coord = ref.get(chave)
                if coord is None:
                    sem_correspondencia.append(f"{nome}: '{mun}/{uf}'")
                    continue
                lat, lng = coord
                if lat_atual == lat and lng_atual == lng:
                    ja_corretas += 1
                    continue
                cur.execute(
                    "UPDATE biografias SET lat_natal = %s, lng_natal = %s "
                    "WHERE biografia_id = %s",
                    (lat, lng, bid),
                )
                atualizadas += 1
                print(f"  ok: {nome} — {mun}/{uf} → ({lat}, {lng})")
        conn.commit()

    print(
        f"\nResumo: {atualizadas} atualizada(s), {ja_corretas} já correta(s), "
        f"{len(sem_uf)} sem UF, {len(sem_correspondencia)} sem correspondência."
    )
    if sem_uf:
        print("\nSem uf_natal (corrigir no JSON da curadoria):")
        for n in sem_uf:
            print(f"  - {n}")
    if sem_correspondencia:
        print("\nSem correspondência no IBGE (provável grafia — corrigir no JSON):")
        for m in sem_correspondencia:
            print(f"  - {m}")
    print("\nConcluído.")


if __name__ == "__main__":
    main()
