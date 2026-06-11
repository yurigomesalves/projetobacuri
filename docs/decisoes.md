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
