"""Indexação: gera embeddings dos chunks e grava fonte + chunks no Supabase.

Idempotente: se a fonte (mesma url_origem) já existir, os chunks dela são
apagados e regravados — o registro da fonte é reaproveitado.

Uso:
    .venv/bin/python 04_indexar.py
"""

import json
from pathlib import Path

from dotenv import load_dotenv
import os

from sentence_transformers import SentenceTransformer
from supabase import create_client

RAIZ = Path(__file__).resolve().parent
ARQ_CHUNKS = RAIZ / "dados" / "chunks" / "cnv-vol1.jsonl"
ARQ_MANIFESTO = RAIZ / "manifesto.json"

MODELO = "intfloat/multilingual-e5-small"
LOTE_EMBEDDINGS = 64
LOTE_INSERCAO = 100

FONTE = {
    "titulo": "Relatório Final da Comissão Nacional da Verdade — Volume I",
    "autor_orgao": "Comissão Nacional da Verdade (CNV)",
    "tipo_fonte": "relatorio_oficial",
    "confiabilidade": "alta",
    "data_documento": "2014-12-10",
    "periodo": "pos_1985",
    "url_origem": "https://cnv.memoriasreveladas.gov.br/images/pdf/relatorio/volume_1_digital.pdf",
    "licenca": "documento público oficial",
}


def montar_proveniencia() -> str:
    """Compõe o texto de proveniência a partir do manifesto do pipeline."""
    manifesto = json.loads(ARQ_MANIFESTO.read_text(encoding="utf-8"))
    doc = manifesto[0]
    return (
        f"{doc['descricao']} Download em {doc['data_download'][:10]}, "
        f"sha256 {doc['sha256']}."
    )


def main() -> None:
    load_dotenv(RAIZ.parent / ".env.local")
    url = os.environ["SUPABASE_URL"]
    chave = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    supabase = create_client(url, chave)

    chunks = [
        json.loads(linha)
        for linha in ARQ_CHUNKS.read_text(encoding="utf-8").splitlines()
        if linha.strip()
    ]
    print(f"{len(chunks)} chunks lidos de {ARQ_CHUNKS.name}")

    # Fonte: reaproveita se já existir (mesma url_origem), senão insere.
    existente = (
        supabase.table("fontes")
        .select("fonte_id")
        .eq("url_origem", FONTE["url_origem"])
        .execute()
    )
    if existente.data:
        fonte_id = existente.data[0]["fonte_id"]
        apagados = supabase.table("chunks").delete().eq("fonte_id", fonte_id).execute()
        print(f"Fonte já existia ({fonte_id}); {len(apagados.data)} chunks antigos removidos.")
    else:
        registro = dict(FONTE, proveniencia=montar_proveniencia())
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
