# Auditoria editorial — Comissão da Verdade em Minas Gerais (Covemg), Relatório Final 2017 + Anexo UFMG

**Data:** 2026-06-15
**Auditor:** Curador-historiador (Projeto Bacuri)
**Amostra:** ~25 chunks do Relatório Final (capa/créditos, fronteiras de capítulo — cap.1, cap.5→6,
cap.7→8, cap.13/Anexos finais —, e trechos temáticos: massacre de Ipatinga, mina de Morro Velho,
povos indígenas Krenak/Maxakali/Xakriabá, casos de assassinato de trabalhadores rurais); todos os
9 chunks do Anexo UFMG.

## 1. Proveniência institucional (`fontes.json` / `manifesto.json`)

**Correto.** O registro `cev-mg-covemg-relatorio-final-2017` identifica corretamente a Covemg como
**comissão ESTADUAL** ("governo do Estado de Minas Gerais"), não confundindo com a Comissão
Municipal da Verdade de Belo Horizonte (que é outra entidade, citada inclusive nos agradecimentos
do próprio relatório, p.3-5). Título, URL do DSpace oficial, licença (reprodução autorizada com
citação de fonte) e metadados de página/tamanho conferem com o que foi lido nas amostras. O anexo
UFMG está corretamente descrito como produzido pelo Centro de Estudos sobre Justiça de Transição
da UFMG, "em colaboração com" a Covemg — e o próprio texto do anexo (chunks 0-8) é um artigo
acadêmico de dois pesquisadores nomeados (Felipe Guimarães Assis Tirado, Jessica Holl), com
bibliografia própria. Nenhuma imprecisão encontrada. **Sem ressalvas.**

## 2. Mapa de capítulos vs. Sumário real

Conferi o Sumário (chunk ordem 16, p.17) e as páginas-fronteira amostradas:

- Cap. 6 ("A Repressão ao Mundo do Trabalho...") começa de fato na p.589 (chunk ordem 819), com
  página de rosto completa (coordenador, equipe, "VOLTAR AO SUMÁRIO") — bate com o mapa do
  docstring. A p.587 (chunk ordem 818) ainda traz o sumário interno do capítulo 6, rotulado
  (corretamente, pois a fronteira ainda não foi cruzada) como seção "5. As Graves Violações...".
  Pequeno desalinhamento de 2 páginas entre o índice interno do capítulo e seu início real, mas
  **não afeta a rotulagem** — o chunk 818 contém apenas o sumário do capítulo 6, sem conteúdo do
  cap.5 nem do cap.6 propriamente.
- Cap. 8 ("Violações de Direitos Humanos dos Povos Indígenas") começa na p.930 conforme o mapa;
  a amostra da p.928 (chunk ordem 1393, ainda rotulado cap.7) traz apenas referências
  bibliográficas (notas de rodapé de jornal/CPT), e a p.931 (chunk ordem 1395) já abre com texto
  substantivo sobre povos indígenas, citando a CNV e a periodização 1946-1988. **Fronteira
  coerente.**
- Cap. 13 (Anexos finais, p.1363+) contém uma extensa lista tabular de nomes (registros de
  vigilância/repressão, formato "NOME / FILIAÇÃO / NATURALIDADE / DATA NASCIMENTO / RESIDÊNCIA /
  OBSERVAÇÕES", muitos com "N/D"). Está corretamente rotulada como parte do cap.13 (cujo título
  trata de "Impedimento de Convivência de Crianças com seus Genitores..."), mas o conteúdo da
  lista parece ser um anexo geral de fichas de vigiados/militantes, não exclusivamente sobre
  filhos separados dos pais. **Achado menor**: o rótulo de seção está tecnicamente correto pelo
  Sumário, mas pode gerar estranhamento se o bot recuperar uma entrada "WILSON SOARES N/D N/D..."
  e a apresentar sob o título "Impedimento de Convivência de Crianças...". Gravidade: **menor**,
  não bloqueante — registrar como item de possível nota de contexto futura para os anexos finais.

## 3. Qualidade do texto extraído

Texto nativo, bem legível, sem lixo de OCR relevante nas amostras. Hifenização de quebra de linha
corretamente desfeita ("agremia-\nção" → "agremiação" — não testei caso real, mas o padrão do
script é correto e nenhuma palavra quebrada apareceu nas amostras). Cabeçalho/rodapé "Relatório
da Comissão da Verdade em Minas Gerais" + numeração não aparece intrusivamente nos chunks
amostrados — removido com sucesso na maioria dos casos.

**Achado menor:** em alguns chunks de página de rosto/créditos (ordem 0-2, p.3-5) aparecem
caracteres de controle residuais (``) antes de itens de lista (ex.: "Levantamento de
dados..."). Não compromete a leitura nem a recuperação semântica (são marcadores de bullet do PDF
original), mas poderia ser limpo em um polimento futuro. Gravidade: **menor**.

## 4. Integridade de sentido — chunks sobre vítimas e crimes

