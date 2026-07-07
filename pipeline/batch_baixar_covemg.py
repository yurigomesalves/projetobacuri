#!/usr/bin/env python3
"""
batch_baixar_covemg.py — Download em lote dos documentos Covemg.

O QUE FAZ (em termos simples):
- Lê pipeline/fontes.json, filtra os 61 slugs que começam com "cev-mg-covemg-"
- Para cada um, verifica se já foi baixado (arquivo existe em dados/brutos/)
- Se não, chama 01_baixar.py <slug> para fazer o download idempotente
- Registra no log (dados/log-baixar-covemg.txt) o resultado de cada um:
  ✓ (sucesso), ✗ (erro), ou — (pulado: já existe, ou sem URL)
- No final, imprime um resumo: quantos foram baixados, quantos falharam, etc.

COMO RODAR:
  cd /home/yuri/Documentos/Mestrado/Projeto/pipeline
  source .venv/bin/activate
  python batch_baixar_covemg.py
"""

import json
import subprocess
import sys
from pathlib import Path

BASE = Path(__file__).parent
FONTES = json.loads((BASE / "fontes.json").read_text())
BRUTOS = BASE / "dados" / "brutos"
LOG = BASE / "dados" / "log-baixar-covemg.txt"

# Estes dois já foram extraídos em fases anteriores; pulamos o download.
JA_EXTRAIDOS = {
    "cev-mg-covemg-relatorio-final-2017",
    "cev-mg-covemg-anexo-justica-transicao-ufmg",
}

BRUTOS.mkdir(parents=True, exist_ok=True)

resultados = []
for slug in sorted(FONTES.keys()):
    if not slug.startswith("cev-mg-covemg-"):
        continue

    if slug in JA_EXTRAIDOS:
        resultados.append(f"— {slug}  [já extraído em fases anteriores, pulando]")
        continue

    url_dl = FONTES[slug].get("url_download")
    if not url_dl:
        resultados.append(f"— {slug}  [sem url_download, pulando]")
        continue

    pdf = BRUTOS / f"{slug}.pdf"
    if pdf.exists():
        resultados.append(f"✓ {slug}  [já existe em brutos/, pulando download]")
        continue

    # Download necessário: chama 01_baixar.py
    print(f"⬇  {slug}")
    resultado_processo = subprocess.run(
        [sys.executable, str(BASE / "01_baixar.py"), slug],
        capture_output=True,
        text=True,
    )

    if resultado_processo.returncode == 0 and pdf.exists():
        # Sucesso
        tamanho_mb = pdf.stat().st_size / (1024 * 1024)
        resultados.append(f"✓ {slug}  [{tamanho_mb:.2f} MB]")
    else:
        # Erro
        mensagem_erro = resultado_processo.stderr.strip()
        # Trunca a 200 caracteres para não poluir o log
        if len(mensagem_erro) > 200:
            mensagem_erro = mensagem_erro[-200:]
        resultados.append(f"✗ {slug}  ERRO: {mensagem_erro}")
        print(f"  ERRO: {mensagem_erro}")

# Salva o log
LOG.write_text("\n".join(resultados) + "\n")

# Resumo
sucesso = sum(1 for r in resultados if r.startswith("✓"))
erro = sum(1 for r in resultados if r.startswith("✗"))
pulado = sum(1 for r in resultados if r.startswith("—"))

print(f"\nLog salvo em: {LOG}")
print(f"Resumo:")
print(f"  Baixados: {sucesso}")
print(f"  Erros: {erro}")
print(f"  Pulados: {pulado}")
print(f"  Total processado: {len(resultados)}")

if erro > 0:
    print(f"\nDocumentos com erro (veja {LOG} para detalhes):")
    for r in resultados:
        if r.startswith("✗"):
            print(f"  {r}")

sys.exit(0 if erro == 0 else 1)
