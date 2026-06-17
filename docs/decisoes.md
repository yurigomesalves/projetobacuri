# Decisões editoriais e de curadoria (ADRs)

> Registro público das decisões de curadoria do Projeto Bacuri,
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

## ADR-004 — Materiais de outras iniciativas são fonte citável
- **Data**: 11/06/2026
- **Decisão (Yuri)**: materiais já curados por museus, ONGs de memória e
  iniciativas educativas (`tipo_fonte: material_didatico_educativo`) podem ser
  citados pelo bot, com confiabilidade `media` e citação completa (instituição,
  título, link), preferindo também citar a fonte primária referenciada quando
  identificável.

## ADR-005 — Notas de rodapé sinalizadas como `tipo_chunk: nota_rodape`
- **Data**: 11/06/2026
- **Contexto**: a extração de PDF intercala notas de rodapé com o corpo do
  texto; sem marcação, fragmentos de nota poderiam ser citados como se fossem
  o corpo do relatório.
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

## ADR-010 — Ampliação do vocabulário de marcadores (seção 6.2): papel social
- **Data**: 13/06/2026
- **Contexto**: a biografia de Edson Luís de Lima Souto (Calabouço, 1968) usa o
  marcador `estudante`. A seção 6.2 da taxonomia já documentava
  `estudante`/`religioso_a`/`militar_oposicao`/`jornalista`/`advogado_a` como
  marcadores de "papel social", mas o check constraint do banco (migração 0006)
  e o script `06_semear_curadoria.py` nunca os incluíam — só os marcadores de
  classe/raça/gênero/origem.
- **Decisão (Yuri)**: ampliar o vocabulário do banco e do script para incluir os
  5 termos de papel social já previstos na taxonomia (migração 0008).
- **Impacto**: `biografia_marcadores` e `evento_marcadores` aceitam agora
  `estudante`, `religioso_a`, `militar_oposicao`, `jornalista`, `advogado_a`.
  Aproveitando a correção, 3 marcadores antigos fora de qualquer vocabulário
  (que bloqueavam o seed) foram corrigidos: `igreja_catolica_progressista` →
  `religioso_a` (Antônio Henrique Pereira Neto); `lideranca_camponesa` →
  `camponesado` e remoção de `idoso` (Epaminondas Gomes de Oliveira);
  `camponeses_luta_pela_terra` → `camponesado` (Sebastião Gomes dos Santos);
  remoção de `ocultacao_de_cadaver_vala_clandestina` de José Gomes Teixeira
  (é `tipo_crime` de evento, já presente em `tipos_crime`). Biografia de
  Edson Luís publicada (`status_curadoria = "publicada"`) e semeada no Supabase.

## ADR-011 — Inclusão de "Direito à Memória e à Verdade" (CEMDP, 2007) e link via DHnet
- **Data**: 13/06/2026
- **Contexto**: o livro-relatório da Comissão Especial sobre Mortos e
  Desaparecidos Políticos (CEMDP, 2007, 502 p.) foi indexado (1.400 chunks,
  `fontes.id = 067ba85a-8b58-4089-9c9d-2da4d100adfd`, `tipo_fonte:
  relatorio_oficial`, `confiabilidade: alta`). O PDF oficial não está
  disponível em cópia ativa no domínio gov.br no momento da indexação; a
  cópia usada como fonte foi obtida no acervo da DHnet (Rede de Direitos
  Humanos e Cultura Democrática), que hospeda a obra integralmente e
  gratuitamente.
- **Decisão (Yuri)**: aceitar a DHnet como `url_origem`/link de citação para
  esta fonte, registrando essa proveniência de forma explícita no metadado da
  fonte (princípio 1 — transparência editorial). A autoria e o caráter de
  documento oficial (Secretaria Especial dos Direitos Humanos da Presidência
  da República / CEMDP, 2007, ISBN 978-85-60877-00-3) permanecem
  inalterados — a DHnet é apenas o repositório de acesso, não a autora.
- **Classificação confirmada**: `tipo_fonte: relatorio_oficial`,
  `confiabilidade: alta` está correta — a obra é historiografia consolidada
  produzida por comissão oficial instituída pela Lei nº 9.140/95, com
  participação de representantes do Estado, do MPF, das Forças Armadas e dos
  familiares de vítimas. Não deve ser tratada como "um lado" de controvérsia
  (princípio 5).
- **Amostragem revisada**: capa/ficha catalográfica e apresentação
  (chunks 1-5, p. 4-10), perfis de vítima (p. 162-163 — Dênis Antônio
  Casemiro/Mariano Joaquim da Silva; p. 261 — Áurea Eliza Pereira/Telma Regina
  Cordeiro Corrêa), lista de desaparecidos do Anexo I (p. 498-499) e seção
  "As Organizações de Esquerda"/Glossário/Anexos finais (p. 483-499).
  Em todas as amostras: `paginas` preenchido, `tipo_chunk: corpo`, texto
  legível e sem corrupção relevante, cortes preservam o nome da vítima junto
  do contexto do crime (nenhum corte no meio de um relato de tortura/execução
  observado na amostra).
