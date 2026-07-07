"""Indexação em lote dos 24 documentos suplementares da Covemg.

Versão otimizada do 04_indexar.py: carrega o modelo sentence-transformers
uma única vez e itera sobre todos os slugs, evitando 24 inicializações
separadas.

Idempotente: reindexação de um slug existente apaga os chunks antigos e
grava os novos (mesma lógica do 04_indexar.py).

Uso:
    .venv/bin/python 04_indexar_lote_covemg.py [slug...]
    sem argumento → processa todos os 24
"""

import json
import sys
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
LOTE_INSERCAO = 25

TODOS_SLUGS = [
    "cev-mg-covemg-310-laudo-pericial-análise",
    "cev-mg-covemg-316-lista-torturadores-fontes-consultadas",
    "cev-mg-covemg-335-histórico-emails-trocados-entre",
    "cev-mg-covemg-341-acontecimentos-envolvendo-mortes-desaparecimentos",
    "cev-mg-covemg-352-cpi-agitação-meio-rural",
    "cev-mg-covemg-354-carta-caio-monteiro-barros",
    "cev-mg-covemg-372-laudo-pericial-comissão-nacional",
    "cev-mg-covemg-392-entrevista-christóvão-mourão-projeto",
    "cev-mg-covemg-402-depoimento-maria-conceição-rubinger",
    "cev-mg-covemg-408-depoimento-nilmário-miranda-sobre",
    "cev-mg-covemg-426-depoimento-chirlene-gonçalves-elaine",
    "cev-mg-covemg-431-depoimento-alípio-gomes-filho",
    "cev-mg-covemg-432-depoimento-josé-francisco-neres",
    "cev-mg-covemg-434-depoimento-omene-vera-comissão",
    "cev-mg-covemg-454-depoimento-daniel-bezerra-albuquerque",
    "cev-mg-covemg-455-laudo-referente-análise-dos",
    "cev-mg-covemg-461-lista-nomes-presos-políticos",
    "cev-mg-covemg-462-perfil-profissional-das-vítimas",
    "cev-mg-covemg-467-depoimento-professor-radialista-fábio",
    "cev-mg-covemg-468-relatório-comissão-verdade-sindicato",
    "cev-mg-covemg-482-tabela-brasil-nunca-mais",
    "cev-mg-covemg-486-quantitativo-vítimas-por-organizações",
    "cev-mg-covemg-502-planilha-mineiros-mortos-desaparecidos",
    "cev-mg-covemg-523-depoimento-emanuel-oliveira-césar",
]


def montar_proveniencia(url_oficial: str, manifesto: list) -> str:
    candidatos = [d for d in manifesto if d.get("url_original") == url_oficial]
    if not candidatos:
        raise ValueError(
            f"url_original={url_oficial} não encontrada no manifesto."
        )
    doc = candidatos[0]
    return (
        f"{doc['descricao']} Download em {doc['data_download'][:10]}, "
        f"sha256 {doc['sha256']}."
    )


def indexar_slug(slug, catalogo, manifesto, modelo, supabase):
    print(f"\n[{slug}]")

    if slug not in catalogo:
        print(f"  AVISO: slug não encontrado em fontes.json — pulando")
        return 0

    arq_chunks = RAIZ / "dados" / "chunks" / f"{slug}.jsonl"
    if not arq_chunks.exists():
        print(f"  AVISO: arquivo de chunks não encontrado — pulando")
        return 0

    with open(arq_chunks, encoding="utf-8") as f:
        chunks = [json.loads(linha) for linha in f if linha.strip()]
    if not chunks:
        print(f"  AVISO: arquivo vazio — pulando")
        return 0
    print(f"  {len(chunks)} chunks lidos")

    fonte_meta = catalogo[slug]["fonte"]

    existente = (
        supabase.table("fontes")
        .select("fonte_id")
        .eq("url_origem", fonte_meta["url_origem"])
        .execute()
    )
    if existente.data:
        fonte_id = existente.data[0]["fonte_id"]
        apagados = supabase.table("chunks").delete().eq("fonte_id", fonte_id).execute()
        print(f"  Fonte já existia ({fonte_id}); {len(apagados.data)} chunks antigos removidos")
    else:
        prov = montar_proveniencia(fonte_meta["url_origem"], manifesto)
        registro = dict(fonte_meta, proveniencia=prov)
        resposta = supabase.table("fontes").insert(registro).execute()
        fonte_id = resposta.data[0]["fonte_id"]
        print(f"  Fonte registrada: {fonte_id}")

    textos = ["passage: " + c["conteudo"] for c in chunks]
    embeddings = modelo.encode(
        textos,
        batch_size=LOTE_EMBEDDINGS,
        normalize_embeddings=True,
        show_progress_bar=False,
    )

    linhas = [
        {
            "fonte_id": fonte_id,
            "ordem": c["ordem"],
            "conteudo": c["conteudo"],
            "paginas": c["paginas"],
            "secao": c["secao"],
            "subsecao": c.get("subsecao"),
            "tipo_chunk": c.get("tipo_chunk", "corpo"),
            "nota_contexto": c.get("nota_contexto"),
            "embedding": emb.tolist(),
        }
        for c, emb in zip(chunks, embeddings)
    ]

    for i in range(0, len(linhas), LOTE_INSERCAO):
        supabase.table("chunks").insert(linhas[i : i + LOTE_INSERCAO]).execute()
        print(f"  gravados {min(i + LOTE_INSERCAO, len(linhas))}/{len(linhas)}", end="\r")

    print(f"  {len(linhas)} chunks indexados para {fonte_id}")
    return len(linhas)


def main():
    slugs = sys.argv[1:] if len(sys.argv) > 1 else TODOS_SLUGS

    invalidos = [s for s in slugs if s not in TODOS_SLUGS]
    if invalidos:
        print(f"Slugs não reconhecidos: {invalidos}")
        sys.exit(1)

    load_dotenv(RAIZ.parent / ".env.local")
    url = os.environ["SUPABASE_URL"]
    chave = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    supabase = create_client(url, chave)

    catalogo = json.loads(CATALOGO.read_text(encoding="utf-8"))
    manifesto = json.loads(ARQ_MANIFESTO.read_text(encoding="utf-8"))

    print(f"Carregando modelo {MODELO}…")
    modelo = SentenceTransformer(MODELO)

    total = 0
    erros = []
    for slug in slugs:
        try:
            total += indexar_slug(slug, catalogo, manifesto, modelo, supabase)
        except Exception as e:
            print(f"  ERRO: {e}")
            erros.append(slug)

    print(f"\n{'='*60}")
    print(f"Concluído: {len(slugs) - len(erros)}/{len(slugs)} documentos indexados, {total} chunks no total.")
    if erros:
        print(f"Com erro: {erros}")


if __name__ == "__main__":
    main()
