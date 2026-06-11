"""
02_extrair.py — Extrai o texto de cada página do PDF do Relatório CNV vol. I.

O QUE FAZ (em termos simples):
- Abre pipeline/dados/brutos/cnv-vol1.pdf (já baixado pelo script 01).
- Para cada página do PDF, extrai o texto que já existe "embutido" no arquivo
  (este PDF tem camada de texto, então não precisa de OCR).
- Apenas normaliza espaços em branco repetidos (não faz limpeza agressiva).
- Salva o resultado em pipeline/dados/extraido/cnv-vol1.jsonl, uma linha JSON
  por página, no formato: {"pagina": N, "texto": "..."}
  (N = posição da página no PDF, começando em 1).
- No final, imprime um resumo: total de páginas, páginas vazias e total de
  caracteres extraídos.

COMO RODAR:
  cd /home/yuri/Documentos/Mestrado/Projeto/pipeline
  source .venv/bin/activate
  python 02_extrair.py
"""

import json
import re
from pathlib import Path

import fitz  # PyMuPDF

ARQUIVO_PDF = Path(__file__).parent / "dados" / "brutos" / "cnv-vol1.pdf"
PASTA_SAIDA = Path(__file__).parent / "dados" / "extraido"
ARQUIVO_SAIDA = PASTA_SAIDA / "cnv-vol1.jsonl"

# Normaliza sequências de espaços/tabs (mas preserva quebras de linha).
RE_ESPACOS = re.compile(r"[ \t]+")
# Normaliza 3+ quebras de linha seguidas para no máximo 2.
RE_QUEBRAS = re.compile(r"\n{3,}")


def normalizar(texto: str) -> str:
    texto = RE_ESPACOS.sub(" ", texto)
    texto = RE_QUEBRAS.sub("\n\n", texto)
    return texto.strip()


def main():
    if not ARQUIVO_PDF.exists():
        print(f"Arquivo não encontrado: {ARQUIVO_PDF}")
        print("Rode primeiro o script 01_baixar.py")
        return

    PASTA_SAIDA.mkdir(parents=True, exist_ok=True)

    documento = fitz.open(ARQUIVO_PDF)
    total_paginas = documento.page_count
    paginas_vazias = 0
    total_caracteres = 0

    with open(ARQUIVO_SAIDA, "w", encoding="utf-8") as f_saida:
        for indice, pagina in enumerate(documento, start=1):
            texto_bruto = pagina.get_text()
            texto = normalizar(texto_bruto)

            if not texto:
                paginas_vazias += 1

            total_caracteres += len(texto)

            registro = {"pagina": indice, "texto": texto}
            f_saida.write(json.dumps(registro, ensure_ascii=False) + "\n")

    documento.close()

    print(f"Arquivo gerado: {ARQUIVO_SAIDA}")
    print(f"Total de páginas: {total_paginas}")
    print(f"Páginas vazias: {paginas_vazias}")
    print(f"Total de caracteres extraídos: {total_caracteres}")


if __name__ == "__main__":
    main()
