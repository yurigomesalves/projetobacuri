"""
02c_ocr_tomo3_cev_sp.py — OCR completo do Tomo III da CEV-SP (audiências públicas).

O QUE FAZ (em termos simples):
- O Tomo III ("III_Tomo_Completo.pdf") é um PDF de 12225 páginas formado
  inteiramente por imagens escaneadas das audiências públicas da Comissão
  da Verdade do Estado de São Paulo. Não existe camada de texto: o
  02_extrair.py normal não extrai nada.
- Este script percorre cada página, renderiza como imagem (200 DPI) e roda
  o Tesseract em português (lang="por") para gerar o texto.
- Muitas páginas (cerca de 5100 de 12225) são páginas em branco (separadores
  entre documentos, sem nenhuma imagem). Para não desperdiçar tempo de OCR,
  o script primeiro verifica se a página tem alguma imagem embutida; se não
  tiver, grava texto vazio "" sem chamar o Tesseract.
- Salva o resultado em pipeline/dados/extraido/cev-sp-rubens-paiva-tomo3.jsonl,
  uma linha JSON por página: {"pagina": N, "texto": "...", "qualidade_ocr": "..."}
- GRAVAÇÃO INCREMENTAL: o script salva o progresso a cada 100 páginas em um
  arquivo de progresso (.jsonl.progresso). Se for interrompido (Ctrl+C, falta
  de luz, etc.), pode ser rodado de novo: ele continua de onde parou, sem
  refazer OCR das páginas já processadas. Ao terminar todas as páginas, o
  arquivo final é gravado em cev-sp-rubens-paiva-tomo3.jsonl.

ATENÇÃO — TEMPO ESTIMADO: este processo é longo. OCR de ~7100 páginas com
conteúdo, a ~1.1s/página, leva entre 2 e 3 horas de processamento contínuo.
Recomenda-se rodar em segundo plano (com `&` ou `nohup`) e verificar o
progresso de tempos em tempos.

COMO RODAR:
  cd /home/yuri/Documentos/Mestrado/Projeto/pipeline
  source .venv/bin/activate
  python 02c_ocr_tomo3_cev_sp.py
  # ou, para rodar em segundo plano e poder fechar o terminal:
  nohup .venv/bin/python 02c_ocr_tomo3_cev_sp.py > ocr_tomo3.log 2>&1 &

  Para acompanhar o progresso enquanto roda:
  tail -f ocr_tomo3.log
"""

import json
import re
import time
from pathlib import Path

import fitz  # PyMuPDF
import pytesseract
from PIL import Image
import io

RAIZ = Path(__file__).parent
PASTA_BRUTOS = RAIZ / "dados" / "brutos"
PASTA_SAIDA = RAIZ / "dados" / "extraido"

SLUG = "cev-sp-rubens-paiva-tomo3"
DPI = 200
IDIOMA = "por"
SALVAR_A_CADA = 100  # páginas

RE_ESPACOS = re.compile(r"[ \t]+")
RE_QUEBRAS = re.compile(r"\n{3,}")


def normalizar(texto: str) -> str:
    texto = RE_ESPACOS.sub(" ", texto)
    texto = RE_QUEBRAS.sub("\n\n", texto)
    return texto.strip()


def carregar_progresso(arquivo_progresso: Path) -> dict:
    """Carrega páginas já processadas (formato {pagina: registro})."""
    paginas = {}
    if arquivo_progresso.exists():
        with arquivo_progresso.open("r", encoding="utf-8") as f:
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
        # se já existe um jsonl final completo, retoma a partir dele também
        paginas = carregar_progresso(arquivo_final)

    documento = fitz.open(arquivo_pdf)
    total = documento.page_count

    print(f"Total de páginas: {total}")
    print(f"Já processadas (retomando): {len(paginas)}")

    inicio_geral = time.time()
    processadas_nesta_execucao = 0

    for n in range(1, total + 1):
        if n in paginas:
            continue

        idx = n - 1
        pagina_pdf = documento[idx]

        if not pagina_pdf.get_images():
            # Página sem nenhuma imagem embutida = página em branco.
            paginas[n] = {"pagina": n, "texto": "", "qualidade_ocr": "pagina_em_branco_sem_ocr"}
        else:
            pix = pagina_pdf.get_pixmap(dpi=DPI)
            img = Image.open(io.BytesIO(pix.tobytes("png")))
            texto_ocr = pytesseract.image_to_string(img, lang=IDIOMA)
            texto_ocr = normalizar(texto_ocr)
            qualidade = "ocr_tesseract_por_200dpi" if texto_ocr else "ocr_tesseract_sem_texto_detectado"
            paginas[n] = {"pagina": n, "texto": texto_ocr, "qualidade_ocr": qualidade}

        processadas_nesta_execucao += 1

        if n % SALVAR_A_CADA == 0 or n == total:
            gravar_jsonl(arquivo_progresso, paginas)
            decorrido = time.time() - inicio_geral
            print(f"  página {n}/{total} — {processadas_nesta_execucao} processadas nesta "
                  f"execução em {decorrido:.0f}s (progresso salvo)")

    documento.close()

    # Tudo processado: grava o arquivo final e remove o de progresso.
    gravar_jsonl(arquivo_final, paginas)
    if arquivo_progresso.exists():
        arquivo_progresso.unlink()

    print(f"Arquivo final gerado: {arquivo_final}")
    print(f"Total de páginas: {total}")


if __name__ == "__main__":
    main()
