# Decisões editoriais e de curadoria (ADRs)

> Registro público das decisões de curadoria do projeto Memória e Verdade,
> em cumprimento ao princípio 1 (transparência editorial). Cada entrada:
> data, decisão, justificativa e impacto.

## ADR-001 — Campo `marcadores` (interseccionalidade) é público
- **Data**: 11/06/2026
- **Decisão (Yuri)**: o campo `marcadores` (classe, raça, gênero, LGBT,
  origem estrangeira etc.) será exibido publicamente nas biografias e nos
  eventos do mapa, e não apenas usado como metadado interno.
- **Justificativa**: reforça o princípio 6 (perspectiva classista e suas
  intersecções) — tornar visível que a repressão não atingiu todos os corpos
  da mesma forma exige que esses dados apareçam ao público.
- **Salvaguarda obrigatória**: cada marcador exibido deve citar a fonte da
  classificação (CNV, biografia publicada, testemunho), nunca por inferência —
  especialmente raça e orientação sexual de pessoas reais com familiares vivos.
  Ver `docs/taxonomia.md`, seção 6.2.
- **Impacto**: o contrato de API (`docs/contrato-api.md`) e o frontend de
  biografias deverão prever `marcadores` com fonte associada por item.

## ADR-002 — Grafia dos órgãos repressivos: forma mais usada
- **Data**: 11/06/2026
- **Decisão (Yuri)**: o campo `orgao_normalizado` usa a grafia **mais usada**
  na historiografia e nos acervos (ex.: DOPS como forma geral; DEOPS/SP quando
  for a forma consagrada para o órgão paulista), e não necessariamente a
  nomenclatura literal do Relatório CNV vol. I.
- **Salvaguarda**: o campo `orgao_repressor` continua registrando a grafia
  EXATAMENTE como consta no documento original (taxonomia, seção 4).
- **Impacto**: a tabela da seção 4 da taxonomia será expandida conforme a
  ingestão real, sempre com a forma consagrada como entrada normalizada.

## ADR-003 — Camada própria no mapa para violência contra povos indígenas
- **Data**: 11/06/2026
- **Decisão (Yuri)**: `violencia_contra_povos_indigenas` é `tipo_crime` de
  primeira classe E os eventos correspondentes ganham **camada própria no mapa**
  (Leaflet), separada dos casos individuais urbanos.
- **Justificativa**: a CNV dedica capítulo próprio ao tema; a violência contra
  comunidades/territórios não se representa bem como ponto individual.
- **Impacto**: `eventos_geo` deve suportar representação de área/território
  (não só ponto) e o frontend do mapa deve permitir ligar/desligar a camada.
  Implementação conjunta com arquiteto-backend e designer-frontend.

## ADR-004 — Materiais de outras iniciativas são fonte citável
- **Data**: 11/06/2026
- **Decisão (Yuri)**: materiais de museus, ONGs de memória e outras iniciativas
  educativas (`tipo_fonte: material_didatico_educativo`) entram no acervo como
  **fonte citável** pelo bot, e não apenas como apoio interno de redação.
- **Salvaguarda**: citação completa obrigatória (instituição, título, link);
  quando o material referenciar fonte primária, citar também a fonte primária.
  Confiabilidade permanece `media`.
- **Impacto**: o pipeline de ingestão pode indexar esses materiais como chunks
  recuperáveis pelo RAG, com metadados completos de proveniência.

## ADR-005 — Notas de rodapé sinalizadas como `tipo_chunk: nota_rodape`
- **Data**: 11/06/2026
- **Contexto**: a auditoria do acervo piloto (CNV vol. I —
  `docs/auditorias/2026-06-11-cnv-vol1.md`) identificou que chunks formados
  por notas de fim de capítulo apareciam na busca sem sinalização, podendo
  ser citados como se fossem o corpo do relatório.
- **Decisão (Yuri)**: tratar imediatamente, ainda na Fase 1 — coluna
  `tipo_chunk` (`corpo` | `nota_rodape`) no banco (migração 0002), detecção
  de blocos de notas no chunking e reindexação. Em caso de dúvida na
  classificação, prevalece `corpo` (não esconder conteúdo).
- **Impacto**: a camada de citações (Fase 3) deve sinalizar ao usuário quando
  o trecho citado é nota de rodapé.

