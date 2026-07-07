"""
aplicar_notas_municipais.py — Aplica as decisões editoriais do curador ao 2º lote
DHnet (8 comissões municipais), em fontes.json E na tabela `fontes` do Supabase.

Idempotente: pode ser rodado mais de uma vez. Só toca a tabela `fontes`
(nota_contexto, confiabilidade e titulo vivem na fonte; a busca faz join — os
chunks NÃO precisam ser atualizados; chunks.nota_contexto fica nulo e cai na da
fonte via coalesce, ver migração 0009).

Decisões (auditoria docs/auditorias/dhnet-municipais.md, aprovadas pelo Yuri):
- nota_contexto para as 8 fontes (ausente até agora).
- Osasco: confiabilidade alta -> media (texto inteiramente por OCR degradado).
- São Paulo: titulo -> nome legal; epíteto "Vladimir Herzog" só na nota_contexto.
- Niterói: confiabilidade mantida "alta" + nota de alerta de versão preliminar.

COMO RODAR:
  cd pipeline && .venv/bin/python aplicar_notas_municipais.py
"""

import json
import os
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client

RAIZ = Path(__file__).resolve().parent
CATALOGO = RAIZ / "fontes.json"
load_dotenv(RAIZ.parent / ".env.local")
load_dotenv(RAIZ / ".env.local")

NOTAS = {
 "cmv-mg-juiz-de-fora": "A Comissão Municipal da Verdade de Juiz de Fora (CMV-JF), criada em 2013 e concluída em 2015, teve suporte acadêmico da UFJF e acesso inédito ao acervo digitalizado da Auditoria da 4ª Circunscrição Judiciária Militar. Juiz de Fora ocupa posição estratégica na história do golpe: foi de lá que partiram as tropas do General Olympio Mourão Filho na madrugada de 31 de março de 1964. O relatório documenta 37 depoimentos, o sistema de repressão local (incluindo a Operação Popeye), vítimas com vínculos juiz-foranos mortas em outros estados, e o papel de veículos de comunicação (Diários Associados) na sustentação ideológica do golpe. Alcance geográfico: município de Juiz de Fora e juiz-foranos perseguidos em outros centros repressivos.",
 "cmv-pb-joao-pessoa": "A Comissão Municipal da Verdade de João Pessoa (CMV-JP), criada em 2015 e concluída em 2020, é um dos relatórios mais tardios do ciclo municipal, publicado pela Editora do CCTA/UFPB. Cobre 9 capítulos temáticos: instalação da ditadura na Paraíba, resistência, papel da Prefeitura e da Câmara de João Pessoa, aparato repressivo (SNI, DOPS-PB, CENIMAR), movimentos de resistência, memória histórica e histórias de vida. Apoia-se em acervo do DOPS-PB (disponibilizado pelo Conselho Estadual de Direitos Humanos da PB), no Arquivo Nacional e em oitivas. Alcance geográfico: município de João Pessoa e paraibanos perseguidos em outros estados. Inclui documentos do SNI sobre vigilância de religiosos católicos ligados à Diocese da Paraíba — fonte relevante para pesquisa sobre Igreja e resistência.",
 "cmv-rj-niteroi": "ATENÇÃO: este documento é o II Relatório Parcial de Pesquisa e Atividades da Comissão da Verdade de Niterói (CVN), publicado em outubro de 2015 em VERSÃO PRELIMINAR, elaborado para subsidiar o Relatório Final da Comissão Estadual da Verdade do Rio de Janeiro (CEV-Rio). Não é o relatório final da CVN. O texto contém referências internas não resolvidas ('Ver pagina ???'). As informações factuais devem ser cotejadas com a CEV-Rio antes de serem apresentadas como definitivas. O relatório foca três temas: o Estádio Caio Martins como primeiro estádio-prisão da América Latina (abril de 1964), a repressão aos Operários Navais de Niterói e São Gonçalo, e o Centro de Armamento da Marinha (CAM) e a Ilha das Flores como espaços de tortura. Alcance geográfico: município de Niterói e antigo estado do Rio de Janeiro.",
 "cmv-rj-petropolis": "A Comissão Municipal da Verdade de Petrópolis (CMVP), criada em 2014 e concluída em 2018, é um dos relatórios municipais mais completos do acervo: 400 páginas com cronologia da ditadura na cidade (1964–1989), seção de vítimas, testemunhos, textos temáticos e oitivas realizadas junto ao Ministério Público Federal. Destaque para a investigação da 'Casa da Morte' (Rua Arthur Barbosa, 50) — sítio de tortura e execução clandestino reconhecido pela CNV e tombado pelo município em 2018 (Decreto 610/2018, reproduzido nos Anexos). O relatório dialoga diretamente com o caso de Inês Etienne Romeu, única sobrevivente identificada do local. Alcance geográfico: município de Petrópolis e trabalhadores têxteis, metalúrgicos e lapidários da região serrana fluminense.",
 "cmv-rj-volta-redonda": "A Comissão Municipal da Verdade D. Waldyr Calheiros de Volta Redonda (2013–2015), cujo nome homenageia o bispo diocesano perseguido pela ditadura, organizou seu relatório em torno de 14 casos de graves violações documentadas por IPMs (Inquéritos Policiais Militares) e depoimentos. O eixo central é a Companhia Siderúrgica Nacional (CSN) e seu entorno operário: sindicalistas da CSN, a Juventude Operária Católica, os Grupos dos Onze, o PCB regional. ATENÇÃO: o relatório cobre eventos até 1989, incluindo o massacre de novembro de 1988 em que três metalúrgicos foram mortos pelo Exército durante greve na CSN — episódio que a comissão classifica como 'ditadura civil-militar tardia'. O chatbot deve apresentar esses eventos dentro do recorte estendido reconhecido pela própria comissão. Alcance geográfico: Volta Redonda, Barra Mansa, Barra do Piraí e Piraí (sul fluminense).",
 "cmv-sp-maua": "A Comissão da Verdade do Município de Mauá (2013–2014) foi criada por iniciativa de vereadores da Câmara Municipal (Processo 82.275/2013) e realizou duas audiências públicas, em abril e agosto de 2014. Trata-se de um relatório de câmara municipal — mais breve (72 p.) e de natureza distinta dos relatórios de comissões com estrutura técnica própria: documenta essencialmente os depoimentos colhidos nas audiências e as conclusões dos vereadores sobre violações ocorridas no município. A base industrial de Mauá (Grande ABC paulista) e o papel das CEBs e da Igreja são eixos dos depoimentos. Sem divisão formal em capítulos; o chatbot deve tratar este documento como registro de audiências, não como análise historiográfica sistemática.",
 "cmv-sp-osasco": "ATENÇÃO: este documento é um DOSSIÊ DOCUMENTAL heterogêneo (117 p.), não um relatório analítico. Reúne: decreto municipal de denominação de ruas (homenagens a vítimas da ditadura), regimento interno da Comissão Municipal da Verdade de Osasco (CMVO), lei de criação da CMVO (Lei 4.650/2014) e atas de reunião da comissão (2015). O PDF é inteiramente escaneado, sem camada de texto; o texto foi obtido por OCR (Tesseract 300 DPI) e apresenta degradação variável — legível no corpo das atas, com ruído nos cabeçalhos e na primeira página. As atas de reunião têm valor histórico: documentam o contato da CMVO com o Capitão Wilson Damasceno (denunciado como torturador) e a recusa do Exército em autorizar depoimentos. Osasco (Grande ABC) tem história operária intensa; a comissão investigava especialmente a repressão ao movimento sindical metalúrgico. Alcance geográfico: município de Osasco/SP.",
 "cmv-sp-sao-paulo": "A Comissão da Memória e Verdade da Prefeitura do Município de São Paulo (CMV) — conhecida pelo epíteto 'Vladimir Herzog', em homenagem ao jornalista assassinado no DOI-CODI/SP em 1975 — foi instituída em 2012 e publicou seu relatório em dezembro de 2016. É a comissão municipal mais abrangente do acervo (396 p., 6 partes): contexto histórico, cooperação entre Prefeitura e aparato repressivo (prefeitos biônicos, Sistema de Segurança Interna), perseguição a servidores municipais, e desaparecimento e ocultação de cadáveres nos cemitérios de São Paulo (especialmente a vala clandestina de Perus). A investigação dos cemitérios municipais — com a participação da Prefeitura na ocultação de corpos de desaparecidos políticos — é o núcleo mais singular deste relatório. Alcance geográfico: município de São Paulo e seu sistema funerário municipal (cemitérios Dom Bosco/Perus, Vila Formosa, entre outros).",
}

