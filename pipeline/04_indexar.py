"""Indexação: gera embeddings dos chunks e grava fonte + chunks no Supabase.

Lê os metadados da fonte do catálogo pipeline/fontes.json e a proveniência
do pipeline/manifesto.json.

Idempotente: se a fonte (mesma url_origem) já existir, os chunks dela são
apagados e regravados — o registro da fonte é reaproveitado.

Uso:
    .venv/bin/python 04_indexar.py cnv-vol2
"""

import argparse
import json
from pathlib import Path

from dotenv import load_dotenv
import os

from sentence_transformers import SentenceTransformer
from supabase import create_client

RAIZ = Path(__file__).resolve().parent
CATALOGO = RAIZ / "fontes.json"
ARQ_MANIFESTO = RAIZ / "manifesto.json"

MODELO = "intfloat/multilingual-e5-small"
LOTE_EMBEDDINGS = 64
# Lote pequeno: cada linha carrega um vetor de 384 dimensões; lotes grandes
# estouram o statement timeout do Supabase free tier (erro 57014).
LOTE_INSERCAO = 25


def montar_proveniencia(url_oficial: str) -> str:
    """Compõe o texto de proveniência a partir do manifesto do pipeline."""
    manifesto = json.loads(ARQ_MANIFESTO.read_text(encoding="utf-8"))
    candidatos = [d for d in manifesto if d.get("url_original") == url_oficial]
    if not candidatos:
        raise SystemExit(
            f"Fonte com url_original={url_oficial} não encontrada no manifesto. "
            "Rode antes o 01_baixar.py."
        )
    doc = candidatos[0]
    return (
        f"{doc['descricao']} Download em {doc['data_download'][:10]}, "
        f"sha256 {doc['sha256']}."
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Indexa os chunks de uma fonte no Supabase")
    parser.add_argument("slug", help="slug da fonte em fontes.json (ex.: cnv-vol2)")
    args = parser.parse_args()

    catalogo = json.loads(CATALOGO.read_text(encoding="utf-8"))
    if args.slug not in catalogo:
        raise SystemExit(f"fonte '{args.slug}' não está em {CATALOGO.name}. "
                         f"Disponíveis: {', '.join(catalogo)}")
    fonte_meta = catalogo[args.slug]["fonte"]
    arq_chunks = RAIZ / "dados" / "chunks" / f"{args.slug}.jsonl"

    load_dotenv(RAIZ.parent / ".env.local")
    url = os.environ["SUPABASE_URL"]
    chave = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    supabase = create_client(url, chave)

    # Atenção: não usar str.splitlines() aqui — o texto extraído dos PDFs pode
    # conter separadores de linha Unicode (U+2028, U+0085) dentro dos chunks,
    # que o splitlines() trataria como fim de registro, corrompendo a leitura.
    # A iteração sobre o arquivo quebra apenas em quebras de linha reais (\n).
    with open(arq_chunks, encoding="utf-8") as f:
        chunks = [json.loads(linha) for linha in f if linha.strip()]
    print(f"{len(chunks)} chunks lidos de {arq_chunks.name}")

    # Fonte: reaproveita se já existir (mesma url_origem), senão insere.
    existente = (
        supabase.table("fontes")
        .select("fonte_id")
        .eq("url_origem", fonte_meta["url_origem"])
        .execute()
    )
    if existente.data:
        fonte_id = existente.data[0]["fonte_id"]
        apagados = supabase.table("chunks").delete().eq("fonte_id", fonte_id).execute()
        print(f"Fonte já existia ({fonte_id}); {len(apagados.data)} chunks antigos removidos.")
    else:
        registro = dict(fonte_meta, proveniencia=montar_proveniencia(fonte_meta["url_origem"]))
        resposta = supabase.table("fontes").insert(registro).execute()
        fonte_id = resposta.data[0]["fonte_id"]
        print(f"Fonte registrada: {fonte_id}")

    print(f"Carregando modelo {MODELO}…")
    modelo = SentenceTransformer(MODELO)

    # O modelo e5 exige o prefixo "passage: " nos textos indexados.
    textos = ["passage: " + c["conteudo"] for c in chunks]
    embeddings = modelo.encode(
        textos,
        batch_size=LOTE_EMBEDDINGS,
        normalize_embeddings=True,
        show_progress_bar=True,
    )

    linhas = [
        {
            "fonte_id": fonte_id,
            "ordem": c["ordem"],
            "conteudo": c["conteudo"],
            "paginas": c["paginas"],
            "secao": c["secao"],
            "tipo_chunk": c.get("tipo_chunk", "corpo"),
            # nota_contexto por chunk (opcional); quando ausente/nulo, a busca
            # cai na nota_contexto da fonte via coalesce (ver migração 0009).
            "nota_contexto": c.get("nota_contexto"),
            "embedding": emb.tolist(),
        }
        for c, emb in zip(chunks, embeddings)
    ]

    for i in range(0, len(linhas), LOTE_INSERCAO):
        supabase.table("chunks").insert(linhas[i : i + LOTE_INSERCAO]).execute()
        print(f"  gravados {min(i + LOTE_INSERCAO, len(linhas))}/{len(linhas)}", end="\r")

    print(f"\nConcluído: {len(linhas)} chunks indexados para a fonte {fonte_id}.")


if __name__ == "__main__":
    main()
