"""Valida a identidade de um documento antes da indexação.

Este módulo não acessa rede, modelo de embeddings ou banco por conta própria.
Ele reúne as verificações que impedem que um arquivo, um manifesto e um
registro do acervo sejam associados por engano.
"""

from __future__ import annotations

import hashlib
from pathlib import Path
from typing import Any


class IdentidadeDocumentalErro(RuntimeError):
    """O catálogo, o manifesto ou o acervo não identificam o mesmo documento."""


METADADOS_COMPARAVEIS = (
    "titulo", "autor_orgao", "tipo_fonte", "subtipo", "confiabilidade", "data_documento",
    "periodo", "url_origem", "licenca", "nota_contexto", "proveniencia",
)


def _urls_manifesto(documento: dict[str, Any]) -> set[str]:
    return {str(documento[campo]) for campo in ("url", "url_original") if documento.get(campo)}


def selecionar_manifesto(manifesto: list[dict[str, Any]], slug: str, url_origem: str) -> dict[str, Any]:
    """Escolhe apenas a entrada cujo slug *e* URL coincidem."""
    candidatos = [
        documento for documento in manifesto
        if (
            documento.get("slug") == slug
            or (
                not documento.get("slug")
                and documento.get("arquivo_local") == f"dados/brutos/{slug}.pdf"
            )
        )
        and url_origem in _urls_manifesto(documento)
    ]
    if len(candidatos) != 1:
        raise IdentidadeDocumentalErro(
            "O manifesto deve conter exatamente uma entrada com o mesmo slug e URL "
            f"da fonte ({slug!r}); encontradas: {len(candidatos)}."
        )
    return candidatos[0]


def sha256_arquivo(caminho: Path) -> str:
    """Calcula o hash sem carregar um PDF inteiro na memória."""
    digest = hashlib.sha256()
    with caminho.open("rb") as arquivo:
        for bloco in iter(lambda: arquivo.read(1024 * 1024), b""):
            digest.update(bloco)
    return digest.hexdigest()


def validar_arquivo_bruto(documento_manifesto: dict[str, Any], raiz_pipeline: Path, sha256_esperado: str | None) -> str:
    """Confere arquivo local, manifesto e, quando fixado, o hash editorial."""
    caminho_relativo = documento_manifesto.get("arquivo_local")
    if not caminho_relativo:
        raise IdentidadeDocumentalErro("A entrada do manifesto não informa arquivo_local.")
    caminho = raiz_pipeline / caminho_relativo
    if not caminho.is_file():
        raise IdentidadeDocumentalErro(f"Arquivo bruto não encontrado: {caminho}.")
    calculado = sha256_arquivo(caminho)
    declarado = documento_manifesto.get("sha256")
    if calculado != declarado:
        raise IdentidadeDocumentalErro("O hash do arquivo bruto diverge do manifesto; interrompido antes da indexação.")
    if sha256_esperado and calculado != sha256_esperado:
        raise IdentidadeDocumentalErro("O hash do arquivo bruto diverge do sha256_esperado do catálogo; interrompido.")
    return calculado


def validar_metadados_existentes(existente: dict[str, Any], esperado: dict[str, Any], sha256_esperado: str | None) -> None:
    """Exige igualdade dos metadados editoriais que o catálogo declara."""
    divergentes = [
        campo for campo in METADADOS_COMPARAVEIS
        if campo in esperado and existente.get(campo) != esperado.get(campo)
    ]
    if divergentes:
        raise IdentidadeDocumentalErro("Registro existente diverge do catálogo nos campos: " + ", ".join(divergentes) + ".")
    if sha256_esperado and sha256_esperado not in str(existente.get("proveniencia") or ""):
        raise IdentidadeDocumentalErro("O sha256_esperado não consta na proveniência do registro fixado.")


def resolver_fonte_existente(supabase: Any, fonte_meta: dict[str, Any], fonte_id_existente: str | None, sha256_esperado: str | None) -> dict[str, Any] | None:
    """Localiza fonte sem escolher arbitrariamente registros duplicados."""
    if fonte_id_existente:
        resposta = supabase.table("fontes").select("*").eq("fonte_id", fonte_id_existente).execute()
        dados = resposta.data or []
        if len(dados) != 1:
            raise IdentidadeDocumentalErro(
                f"fonte_id_existente={fonte_id_existente} não existe de forma única; não haverá fallback por URL."
            )
        existente = dados[0]
        if existente.get("fonte_id") != fonte_id_existente:
            raise IdentidadeDocumentalErro(
                "A consulta pelo fonte_id_existente devolveu outro registro; interrompido."
            )
        validar_metadados_existentes(existente, fonte_meta, sha256_esperado)
        return existente

    resposta = supabase.table("fontes").select("*").eq("url_origem", fonte_meta["url_origem"]).execute()
    dados = resposta.data or []
    if len(dados) > 1:
        raise IdentidadeDocumentalErro(
            "Há mais de um registro com esta url_origem; informe fonte_id_existente no catálogo antes de indexar."
        )
    if not dados:
        return None
    existente = dados[0]
    validar_metadados_existentes(existente, fonte_meta, sha256_esperado)
    return existente
