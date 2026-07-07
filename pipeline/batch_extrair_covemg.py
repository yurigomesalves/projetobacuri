#!/usr/bin/env python3
"""
batch_extrair_covemg.py — Extração em lote dos documentos Covemg baixados.

O QUE FAZ (em termos simples):
- Lê pipeline/fontes.json, filtra os 61 slugs Covemg
- Para cada um, verifica se já existe JSONL extraído (em dados/extraido/<slug>.jsonl)
- Se não, chama 02_extrair.py <slug> para extrair o texto do PDF
- Analisa o resultado: conta páginas, páginas com texto, caracteres totais
- Se <50% das páginas têm texto, marca como ⚠ ESCANEADO (candidato a OCR futuro)
- Registra no log o status de cada documento

COMO RODAR:
  cd /home/yuri/Documentos/Mestrado/Projeto/pipeline
  source .venv/bin/activate
  python batch_extrair_covemg.py
"""

import json
import subprocess
import sys
from pathlib import Path

BASE = Path(__file__).parent
FONTES = json.loads((BASE / "fontes.json").read_text())
BRUTOS = BASE / "dados" / "brutos"
EXTRAIDO = BASE / "dados" / "extraido"
LOG = BASE / "dados" / "log-extrair-covemg.txt"

# Estes dois já foram extraídos anteriormente
JA_EXTRAIDOS = {
    "cev-mg-covemg-relatorio-final-2017",
    "cev-mg-covemg-anexo-justica-transicao-ufmg",
}

EXTRAIDO.mkdir(parents=True, exist_ok=True)

resultados = []
documentos_escaneados = []

for slug in sorted(FONTES.keys()):
    if not slug.startswith("cev-mg-covemg-"):
        continue

    if slug in JA_EXTRAIDOS:
        resultados.append(f"— {slug}  [já extraído]")
        continue

    pdf = BRUTOS / f"{slug}.pdf"
    if not pdf.exists():
        resultados.append(f"— {slug}  [sem PDF em brutos/, pulando]")
        continue

    jsonl = EXTRAIDO / f"{slug}.jsonl"
    if jsonl.exists():
        # Analisa JSONL existente
        linhas = jsonl.read_text().splitlines()
        paginas_total = len(linhas)
        paginas_com_texto = sum(1 for l in linhas if json.loads(l).get("texto", "").strip())
        chars = sum(len(json.loads(l).get("texto", "")) for l in linhas)
        pct = (paginas_com_texto / paginas_total * 100) if paginas_total else 0
        status = "✓" if pct > 50 else "⚠"
        status_msg = "ok" if pct > 50 else "ESCANEADO"
        if status == "⚠":
            documentos_escaneados.append(slug)
        resultados.append(
            f"{status} {slug}  págs={paginas_total} com_texto={paginas_com_texto}({pct:.0f}%) {status_msg}"
        )
        continue

    # JSONL não existe; fazer extração
    print(f"📄 {slug}")
    resultado_processo = subprocess.run(
        [sys.executable, str(BASE / "02_extrair.py"), slug],
        capture_output=True,
        text=True,
    )

    if resultado_processo.returncode != 0 or not jsonl.exists():
        mensagem_erro = resultado_processo.stderr.strip()
        if len(mensagem_erro) > 200:
            mensagem_erro = mensagem_erro[-200:]
        resultados.append(f"✗ {slug}  ERRO: {mensagem_erro}")
        print(f"  ERRO: {mensagem_erro}")
        continue

    # Extração bem-sucedida: analisa resultado
    linhas = jsonl.read_text().splitlines()
    paginas_total = len(linhas)
    paginas_com_texto = sum(1 for l in linhas if json.loads(l).get("texto", "").strip())
    chars = sum(len(json.loads(l).get("texto", "")) for l in linhas)
    pct = (paginas_com_texto / paginas_total * 100) if paginas_total else 0

    if pct > 50:
        resultados.append(
            f"✓ {slug}  págs={paginas_total} com_texto={paginas_com_texto}({pct:.0f}%) chars={chars}"
        )
    else:
        documentos_escaneados.append(slug)
        resultados.append(
            f"⚠ {slug}  págs={paginas_total} com_texto={paginas_com_texto}({pct:.0f}%) ESCANEADO"
        )

# Salva o log
LOG.write_text("\n".join(resultados) + "\n")

# Resumo
sucesso = sum(1 for r in resultados if r.startswith("✓"))
escaneado = sum(1 for r in resultados if r.startswith("⚠"))
erro = sum(1 for r in resultados if r.startswith("✗"))
pulado = sum(1 for r in resultados if r.startswith("—"))

print(f"\nLog salvo em: {LOG}")
print(f"Resumo:")
print(f"  Extraídos ok: {sucesso}")
print(f"  Possivelmente escaneados (OCR futuro): {escaneado}")
print(f"  Erros: {erro}")
print(f"  Pulados: {pulado}")
print(f"  Total processado: {len(resultados)}")

if escaneado > 0:
    print(f"\nDocumentos com <50% texto extraído (candidatos a OCR):")
    for slug in documentos_escaneados[:10]:  # Mostra até 10
        print(f"  — {slug}")
    if escaneado > 10:
        print(f"  ... e mais {escaneado - 10}")

if erro > 0:
    print(f"\nDocumentos com erro (veja {LOG}):")
    for r in resultados:
        if r.startswith("✗"):
            print(f"  {r}")

sys.exit(0 if erro == 0 else 1)
