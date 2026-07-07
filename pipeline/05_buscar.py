"""Busca semântica de teste contra o acervo indexado no Supabase.

Uso:
    .venv/bin/python 05_buscar.py "o que foi a Operação Bandeirante?" [--limiar 0.78] [--qtd 8]
"""

import argparse
import os
from pathlib import Path

from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer
from supabase import create_client

RAIZ = Path(__file__).resolve().parent
MODELO = "intfloat/multilingual-e5-small"


def main() -> None:
    parser = argparse.ArgumentParser(description="Busca semântica no acervo")
    parser.add_argument("pergunta", help="pergunta em linguagem natural")
    parser.add_argument("--limiar", type=float, default=0.78)
    parser.add_argument("--qtd", type=int, default=8)
    args = parser.parse_args()

    load_dotenv(RAIZ.parent / ".env.local")
    supabase = create_client(
        os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    )

    modelo = SentenceTransformer(MODELO)
    # O modelo e5 exige o prefixo "query: " nas consultas.
    embedding = modelo.encode(
        "query: " + args.pergunta, normalize_embeddings=True
    ).tolist()

    resposta = supabase.rpc(
        "buscar_chunks",
        {
            "consulta_embedding": embedding,
            "limiar": args.limiar,
            "qtd": args.qtd,
        },
    ).execute()

    if not resposta.data:
        print("Nenhum trecho acima do limiar — sem base documental para esta pergunta.")
        return

    for item in resposta.data:
        trecho = item["conteudo"][:300].replace("\n", " ")
        marcador_nota = " [NOTA DE RODAPÉ]" if item.get("tipo_chunk") == "nota_rodape" else ""
        print(
            f"[{item['similaridade']:.3f}] p. {item['paginas']}"
            f" — {item['secao'] or '(sem seção)'}{marcador_nota}\n    {trecho}…\n"
        )


if __name__ == "__main__":
    main()
