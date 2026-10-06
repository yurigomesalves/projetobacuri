"""Indexa uma fonte somente após conferir sua identidade documental.

Por padrão, o comando apenas diagnostica catálogo, manifesto, arquivo bruto e
registro remoto, sem carregar modelo nem alterar o banco:

    .venv/bin/python 04_indexar.py dossie-ditadura-cevsp

Para uma fonte nova, depois de conferir a saída, use:

    .venv/bin/python 04_indexar.py SLUG --aplicar

Para substituir chunks de uma fonte já existente, a operação é destrutiva e
exige as duas chaves explícitas abaixo. Faça backup autorizado antes:

    .venv/bin/python 04_indexar.py SLUG --aplicar --substituir-chunks
"""

import argparse
import json
import math
import os
from pathlib import Path

from identidade_documental import (
    IdentidadeDocumentalErro,
    resolver_fonte_existente,
    selecionar_manifesto,
    validar_arquivo_bruto,
)

RAIZ = Path(__file__).resolve().parent
CATALOGO = RAIZ / "fontes.json"
ARQ_MANIFESTO = RAIZ / "manifesto.json"
MODELO = "intfloat/multilingual-e5-small"
LOTE_EMBEDDINGS = 64
LOTE_INSERCAO = 25


def ler_chunks(caminho: Path) -> list[dict]:
    # Não usar splitlines(): U+2028/U+0085 podem fazer parte do texto do chunk.
    with caminho.open(encoding="utf-8") as arquivo:
        chunks = [json.loads(linha) for linha in arquivo if linha.strip()]
    if not chunks:
        raise IdentidadeDocumentalErro(f"Arquivo de chunks vazio: {caminho}.")
    return chunks


def preparar_linhas(chunks: list[dict], fonte_id: str | None, modelo) -> list[dict]:
    """Calcula todos os vetores antes de qualquer remoção de chunks antigos."""
    embeddings = modelo.encode(
        ["passage: " + chunk["conteudo"] for chunk in chunks],
        batch_size=LOTE_EMBEDDINGS,
        normalize_embeddings=True,
        show_progress_bar=True,
    )
    if len(embeddings) != len(chunks):
        raise IdentidadeDocumentalErro(
            "O modelo devolveu quantidade de embeddings diferente da quantidade de chunks."
        )
    vetores = []
    for indice, embedding in enumerate(embeddings):
        vetor = embedding.tolist()
        if len(vetor) != 384 or not all(math.isfinite(valor) for valor in vetor):
            raise IdentidadeDocumentalErro(
                f"Embedding inválido no chunk {indice}: esperadas 384 dimensões finitas."
            )
        vetores.append(vetor)
    return [
        {
            "fonte_id": fonte_id,
            "ordem": chunk["ordem"],
            "conteudo": chunk["conteudo"],
            "paginas": chunk["paginas"],
            "secao": chunk["secao"],
            "subsecao": chunk.get("subsecao"),
            "tipo_chunk": chunk.get("tipo_chunk", "corpo"),
            "nota_contexto": chunk.get("nota_contexto"),
            "embedding": vetor,
        }
        for chunk, vetor in zip(chunks, vetores)
    ]


def inserir_em_lotes(supabase, linhas: list[dict]) -> None:
    for inicio in range(0, len(linhas), LOTE_INSERCAO):
        supabase.table("chunks").insert(linhas[inicio : inicio + LOTE_INSERCAO]).execute()
        print(f"  gravados {min(inicio + LOTE_INSERCAO, len(linhas))}/{len(linhas)}", end="\r")


def main() -> None:
    parser = argparse.ArgumentParser(description="Confere e indexa uma fonte no Supabase")
    parser.add_argument("slug", help="slug da fonte em fontes.json")
    parser.add_argument("--aplicar", action="store_true", help="autoriza gravar fonte/chunks após o diagnóstico")
    parser.add_argument(
        "--substituir-chunks", action="store_true",
        help="autoriza apagar chunks existentes; requer --aplicar e backup autorizado",
    )
    args = parser.parse_args()
    if args.substituir_chunks and not args.aplicar:
        parser.error("--substituir-chunks requer --aplicar")

    catalogo = json.loads(CATALOGO.read_text(encoding="utf-8"))
    if args.slug not in catalogo:
        raise SystemExit(f"fonte {args.slug!r} não está em {CATALOGO.name}.")
    entrada = catalogo[args.slug]
    fonte_meta = entrada["fonte"]
    sha_esperado = entrada.get("sha256_esperado")
    documento = selecionar_manifesto(
        json.loads(ARQ_MANIFESTO.read_text(encoding="utf-8")), args.slug, fonte_meta["url_origem"]
    )
    sha_calculado = validar_arquivo_bruto(documento, RAIZ, sha_esperado)
    chunks = ler_chunks(RAIZ / "dados" / "chunks" / f"{args.slug}.jsonl")
    print(f"Identidade local conferida: {len(chunks)} chunks; sha256 {sha_calculado}.")

    # Dependências de banco/modelo ficam aqui para que validações e testes sejam offline.
    from dotenv import load_dotenv
    from supabase import create_client

    load_dotenv(RAIZ.parent / ".env.local")
    supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])
    existente = resolver_fonte_existente(
        supabase, fonte_meta, entrada.get("fonte_id_existente"), sha_esperado
    )
    if not args.aplicar:
        estado = f"fonte existente {existente['fonte_id']}" if existente else "fonte ainda não cadastrada"
        print(f"Diagnóstico concluído: {estado}. Nenhum modelo foi carregado e nada foi alterado.")
        return

    if existente and not args.substituir_chunks:
        raise SystemExit(
            "A fonte já existe. Para substituir seus chunks, faça backup autorizado e use "
            "--aplicar --substituir-chunks."
        )

    from sentence_transformers import SentenceTransformer

    print(f"Carregando modelo {MODELO}…")
    fonte_id = existente["fonte_id"] if existente else None
    linhas = preparar_linhas(chunks, fonte_id, SentenceTransformer(MODELO))
    if not existente:
        registro = dict(fonte_meta)
        registro.setdefault(
            "proveniencia",
            f"{documento['descricao']} Download em {documento['data_download'][:10]}, sha256 {sha_calculado}.",
        )
        fonte_id = supabase.table("fontes").insert(registro).execute().data[0]["fonte_id"]
        for linha in linhas:
            linha["fonte_id"] = fonte_id
    if existente:
        apagados = supabase.table("chunks").delete().eq("fonte_id", fonte_id).execute()
        print(f"{len(apagados.data or [])} chunks antigos removidos após preparar os novos.")
    inserir_em_lotes(supabase, linhas)
    print(f"\nConcluído: {len(linhas)} chunks indexados para a fonte {fonte_id}.")


if __name__ == "__main__":
    main()
