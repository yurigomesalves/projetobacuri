r"""
Reetiquetagem da coluna `secao` dos chunks já indexados do Tomo III da CEV-SP
"Rubens Paiva" (Audiências Públicas) — heurística CONSERVADORA: só rotula
faixas de página cuja audiência pública é identificada com alta confiança
("Está instalada a <ordinal> audiência pública...", numérico ou por
extenso), extraindo número e data quando presentes.

NÃO reindexa embeddings (a coluna `secao` não entra no vetor — ver
04_indexar.py linha 94). Apenas:
  1. Reescreve pipeline/dados/chunks/cev-sp-rubens-paiva-tomo3.jsonl com a
     nova `secao` por chunk (faixas sem detecção de alta confiança ficam
     secao = None, como já era).
  2. Em modo dry-run (padrão), mostra quantas linhas seriam atualizadas no
     Supabase e exemplos antes->depois.
  3. Com --aplicar, executa os UPDATEs no Supabase.

Uso:
  python 08_reetiquetar_secao_tomo3.py            # dry-run
  python 08_reetiquetar_secao_tomo3.py --aplicar   # aplica no banco
"""

import json
import os
import re
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent
SLUG = "cev-sp-rubens-paiva-tomo3"

# =============================================================================
# DETECÇÃO DE CABEÇALHOS DE AUDIÊNCIA PÚBLICA (alta confiança)
# =============================================================================
# Critério: linha curta contendo "instalad..." + ordinal de audiência
# (numérico "NNº"/"NNª"/"NN*" OU por extenso, ex. "septuagésima primeira") +
# "audiência pública". Data extraída da página inteira, se presente
# (dd/mm/aaaa ou "dd de <mês> de aaaa"), e validada (ano 2012-2015 — período
# da CEV-SP). Sem essas condições, não há detecção — secao permanece None.

UNIDADES_EXTENSO = {
    "primeira": 1, "segunda": 2, "terceira": 3, "quarta": 4, "quinta": 5,
    "sexta": 6, "sétima": 7, "setima": 7, "oitava": 8, "nona": 9,
}
DEZENAS_EXTENSO = {
    "décima": 10, "decima": 10, "vigésima": 20, "vigesima": 20,
    "trigésima": 30, "trigesima": 30, "quadragésima": 40, "quadragesima": 40,
    "quinquagésima": 50, "quinquagesima": 50, "sexagésima": 60, "sexagesima": 60,
    "septuagésima": 70, "septuagesima": 70, "octogésima": 80, "octogesima": 80,
    "nonagésima": 90, "nonagesima": 90,
}
CENTENAS_EXTENSO = {"centésima": 100, "centesima": 100}

PAT_NUMERICO = re.compile(r"\b(\d{1,3})\s*[ºª°*]\s*[Aa]udi[eê]ncia\s+[Pp][uú]blica")
PAT_INSTALADA = re.compile(r"[Ii]nstal(?:ada|ação|ado)", re.I)
PAT_AUDIENCIA = re.compile(r"audi[eê]ncia\s+p[uú]blica", re.I)

PAT_DATA_NUM = re.compile(r"\b(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})\b")
MESES = {
    "janeiro": 1, "fevereiro": 2, "março": 3, "marco": 3, "abril": 4,
    "maio": 5, "junho": 6, "julho": 7, "agosto": 8, "setembro": 9,
    "outubro": 10, "novembro": 11, "dezembro": 12,
}
PAT_DATA_EXT = re.compile(r"\b(\d{1,2})\s*(?:de)?\s*([A-Za-zçÇãõ]+)\s*(?:de)?\s*(\d{4})\b", re.I)

ANO_MIN_CEV = 2012
ANO_MAX_CEV = 2015

MAX_LEN_LINHA = 250


def numero_por_extenso(texto):
    palavras = re.findall(r"[A-Za-zÀ-ÿ]+", texto.lower())
    total = 0
    achou = False
    for p in palavras:
        if p in CENTENAS_EXTENSO:
            total += CENTENAS_EXTENSO[p]
            achou = True
        elif p in DEZENAS_EXTENSO:
            total += DEZENAS_EXTENSO[p]
            achou = True
        elif p in UNIDADES_EXTENSO:
            total += UNIDADES_EXTENSO[p]
            achou = True
    return total if achou else None


def extrair_data(texto_pagina):
    m = PAT_DATA_NUM.search(texto_pagina)
    if m:
        d, mo, ano = m.groups()
        if ANO_MIN_CEV <= int(ano) <= ANO_MAX_CEV:
            return f"{int(d):02d}/{int(mo):02d}/{ano}"
    m = PAT_DATA_EXT.search(texto_pagina)
    if m:
        d, mes_nome, ano = m.groups()
        mes_nome = mes_nome.lower()
        if mes_nome in MESES and ANO_MIN_CEV <= int(ano) <= ANO_MAX_CEV:
            return f"{int(d):02d}/{MESES[mes_nome]:02d}/{ano}"
    return None