# Correções pontuais aprovadas pelo Yuri.
TITULO_SP = "Relatório Final da Comissão da Memória e Verdade da Prefeitura do Município de São Paulo"

# ---------------------------------------------------------------------------
# 1) Atualiza fontes.json (fonte única da verdade dos metadados editoriais)
catalogo = json.loads(CATALOGO.read_text(encoding="utf-8"))
for slug, nota in NOTAS.items():
    f = catalogo[slug]["fonte"]
    f["nota_contexto"] = nota
catalogo["cmv-sp-osasco"]["fonte"]["confiabilidade"] = "media"
catalogo["cmv-sp-sao-paulo"]["fonte"]["titulo"] = TITULO_SP
CATALOGO.write_text(json.dumps(catalogo, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"fontes.json atualizado ({len(NOTAS)} notas; Osasco->media; título SP corrigido).")

# ---------------------------------------------------------------------------
# 2) Aplica na tabela `fontes` do Supabase (UPDATE por url_origem)
url = os.environ.get("SUPABASE_URL")
chave = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_SERVICE_KEY")
if not (url and chave):
    raise SystemExit("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY ausentes no .env.local")
sb = create_client(url, chave)

for slug, nota in NOTAS.items():
    f = catalogo[slug]["fonte"]
    patch = {"nota_contexto": nota}
    if slug == "cmv-sp-osasco":
        patch["confiabilidade"] = "media"
    if slug == "cmv-sp-sao-paulo":
        patch["titulo"] = TITULO_SP
    r = sb.table("fontes").update(patch).eq("url_origem", f["url_origem"]).execute()
    print(f"  [{slug}] {len(r.data)} fonte(s) atualizada(s): {sorted(patch.keys())}")

print("Concluído.")
