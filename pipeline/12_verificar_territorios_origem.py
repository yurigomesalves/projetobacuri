"""Valida integridade de território de origem nas biografias (migração 0016).

Script de VERIFICAÇÃO (não atualiza dados). Carrega todas as biografias com
`povo_origem IS NOT NULL` e valida:

a) terra_indigena_codigo não-NULL mas sem registro em terras_indigenas
   → ERRO (código inválido, corrigir JSON de curadoria)

b) terra_indigena_codigo IS NULL e geometria_origem_ponto IS NULL
   → AVISO (situação válida: só o povo documentado, sem área geográfica —
           permitido por ADR-016 decisão 1/2, taxonomy 8.3)

c) geometria_origem_raio_km preenchido mas geometria_origem_ponto IS NULL
   → ERRO (viola constraint: raio sem ponto é inválido)

d) Ambas as vias preenchidas ao mesmo tempo (terra_indigena_codigo E
   geometria_origem_ponto)
   → ERRO (viola constraint: mutuamente exclusivas)

Resumo final: total de biografias com povo_origem, X com TI válida (Via A),
Y com fallback circular (Via B), Z sem área (só povo), E erros.

Saída: stdout + stderr. Código de saída 0 se ok, 1 se houver qualquer ERRO.

Uso:
    .venv/bin/python 12_verificar_territorios_origem.py
"""

import os
import sys
from pathlib import Path

import psycopg
from dotenv import load_dotenv

RAIZ = Path(__file__).resolve().parent
load_dotenv(RAIZ.parent / ".env.local")
load_dotenv(RAIZ / ".env.local")


def main() -> None:
    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        raise SystemExit("DATABASE_URL ausente — adicione a connection string ao .env.local.")

    erros = []
    avisos = []
    via_a = 0  # Com terra_indigena_codigo válido
    via_b = 0  # Com geometria_origem_ponto (fallback)
    sem_area = 0  # Só povo, sem área
    total = 0

    with psycopg.connect(dsn, connect_timeout=30) as conn:
        with conn.cursor() as cur:
            # Carrega todas as biografias com povo_origem
            cur.execute(
                """
                SELECT biografia_id, nome, povo_origem, terra_indigena_codigo,
                       terra_indigena_nome, geometria_origem_ponto, geometria_origem_raio_km
                FROM biografias
                WHERE povo_origem IS NOT NULL
                ORDER BY nome
                """
            )
            fichas = cur.fetchall()
            total = len(fichas)

            if total == 0:
                print("Nenhuma biografia com povo_origem encontrada.")
                return

            print(f"Analisando {total} biografias com povo_origem...\n")

            # Carrega mapa de códigos FUNAI válidos
            cur.execute("SELECT codigo_funai FROM terras_indigenas")
            codigos_validos = {row[0] for row in cur.fetchall()}

            for bid, nome, povo, cod_ti, nome_ti, geom_ponto, raio in fichas:
                via_a_aqui = cod_ti is not None
                via_b_aqui = geom_ponto is not None
                tem_raio = raio is not None

                # Validação d): ambas as vias preenchidas
                if via_a_aqui and via_b_aqui:
                    erros.append(
                        f"{nome}: ambas as vias preenchidas "
                        f"(terra_indigena_codigo={cod_ti} E geometria_origem_ponto). "
                        f"Devem ser mutuamente exclusivas (ADR-016)."
                    )
                    continue

                # Validação a): código FUNAI inválido
                if via_a_aqui and cod_ti not in codigos_validos:
                    erros.append(
                        f"{nome}: terra_indigena_codigo={cod_ti} não existe em terras_indigenas "
                        f"(corrigir JSON de curadoria)."
                    )
                    continue

                # Validação c): raio sem ponto
                if tem_raio and not via_b_aqui:
                    erros.append(
                        f"{nome}: geometria_origem_raio_km={raio} mas "
                        f"geometria_origem_ponto é NULL (raio sem ponto é inválido)."
                    )
                    continue

                # Contadores
                if via_a_aqui:
                    via_a += 1
                elif via_b_aqui:
                    via_b += 1
                else:
                    # Validação b): sem nenhuma coordenada (válido)
                    sem_area += 1

    print(f"\n=== RESUMO ===")
    print(f"Total de biografias com povo_origem: {total}")
    print(f"  - Via A (terra_indigena_codigo válido): {via_a}")
    print(f"  - Via B (geometria_origem_ponto): {via_b}")
    print(f"  - Sem área geográfica (só povo): {sem_area}")
    print(f"  - ERROS encontrados: {len(erros)}")

    if avisos:
        print(f"\n=== AVISOS ({len(avisos)}) ===")
        for av in avisos:
            print(f"  AVISO: {av}")

    if erros:
        print(f"\n=== ERROS ({len(erros)}) ===")
        for err in erros:
            print(f"  ERRO: {err}", file=sys.stderr)
        sys.exit(1)

    print("\nValidação concluída sem erros.")
    sys.exit(0)


if __name__ == "__main__":
    main()
