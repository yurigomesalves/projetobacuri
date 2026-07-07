r"""
Reetiquetagem da coluna `secao` dos chunks já indexados do Tomo IV da CEV-SP
"Rubens Paiva" — corrige a granularidade dos Anexos I-XIX (acrescenta a
descrição do índice e o autor, quando identificável) e corrige defeitos da
heurística original (linhas de índice e nomes de autor soltos virando
"secao").

NÃO reindexa embeddings (a coluna `secao` não entra no vetor — ver
04_indexar.py linha 94). Apenas:
  1. Reescreve pipeline/dados/chunks/cev-sp-rubens-paiva-tomo4.jsonl com a
     nova `secao` por chunk.
  2. Em modo dry-run (padrão), mostra quantas linhas seriam atualizadas no
     Supabase e exemplos antes->depois.
  3. Com --aplicar, executa os UPDATEs no Supabase (um por chunk alterado).

Uso:
  python 08_reetiquetar_secao_tomo4.py            # dry-run
  python 08_reetiquetar_secao_tomo4.py --aplicar   # aplica no banco
"""

import json
import os
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent
SLUG = "cev-sp-rubens-paiva-tomo4"

# =============================================================================
# MAPA: página-início do CORPO de cada anexo -> rótulo de secao
# =============================================================================
# Rótulo = "ANEXO <romano> — <descrição curta do índice> (autor: <nome>)"
# quando há autor individual identificável; senão "ANEXO <romano> — <descrição>".
MAPA_ANEXOS = {
    830: "ANEXO I — Ofício enviado à Comissão Nacional da Verdade (CNV), em 25 de julho de 2014",
    849: "ANEXO II — Cartaz do evento \"JK – o homem, o presidente, a atualidade\" na Faculdade de Direito da USP (12-13/09/2013)",
    851: "ANEXO III — Relatório Parcial da Comissão Municipal da Verdade \"Vladimir Herzog\" de São Paulo, de 19/02/2014",
    882: "ANEXO IV — E-mails de Lea Vidigal Medeiros ao coordenador da CNV, Pedro Dallari (abril-maio/2014)",
    889: "ANEXO V — Cartaz da Audiência Pública \"A Ditadura e a Morte de JK\" (03/06/2014)",
    891: "ANEXO VI — Parecer Jurídico (autor: Prof. Gilberto Bercovici)",
    960: "ANEXO VII — Cartaz do Ato em homenagem a Juscelino Kubitschek na Faculdade de Direito da USP (11/08/2014)",
    962: "ANEXO VIII — Cartaz da Audiência Pública de apresentação dos Pareceres Jurídicos sobre o Caso JK (29/08/2014)",
    964: "ANEXO IX — Notícias veiculadas na mídia sobre o Caso JK",
    974: "ANEXO X — Ofício enviado à Comissão Nacional da Verdade (CNV), em 22 de agosto de 2014",
    977: "ANEXO XI — Ofício enviado à Comissão Nacional da Verdade (CNV), em 2 de setembro de 2014",
    1005: "ANEXO XII — Evento no Kings College London: \"Rebuilding the Concept of Rule of Law under Transitional Justice Processes: the Case of Brazil\" (04/11/2014)",
    1009: "ANEXO XIII — Ofício enviado à Secretaria Geral da Presidência da República (Sr. Gilberto de Carvalho), em 2 de dezembro de 2014",
    1012: "ANEXO XIV — Ofício enviado à Comissão Nacional da Verdade (CNV), em 4 de dezembro de 2014",
    1040: "ANEXO XV — Reportagem da Revista Interview, de julho de 1996, Ed. 198",
    1049: "ANEXO XVI — Parecer Jurídico (autor: Prof. Eduardo Saad-Diniz)",
    1055: "ANEXO XVII — Parecer Jurídico (autor: Prof. Emílio Peluso Neder Meyer)",
    1113: "ANEXO XVIII — Parecer Jurídico (autor: Prof. Alessandro Octaviani)",
    1196: "ANEXO XIX — Parecer Jurídico (autor: Prof. José Carlos Moreira da Silva Filho)",
}

# Página do índice dos anexos (828-829): secao própria, não vira "ANEXO XIV..."
SECAO_INDICE_ANEXOS = "ANEXOS AO RELATÓRIO"
PAGINAS_INDICE_ANEXOS = {828, 829}

# Páginas-início dos anexos, ordenadas (para localizar por faixa)
LIMITES_ANEXOS = sorted(MAPA_ANEXOS.keys())

# Defeitos pontuais conhecidos da heurística original: chunks cuja secao
# original era um nome de autor solto (carry-forward indevido), a corrigir
# pela secao do anexo correspondente à sua página inicial.
# (não precisam de tratamento especial: a lógica geral por página-início já
# resolve, pois a página-início desses chunks está dentro de um dos anexos
# mapeados.)


