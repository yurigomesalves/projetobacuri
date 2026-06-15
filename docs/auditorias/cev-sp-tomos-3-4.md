# Auditoria editorial — CEV-SP "Rubens Paiva", Tomos III e IV

**Data:** 2026-06-15
**Auditor:** Curador-historiador (Projeto Bacuri)
**Amostra:** ~15 chunks do Tomo III (páginas 2961-10382, ordens 0-13000) e ~6 chunks do Tomo IV (páginas 1-1282, ordens 0-1351).

## 1. Qualidade do OCR — Tomo III
Amostras lidas estão **legíveis e citáveis**. Mesmo transcrições de fala (depoimentos
em audiência, com hesitações, repetições, "né", "tava") preservam o sentido e são
historiograficamente valiosas como registro de oralidade. Não foi encontrado lixo de
OCR relevante nas amostras (sem strings tipo "lll1|||" ou substituições maciças de
caracteres). O critério de descarte (≥60 caracteres alfabéticos, ≥50% alfabéticos)
parece adequado — não houve indício de corte de conteúdo válido nas amostras.

**Achado menor:** ocorrências de "—-" e aspas tipográficas inconsistentes (`<laudos=`,
`9` em vez de aspas no Tomo IV, ordem 699-701, provavelmente artefato de extração de
PDF com fontes especiais) — não impedem leitura, mas podem soar estranhas se citadas
literalmente. **Gravidade: menor.**

## 2. `secao = null` no Tomo III (audiências)
**Aceitável como estado atual**, mas é uma lacuna de proveniência que viola
parcialmente o princípio de referência autoral: o chatbot poderá citar "Tomo III,
p. 5665" mas não "Audiência Pública sobre [tema], de [data]".

Nas amostras, cada audiência tem presidente/mediador nomeado no próprio corpo
("O SR. PRESIDENTE — ADRIANO DIOGO"), datas e temas variados — incluindo casos que
extrapolam o núcleo "vítima política individual" (ex.: ordem ~10495, audiência sobre
o incêndio da Vila Socó/Vila Parisi em Cubatão — tema de racismo ambiental e
classismo industrial, legítimo no escopo da CEV-SP, mas o usuário do bot pode
estranhar se não houver contexto de qual audiência é essa).

**Recomendação prática:** mapear faixas de página → audiência usando o sumário/índice
do Tomo III (lista de audiências públicas com datas e títulos, normalmente nas
primeiras páginas do tomo). Isso é viável pois as páginas têm `paginas` como string
contínua. Sugiro ao cientista-de-dados um script de pós-processamento que faça
join por intervalo de página, sem reindexar os embeddings. **Gravidade: importante,
não bloqueante** — o chunk ainda cita Tomo III + página, o que já é referência
mínima válida.

