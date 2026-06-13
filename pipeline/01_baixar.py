"""
01_baixar.py — Baixa um documento do catálogo de fontes e registra a proveniência.

O QUE FAZ (em termos simples):
- Lê o catálogo pipeline/fontes.json, que descreve cada documento do acervo
  (de onde baixar, qual a URL oficial, metadados da fonte).
- Baixa o PDF da fonte pedida e salva em pipeline/dados/brutos/<slug>.pdf
- Anota em pipeline/manifesto.json de onde veio o arquivo, quando foi baixado,
  qual o "hash" (impressão digital) dele e seu tamanho. Isso permite conferir
  depois que o arquivo não foi alterado/corrompido.
- Se o arquivo já existir e já estiver registrado no manifesto, não baixa de novo
  (pode rodar este script várias vezes sem problema).

COMO RODAR:
  cd /home/yuri/Documentos/Mestrado/Projeto/pipeline
  source .venv/bin/activate
  python 01_baixar.py cnv-vol2          # uma fonte específica
  python 01_baixar.py --todas           # todas as fontes do catálogo
"""

import argparse
import hashlib
import json
import os
import time
from datetime import datetime, timezone
from pathlib import Path

import certifi
import requests

RAIZ = Path(__file__).parent
CATALOGO = RAIZ / "fontes.json"
PASTA_BRUTOS = RAIZ / "dados" / "brutos"
MANIFESTO = RAIZ / "manifesto.json"

# O portal oficial (cnv.memoriasreveladas.gov.br) está protegido por um sistema
# anti-robô (desafio JavaScript / F5 "TSPD") que bloqueia qualquer download
# automatizado, mesmo respeitando robots.txt e usando User-Agent de navegador.
# Em vez de tentar burlar essa proteção, baixamos cópias idênticas preservadas
# pelo Internet Archive (Wayback Machine). A proveniência completa (URL original
# + URL do arquivamento + data da captura) fica registrada no manifesto.

# Certificados extras (mantidos caso seja necessário tentar o portal oficial
# diretamente no futuro; o Internet Archive não tem o problema de cadeia
# incompleta, mas deixamos pronto para reuso).
CADEIA_EXTRA = RAIZ / "certs" / "cadeia-extra-memoriasreveladas.pem"


def montar_bundle_ca() -> str:
    """Cria (se necessário) um arquivo combinando certifi + cadeia extra e retorna o caminho."""
    bundle = RAIZ / "certs" / "_bundle_ca.pem"
    conteudo = Path(certifi.where()).read_text() + "\n" + CADEIA_EXTRA.read_text()
    bundle.write_text(conteudo)
    return str(bundle)


def montar_descricao(item: dict) -> str:
    captura = item.get("data_captura_wayback")
    if captura:
        return (
            f"{item['descricao_curta']} "
            "Documento original do portal Memórias Reveladas/Arquivo Nacional "
            f"({item['url_oficial']}), obtido via cópia arquivada pelo Internet "
            f"Archive (Wayback Machine) em {captura}, pois o "
            "portal oficial bloqueia downloads automatizados (proteção anti-robô)."
        )
    return (
        f"{item['descricao_curta']} "
        f"Baixado diretamente de {item['url_download']}."
    )


def calcular_sha256(caminho: Path) -> str:
    h = hashlib.sha256()
    with open(caminho, "rb") as f:
        for bloco in iter(lambda: f.read(8192), b""):
            h.update(bloco)
    return h.hexdigest()


