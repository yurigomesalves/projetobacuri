r"""
Log de páginas descartadas pelos chunkers do Tomo III e IV da CEV-SP
"Rubens Paiva", reaplicando exatamente o mesmo critério de descarte.

Uso: python 07_log_descartes_cev_sp.py

Gera:
  pipeline/dados/chunks/cev-sp-rubens-paiva-tomo3.descartes.jsonl
  pipeline/dados/chunks/cev-sp-rubens-paiva-tomo4.descartes.jsonl

Cada linha: {"pagina": N, "motivo": "em_branco"|"baixa_qualidade",
             [para baixa_qualidade] "n_alfa": ..., "proporcao_alfa": ...}
"""

import json
import re
from pathlib import Path

import importlib.util

RAIZ = Path(__file__).resolve().parent


def _carregar_modulo(nome_arquivo, nome_modulo):
    caminho = RAIZ / nome_arquivo
    spec = importlib.util.spec_from_file_location(nome_modulo, caminho)
    modulo = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(modulo)
    return modulo


# Importa as funções limpar_pagina dos chunkers existentes, sem reexecutar o
# main() de cada um (carregamos como módulos, mas __name__ != "__main__").
tomo3 = _carregar_modulo("03_chunkar_cev_sp_tomo3.py", "chunker_tomo3")
tomo4 = _carregar_modulo("03_chunkar_cev_sp_tomo4.py", "chunker_tomo4")

ALFA = re.compile(r"[^\W\d_]", re.UNICODE)


def processar_tomo3():
    entrada = RAIZ / "dados" / "extraido" / "cev-sp-rubens-paiva-tomo3.jsonl"
    saida = RAIZ / "dados" / "chunks" / "cev-sp-rubens-paiva-tomo3.descartes.jsonl"

    contagem = {"em_branco": 0, "baixa_qualidade": 0}
    with open(entrada, encoding="utf-8") as f, open(saida, "w", encoding="utf-8") as fout:
        for linha in f:
            registro = json.loads(linha)
            numero_pagina = registro["pagina"]

            if registro["qualidade_ocr"] == "pagina_em_branco_sem_ocr" or not registro["texto"].strip():
                contagem["em_branco"] += 1
                fout.write(json.dumps({"pagina": numero_pagina, "motivo": "em_branco"}, ensure_ascii=False) + "\n")
                continue

            texto_limpo, valida = tomo3.limpar_pagina(registro["texto"])
            if not valida:
                n_alfa = len(ALFA.findall(texto_limpo))
                n_nao_espaco = len(re.sub(r"\s", "", texto_limpo))
                proporcao_alfa = (n_alfa / n_nao_espaco) if n_nao_espaco else 0.0
                contagem["baixa_qualidade"] += 1
                fout.write(json.dumps({
                    "pagina": numero_pagina,
                    "motivo": "baixa_qualidade",
                    "n_alfa": n_alfa,
                    "proporcao_alfa": round(proporcao_alfa, 4),
                }, ensure_ascii=False) + "\n")

    return contagem


def processar_tomo4():
    entrada = RAIZ / "dados" / "extraido" / "cev-sp-rubens-paiva-tomo4.jsonl"
    saida = RAIZ / "dados" / "chunks" / "cev-sp-rubens-paiva-tomo4.descartes.jsonl"

    contagem = {"em_branco": 0, "baixa_qualidade": 0}
    with open(entrada, encoding="utf-8") as f, open(saida, "w", encoding="utf-8") as fout:
        for linha in f:
            registro = json.loads(linha)
            numero_pagina = registro["pagina"]

            if not registro["texto"].strip():
                contagem["em_branco"] += 1
                fout.write(json.dumps({"pagina": numero_pagina, "motivo": "em_branco"}, ensure_ascii=False) + "\n")
                continue

            texto_limpo, _secao, valida = tomo4.limpar_pagina(registro["texto"])
            if not valida:
                n_alfa = len(ALFA.findall(texto_limpo))
                n_nao_espaco = len(re.sub(r"\s", "", texto_limpo))
                proporcao_alfa = (n_alfa / n_nao_espaco) if n_nao_espaco else 0.0
                contagem["baixa_qualidade"] += 1
                fout.write(json.dumps({
                    "pagina": numero_pagina,
                    "motivo": "baixa_qualidade",
                    "n_alfa": n_alfa,
                    "proporcao_alfa": round(proporcao_alfa, 4),
                }, ensure_ascii=False) + "\n")

    return contagem


def main():
    c3 = processar_tomo3()
    print("Tomo III:")
    print(f"  Em branco: {c3['em_branco']} (auditoria esperava ~5121)")
    print(f"  Baixa qualidade: {c3['baixa_qualidade']} (auditoria esperava ~81)")

    c4 = processar_tomo4()
    print("Tomo IV:")
    print(f"  Em branco: {c4['em_branco']} (auditoria esperava 148)")
    print(f"  Baixa qualidade: {c4['baixa_qualidade']} (auditoria esperava 288)")


if __name__ == "__main__":
    main()
