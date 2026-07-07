#!/bin/bash
# semeia_covemg.sh — Semeia as biografias e eventos da Covemg no Supabase
# Execute do diretório raiz do projeto com:
#   bash pipeline/semeia_covemg.sh

set -e

echo "=== Semeando dados da Covemg no Supabase ==="
echo "Biografias: $(ls pipeline/dados/curadoria/biografias/*.json | wc -l)"
echo "Eventos:    $(ls pipeline/dados/curadoria/eventos/*.json | wc -l)"
echo

if [ ! -d pipeline/.venv ]; then
    echo "Criando venv..."
    python3 -m venv pipeline/.venv
    pipeline/.venv/bin/pip install -r pipeline/requirements.txt
fi

echo "Executando 06_semear_curadoria.py..."
pipeline/.venv/bin/python pipeline/06_semear_curadoria.py

echo
echo "=== Pronto! ==="
echo "Verifique no painel Supabase se os dados foram inseridos."
