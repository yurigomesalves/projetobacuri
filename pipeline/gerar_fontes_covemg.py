#!/usr/bin/env python3
"""
Gera draft de entradas de pipeline/fontes.json para documentos da Covemg.

DESCRIÇÃO:
  Lê a lista TSV de 97 documentos do repositório DSpace da Covemg.
  Para cada documento, gera uma entrada de fonte com:
    - slug único (cev-mg-covemg-<handle>-<slug-do-titulo>)
    - tipo_fonte e confiabilidade por heurística (título, data, autor)
    - nota_contexto apropriada
    - URL de download construída

ENTRADA:
  /tmp/covemg_items_final.tsv

SAÍDA:
  pipeline/dados/fontes-covemg-draft.json  (objeto JSON com todas as entradas)
  pipeline/dados/fontes-covemg-pulados.md  (lista de handles pulados)

USO:
  python3 /home/yuri/gerar_fontes_covemg.py
"""

import json
import re
from pathlib import Path
from datetime import datetime

# Handles a pular (capítulos do Relatório Final 2017)
HANDLES_PULADOS = {
    374, 375, 377, 410, 413, 418, 421, 424, 435, 438, 509
}

# Slugs já existentes (NÃO recriar)
SLUGS_EXISTENTES = {
    "cev-mg-covemg-relatorio-final-2017",
    "cev-mg-covemg-anexo-justica-transicao-ufmg",
    # handle desconhecido do triangulo-mineiro — ignorar por agora
}