def primeira_pagina(faixa):
    """'1322-1323' -> 1322 ; '829' -> 829"""
    return int(str(faixa).split("-")[0])


def nova_secao(chunk):
    pag_inicio = primeira_pagina(chunk["paginas"])

    if pag_inicio in PAGINAS_INDICE_ANEXOS:
        return SECAO_INDICE_ANEXOS

    if pag_inicio >= LIMITES_ANEXOS[0]:
        # encontra o maior limite <= pag_inicio
        anexo_pagina = max(p for p in LIMITES_ANEXOS if p <= pag_inicio)
        return MAPA_ANEXOS[anexo_pagina]

    # páginas 1-827: preserva a secao já existente (relatórios principais)
    return chunk["secao"]


def main():
    aplicar = "--aplicar" in sys.argv

    caminho_chunks = RAIZ / "dados" / "chunks" / f"{SLUG}.jsonl"
    chunks = []
    with open(caminho_chunks, encoding="utf-8") as f:
        for linha in f:
            chunks.append(json.loads(linha))

    novas_secoes = {}  # ordem -> nova secao
    alteracoes_locais = []
    for chunk in chunks:
        antiga = chunk["secao"]
        nova = nova_secao(chunk)
        if nova != antiga:
            alteracoes_locais.append((chunk["ordem"], chunk["paginas"], antiga, nova))
        chunk["secao"] = nova
        novas_secoes[chunk["ordem"]] = nova

    # Reescreve o JSONL local sempre (operação local, não destrutiva no banco;
    # idempotente: se já estiver com as novas secoes, alteracoes_locais = 0)
    with open(caminho_chunks, "w", encoding="utf-8") as f:
        for chunk in chunks:
            f.write(json.dumps(chunk, ensure_ascii=False) + "\n")

    print(f"Tomo IV — {len(chunks)} chunks no total, {len(alteracoes_locais)} alterados nesta execução (relativo ao arquivo local antes de rodar).")
    if alteracoes_locais:
        print("\nExemplos antes -> depois (arquivo local):")
        for ordem, paginas, antiga, nova in alteracoes_locais[:5]:
            print(f"  ordem {ordem} (paginas {paginas}):")
            print(f"    antes : {antiga!r}")
            print(f"    depois: {nova!r}")

    # --- Supabase ----------------------------------------------------------
    from dotenv import load_dotenv
    from supabase import create_client

    load_dotenv(RAIZ.parent / ".env.local")
    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    cliente = create_client(url, key)

    with open(RAIZ / "fontes.json", encoding="utf-8") as f:
        fontes_json = json.load(f)
    url_origem = fontes_json[SLUG]["fonte"]["url_origem"]

    resp = cliente.table("fontes").select("fonte_id").eq("url_origem", url_origem).execute()
    fonte_id = resp.data[0]["fonte_id"]
    print(f"\nfonte_id (Tomo IV): {fonte_id}")

    # Busca secao atual no Supabase para todos os chunks desta fonte
    atuais = {}
    pagina_sb = 0
    tamanho_pagina = 1000
    while True:
        resp = (
            cliente.table("chunks")
            .select("ordem,secao")
            .eq("fonte_id", fonte_id)
            .range(pagina_sb * tamanho_pagina, (pagina_sb + 1) * tamanho_pagina - 1)
            .execute()
        )
        if not resp.data:
            break
        for row in resp.data:
            atuais[row["ordem"]] = row["secao"]
        if len(resp.data) < tamanho_pagina:
            break
        pagina_sb += 1

    diferencas = []
    for ordem, nova in novas_secoes.items():
        antiga_sb = atuais.get(ordem)
        if antiga_sb != nova:
            diferencas.append((ordem, antiga_sb, nova))

    print(f"\nDRY-RUN: {len(diferencas)} de {len(chunks)} chunks do Tomo IV têm secao diferente no Supabase vs. arquivo local novo.")
    print("Exemplos Supabase (antes) -> arquivo local (depois):")
    for ordem, antiga_sb, nova in diferencas[:5]:
        print(f"  ordem {ordem}:")
        print(f"    Supabase atual: {antiga_sb!r}")
        print(f"    novo          : {nova!r}")

    if not aplicar:
        print("\n(rode com --aplicar para executar os UPDATEs no Supabase)")
        return

    print(f"\nAplicando {len(diferencas)} UPDATEs no Supabase...")
    for ordem, _antiga_sb, nova in diferencas:
        cliente.table("chunks").update({"secao": nova}).eq("fonte_id", fonte_id).eq("ordem", ordem).execute()
    print("Concluído.")


if __name__ == "__main__":
    main()