## 3. Granularidade das seções — Tomo IV (Anexos I-XIX)
A heurística captura títulos de seção (ex.: "RELATÓRIO SOBRE OS CASOS DE TORTURA E
MORTE DE IMIGRANTES", "RELATÓRIO SOBRE A MORTE DO PRESIDENTE", "ANEXO XIX") mas
**não o autor individual de cada anexo**. Na amostra da ordem 0, o autor (Mario Jun
Okuhara) aparece no próprio corpo do chunk 1 — então a informação não está perdida,
mas depende de o chunk recuperado conter essa linha específica.

Já na amostra da ordem ~1350 (ANEXO XIX, caso Nestor Vera), o chunk **já contém uma
seção "Fontes:" com citação completa** (CEV-SP + autores + ano) — ótimo padrão,
mas não é uniforme em todo o Tomo IV.

**Recomendação prática:** para os 19 anexos, mapear manualmente (são poucos) faixa de
página → autor(es) do anexo, usando o sumário do Tomo IV, e gravar como metadado
adicional `autor_secao`. É um trabalho finito (19 entradas) e de alto retorno para o
princípio de referência autoral. **Gravidade: importante, não bloqueante.**

## 4. Páginas descartadas
Não foi possível localizar lista específica de páginas descartadas nos arquivos
verificados (`pipeline/dados/extraido/cev-sp-rubens-paiva-tomo{3,4}.jsonl` existem,
mas não foram abertas integralmente por economia de tokens). **Pendência**: pedir ao
engenheiro-de-dados/cientista-de-dados um relatório de log com a lista de páginas
descartadas (81 do III, 288 do IV) para amostragem específica — sem esse log, não dá
para confirmar se houve perda de conteúdo relevante. **Gravidade: importante** —
necessário para fechar a auditoria com segurança, mas não impede uso do que já foi
indexado.

## 5. Conformidade com princípios editoriais
Nas amostras lidas: tom sóbrio preservado (são transcrições verbatim de fala em
audiência pública, incluindo testemunhos de familiares — tratamento digno).
Proveniência (`www.verdadeaberta.org`, números de página, "Comissão da Verdade do
Estado de São Paulo Rubens Paiva") aparece nos próprios textos, reforçando
rastreabilidade. Nenhum conteúdo identificado como negacionista ou que relativize
crimes — ao contrário, os depoimentos (ex.: caso Nestor Vera, Manoel Raimundo
Soares) nomeiam vítimas, datas e processos judiciais com precisão. Nenhum problema
bloqueante de conteúdo encontrado nas amostras.

## Veredito geral
**Apto para uso com ressalvas.** Nenhum problema bloqueante de conteúdo ou OCR nas
amostras. Os dois pontos "importantes" (seção=null no III; autor por anexo no IV)
não impedem a citação mínima (documento + página), mas devem entrar no roadmap de
melhoria de metadados para fortalecer a referência autoral granular — especialmente
para o Tomo IV, onde há 19 autores distintos de pesquisa.

## Pendência para decisão do Yuri
- Priorizar (ou não) o mapeamento de faixas página→audiência (Tomo III) e
  página→autor de anexo (Tomo IV) nesta fase ou deixar para fase de polimento.
- Solicitar ao engenheiro-de-dados o log de páginas descartadas para fechar o
  item 4 desta auditoria.

## Fechamento da dívida (2026-06-15)

Decisão do Yuri: quitar a dívida nesta fase. O cientista-de-dados reetiquetou a
coluna `secao` dos chunks já indexados — sem recalcular embeddings, pois a
`secao` não entra no vetor (`04_indexar.py` embeda apenas `"passage: " +
conteudo`). A sincronia com o Supabase foi confirmada por dry-run (0 diferenças
entre arquivo local e banco) nos dois tomos. Auditoria de amostragem do curador:

**Item 3 — Tomo IV (anexos + autores): APROVADO, sem ressalvas.** Os 19 rótulos
no formato `ANEXO <romano> — <descrição> (autor: <nome>)` conferem com o índice
oficial (págs. 828-829 do extraído), inclusive os cinco anexos com autor pessoa
(VI Gilberto Bercovici; XVI Eduardo Saad-Diniz; XVII Emílio Peluso Neder Meyer;
XVIII Alessandro Octaviani; XIX José Carlos Moreira da Silva Filho). Nenhum
rótulo inventado; corrigidos os dois defeitos da heurística antiga (linha de
índice rotulada como anexo; nome de autor solto virando seção).

**Item 2 — Tomo III (audiências, heurística conservadora): APROVADO, sem
ressalvas.** Amostra de 7 chunks (ordens 304, 359, 436, 5304, 9304, 12804,
12999) confirma número e data de audiência coerentes com o conteúdo. A fronteira
`secao=null` (até a página 3119, antes da 1ª audiência detectada) está correta.
Cobertura: 13.241/13.545 chunks (97,8%) rotulados; 304 (2,2%) em `null`. Critério
de detecção: linha "instalada a Nª audiência pública" (numérica ou por extenso)
com data validada (2012-2015) — não inventa rótulo onde não há cabeçalho de alta
confiança, conforme o princípio "não inventar".

**Item 4 — Páginas descartadas: APROVADO, sem ressalvas.** Logs gerados em
`pipeline/dados/chunks/cev-sp-rubens-paiva-tomo{3,4}.descartes.jsonl`, batendo
exatamente com as contagens desta auditoria (Tomo III: 5121 em branco + 81 baixa
qualidade; Tomo IV: 148 vazias + 288 baixa qualidade). Amostradas ~15 páginas de
motivo "baixa_qualidade" em cada tomo: todas são ruído de diagramação
(cabeçalho/rodapé repetido, numeração de página, "(Aplausos)", "A sessão está
encerrada") — nenhum conteúdo historiograficamente relevante foi perdido.

**Veredito geral:** os três itens pendentes ficam FECHADOS, sem bloqueantes.
Ressalva remanescente (não bloqueante): os 2,2% de chunks `secao=null` no Tomo
III são item de polimento futuro, não pendência de auditoria.
