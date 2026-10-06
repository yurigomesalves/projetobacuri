# Auditoria editorial — preview pós-correção (05/10/2026)

## Escopo

Regressão dirigida da bateria 11, após a regra editorial sobre sujeito, alcance e
cadeia de atribuição. Foram conferidos `S01`, `S03`, `S04`, `S06` e `S12`: 33
citações públicas, todas com correspondência única, em 28 chunks distintos. A revisão
cotejou resumo e resposta com os chunks associados; não presume sustentação histórica
apenas porque há um marcador numérico.

| Caso e pergunta | Afirmações efetivamente conferidas | Resultado |
|---|---|---|
| S01 — AI-5 e garantias | edição, poderes, recesso, cassações, habeas corpus, controle judicial, censura e nota de rodapé | sustentadas nos chunks 1–8; fonte de nota é identificada como contexto secundário. |
| S03 — violações contra Waimiri-Atroari | genocídio conforme relatório, bombardeio/testemunho, estimativa demográfica, invasão, BR-174, Balbina e falas de agentes públicos | sustentadas nos chunks 1–7; sobreviventes e audiência são atribuídos como testemunho. |
| S04 — função da CEMDP | instituição, composição, atribuições, reparação, Lei 10.875, cronologia, Perus e recomendações em perfis | sustentadas nos chunks 1–6, com a distinção institucional abaixo. |
| S06 — empresas e agentes civis | articulação golpista, apoio material, vigilância de trabalhadores, conclusões e recomendações, militares como decisores | sustentadas nos chunks 1–7; cadeias de atribuição preservadas. |
| S12 — continuidade sobre consequências do AI-5 | recesso, expurgo, cassações, Judiciário, censura, repressão, heranças e limites da evidência | sustentadas nos chunks 1–5; responde ao referente de S01 e não introduz lacuna indevida. |

## Rechecagem dos achados anteriores

### S04 — veto anterior corrigido

- O antigo enunciado que generalizava menções a processos da CEMDP foi removido.
  A nova resposta usa `chunk_id 879e0ec0-615c-4a29-86bc-7574c79da759` para as
  atribuições expressas da comissão e limita `ddfabb0b-7f7c-4d51-9a4d-3714128ed781`
  ao perfil de João Alfredo Dias.
- A recomendação sobre Lourival Moura Paulino agora é apresentada como recomendação
  da **CNV**, na mesma frase, e não como competência ou ação da CEMDP. O chunk
  `37a87b76-5101-4db0-8f25-5a88392684f9` diz “recomenda-se a investigação...” e a
  resposta preserva essa autoria e alcance. **[corrigido; sem gravidade pendente]**

### S06 — ressalva anterior corrigida

- A alegação sobre eventual colaboração de Henning Albert Boilesen com a CIA foi
  retirada. A resposta conserva somente o que a nota 25 permite: o relatório paulista
  registra, em nota de rodapé baseada em documentário, financiamento e apoio à Oban.
  Evidência: `6ba95d0a-79ff-47af-965b-05cde31726ed`, pp. 560–561.
  **[corrigido; sem gravidade pendente]**

## Achados novos

Nenhum achado bloqueante, importante ou menor foi identificado nesta amostra. As
afirmações sensíveis permanecem atribuídas: em S03, o ataque aéreo é relato de Viana
Womé Atroari no chunk `e2b33d73-44b7-49fb-a9c8-dcea3fd5e2c7`; em S06, a vigilância
fabril é apresentada como depoimentos/audiências no `8ab5732b-ccb4-4e31-8722-a7e26aafd79d`;
em S12, o aumento de mortos e desaparecidos é atribuído ao relatório paulista, e não
convertido em dado sem autor.

Os resumos de S01, S03, S04, S06 e S12 permanecem ligados às respostas citadas e não
trazem marcadores. S12 usa o histórico para identificar “essa medida” como AI-5; não
atribui novas competências a instituições nem afirma que as limitações dos cinco chunks
esgotem o acervo.

## Limites e decisão

Esta é amostra dirigida de desenvolvimento, não validação independente v4 nem aprovação
do corpus ou do comportamento global. Não houve prompt completo, fontes recuperadas e
não citadas podem faltar. As páginas são os localizadores declarados nos chunks: não se
certificou página física do PDF ou página impressa. A auditoria não substitui leitura dos
documentos originais.

**O veto anterior pode ser retirado para esta amostra pós-correção.** A retirada vale
somente para os cinco casos auditados e não autoriza promoção geral sem a avaliação
independente e a conferência humana previstas.

## Checagem de consistência

Releitura final confirmou que a decisão decorre da comparação direta entre as novas
frases e os chunks identificados acima; não foram transformadas associações numéricas em
prova, nem foram certificadas paginação PDF, corpus ou avaliação v4.
