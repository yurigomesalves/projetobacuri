"""
01_baixar.py — Baixa o Relatório Final da CNV (volume I) e registra a proveniência.

O QUE FAZ (em termos simples):
- Baixa o PDF oficial do volume I do relatório da Comissão Nacional da Verdade,
  disponibilizado pelo portal Memórias Reveladas (Arquivo Nacional).
- Salva em pipeline/dados/brutos/cnv-vol1.pdf
- Anota em pipeline/manifesto.json de onde veio o arquivo, quando foi baixado,
  qual o "hash" (impressão digital) dele e seu tamanho. Isso permite conferir
  depois que o arquivo não foi alterado/corrompido.
- Se o arquivo já existir e já estiver registrado no manifesto, não baixa de novo
  (pode rodar este script várias vezes sem problema).

COMO RODAR:
  cd /home/yuri/Documentos/Mestrado/Projeto/pipeline
  source .venv/bin/activate
  python 01_baixar.py
"""

import hashlib
import json
import os
import time
from datetime import datetime, timezone
from pathlib import Path

import certifi
import requests

# URL oficial do documento (portal Memórias Reveladas / Arquivo Nacional).
# Esta URL está bloqueada para downloads automatizados (ver comentário abaixo),
# mas é mantida aqui como referência da fonte original/autoritativa.
URL_OFICIAL = "https://cnv.memoriasreveladas.gov.br/images/pdf/relatorio/volume_1_digital.pdf"

# O portal oficial está protegido por um sistema anti-robô (desafio JavaScript
# / F5 "TSPD") que bloqueia qualquer download automatizado, mesmo respeitando
# robots.txt e usando User-Agent de navegador. Em vez de tentar burlar essa
# proteção, baixamos uma cópia idêntica preservada pelo Internet Archive
# (Wayback Machine), que arquivou publicamente o mesmo arquivo do portal
# oficial. A proveniência completa (URL original + URL do arquivamento +
# data da captura) fica registrada no manifesto.
URL = "https://web.archive.org/web/20240123001525/http://cnv.memoriasreveladas.gov.br/images/pdf/relatorio/volume_1_digital.pdf"

PASTA_BRUTOS = Path(__file__).parent / "dados" / "brutos"
ARQUIVO_DESTINO = PASTA_BRUTOS / "cnv-vol1.pdf"
MANIFESTO = Path(__file__).parent / "manifesto.json"

# Certificados extras (mantidos caso seja necessário tentar o portal oficial
# diretamente no futuro; o Internet Archive não tem o problema de cadeia
# incompleta, mas deixamos pronto para reuso).
CADEIA_EXTRA = Path(__file__).parent / "certs" / "cadeia-extra-memoriasreveladas.pem"


def montar_bundle_ca() -> str:
    """Cria (se necessário) um arquivo combinando certifi + cadeia extra e retorna o caminho."""
    bundle = Path(__file__).parent / "certs" / "_bundle_ca.pem"
    conteudo = Path(certifi.where()).read_text() + "\n" + CADEIA_EXTRA.read_text()
    bundle.write_text(conteudo)
    return str(bundle)

DESCRICAO = (
    "Relatório Final da CNV, volume I, dez/2014, PDF com camada de texto. "
    "Documento original do portal Memórias Reveladas/Arquivo Nacional "
    f"({URL_OFICIAL}), obtido via cópia arquivada pelo Internet Archive "
    "(Wayback Machine) em 23/01/2024, pois o portal oficial bloqueia "
    "downloads automatizados (proteção anti-robô)."
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


def main():
    PASTA_BRUTOS.mkdir(parents=True, exist_ok=True)
    itens = carregar_manifesto()

    if ARQUIVO_DESTINO.exists() and ja_registrado(itens, URL):
        print(f"Arquivo já baixado e registrado: {ARQUIVO_DESTINO}")
        return

    if ARQUIVO_DESTINO.exists() and not ja_registrado(itens, URL):
        # Arquivo já está na pasta (ex.: colocado manualmente pelo Yuri).
        # Não baixa de novo: só calcula o hash e registra a proveniência.
        print(f"Arquivo já existe em {ARQUIVO_DESTINO}, registrando proveniência...")
        registrar(itens)
        return

    print(f"Baixando {URL} ...")

    # Pausa educada antes da requisição (boa prática de rate limiting).
    time.sleep(1)

    cabecalhos = {"User-Agent": "Mozilla/5.0 (pesquisa-academica)"}
    bundle_ca = montar_bundle_ca()

    resposta = requests.get(URL, headers=cabecalhos, verify=bundle_ca, stream=True, timeout=120)
    resposta.raise_for_status()

    tipo_conteudo = resposta.headers.get("Content-Type", "")
    if "pdf" not in tipo_conteudo.lower():
        print()
        print("AVISO: o portal não retornou um PDF (Content-Type recebido: "
              f"'{tipo_conteudo}').")
        print(
            "O site cnv.memoriasreveladas.gov.br está protegido por um "
            "sistema anti-robô (desafio JavaScript / F5 'TSPD'), que bloqueia "
            "downloads automatizados mesmo com User-Agent de navegador."
        )
        print()
        print("AÇÃO MANUAL NECESSÁRIA:")
        print("  1. Abra no navegador:")
        print(f"     {URL}")
        print("  2. Salve o arquivo como:")
        print(f"     {ARQUIVO_DESTINO}")
        print("  3. Rode este script de novo: ele vai calcular o hash,")
        print("     registrar a proveniência no manifesto e não tentará baixar de novo.")
        return

    with open(ARQUIVO_DESTINO, "wb") as f:
        for bloco in resposta.iter_content(chunk_size=8192):
            f.write(bloco)

    print(f"Download concluído: {ARQUIVO_DESTINO}")
    registrar(itens)


def registrar(itens: list) -> None:
    """Calcula o hash do arquivo já presente em ARQUIVO_DESTINO e grava no manifesto."""
    sha256 = calcular_sha256(ARQUIVO_DESTINO)
    tamanho = os.path.getsize(ARQUIVO_DESTINO)

    entrada = {
        "url": URL,
        "url_original": URL_OFICIAL,
        "arquivo_local": str(ARQUIVO_DESTINO.relative_to(Path(__file__).parent)),
        "data_download": datetime.now(timezone.utc).isoformat(),
        "sha256": sha256,
        "tamanho_bytes": tamanho,
        "descricao": DESCRICAO,
    }

    # Remove registro anterior da mesma URL, se existir, e adiciona o novo.
    itens = [item for item in itens if item["url"] != URL]
    itens.append(entrada)
    salvar_manifesto(itens)

    print(f"sha256: {sha256}")
    print(f"tamanho: {tamanho} bytes")
    print(f"Registrado em: {MANIFESTO}")


if __name__ == "__main__":
    main()