Amostra das "Graves Violações de Direitos Humanos no Campo" (cap.5, p.536-549): os chunks
preservam corretamente a ligação entre nome da vítima, data da morte, local e narrativa do crime
(ex.: ordens 718-719, caso "Carlos Zomar"/fazendeiro "Juquita" e em seguida o trio "Felício
Germano Mendes, José Amâncio Rocha, Sávio Gonçalves da Silva", Santa Maria do Suaçuí, 24-25/09/1984
— nome, contexto e data juntos no mesmo chunk, com overlap de ~80 tokens preservando a transição
entre os dois casos). Caso "Antônio 'Velho' e Maria Bernardina" (Miradouro, 1977, ordem 738) também
mantém nome, vínculo familiar, circunstância (esfaqueamento, degola) e autoria atribuída ("família
Ribas"/"irmãos Cadetes") com fonte citada (Cedefes, CPT-MG) no mesmo chunk. **Nenhum caso de nome
de vítima separado do contexto do crime nas amostras.**

## 5. Conteúdo temático sensível — Ipatinga, Morro Velho, povos indígenas

- **Massacre de Ipatinga** (cap.6, parte 2, p.589-591): o chunk de abertura (ordem 819-822)
  contextualiza o evento com precisão — data (6-7/10/1963), atores (trabalhadores da Usiminas,
  vigilantes, PM, populares), fontes (jornais da época, documentos da Usiminas, ALMG, TJM-MG) e
  metodologia (oitivas nomeadas: Agnaldo Quintela, Clodesmidt Riani et al.). Reconhece
  explicitamente o uso de jornais da época como objeto de crítica documental ("os jornais da
  época" listados ao lado de "documentos oficiais", sem tratá-los como fonte neutra). Compatível
  com o princípio de classismo/interseccionalidade do projeto (trabalhadores industriais como
  sujeitos de repressão de Estado).
- **Mina de Morro Velho** (cap.6, parte 1): metodologia descrita com testemunhas nomeadas
  (Alcebíades Campbell, Clodesmidt Riani, Sinval Bambirra etc.) e arquivos sindicais — boa base
  para citação responsável.
- **Povos indígenas Krenak/Maxakali/Xakriabá** (cap.8, p.930-934): trecho de abertura
  excepcionalmente rico — cita o Relatório Figueiredo, a CNV, o "Reformatório Krenak" como presídio
  indígena (1969), a Guarda Rural Indígena (GRIN), nomeia o capitão Manoel dos Santos Pinheiro e o
  presidente da FUNAI José de Queiroz Campos **com fonte explícita** (CNV 2014; jornalista Rubens
  Valente). Tom sóbrio, sem eufemismo ("esbulho de terras", "descaracterização cultural",
  "barbaridades"). A granularidade de seção ("8. Violações de Direitos Humanos dos Povos
  Indígenas") + página permite citação responsável. **Nenhum problema.**

Em nenhuma das amostras houve atribuição de crime a indivíduo nominado além do que o próprio
documento sustenta, nem qualquer formulação que relativizasse violações como "controvérsia".

## 6. Anexo UFMG (Justiça de Transição)

9 chunks, `secao=null` (correto — texto corrido, sem subtítulos confiáveis, conforme docstring).
Texto acadêmico bem segmentado, com autoria explícita (dois pesquisadores nomeados, com
afiliação), bibliografia completa preservada nos últimos chunks (ordens 6-8). É um texto teórico
sobre justiça de transição em geral (não fala de MG especificamente) — útil para perguntas
conceituais ("o que é justiça de transição?"), mas o bot não deve usá-lo como fonte de fatos sobre
casos mineiros específicos. **Achado menor**: poderia se beneficiar de uma `nota_contexto` curta
indicando que é um texto de fundamentação teórica geral, anexo ao relatório da Covemg, e não um
levantamento de casos de MG — mas isso não é bloqueante, pois o próprio texto já se identifica como
tal (título "JUSTIÇA DE TRANSIÇÃO", autoria, "Mestrando em Direito pela UFMG... Pesquisador do
Centro de Estudos sobre Justiça de Transição da UFMG").

## Veredito geral

**Apto para uso, sem bloqueantes.** Proveniência institucional correta (comissão estadual,
distinta da municipal de BH). Mapa de capítulos coerente com o Sumário nas fronteiras amostradas.
Nenhum chunk separa nome de vítima do contexto do crime. Conteúdo sobre Ipatinga, Morro Velho e
povos indígenas (Krenak/Maxakali/Xakriabá) tem granularidade e fontes suficientes para citação
responsável, em linha com a perspectiva classista/interseccional do projeto.

## Ressalvas (melhorias futuras, não bloqueantes)

1. **[menor]** Lista tabular de nomes do cap.13 (anexos finais, p.1363+) está rotulada sob o
   título "Impedimento de Convivência de Crianças com seus Genitores...", mas parece ser um anexo
   geral de fichas de vigiados — considerar `nota_contexto` específica para essa faixa de páginas
   em polimento futuro.
2. **[menor]** Caracteres de controle residuais (``) em chunks de página de rosto/créditos —
   limpeza cosmética, sem urgência.
3. **[menor]** Anexo UFMG poderia receber `nota_contexto` indicando que é texto teórico geral sobre
   justiça de transição, não levantamento de casos mineiros — para evitar que o bot o cite como
   fonte factual sobre MG.

## O que precisa de decisão do Yuri

- Nenhuma decisão bloqueante. As três ressalvas acima podem entrar no roadmap de polimento de
  metadados quando houver tempo, sem impedir o uso já feito da ingestão.