def detectar_audiencias(caminho_extraido):
    """Retorna lista ordenada de (pagina, numero, data_ou_None)."""
    detec = []
    with open(caminho_extraido, encoding="utf-8") as f:
        for linha in f:
            registro = json.loads(linha)
            pagina = registro["pagina"]
            texto = registro["texto"]
            for l in texto.split("\n"):
                ls = l.strip()
                if len(ls) > MAX_LEN_LINHA:
                    continue
                if not PAT_AUDIENCIA.search(ls):
                    continue
                if not PAT_INSTALADA.search(ls):
                    continue

                numero = None
                m = PAT_NUMERICO.search(ls)
                if m:
                    numero = int(m.group(1))
                else:
                    numero = numero_por_extenso(ls)

                if numero is None:
                    continue

                data = extrair_data(texto)
                detec.append((pagina, numero, data))
                break  # uma detecção por página basta

    return detec


def montar_faixas(detec):
    """Deduplica detecções consecutivas com o mesmo número de audiência e
    monta a lista ordenada (pagina_inicio, rotulo)."""
    faixas = []
    numero_anterior = None
    for pagina, numero, data in detec:
        if numero == numero_anterior:
            continue  # mesma audiência já detectada (reinstalação/repetição)
        rotulo = f"{numero}ª Audiência Pública"
        if data:
            rotulo += f" — {data}"
        faixas.append((pagina, rotulo))
        numero_anterior = numero
    return faixas


def secao_por_pagina(faixas, pagina_inicio):
    """Retorna o rótulo vigente na pagina_inicio, ou None se for antes da
    primeira detecção."""
    secao = None
    for pag_faixa, rotulo in faixas:
        if pagina_inicio >= pag_faixa:
            secao = rotulo
        else:
            break
    return secao


def primeira_pagina(faixa):
    return int(str(faixa).split("-")[0])


def main():
    aplicar = "--aplicar" in sys.argv

    caminho_extraido = RAIZ / "dados" / "extraido" / f"{SLUG}.jsonl"
    caminho_chunks = RAIZ / "dados" / "chunks" / f"{SLUG}.jsonl"

    detec = detectar_audiencias(caminho_extraido)
    faixas = montar_faixas(detec)

    print(f"Detecções brutas (linha 'instalada a N audiência pública'): {len(detec)}")
    print(f"Audiências distintas detectadas (após dedup por número consecutivo): {len(faixas)}")
    print(f"Primeira faixa: página {faixas[0][0]} -> {faixas[0][1]!r}")
    print(f"Última faixa : página {faixas[-1][0]} -> {faixas[-1][1]!r}")

    chunks = []
    with open(caminho_chunks, encoding="utf-8") as f:
        for linha in f:
            chunks.append(json.loads(linha))

    novas_secoes = {}
    alteracoes_locais = []
    for chunk in chunks:
        pag_inicio = primeira_pagina(chunk["paginas"])
        nova = secao_por_pagina(faixas, pag_inicio)
        antiga = chunk["secao"]
        if nova != antiga:
            alteracoes_locais.append((chunk["ordem"], chunk["paginas"], antiga, nova))
        chunk["secao"] = nova
        novas_secoes[chunk["ordem"]] = nova

    with open(caminho_chunks, "w", encoding="utf-8") as f:
        for chunk in chunks:
            f.write(json.dumps(chunk, ensure_ascii=False) + "\n")

    com_secao = sum(1 for s in novas_secoes.values() if s)
    pct = 100 * com_secao / len(chunks)
    print(f"\nTomo III — {len(chunks)} chunks no total.")
    print(f"Chunks com secao preenchida: {com_secao} ({pct:.1f}%); sem secao (null): {len(chunks) - com_secao} ({100 - pct:.1f}%)")
    print(f"Alterados nesta execução (relativo ao arquivo local antes de rodar): {len(alteracoes_locais)}")
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
    print(f"\nfonte_id (Tomo III): {fonte_id}")

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

    print(f"\nDRY-RUN: {len(diferencas)} de {len(chunks)} chunks do Tomo III têm secao diferente no Supabase vs. arquivo local novo.")
    print("Exemplos Supabase (antes) -> arquivo local (depois):")
    for ordem, antiga_sb, nova in diferencas[:5]:
        print(f"  ordem {ordem}:")
        print(f"    Supabase atual: {antiga_sb!r}")
        print(f"    novo          : {nova!r}")

    if not aplicar:
        print("\n(rode com --aplicar para executar os UPDATEs no Supabase)")
        return

    print(f"\nAplicando {len(diferencas)} UPDATEs no Supabase...")
    # O free tier encerra a conexão HTTP/2 após muitas streams (~10 mil): por
    # isso recriamos o cliente a cada lote e tentamos cada UPDATE de novo se a
    # conexão cair. O script é idempotente, então re-rodar também é seguro.
    import time

    LOTE_RECONEXAO = 1000
    feitos = 0
    for i, (ordem, _antiga_sb, nova) in enumerate(diferencas):
        if i % LOTE_RECONEXAO == 0:
            cliente = create_client(url, key)
        for tentativa in range(3):
            try:
                cliente.table("chunks").update({"secao": nova}).eq("fonte_id", fonte_id).eq("ordem", ordem).execute()
                break
            except Exception as e:  # reconecta e tenta de novo
                if tentativa == 2:
                    raise
                print(f"  (reconectando após falha no ordem {ordem}: {type(e).__name__})")
                time.sleep(1)
                cliente = create_client(url, key)
        feitos += 1
        if feitos % 1000 == 0:
            print(f"  {feitos}/{len(diferencas)}", end="\r")
    print(f"\nConcluído: {feitos} UPDATEs aplicados.")


if __name__ == "__main__":
    main()