def carregar_manifesto() -> list:
    if MANIFESTO.exists():
        with open(MANIFESTO, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


def salvar_manifesto(itens: list) -> None:
    with open(MANIFESTO, "w", encoding="utf-8") as f:
        json.dump(itens, f, ensure_ascii=False, indent=2)


def ja_registrado(itens: list, url: str) -> bool:
    return any(item["url"] == url for item in itens)


def registrar(itens: list, slug: str, item: dict, arquivo: Path) -> None:
    """Calcula o hash do arquivo já presente e grava no manifesto."""
    sha256 = calcular_sha256(arquivo)
    tamanho = os.path.getsize(arquivo)

    entrada = {
        "slug": slug,
        "url": item["url_download"],
        "url_original": item["url_oficial"],
        "arquivo_local": str(arquivo.relative_to(RAIZ)),
        "data_download": datetime.now(timezone.utc).isoformat(),
        "sha256": sha256,
        "tamanho_bytes": tamanho,
        "descricao": montar_descricao(item),
    }

    # Remove registro anterior da mesma URL, se existir, e adiciona o novo.
    itens_novos = [i for i in itens if i["url"] != item["url_download"]]
    itens_novos.append(entrada)
    salvar_manifesto(itens_novos)
    itens[:] = itens_novos

    print(f"sha256: {sha256}")
    print(f"tamanho: {tamanho} bytes")
    print(f"Registrado em: {MANIFESTO}")


def baixar_fonte(slug: str, item: dict, itens: list) -> None:
    url = item["url_download"]
    arquivo = PASTA_BRUTOS / f"{slug}.pdf"

    if arquivo.exists() and ja_registrado(itens, url):
        print(f"[{slug}] Arquivo já baixado e registrado: {arquivo}")
        return

    if arquivo.exists() and not ja_registrado(itens, url):
        # Arquivo já está na pasta (ex.: colocado manualmente pelo Yuri).
        # Não baixa de novo: só calcula o hash e registra a proveniência.
        print(f"[{slug}] Arquivo já existe em {arquivo}, registrando proveniência...")
        registrar(itens, slug, item, arquivo)
        return

    print(f"[{slug}] Baixando {url} ...")

    # Pausa educada antes da requisição (boa prática de rate limiting).
    time.sleep(1)

    cabecalhos = {"User-Agent": "Mozilla/5.0 (pesquisa-academica)"}
    bundle_ca = montar_bundle_ca()

    resposta = requests.get(url, headers=cabecalhos, verify=bundle_ca, stream=True, timeout=300)
    resposta.raise_for_status()

    tipo_conteudo = resposta.headers.get("Content-Type", "")
    if "pdf" not in tipo_conteudo.lower():
        print()
        print("AVISO: o servidor não retornou um PDF (Content-Type recebido: "
              f"'{tipo_conteudo}').")
        print("AÇÃO MANUAL NECESSÁRIA:")
        print(f"  1. Abra no navegador: {url}")
        print(f"  2. Salve o arquivo como: {arquivo}")
        print("  3. Rode este script de novo: ele vai calcular o hash,")
        print("     registrar a proveniência no manifesto e não tentará baixar de novo.")
        return

    temporario = arquivo.with_suffix(".pdf.parcial")
    with open(temporario, "wb") as f:
        for bloco in resposta.iter_content(chunk_size=8192):
            f.write(bloco)
    temporario.rename(arquivo)

    print(f"[{slug}] Download concluído: {arquivo}")
    registrar(itens, slug, item, arquivo)


def main():
    parser = argparse.ArgumentParser(description="Baixa documentos do catálogo de fontes")
    parser.add_argument("slug", nargs="?", help="slug da fonte em fontes.json (ex.: cnv-vol2)")
    parser.add_argument("--todas", action="store_true", help="baixa todas as fontes do catálogo")
    args = parser.parse_args()

    catalogo = json.loads(CATALOGO.read_text(encoding="utf-8"))

    if args.todas:
        slugs = list(catalogo)
    elif args.slug:
        if args.slug not in catalogo:
            parser.error(f"fonte '{args.slug}' não está em {CATALOGO.name}. "
                         f"Disponíveis: {', '.join(catalogo)}")
        slugs = [args.slug]
    else:
        parser.error("informe o slug de uma fonte ou use --todas")

    PASTA_BRUTOS.mkdir(parents=True, exist_ok=True)
    itens = carregar_manifesto()

    for slug in slugs:
        baixar_fonte(slug, catalogo[slug], itens)


if __name__ == "__main__":
    main()
