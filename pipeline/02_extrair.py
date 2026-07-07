"""
02_extrair.py — Extrai o texto de cada página de um PDF do acervo.

O QUE FAZ (em termos simples):
- Abre pipeline/dados/brutos/<slug>.pdf (já baixado pelo script 01).
- Para cada página do PDF, extrai o texto que já existe "embutido" no arquivo
  (os volumes da CNV têm camada de texto, então não precisa de OCR).
- Apenas normaliza espaços em branco repetidos (não faz limpeza agressiva).
- Salva o resultado em pipeline/dados/extraido/<slug>.jsonl, uma linha JSON
  por página, no formato: {"pagina": N, "texto": "..."}
  (N = posição da página no PDF, começando em 1).
- No final, imprime um resumo: total de páginas, páginas vazias e total de
  caracteres extraídos.

COMO RODAR:
  cd /home/yuri/Documentos/Mestrado/Projeto/pipeline
  source .venv/bin/activate
  python 02_extrair.py cnv-vol2
"""

import argparse
import json
import re
from pathlib import Path

import fitz  # PyMuPDF

RAIZ = Path(__file__).parent
PASTA_BRUTOS = RAIZ / "dados" / "brutos"
PASTA_SAIDA = RAIZ / "dados" / "extraido"

# Normaliza sequências de espaços/tabs (mas preserva quebras de linha).
RE_ESPACOS = re.compile(r"[ \t]+")
# Normaliza 3+ quebras de linha seguidas para no máximo 2.
RE_QUEBRAS = re.compile(r"\n{3,}")


def normalizar(texto: str) -> str:
    texto = RE_ESPACOS.sub(" ", texto)
    texto = RE_QUEBRAS.sub("\n\n", texto)
    return texto.strip()


def main():
    parser = argparse.ArgumentParser(description="Extrai texto de um PDF do acervo")
    parser.add_argument("slug", help="slug da fonte (ex.: cnv-vol2)")
    args = parser.parse_args()

    arquivo_pdf = PASTA_BRUTOS / f"{args.slug}.pdf"
    arquivo_saida = PASTA_SAIDA / f"{args.slug}.jsonl"

    if not arquivo_pdf.exists():
        print(f"Arquivo não encontrado: {arquivo_pdf}")
        print("Rode primeiro o script 01_baixar.py")
        return

    PASTA_SAIDA.mkdir(parents=True, exist_ok=True)

    documento = fitz.open(arquivo_pdf)
    total_paginas = documento.page_count
    paginas_vazias = 0
    total_caracteres = 0

    with open(arquivo_saida, "w", encoding="utf-8") as f_saida:
        for indice, pagina in enumerate(documento, start=1):
            texto_bruto = pagina.get_text()
            texto = normalizar(texto_bruto)

            if not texto:
                paginas_vazias += 1

            total_caracteres += len(texto)

            registro = {"pagina": indice, "texto": texto}
            f_saida.write(json.dumps(registro, ensure_ascii=False) + "\n")

    documento.close()

    print(f"Arquivo gerado: {arquivo_saida}")
    print(f"Total de páginas: {total_paginas}")
    print(f"Páginas vazias: {paginas_vazias}")
    print(f"Total de caracteres extraídos: {total_caracteres}")


if __name__ == "__main__":
    main()