- **Problema cosmético confirmado (já relatado pelo cientista-de-dados)**: nos
  4 chunks da seção "As Organizações de Esquerda" que descrevem múltiplas
  organizações (ex.: Grupos dos Onze, DISP), apenas a primeira organização do
  bloco recebe `secao` própria — as seguintes ficam sob a seção da anterior.
  Gravidade: **menor** — não compromete a recuperação (o texto descreve a
  organização certa, só o rótulo de seção do chunk é impreciso). Sugestão:
  caso o cientista-de-dados refaça o chunking desta fonte por outro motivo,
  ajustar a detecção de cabeçalho de subseção para reconhecer também títulos
  de organização em negrito/iniciais maiúsculas dentro de "As Organizações de
  Esquerda".
- **Erro de OCR no Glossário (chunks ~1369-1371, p. 486)**: "Revolucionária"
  aparece como "RevoLúcionária" em VAR-Palmares e VPR. Gravidade: **menor**
  — afeta apenas a entrada de glossário (sigla ainda correta: VAR-Palmares,
  VPR), não os perfis de vítima nem a busca semântica (que tolera essa
  variação). Não bloqueia produção; registrar para correção futura caso o
  glossário seja usado em exibição literal ao usuário.
- **Parecer final**: **aprovado para uso em produção**, com as duas ressalvas
  menores acima (rotulagem de seção em "As Organizações de Esquerda" e OCR do
  Glossário), nenhuma delas bloqueante. A fonte cumpre os princípios 1, 3 e 5:
  metadados permitem citar página e construir link (DHnet) para cada chunk, e
  a obra é tratada como documento oficial/historiografia consolidada, não como
  "lado de debate".

## ADR-012 — Tipologia de biografias e correção de marcadores
- **Data**: 17/06/2026
- **Decisão (Yuri)**:
  1. **Unificar `vitima` e `sobrevivente`** num único tipo de biografia. A
     distinção entre quem foi morto/desaparecido e quem sobreviveu à repressão
     era problemática como tipologia; ambas as situações passam a `vitima`.
  2. **Habilitar o tipo `perpetrador`** (agentes da repressão), já previsto em
     `docs/contrato-api.md` mas ausente da constraint do banco, para uma fase
     dedicada de ingestão desses dados.
  3. **`camponesado` → `campesinato`** (forma correta do termo).
  4. **Remover o marcador `pardo`**: negros e pardos são registrados como
     `negro` (critério do IBGE para população negra). Ver `docs/taxonomia.md`,
     seção 6.2.
- **Impacto**: migração `0012_unifica_vitima_marcadores.sql` (6 biografias
  `sobrevivente` → `vitima`; 11 marcadores `camponesado` → `campesinato`;
  nenhum dado usava `pardo`); vocabulários do seed
  `pipeline/06_semear_curadoria.py` e arquivos de curadoria atualizados.

## ADR-013 — Critério editorial para biografias de perpetradores
- **Data**: 17/06/2026
- **Decisão**: estabelecer critério formal de como o projeto descreve, cita e
  responsabiliza agentes da repressão em `tipo: "perpetrador"`. Texto completo
  em `docs/taxonomia.md`, seção 11.
- **Princípio central**: perpetrador não é "outro lado de um debate"; é agente
  cuja autoria está documentada. Linguagem sempre referenciada nas comissões da
  verdade; `marcadores` vazio para perpetradores (seção 6.2 não se aplica);
  `status_curadoria: "rascunho"` obrigatório até revisão humana. Dado
  biográfico verificável fora do acervo (ex.: data de morte) entra só na prosa
  do `texto_md`, nunca como `trecho` de fonte.
- **Impacto**: pipeline de curadoria, interface pública, notas de transparência.
- **Recomendação aberta (não implementada)**: campos estruturados
  `orgao_vinculo`, `patente`, `funcao` e `periodo_atuacao` para perpetradores —
  exigiriam migração + ajuste do validador e do contrato de API. Decisão do Yuri.

## ADR-014 — Grafia padronizada "Fiuza" (sem acento) para Adyr Fiuza de Castro
- **Data**: 17/06/2026
- **Decisão (Yuri)**: adotar a grafia **"Fiuza"** (sem acento) como forma
  canônica do nome (campo `nome` e prosa do `texto_md`), por ser a usada no
  Capítulo 16 do Relatório da CNV, vol. I — capítulo de autoria das graves
  violações e fonte primária da biografia.
- **Justificativa**: o vol. III do mesmo relatório grafa "Fiúza" (com acento)
  nas fichas de responsabilização; diante da divergência interna da própria
  fonte, padroniza-se pela seção que fundamenta o enquadramento. A grafia
  original com acento é **preservada dentro da citação literal** do vol. III
  (campo `trecho`), que não se altera.
- **Impacto**: biografia `adyr-fiuza-de-castro`; regra geral para futuros casos
  de divergência de grafia entre volumes de uma mesma fonte (preferir a seção
  que fundamenta a responsabilização; preservar o original nos `trecho`).