## ADR-006 — Proveniência do PDF da CNV vol. I via Internet Archive
- **Data**: 11/06/2026
- **Contexto**: o portal oficial (cnv.memoriasreveladas.gov.br) bloqueia
  downloads automatizados; o PDF foi obtido de cópia arquivada no Internet
  Archive (Wayback Machine, 23/01/2024), com URL original, URL de
  arquivamento e sha256 registrados em `pipeline/manifesto.json`.
- **Decisão (Yuri)**: aceitar a proveniência como está, mantendo registrada
  a possibilidade de confronto manual futuro do hash contra download direto
  do portal oficial.

## ADR-007 — Embedding da consulta no servidor Next.js (não na Edge Function)
- **Data**: 11/06/2026
- **Contexto**: o contrato v1.0 previa gerar o embedding da pergunta numa
  Edge Function do Supabase. Na implementação (Fase 3), a função implantada
  falhou com `WORKER_RESOURCE_LIMIT` (status 546): o worker do free tier
  (256 MB) não comporta o modelo `multilingual-e5-small` (~112 MB + runtime
  WASM). O exemplo da documentação do Supabase usa o `gte-small` (34 MB),
  modelo em inglês, inadequado ao acervo em português.
- **Decisão (Yuri)**: gerar o embedding na própria rota `/api/chat`
  (Transformers.js em Node/Vercel), mantendo o MESMO modelo da indexação.
  Alternativas rejeitadas: trocar por modelo menor em inglês (pior para
  pt-BR e exigiria reindexar) e pagar tier maior do Supabase (princípio 4).
- **Impacto**: contrato atualizado (fluxo interno do POST /api/chat); a
  Edge Function `embed-consulta` foi removida do repositório (a versão
  implantada no Supabase pode ser apagada pelo painel). Primeira requisição
  após ociosidade do servidor é mais lenta (download/carga do modelo).

## ADR-008 — Novo `tipo_crime`: `atentado_a_populacao_civil`; marcadores 6.2 restritos à interseccionalidade
- **Data**: 12/06/2026
- **Contexto**: na curadoria da Fase 6, o atentado do Riocentro (1981) não
  cabia no vocabulário fechado de `tipo_crime` (derivado das graves violações
  nucleares da CNV), e o curador usou `tortura` como aproximação — classificação
  factualmente incorreta. Na mesma rodada, surgiram marcadores de profissão
  ("jornalista", "militar_oposicao") fora do vocabulário 6.2.
- **Decisão (Yuri)**: (a) criar o termo `atentado_a_populacao_civil` na seção 6
  da taxonomia (migração 0007 ajusta o vocabulário no banco); (b) manter a
  seção 6.2 restrita à interseccionalidade (classe, raça, gênero, etc.) —
  marcadores de profissão removidos; a profissão segue no texto biográfico,
  com citação.
- **Impacto**: taxonomia seção 6 atualizada; migração 0007; arquivos curados
  de Riocentro, Herzog e Rubens Paiva corrigidos antes do seed.

## ADR-009 — Módulo "crimes e justiça" suspenso; criação do manifesto projeto_bacuri
- **Data**: 12/06/2026
- **Contexto**: a Fase 7 previa o módulo comparativo jurídico (BlocoJustica).
  A infraestrutura já existe (colunas `justica_*` na migração 0006; rota
  `/api/eventos-geo/[id]` só serve o bloco com `revisado_por_humano = true`),
  mas nenhum conteúdo jurídico foi redigido.
- **Decisão (Yuri)**: suspender o módulo por tempo indeterminado, até a ideia
  ser mais bem desenvolvida. A infraestrutura
  fica preservada e dormente (todos os registros com `revisado_por_humano =
  false`, logo a API omite o bloco). Em seu lugar, nesta etapa entra uma
  página-manifesto pública, "manifesto projeto_bacuri", acessível por um botão
  minimalista na navegação.
- **Impacto**: contrato ajustado (bloco `justica` omitido até decisão futura);
  novo texto público em `docs/manifesto-projeto-bacuri.md` (rascunho do
  curador, publicado só após revisão do Yuri); nova página `/manifesto` e
  link no cabeçalho. Nenhuma migração ou mudança de pipeline.