def ler_tsv(caminho):
    """Lê o TSV e retorna lista de dicts."""
    items = []
    with open(caminho, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    # Skip header (linha 1: colnames)
    for line in lines[1:]:
        fields = line.rstrip('\n').split('\t')
        if len(fields) < 8:
            continue
        # Validar que o primeiro campo é um número (handle)
        try:
            handle_num = int(fields[0])
        except ValueError:
            continue
        items.append({
            'handle': fields[0],
            'titulo': fields[1],
            'autor': fields[2],
            'data': fields[3],
            'num_pdfs': fields[4],
            'pdf_principal': fields[5],
            'tamanho_mb': fields[6],
            'tipo': fields[7] if len(fields) > 7 else '',
        })
    return items

def inferir_tipo_fonte(titulo, data, autor, pdf_principal):
    """
    Heurística para classificar tipo_fonte e confiabilidade.
    Retorna (tipo_fonte, confiabilidade, nota_contexto_key).
    """

    # Regra 1: Laudos periciais 2014 ou 2017
    if any(x in titulo.lower() for x in ['laudo pericial', 'laudo complementar', 'laudo referente']):
        if data in ['2014-10-22', '2014-03-27', '2014-04-29', '2017-08-07', '2017-09-19', '2017-12-13']:
            return ('relatorio_oficial', 'alta', 'relatorio_oficial')

    # Regra 2: Listas, tabelas, relatórios temáticos Covemg (2017-12-13)
    listas_covemg = [
        'lista de torturadores', 'acontecimentos envolvendo mortes',
        'centros de repressão', 'locais', 'planilha', 'quantitativo',
        'tabela', 'perfil profissional', 'lista de nomes de presos',
        'distribuição dos centros', 'relatório de'
    ]
    if data == '2017-12-13' and not autor:
        if any(x in titulo.lower() for x in listas_covemg):
            return ('relatorio_oficial', 'alta', 'relatorio_oficial')

    # Regra 3: Relatórios de comissões/sindicatos pós-1985
    if 'sindicato' in titulo.lower() and 'verdade' in titulo.lower():
        return ('relatorio_oficial', 'alta', 'relatorio_oficial')

    # Regra 4: Autos de exame cadavérico, necrópsia (período ditatorial)
    if any(x in titulo.lower() for x in ['auto de exame', 'auto de corpo de delito', 'necrópsia']):
        if data <= '1985':
            return ('documento_repressao', 'alta_como_evidencia_de_autoria', 'documento_repressao')

    # Regra 5: Processo criminal, sentença, CPI (1960-1985)
    if any(x in titulo.lower() for x in ['sentença', 'autos do processo', 'processo criminal', 'cpi', 'denúncia']):
        if data <= '1985':
            return ('documento_repressao', 'alta_como_evidencia_de_autoria', 'documento_repressao')

    # Regra 6: Certificado, ficha DOPS, registro, solicitação (período ditatorial)
    if any(x in titulo.lower() for x in ['certificado de análise', 'ficha do dops', 'registro de óbito', 'solicitação de processo']):
        if data <= '1985':
            return ('documento_repressao', 'alta_como_evidencia_de_autoria', 'documento_repressao')

    # Regra 7: Cartas de escolta (período ditatorial)
    if 'carta' in titulo.lower() and 'escolta' in titulo.lower():
        if data <= '1985':
            return ('documento_repressao', 'alta_como_evidencia_de_autoria', 'documento_repressao')

    # Casos especiais: Cartas de Linhares COLINA/CORRENTE (1969)
    if 'cartas de linhares' in titulo.lower() or ('carta' in titulo.lower() and '1969' in data):
        return ('testemunho', 'alta_como_relato_subjetivo', 'testemunho_cartas')

    # Casos especiais: Documentos entregues à Covemg (Nestor Vera, Marcos Magalhães)
    if any(x in titulo.lower() for x in ['nestor vera', 'marcos magalhães']):
        return ('relatorio_oficial', 'alta', 'relatorio_oficial')

    # Correspondência Covemg/Anistia
    if 'anistia' in titulo.lower() and 'covemg' in titulo.lower():
        return ('relatorio_oficial', 'alta', 'relatorio_oficial')

    # Caso: Carta Caio Monteiro
    if 'caio monteiro' in titulo.lower() and 'carta' in titulo.lower():
        return ('testemunho', 'alta_como_relato_subjetivo', 'testemunho_carta_politico')

    # Caso: Revista Sem Terra 2005
    if 'sem terra' in titulo.lower() and '2005' in data:
        return ('producao_academica', 'media_alta', 'producao_academica')

    # Caso: Reportagem Estado de Minas 2017 (reportagem moderna sobre o caso)
    if 'estado de minas' in titulo.lower() and '2017' in data:
        return ('material_didatico_educativo', 'media', 'material_didatico')

    # Regra 8: Jornais e revistas 1960-1985
    if any(x in titulo.lower() for x in ['jornal', 'revista']):
        if data < '1960' or data > '1985':
            pass  # Fora do período
        else:
            # Decidir por imprensa alinhada vs. alternativa
            if any(x in titulo.lower() for x in ['terra livre', 'combate', 'o combate']):
                return ('imprensa_epoca', 'baixa_factual_alta_documental', 'imprensa_alternativa')
            elif 'estado de minas' in titulo.lower() or 'jornal do brasil' in titulo.lower():
                return ('imprensa_epoca', 'baixa_factual_alta_documental', 'imprensa_alinhada')
            else:
                return ('imprensa_epoca', 'baixa_factual_alta_documental', 'imprensa_epoca_geral')

    # Regra 9: Depoimentos, entrevistas, oitivas
    if any(x in titulo.lower() for x in ['depoimento de', 'entrevista de', 'oitiva']):
        return ('testemunho', 'alta_como_relato_subjetivo', 'testemunho_depoimento')

    # Default: relatorio_oficial (outros documentos Covemg)
    return ('relatorio_oficial', 'alta', 'relatorio_oficial')

def gerar_slug(handle, titulo):
    """Gera slug único a partir do handle e título."""
    # Tomar primeiras 3-4 palavras significativas do título
    palavras = re.sub(r'[^\w\s]', '', titulo.lower()).split()
    palavras = [p for p in palavras if len(p) > 2 and p not in ['de', 'da', 'do', 'em', 'para', 'com', 'uma', 'um']]
    slug_titulo = '-'.join(palavras[:4])
    slug = f"cev-mg-covemg-{handle}-{slug_titulo}"
    return slug

def construir_url_download(handle, pdf_principal):
    """Constrói URL de download no DSpace da Covemg."""
    if not pdf_principal or pdf_principal == '':
        return None
    # Template: http://www.comissaodaverdade.mg.gov.br/bitstream/handle/123456789/<handle>/<pdf_principal>
    # URL-encoded: %20 = espaço, etc.
    nome_url = pdf_principal.replace(' ', '%20')
    return f"http://www.comissaodaverdade.mg.gov.br/bitstream/handle/123456789/{handle}/{nome_url}"

def construir_url_oficial(handle):
    """Constrói URL oficial no repositório."""
    return f"http://www.comissaodaverdade.mg.gov.br/handle/123456789/{handle}"

def nota_contexto_para_tipo(tipo_fonte, confiabilidade, nota_key):
    """Gera nota_contexto baseada no tipo de fonte."""
    notas = {
        'documento_repressao': "Documento produzido pelo aparato do Estado durante a ditadura militar-empresarial (1964–1985). Autentica a ação do órgão repressor, mas o conteúdo sobre a vítima é hostil por definição e deve ser contextualizado com outras fontes.",
        'imprensa_alinhada': "Publicado durante o regime ditatorial. A grande imprensa operou sob censura e em muitos casos com adesão editorial ao regime. Tratar como objeto de crítica documental, não como autoridade factual.",
        'imprensa_alternativa': "Imprensa alternativa ou de resistência publicada antes/durante o regime. Documento histórico de luta social; contextualizar com outras fontes.",
        'imprensa_epoca_geral': "Publicado durante o regime ditatorial (1960-1985). Tratar como documento histórico da época, considerando contexto de censura e controle editorial.",
        'testemunho_cartas': "Cartas de prisioneiros políticos produzidas durante o regime ditatorial. Documento histórico de testemunho direto; contextualizar com outras fontes.",
        'testemunho_carta_politico': "Carta de participante da história política enviada à imprensa. Documento de testemunho; contextualizar com outras fontes.",
        'testemunho_depoimento': "Depoimento ou entrevista coletada pela Comissão da Verdade. Testemunho direto; contextualizar com outras fontes.",
        'material_didatico': "Reportagem ou material educativo produzido em contexto de investigação ou divulgação histórica. Documento de divulgação; verificar com fontes primárias.",
        'producao_academica': "Produção acadêmica ou em articulação com organizações de pesquisa. Documento de interpretação histórica; verificar metodologia e contexto de publicação.",
    }
    return notas.get(nota_key, None)

def processar_itens(items):
    """Processa itens do TSV e gera entradas de fontes."""
    draft = {}
    pulados = []

    for item in items:
        handle = item['handle']

        # Pular handles na lista explícita
        if int(handle) in HANDLES_PULADOS:
            pulados.append({
                'handle': handle,
                'titulo': item['titulo'],
                'razao': 'Capítulo do Relatório Final 2017 — conteúdo já ingerido via slug cev-mg-covemg-relatorio-final-2017 (handle 2736)'
            })
            continue

        # Pular documentos sem PDF
        if item['tipo'] == 'Sem PDF':
            pulados.append({
                'handle': handle,
                'titulo': item['titulo'],
                'razao': 'Sem PDF disponível no repositório'
            })
            continue

        # Gerar slug e verificar duplicatas
        slug = gerar_slug(handle, item['titulo'])
        if slug in SLUGS_EXISTENTES:
            pulados.append({
                'handle': handle,
                'titulo': item['titulo'],
                'razao': f'Slug já existe: {slug}'
            })
            continue

        # Inferir tipo_fonte
        tipo_fonte, confiabilidade, nota_key = inferir_tipo_fonte(
            item['titulo'], item['data'], item['autor'], item['pdf_principal']
        )

        # Construir período
        try:
            ano = int(item['data'][:4])
        except:
            ano = 1985

        if ano < 1964:
            periodo = 'pre_golpe'
        elif ano <= 1985:
            periodo = 'ditadura_militar'
        else:
            periodo = 'pos_1985'

        # Construir URL
        url_download = construir_url_download(handle, item['pdf_principal'])
        url_oficial = construir_url_oficial(handle)

        # Nota contexto
        nota_contexto = nota_contexto_para_tipo(tipo_fonte, confiabilidade, nota_key)

        # Construir entrada
        entrada = {
            'url_oficial': url_oficial,
            'url_download': url_download,
            'data_captura_wayback': None,
            'descricao_curta': f"{item['titulo']}, {item['data']}, {item['tamanho_mb']} MB, PDF.",
            'fonte': {
                'titulo': item['titulo'],
                'autor_orgao': item['autor'] if item['autor'] else 'Comissão da Verdade em Minas Gerais (Covemg)',
                'tipo_fonte': tipo_fonte,
                'confiabilidade': confiabilidade,
                'data_documento': item['data'],
                'periodo': periodo,
                'url_origem': url_oficial,
                'licenca': "Documento público oficial da Comissão da Verdade em Minas Gerais (Covemg). Reprodução autorizada com citação da fonte. Acervo em repositório DSpace institucional.",
            }
        }

        if nota_contexto:
            entrada['fonte']['nota_contexto'] = nota_contexto

        draft[slug] = entrada

    return draft, pulados

def main():
    tsv_path = Path('/tmp/covemg_items_final.tsv')
    dados_dir = Path('/home/yuri/Documentos/Mestrado/Projeto/pipeline/dados')
    dados_dir.mkdir(parents=True, exist_ok=True)

    # Ler TSV
    items = ler_tsv(tsv_path)
    print(f"[*] Lidos {len(items)} itens do TSV")

    # Processar
    draft, pulados = processar_itens(items)

    # Salvar draft JSON
    draft_path = dados_dir / 'fontes-covemg-draft.json'
    with open(draft_path, 'w', encoding='utf-8') as f:
        json.dump(draft, f, ensure_ascii=False, indent=2)
    print(f"[+] Draft JSON salvo: {draft_path}")
    print(f"    Total de entradas: {len(draft)}")

    # Contar por tipo_fonte
    tipos = {}
    for slug, entrada in draft.items():
        tipo = entrada['fonte']['tipo_fonte']
        tipos[tipo] = tipos.get(tipo, 0) + 1
    print("[*] Distribuição por tipo_fonte:")
    for tipo, count in sorted(tipos.items()):
        print(f"    {tipo}: {count}")

    # Salvar pulados
    pulados_path = dados_dir / 'fontes-covemg-pulados.md'
    with open(pulados_path, 'w', encoding='utf-8') as f:
        f.write("# Documentos Pulados — Covemg\n\n")
        f.write(f"Total pulados: {len(pulados)}\n\n")
        for item in sorted(pulados, key=lambda x: int(x['handle'])):
            f.write(f"- **Handle {item['handle']}**: {item['titulo']}\n")
            f.write(f"  Razão: {item['razao']}\n\n")
    print(f"[+] Lista de pulados salva: {pulados_path}")
    print(f"    Total de documentos pulados: {len(pulados)}")

    print(f"\n[OK] Processo concluído. Próximo passo: validar JSON e revisar tipos_fonte.")

if __name__ == '__main__':
    main()
