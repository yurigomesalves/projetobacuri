"""
aplicar_notas_tematicas.py — Decisões editoriais do 4º e último lote DHnet
(9 comissões TEMÁTICAS/SETORIAIS da verdade), aplicadas em fontes.json E no Supabase.

Idempotente: pode rodar mais de uma vez.
- nota_contexto e subtipo vivem na tabela `fontes` (a busca faz join via coalesce,
  migração 0009) → não exigem reindexar.
- secoes_corrigidas: apenas RENOMEIA o rótulo de seção dos chunks já gravados
  (UPDATE chunks.secao). A `secao` NÃO entra no embedding (04_indexar.py linha 96),
  portanto renomear o título não exige recomputar vetores.

Curadoria feita na sessão principal (curador-historiador foi interrompido por limite
de sessão antes de gravar). Títulos de seção conferidos contra os sumários dos PDFs;
no ANDES corrigiu-se a pág 27, que é Referências (não "violações físicas").

COMO RODAR:
  cd pipeline && .venv/bin/python aplicar_notas_tematicas.py
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
 "ctv-camponesa": "Relatório Final da Comissão Camponesa da Verdade, organizado por Sérgio Sauer e outros e publicado em Brasília (2016) sob a Comissão de Direitos Humanos e Legislação Participativa do Senado Federal em parceria com o Decanato de Extensão da Universidade de Brasília (DEX-UnB). É uma comissão TEMÁTICA de âmbito nacional, dedicada às graves violações de direitos contra os povos e trabalhadores do campo no período de 1946 a 1988 — recorte temporal mais amplo que o da CNV, para abranger conflitos agrários anteriores ao golpe. Estrutura: memória camponesa e justiça de transição; a história do ponto de vista camponês (organização sindical, Ligas Camponesas, ULTAB, CONTAG); as violações aos direitos humanos dos camponeses (núcleo do relatório, p. 94 ss., com casos de despejos, grilagem, pistolagem, prisões, tortura, assassinatos e massacres no campo); recomendações; e um anexo extenso de camponeses atingidos por IPMs e processos na Justiça Militar. PERSPECTIVA CLASSISTA explícita: trata o campesinato como classe e sujeito de direitos, articulando a repressão à estrutura fundiária e à aliança entre latifúndio e Estado. ALERTA DE USO: a documentação sobre o campo é dispersa e subnotificada — o próprio relatório indica subcontagem; dados individuais devem ser cotejados com a CNV (Vol. III), o CEMDP e fontes regionais. Proveniência: DHnet redistribui o PDF original sem alterações — mesmo padrão adotado para o CEMDP neste acervo.",

 "ctv-une": "Relatório da Comissão Nacional da Verdade da União Nacional dos Estudantes (UNE), publicado em 2015 no marco dos 50 anos do golpe e da trajetória da entidade (linha do tempo 1964–2014). Comissão TEMÁTICA de âmbito nacional dedicada à perseguição ao movimento estudantil. Estrutura em quatro partes: artigos convidados (com textos de Paulo Abrão, Pedro Dallari e Maria do Rosário, situando juventude e justiça de transição); o relatório final propriamente dito; os estudantes mortos e desaparecidos; e a reconstrução da memória da UNE — incluindo a invasão e o incêndio da sede da entidade no primeiro dia da ditadura, em 1964. Documenta prisões, torturas, mortes e desaparecimentos de lideranças estudantis e a repressão a congressos e entidades. ALERTA DE USO: parte do volume é de natureza memorialística e ensaística (artigos assinados); distinga esses textos de opinião do levantamento factual de casos, e cruze nomes de mortos e desaparecidos com a CNV (Vol. III) e o CEMDP. Proveniência: DHnet redistribui o PDF original sem alterações.",

 "ctv-mg-jornalistas": "Relatório da Comissão da Verdade do Sindicato dos Jornalistas Profissionais de Minas Gerais (SJPMG), elaborado em Belo Horizonte entre outubro de 2013 e janeiro de 2014. Comissão SETORIAL (categoria dos jornalistas mineiros). O documento é majoritariamente composto por depoimentos transcritos de jornalistas (entre eles José Maria Rabelo, Guy de Almeida, Carlos Olavo Cunha Pereira, Geraldo Elísio Machado Lopes), intercalados com análises sobre censura e violência contra jornais e jornalistas, o papel do SJPMG, e a atuação de esquadrões da morte em Minas Gerais. ALERTA DE USO: trata-se sobretudo de relato em primeira pessoa (testemunho), com marcas de oralidade e memória — valor histórico alto, mas a ser cotejado com documentação; é um relatório breve e de categoria, não um levantamento estadual exaustivo (não confundir com a Covemg estadual, cev-mg-covemg-relatorio-final-2017). Proveniência: DHnet redistribui o PDF original sem alterações.",

 "ctv-sp-cut": "Relatório da Comissão Nacional da Memória, Verdade e Justiça da Central Única dos Trabalhadores (CUT), publicado em São Paulo (2015) com apresentação de Vagner Freitas. Apesar de sediada em São Paulo, é uma comissão SETORIAL de âmbito NACIONAL, dedicada à perseguição ao movimento sindical e à classe trabalhadora durante a ditadura e a transição. Estrutura: Parte I — mortos e desaparecidos políticos do mundo do trabalho; Parte II — atos da CUT e atos sindicais unitários por memória, verdade, justiça e reparação; Parte III — pesquisa e documentação, incluindo o Encontro Nacional de Comissões da Verdade dos Sindicatos cutistas; e uma seção de artigos. PERSPECTIVA CLASSISTA central: documenta a repressão a sindicalistas e o vínculo entre a ditadura e o disciplinamento da força de trabalho. ALERTA DE USO: documento de natureza mista (institucional, militante e analítica) — distinga os atos e textos de posição da entidade do levantamento factual de casos; cruze nomes com a CNV (Vol. III) e o CEMDP. Proveniência: DHnet redistribui o PDF original sem alterações.",

 "ctv-sp-jornalistas": "Relatório da Comissão da Verdade, Memória e Justiça do Sindicato dos Jornalistas Profissionais no Estado de São Paulo — 'Jornalistas de São Paulo e a ditadura', publicado em 2017 no marco dos 80 anos do sindicato. Comissão SETORIAL (categoria dos jornalistas paulistas). Estrutura: apresentação; texto de abertura ('Dos porões da ditadura ao exílio na democracia'); Capítulo 1 — jornalistas mortos e desaparecidos; Capítulo 2 — audiências públicas e entrevistas; Capítulo 3 — perseguição a jornalistas no pós-ditadura (casos de jornalistas assassinados e os exílios de Caco Barcellos, André Caramante e Mauri König); Capítulo 4 — lugares de memória e consciência; Capítulo 5 — conclusões e recomendações; Capítulo 6 — bibliografia de 116 livros sobre jornalismo e o período 1964–1985. ALERTA DE USO: documento de categoria, focado em jornalistas; o Capítulo 3 estende-se à democracia (violência contra a imprensa no pós-1985), tema conexo mas distinto das violações da ditadura — atente ao recorte temporal de cada caso. Cruze nomes com a CNV (Vol. III) e o CEMDP. Proveniência: DHnet redistribui o PDF original sem alterações.",

 "ctv-andes": "Relatório Final da pesquisa da Comissão da Verdade do ANDES-SN (Sindicato Nacional dos Docentes das Instituições de Ensino Superior) — 'A ditadura empresarial-militar nas universidades públicas brasileiras', publicado em 2020. Comissão SETORIAL de âmbito NACIONAL, dedicada às violações contra docentes universitários. Estrutura: introdução e apresentação; a ditadura empresarial-militar (1964–1988) e a universidade; perseguição administrativa e violações a discentes e docentes (indeferimento de matrículas por 'determinação superior', enquadramento no Decreto-Lei 477, aposentadorias e demissões compulsórias, vigilância pelas ASI/AESI); referências; e anexos (entre eles o Termo de Referência do 32º Congresso do ANDES-SN que criou a comissão). PERSPECTIVA CLASSISTA explícita já no título: caracteriza o regime como 'empresarial-militar', enfatizando a aliança entre empresariado e Forças Armadas e seus efeitos sobre o trabalho docente e a universidade pública. ALERTA DE USO: é um relatório de pesquisa sindical, de síntese nacional (44 p.), não um levantamento caso a caso exaustivo; complementa, sem substituir, as comissões universitárias específicas já no acervo (cuv-*). Proveniência: DHnet redistribui o PDF original sem alterações.",

 "ctv-df-bancarios": "ATENÇÃO — RELATÓRIO SIMPLIFICADO. Versão simplificada do relatório da Comissão da Verdade dos Bancários de Brasília, referente aos trabalhos de 2013 a 2015. Comissão SETORIAL (categoria bancária do Distrito Federal). Documento breve (23 p.): apresentação, histórico e atividades da comissão, conclusão, declaração e anexos (cronograma de atividades, o Manifesto do Fórum pela Democracia '50 anos de resistência: 1964–2014' e demais peças). Registra a perseguição a bancários sindicalizados — prisões, demissões e a repressão ao movimento sindical da categoria no DF. ALERTA DE USO: por ser a versão SIMPLIFICADA, não traz o levantamento detalhado de casos individuais; use como registro institucional e ponto de partida, cotejando com fontes sindicais e com a CNV/CEMDP para dados factuais. Proveniência: DHnet redistribui o PDF original sem alterações.",

 "ctv-fenaj-jornalistas": "ATENÇÃO — DOCUMENTO PARCIAL (ANEXO). Este arquivo é APENAS o Anexo I do Relatório Final da Comissão de Anistia/Ministério da Justiça à Comissão Nacional da Verdade dos Jornalistas (FENAJ), produzido no âmbito de termo de cooperação entre a Comissão de Anistia (CA/MJ), a Agência Brasileira de Cooperação e o PNUD (Projeto BRA/08/021) para apoiar os trabalhos da CNV. NÃO é o relatório completo da Comissão Nacional da Verdade dos Jornalistas/FENAJ. Documento muito curto (9 p.): introdução, uma relação de processos de jornalistas perseguidos e considerações finais. ALERTA DE USO CRÍTICO: (a) por ser apenas o Anexo I, a maior parte da investigação da FENAJ não está neste arquivo — quem precisar do relatório integral deve buscá-lo à parte; (b) trata-se de uma síntese de processos, a ser cotejada com a CNV (Vol. III), o CEMDP e os autos de origem. Proveniência: DHnet redistribui o PDF original do anexo sem alterações.",

 "ctv-sc-jornalistas": "Relatório Final da Comissão da Verdade dos Jornalistas de Santa Catarina (Jornalistas/SC), de novembro de 2014, produzido para contribuir com os trabalhos da Comissão Nacional da Verdade (Lei 12.528/2011). Comissão SETORIAL (categoria dos jornalistas catarinenses). Documento breve (11 p.) em texto corrido, sem subdivisões formais: reúne memória e casos da perseguição a jornalistas e à imprensa em Santa Catarina durante a ditadura. ALERTA DE USO: é um relatório curto e de categoria, não um levantamento estadual exaustivo (não confundir com a CEV estadual Paulo Stuart Wright, cev-sc-relatorio-final); dados factuais devem ser cotejados com a CNV (Vol. III) e o CEMDP. Proveniência: DHnet redistribui o PDF original sem alterações.",
}

# Subtipos que qualificam a natureza do documento (a busca pode exibir ao usuário).
SUBTIPOS = {
 "ctv-fenaj-jornalistas": "anexo_parcial",
 "ctv-df-bancarios": "relatorio_simplificado",
}

# Renomeação de rótulos de seção (título provisório do chunking -> título conferido
# no sumário do PDF). Só os que mudam; offsets já estavam corretos.
SECOES_CORRIGIDAS = {
 "ctv-camponesa": {
   "Parte I": "I. Memória camponesa: narrativa da dor e esperança no porvir",
   "Parte II": "II. A história do ponto de vista camponês",
   "Parte III": "III. Violações aos direitos humanos dos camponeses",
   "Parte IV": "IV. Recomendações",
 },
 "ctv-mg-jornalistas": {
   "O método": "O método e a busca da verdade",
   "Censura e autocensura": "Censura e violência contra jornais e jornalistas",
 },
 "ctv-sp-cut": {
   "Parte I": "Parte I — Mortos e desaparecidos políticos na ditadura e na transição",
   "Parte II": "Parte II — Atos da CUT por memória, verdade, justiça e reparação",
   "Parte III": "Parte III — Pesquisa e documentação",
 },
 "ctv-sp-jornalistas": {
   "Homenagem a Milton Coelho da Graça": "Dos porões da ditadura ao exílio na democracia",
   "Capítulo 2 — Audiências públicas": "Capítulo 2 — Audiências públicas e entrevistas realizadas",
   "Capítulo 3 — Censura e perseguição": "Capítulo 3 — Perseguição a jornalistas no pós-ditadura",
   "Capítulo 4": "Capítulo 4 — Lugares de memória e consciência",
   "Capítulo 5": "Capítulo 5 — Conclusões e recomendações",
   "Capítulo 6 — Acervo e referências": "Capítulo 6 — 116 livros de jornalistas ou sobre jornalismo (1964–1985)",
 },
 "ctv-andes": {
   "Parte 1 — Estado ditatorial e a universidade": "A ditadura empresarial-militar (1964–1988) e a universidade",
   "Partes 2 e 3 — Perseguição a discentes e docentes": "Perseguição administrativa e violações a discentes e docentes",
   "Parte 4 — Violações físicas": "Referências",
 },
}

# ---------------------------------------------------------------------------
# 1) Atualiza fontes.json (fonte única da verdade dos metadados editoriais)
catalogo = json.loads(CATALOGO.read_text(encoding="utf-8"))
for slug, nota in NOTAS.items():
    catalogo[slug]["fonte"]["nota_contexto"] = nota
for slug, subtipo in SUBTIPOS.items():
    catalogo[slug]["fonte"]["subtipo"] = subtipo
CATALOGO.write_text(json.dumps(catalogo, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"fontes.json atualizado ({len(NOTAS)} notas; {len(SUBTIPOS)} subtipos).")

# ---------------------------------------------------------------------------
# 2) Aplica na tabela `fontes` (nota_contexto, subtipo) e em `chunks` (secao)
url = os.environ.get("SUPABASE_URL")
chave = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_SERVICE_KEY")
if not (url and chave):
    raise SystemExit("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY ausentes no .env.local")
sb = create_client(url, chave)

for slug, nota in NOTAS.items():
    f = catalogo[slug]["fonte"]
    patch = {"nota_contexto": nota}
    if slug in SUBTIPOS:
        patch["subtipo"] = SUBTIPOS[slug]
    r = sb.table("fontes").update(patch).eq("url_origem", f["url_origem"]).execute()
    print(f"  [{slug}] fonte: {len(r.data)} atualizada(s) {sorted(patch.keys())}")

# Renomeação de seções: precisa do fonte_id (UPDATE chunks por fonte_id + secao antiga)
for slug, mapa in SECOES_CORRIGIDAS.items():
    url_origem = catalogo[slug]["fonte"]["url_origem"]
    fonte = sb.table("fontes").select("fonte_id").eq("url_origem", url_origem).execute()
    if not fonte.data:
        print(f"  [{slug}] !! fonte não encontrada — pulando renomeação de seções")
        continue
    fonte_id = fonte.data[0]["fonte_id"]
    for antigo, novo in mapa.items():
        r = (sb.table("chunks").update({"secao": novo})
             .eq("fonte_id", fonte_id).eq("secao", antigo).execute())
        print(f"  [{slug}] secao '{antigo}' -> '{novo}': {len(r.data)} chunk(s)")

print("Concluído.")
