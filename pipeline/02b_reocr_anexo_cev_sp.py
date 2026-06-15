"""
02b_reocr_anexo_cev_sp.py — Re-OCR de um anexo escaneado do Tomo I da CEV-SP.

O QUE FAZ (em termos simples):
- O Tomo I da CEV-SP "Rubens Paiva" já foi extraído com texto nativo do PDF
  (script 02_extrair.py). Mas as páginas 460 a 501 são reproduções de
  documentos escaneados (lista francesa "Les 151 tortionnaires" e dossiês
  clandestinos sobre o caso Herzog), e o "texto nativo" embutido nessas
  páginas é lixo de OCR antigo (letras espaçadas, palavras quebradas).
- Este script abre o PDF original, renderiza CADA UMA dessas páginas como
  imagem em alta resolução (300 DPI) e roda o Tesseract (idiomas português
  + francês) para gerar um texto novo e mais legível.
- O texto novo é normalizado da mesma forma simples que o 02_extrair.py
  (colapsa espaços repetidos, no máximo 2 quebras de linha seguidas).
- No final, faz um PATCH no arquivo mestre
  pipeline/dados/extraido/cev-sp-rubens-paiva-tomo1.jsonl: substitui SOMENTE
  as linhas das páginas no intervalo configurado, mantendo todas as outras
  linhas e a ordem original intactas.
- Antes de patchear, cria um backup .jsonl.bak (só se ainda não existir).

INTERVALO E SLUG: configuráveis nas constantes abaixo (PAGINA_INICIO,
PAGINA_FIM, SLUG). Por padrão: páginas 460 a 501 (inclusive), slug
"cev-sp-rubens-paiva-tomo1".

COMO RODAR:
  cd /home/yuri/Documentos/Mestrado/Projeto/pipeline
  .venv/bin/python 02b_reocr_anexo_cev_sp.py

É seguro rodar de novo: o backup só é criado uma vez, e o patch sempre
recalcula as páginas do intervalo a partir do PDF original.
"""

import json
import re
from pathlib import Path

import fitz  # PyMuPDF
import pytesseract
from PIL import Image
import io

RAIZ = Path(__file__).parent
PASTA_BRUTOS = RAIZ / "dados" / "brutos"
PASTA_SAIDA = RAIZ / "dados" / "extraido"

SLUG = "cev-sp-rubens-paiva-tomo1"
PAGINA_INICIO = 460  # inclusive, numeração "nossa" (1-based, igual ao jsonl)
PAGINA_FIM = 501     # inclusive
DPI = 300
IDIOMAS = "por+fra"

RE_ESPACOS = re.compile(r"[ \t]+")
RE_QUEBRAS = re.compile(r"\n{3,}")


def normalizar(texto: str) -> str:
    texto = RE_ESPACOS.sub(" ", texto)
    texto = RE_QUEBRAS.sub("\n\n", texto)
    return texto.strip()


def main():
    arquivo_pdf = PASTA_BRUTOS / f"{SLUG}.pdf"
    arquivo_jsonl = PASTA_SAIDA / f"{SLUG}.jsonl"
    arquivo_bak = PASTA_SAIDA / f"{SLUG}.jsonl.bak"

    if not arquivo_pdf.exists():
        print(f"Arquivo não encontrado: {arquivo_pdf}")
        return
    if not arquivo_jsonl.exists():
        print(f"Arquivo não encontrado: {arquivo_jsonl}")
        return

    # Backup, só se ainda não existir.
    if not arquivo_bak.exists():
        arquivo_bak.write_bytes(arquivo_jsonl.read_bytes())
        print(f"Backup criado em {arquivo_bak}")
    else:
        print(f"Backup já existe em {arquivo_bak} (não sobrescrito)")

    # Carrega todas as páginas atuais do jsonl mestre.
    paginas = {}
    with arquivo_jsonl.open("r", encoding="utf-8") as f:
        for linha in f:
            linha = linha.strip()
            if not linha:
                continue
            registro = json.loads(linha)
            paginas[registro["pagina"]] = registro

    documento = fitz.open(arquivo_pdf)

    print(f"Re-OCRando páginas {PAGINA_INICIO}-{PAGINA_FIM} (DPI={DPI}, lang={IDIOMAS})...")

    for n in range(PAGINA_INICIO, PAGINA_FIM + 1):
        idx_fitz = n - 1  # nossa página N = documento[N-1]
        pagina_pdf = documento[idx_fitz]

        pix = pagina_pdf.get_pixmap(dpi=DPI)
        img = Image.open(io.BytesIO(pix.tobytes("png")))

        texto_ocr = pytesseract.image_to_string(img, lang=IDIOMAS)
        texto_ocr = normalizar(texto_ocr)

        if n not in paginas:
            paginas[n] = {"pagina": n}
        paginas[n]["texto"] = texto_ocr

        print(f"  página {n} (fitz[{idx_fitz}]): {len(texto_ocr)} caracteres")

    documento.close()

    # Regrava o arquivo mestre, na ordem de número de página.
    with arquivo_jsonl.open("w", encoding="utf-8") as f:
        for n in sorted(paginas.keys()):
            f.write(json.dumps(paginas[n], ensure_ascii=False) + "\n")

    print(f"Arquivo atualizado: {arquivo_jsonl}")
    print(f"Total de páginas substituídas: {PAGINA_FIM - PAGINA_INICIO + 1}")


if __name__ == "__main__":
    main()
