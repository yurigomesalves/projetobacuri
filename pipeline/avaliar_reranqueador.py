"""Mede o teto de qualidade de um reranqueador sobre as perguntas difíceis.

Este ensaio injeta as evidências esperadas no conjunto candidato. Portanto, ele
avalia somente a ordenação do reranqueador e não deve ser comparado ao recall da
busca pública como se fosse uma estratégia completa de recuperação.
"""

from __future__ import annotations

import argparse
import json
import os
import re
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from sentence_transformers import CrossEncoder
from supabase import Client, create_client


RAIZ = Path(__file__).resolve().parents[1]
MODELO_PADRAO = "unicamp-dl/mMiniLM-L6-v2-en-pt-msmarco-v2"


def argumentos() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--saida",
        type=Path,
        default=RAIZ / "docs/avaliacao/resultados-reranqueador-oraculo.json",
    )
    parser.add_argument("--modelo", default=MODELO_PADRAO)
    parser.add_argument("--top-k", type=int, default=8)
    return parser.parse_args()


def paginas_contem(valor: Any, esperadas: list[int]) -> bool:
    texto = str(valor or "")
    intervalos = [
        (int(inicio), int(fim))
        for inicio, fim in re.findall(r"(\d+)\s*[-–—]\s*(\d+)", texto)
    ]
    numeros = [int(numero) for numero in re.findall(r"\d+", texto)]
    return any(
        pagina in numeros
        or any(inicio <= pagina <= fim for inicio, fim in intervalos)
        for pagina in esperadas
    )


def carregar_json(caminho: Path) -> dict[str, Any]:
    return json.loads(caminho.read_text(encoding="utf-8"))


def buscar_chunks(cliente: Client, ids: list[str]) -> dict[str, dict[str, Any]]:
    encontrados: dict[str, dict[str, Any]] = {}
    for inicio in range(0, len(ids), 100):
        lote = ids[inicio : inicio + 100]
        resposta = (
            cliente.table("chunks")
            .select("chunk_id,fonte_id,paginas,secao,conteudo")
            .in_("chunk_id", lote)
            .execute()
        )
        for chunk in resposta.data:
            encontrados[chunk["chunk_id"]] = chunk
    ausentes = sorted(set(ids) - encontrados.keys())
    if ausentes:
        raise RuntimeError(f"{len(ausentes)} chunks não foram retornados pelo banco")
    return encontrados


def main() -> None:
    args = argumentos()
    load_dotenv(RAIZ / ".env.local")
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    chave = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not chave:
        raise RuntimeError("Credenciais do Supabase ausentes em .env.local")

    perguntas = carregar_json(RAIZ / "docs/avaliacao/perguntas-ouro.json")["itens"]
    diagnostico = carregar_json(
        RAIZ / "docs/avaliacao/resultados-diagnostico-50.json"
    )["resultados"]
    auditoria = carregar_json(
        RAIZ / "docs/avaliacao/diagnostico-evidencias-fora-top50.json"
    )["resultados"]

    perguntas_por_id = {item["id"]: item["pergunta"] for item in perguntas}
    diagnostico_por_id = {item["id"]: item for item in diagnostico}
    grupos_por_pergunta: dict[str, list[dict[str, Any]]] = {}
    for grupo in auditoria:
        grupos_por_pergunta.setdefault(grupo["pergunta_id"], []).append(grupo)

    candidatos_por_pergunta: dict[str, list[str]] = {}
    todos_ids: set[str] = set()
    for pergunta_id, grupos in grupos_por_pergunta.items():
        ids = {
            item["chunk_id"]
            for item in diagnostico_por_id[pergunta_id]["resultados"]
        }
        ids.update(
            chunk["chunk_id"] for grupo in grupos for chunk in grupo["chunks"]
        )
        candidatos_por_pergunta[pergunta_id] = sorted(ids)
        todos_ids.update(ids)

    print(f"Buscando {len(todos_ids)} candidatos no Supabase...")
    chunks = buscar_chunks(create_client(url, chave), sorted(todos_ids))
    print(f"Carregando {args.modelo}...")
    modelo = CrossEncoder(args.modelo, max_length=512)

    resultados = []
    unidades_encontradas = 0
    total_unidades = sum(len(grupos) for grupos in grupos_por_pergunta.values())
    for pergunta_id, ids in candidatos_por_pergunta.items():
        pergunta = perguntas_por_id[pergunta_id]
        candidatos = [chunks[chunk_id] for chunk_id in ids]
        pares = [
            (pergunta, f"{chunk.get('secao') or ''}\n{chunk['conteudo']}")
            for chunk in candidatos
        ]
        pontuacoes = modelo.predict(
            pares, batch_size=16, show_progress_bar=False, convert_to_numpy=True
        )
        ordenados = sorted(
            (
                {**chunk, "pontuacao_reranqueador": float(pontuacao)}
                for chunk, pontuacao in zip(candidatos, pontuacoes, strict=True)
            ),
            key=lambda item: item["pontuacao_reranqueador"],
            reverse=True,
        )

        evidencias = []
        for grupo in grupos_por_pergunta[pergunta_id]:
            posicao = next(
                (
                    indice
                    for indice, chunk in enumerate(ordenados, start=1)
                    if chunk["fonte_id"] == grupo["fonte_id"]
                    and paginas_contem(chunk["paginas"], grupo["paginas_esperadas"])
                ),
                None,
            )
            encontrado = posicao is not None and posicao <= args.top_k
            unidades_encontradas += int(encontrado)
            evidencias.append(
                {
                    "rotulo": grupo["rotulo"],
                    "posicao": posicao,
                    f"encontrado_top_{args.top_k}": encontrado,
                }
            )

        resultados.append(
            {
                "id": pergunta_id,
                "pergunta": pergunta,
                "candidatos": len(ordenados),
                "evidencias": evidencias,
                "resultados": [
                    {
                        "posicao": indice,
                        "chunk_id": chunk["chunk_id"],
                        "fonte_id": chunk["fonte_id"],
                        "paginas": chunk["paginas"],
                        "secao": chunk["secao"],
                        "pontuacao_reranqueador": chunk["pontuacao_reranqueador"],
                    }
                    for indice, chunk in enumerate(ordenados, start=1)
                ],
            }
        )
        posicoes = ", ".join(
            f"{item['rotulo']}={item['posicao'] or 'fora'}" for item in evidencias
        )
        print(f"{pergunta_id}: {posicoes}")

    saida = {
        "resumo": {
            "executado_em": datetime.now(UTC).isoformat(),
            "tipo": "teto_oraculo_com_evidencias_injetadas",
            "modelo": args.modelo,
            "top_k": args.top_k,
            "perguntas": len(resultados),
            "unidades_evidencia": total_unidades,
            "unidades_encontradas": unidades_encontradas,
            "recall_oraculo": unidades_encontradas / total_unidades,
        },
        "resultados": resultados,
    }
    args.saida.parent.mkdir(parents=True, exist_ok=True)
    args.saida.write_text(
        json.dumps(saida, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(saida["resumo"], ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
