"""
02d_ocr_osasco.py — OCR do dossiê da Comissão Municipal da Verdade de Osasco.

O QUE FAZ (em termos simples):
- O dossiê de Osasco ("cmv-sp-osasco.pdf", 117 páginas) é um PDF formado
  inteiramente por imagens escaneadas: não tem camada de texto, então o
  02_extrair.py normal não extrai nada (0 caracteres em todas as páginas).
- Este script percorre cada página, renderiza como imagem (300 DPI) e roda o
  Tesseract em português (lang="por") para gerar o texto.
- Páginas sem nenhuma imagem embutida são tratadas como em branco (sem OCR).
- Salva em pipeline/dados/extraido/cmv-sp-osasco.jsonl, uma linha JSON por
  página: {"pagina": N, "texto": "...", "qualidade_ocr": "..."} — mesmo formato
  do 02_extrair.py (mais o campo de qualidade do OCR, como no 02c do Tomo III).
- GRAVAÇÃO INCREMENTAL a cada 25 páginas (.jsonl.progresso); retomável.

Documento pequeno: a 300 DPI, ~117 páginas levam poucos minutos.

COMO RODAR:
  cd /home/yuri/Documentos/Mestrado/Projeto/pipeline
  source .venv/bin/activate
  python 02d_ocr_osasco.py
  # ou em segundo plano:
  nohup .venv/bin/python 02d_ocr_osasco.py > ocr_osasco.log 2>&1 &
"""

import json
import re
import time
import io
from pathlib import Path

import fitz  # PyMuPDF
import pytesseract
from PIL import Image

RAIZ = Path(__file__).parent
PASTA_BRUTOS = RAIZ / "dados" / "brutos"
PASTA_SAIDA = RAIZ / "dados" / "extraido"

SLUG = "cmv-sp-osasco"
DPI = 300
IDIOMA = "por"
SALVAR_A_CADA = 25  # páginas

RE_ESPACOS = re.compile(r"[ \t]+")
RE_QUEBRAS = re.compile(r"\n{3,}")


def normalizar(texto: str) -> str:
    texto = RE_ESPACOS.sub(" ", texto)
    texto = RE_QUEBRAS.sub("\n\n", texto)
    return texto.strip()


def carregar_progresso(arquivo: Path) -> dict:
    paginas = {}
    if arquivo.exists():
        with arquivo.open("r", encoding="utf-8") as f:
            for linha in f:
                linha = linha.strip()
                if not linha:
                    continue
                registro = json.loads(linha)
                paginas[registro["pagina"]] = registro
    return paginas


def gravar_jsonl(caminho: Path, paginas: dict) -> None:
    with caminho.open("w", encoding="utf-8") as f:
        for n in sorted(paginas.keys()):
            f.write(json.dumps(paginas[n], ensure_ascii=False) + "\n")


def main():
    arquivo_pdf = PASTA_BRUTOS / f"{SLUG}.pdf"
    arquivo_final = PASTA_SAIDA / f"{SLUG}.jsonl"
    arquivo_progresso = PASTA_SAIDA / f"{SLUG}.jsonl.progresso"

    if not arquivo_pdf.exists():
        print(f"Arquivo não encontrado: {arquivo_pdf}")
        return

    PASTA_SAIDA.mkdir(parents=True, exist_ok=True)

    paginas = carregar_progresso(arquivo_progresso)
    if not paginas and arquivo_final.exists():
        paginas = carregar_progresso(arquivo_final)

    documento = fitz.open(arquivo_pdf)
    total = documento.page_count

    print(f"Total de páginas: {total}")
    print(f"Já processadas (retomando): {len(paginas)}")

    inicio = time.time()
    processadas = 0

    for n in range(1, total + 1):
        if n in paginas:
            continue

        pagina_pdf = documento[n - 1]

        if not pagina_pdf.get_images():
            paginas[n] = {"pagina": n, "texto": "",
                          "qualidade_ocr": "pagina_em_branco_sem_ocr"}
        else:
            pix = pagina_pdf.get_pixmap(dpi=DPI)
            img = Image.open(io.BytesIO(pix.tobytes("png")))
            texto_ocr = normalizar(pytesseract.image_to_string(img, lang=IDIOMA))
            qualidade = ("ocr_tesseract_por_300dpi" if texto_ocr
                         else "ocr_tesseract_sem_texto_detectado")
            paginas[n] = {"pagina": n, "texto": texto_ocr, "qualidade_ocr": qualidade}

        processadas += 1

        if n % SALVAR_A_CADA == 0 or n == total:
            gravar_jsonl(arquivo_progresso, paginas)
            print(f"  página {n}/{total} — {processadas} processadas em "
                  f"{time.time() - inicio:.0f}s (progresso salvo)")

    documento.close()

    gravar_jsonl(arquivo_final, paginas)
    if arquivo_progresso.exists():
        arquivo_progresso.unlink()

    print(f"Arquivo final gerado: {arquivo_final}")
    print(f"Total de páginas: {total}")


if __name__ == "__main__":
    main()
