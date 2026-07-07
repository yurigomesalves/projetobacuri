"""Monta um dossiê de trabalho (somente leitura) para o curador-historiador:
para cada vítima negra da shortlist, reúne TODOS os chunks do acervo que a
mencionam (a ficha dela espalhada pelas fontes), com fonte e página.

Saída: pipeline/dados/dossie_curador_vitimas_negras.md (gitignored).
Uso: python3 pipeline/dossie_curador_vitimas_negras.py
"""

import os
import re
from pathlib import Path

import psycopg
from dotenv import load_dotenv

RAIZ = Path(__file__).resolve().parent
load_dotenv(RAIZ.parent / ".env.local")
load_dotenv(RAIZ / ".env.local")

SAIDA = RAIZ / "dados" / "dossie_curador_vitimas_negras.md"

# (nome de busca ILIKE, rótulo). Busca pelo nome completo; se muito curto/comum,
# usar a forma mais distintiva.
SHORTLIST = [
    "Robson Silveira da Luz",
    "Francisco Manoel Chaves",
    "Raimundo Eduardo da Silva",
    "Lúcia Maria de Souza",
    "Ieda Santos Delgado",
    "Alceri Maria Gomes da Silva",
    "Joel Vasconcelos dos Santos",
    "Roberto Cieto",
    "Hilton Ferreira",
    "Dermeval da Silva Pereira",
]


def main():
    dsn = os.environ["DATABASE_URL"]
    partes = ["# Dossiê de trabalho — vítimas negras (para curadoria)\n",
              "Reúne, por vítima, os trechos do acervo indexado que a mencionam. ",
              "NÃO é texto final: é matéria-prima para o curador validar a ",
              "identificação racial e escrever a biografia com citação.\n"]

    with psycopg.connect(dsn) as conn, conn.cursor() as cur:
        for nome in SHORTLIST:
            cur.execute(
                """
                select f.titulo, f.fonte_id, c.paginas, c.secao, c.conteudo
                from chunks c join fontes f on f.fonte_id = c.fonte_id
                where c.conteudo ilike %s
                order by f.titulo, c.ordem
                """,
                (f"%{nome}%",), prepare=False,
            )
            linhas = cur.fetchall()
            partes.append(f"\n\n---\n\n## {nome}  ({len(linhas)} trecho(s))\n")
            if not linhas:
                # tenta pelo sobrenome distintivo (últimas 2 palavras)
                alt = " ".join(nome.split()[-2:])
                cur.execute(
                    """
                    select f.titulo, f.fonte_id, c.paginas, c.secao, c.conteudo
                    from chunks c join fontes f on f.fonte_id = c.fonte_id
                    where c.conteudo ilike %s order by f.titulo, c.ordem
                    """,
                    (f"%{alt}%",), prepare=False,
                )
                linhas = cur.fetchall()
                partes.append(f"_(busca pelo nome completo vazia; usando '{alt}': "
                              f"{len(linhas)} trecho(s))_\n")
            for titulo, fonte_id, paginas, secao, conteudo in linhas:
                txt = re.sub(r"\s+\n", "\n", conteudo).strip()
                partes.append(f"\n**Fonte:** {titulo}  \n"
                              f"**fonte_id:** `{fonte_id}` — **p.** {paginas}"
                              f"{(' — § ' + secao) if secao else ''}\n\n> "
                              + txt.replace("\n", "\n> ") + "\n")

    SAIDA.parent.mkdir(parents=True, exist_ok=True)
    SAIDA.write_text("".join(partes), encoding="utf-8")
    print(f"dossiê gravado: {SAIDA}")
    print(f"tamanho: {SAIDA.stat().st_size/1024:.1f} KB")


if __name__ == "__main__":
    main()
