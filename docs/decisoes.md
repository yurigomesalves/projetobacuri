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

## ADR-015 — Dois tipos_crime para a violência colonial (caso Waimiri-Atroari)
- **Data**: 17/06/2026
- **Decisão (Yuri)**: ampliar o vocabulário fechado de `tipos_crime`
  (`eventos_geo`) com dois termos, motivados pelo aprofundamento do 1º Relatório
  do Comitê Estadual da Verdade do Amazonas ("O Genocídio do Povo
  Waimiri-Atroari"):
  1. **`grilagem_de_territorio_indigena`** — apropriação fraudulenta/forçada de
     terras indígenas (a "Grilagem Paulista" e o desmembramento de 526.800 ha da
     reserva em favor da mineração, p. 29–34 do relatório).
  2. **`apagamento_de_registros_e_testemunhos`** — ocultação deliberada da
     verdade: expulsão de pesquisadores e testemunhas, cassação de autorizações,
     perseguição de quem documentava os crimes (expulsão dos Schwade, de Baines e
     de Márcio Silva na Nova República, p. 65–73).
- **Justificativa**: o vocabulário derivado das graves violações nucleares da
  CNV não nomeava a dimensão colonial e a continuidade da violência por
  ocultação — classificá-las só como `violencia_contra_povos_indigenas`
  apagaria o que o próprio relatório identifica como invisibilização do povo
  pelo Estado. Mesmo critério do ADR-008. Os termos são reutilizáveis por outros
  eventos do acervo.
- **Impacto**: migração `0013_tipos_crime_invisibilizacao_indigena.sql`
  (aditiva, amplia o check; nenhum dado alterado); vocabulário do seed
  `pipeline/06_semear_curadoria.py` e `docs/taxonomia.md` (seção 6) atualizados.
  Etiquetagem do evento `violencia-waimiri-atroari` com os novos termos fica
  pendente da aplicação da migração no banco.

## ADR-016 — Naturalidade, período de atuação/perseguição, vínculos a organizações e camada de origem no mapa
- **Data**: 17/06/2026
- **Contexto**: para dar filtros às seções "Nomes e Histórias" e "Mapa" (filtros
  opcionais e aditivos; a tela abre com tudo), foram necessárias decisões
  semânticas sobre quatro conjuntos de dados novos: (a) naturalidade das vítimas;
  (b) período representado nas fichas; (c) vínculo documentado entre pessoas e
  organizações; (d) camada cartográfica de origem no mapa.
- **Decisão 1 — Naturalidade (`municipio_natal`/`uf_natal`)**: naturalidade =
  município de nascimento conforme fonte documental (certidão, depoimento à CNV,
  verbete acadêmico). É distinta do `municipio`/`uf` já existentes, que marcam o
  local do crime/morte/atuação. Quando a documentação indica só a cidade de
  criação ou há conflito, registrar o valor mais documentado e explicitar a
  ambiguidade no `texto_md` com fonte. Naturalidade desconhecida → `NULL`, nunca
  inferir por UF de atuação ou sobrenome. As coordenadas (`lat_natal`/`lng_natal`)
  derivam da tabela IBGE e representam a sede do município, nunca endereço preciso.
- **Decisão 2 — Período (`data_inicio`/`data_fim`)**: o par marca o **período de
  atuação/perseguição documentado** no contexto da ditadura, não datas de
  nascimento/morte. Vítimas: do primeiro ato de repressão documentado até
  morte/desaparecimento/retorno ou último registro. Perpetradores: do ingresso no
  órgão repressivo até desligamento ou última ação documentada. Organizações: da
  fundação até dissolução ou último registro. Isso torna o filtro de período útil
  para situar *quando o caso aconteceu*, evitando confusão com cronologia
  biográfica geral. Rótulo público do filtro: **"Período de atuação / perseguição"**.
  Data conhecida só pelo ano → `YYYY-01-01`/`YYYY-12-31`, com a aproximação
  registrada no `texto_md`. Extremo desconhecido → `NULL` (a interface trata como
  "sem limite nesse extremo").
- **Decisão 3 — Vínculos a organizações (`pessoa_organizacoes`)**: um vínculo só é
  registrado quando há fonte identificada independente do aparato repressivo — ou,
  quando proveniente de documento de inteligência (DOPS/DOI-CODI/SNI), corroborada
  por fonte independente. Esses documentos registravam como "membros" pessoas
  suspeitas sem base factual; reproduzir tais vínculos sem verificação replicaria a
  lógica persecutória do regime. `fonte_id` é obrigatório (mesmo critério do
  ADR-001 para marcadores). O campo `nota_vinculo` (o que a fonte afirma sobre o
  vínculo) é **obrigatório para perpetradores** (vínculo a órgão repressivo) e
  opcional para vítimas, onde o vínculo costuma já estar descrito no `texto_md`.
- **Decisão 4 — Camada de origem no mapa**: plota a cidade natal
  (`lat_natal`/`lng_natal`) das vítimas com ficha publicada, em camada **distinta e
  separada** da camada de eventos (local do crime). Fica **desligada por padrão**
  (o mapa abre mostrando os locais de repressão, informação primária do acervo); o
  usuário a ativa por escolha. O tooltip de cada ponto identifica "cidade natal de
  [nome] — origem da vítima, não o local do crime". A separação serve ao princípio
  6: permite ver de quais regiões o país teve seus filhos e filhas mortos e
  desaparecidos longe de casa — leitura relevante para a perspectiva classista e o
  colonialismo interno.
- **Impacto**:
  - Schema: migração `0014` em `supabase/migrations/` com `municipio_natal`,
    `uf_natal`, `lat_natal`, `lng_natal`, `data_inicio`, `data_fim` em `biografias`;
    nova tabela `pessoa_organizacoes` (pessoa, organização, `fonte_id` obrigatório,
    `trecho`/`paginas`/`nota_vinculo`) com validação de que a organização tem
    `tipo='organizacao'`; nova tabela de referência `municipios_ibge`. A migração
    deve importar a lista **atualizada** de `tipos_crime` (ADR-008/015), não o check
    antigo da 0006.
  - Proveniência de `municipios_ibge` (coordenadas da **sede**, decisão 1/4): fonte
    oficial IBGE **"Localidades do Brasil 2022"** — edição vigente do mesmo dataset,
    preferida ao cadastro de 2010 por já incluir os municípios criados depois de 2010
    (sem coordenada preenchida à mão). Carga pelo script idempotente
    `pipeline/09_semear_municipios_ibge.py`; 5.570 municípios, todos com coordenada.
  - Preenchimento das coordenadas de naturalidade nas biografias (decisão 1/4): a
    naturalidade (`municipio_natal`/`uf_natal`) é curadoria e vem dos JSONs em
    `pipeline/dados/curadoria/biografias/*.json`, gravada pelo
    `06_semear_curadoria.py` (que passou a persistir também `data_inicio`/`data_fim`).
    O script idempotente `pipeline/10_preencher_naturalidades.py` faz só a parte
    mecânica: casa município+UF com a `municipios_ibge` (ignorando acento/maiúscula;
    `(UF, nome)` desambigua) e grava `lat_natal`/`lng_natal` da **sede**. Não infere
    naturalidade (ADR proíbe): o que não casa é reportado como provável erro de grafia
    para a curadoria corrigir no JSON, e fica sem coordenada (nunca chuta a sede).
  - `docs/contrato-api.md`: novos campos em `BiografiaResumo`/`Biografia`; novos
    parâmetros de filtro em `GET /api/biografias`; período em `GET /api/eventos-geo`;
    novos endpoints `GET /api/biografias/facetas` e `GET /api/naturalidades` (camada
    de origem). Contrato antes do código (CLAUDE.md).
  - `docs/taxonomia.md`: semântica de `data_inicio`/`data_fim` e critérios de
    vínculo registrados. Rótulos de interface e nota de transparência ao usuário
    definidos nesta ADR.

## ADR-017 — Ingestão de vínculos pessoa↔organização e atuação em mais de um estado
- **Data**: 17/06/2026
- **Contexto**: as biografias de perpetradores estavam concentradas em poucos
  estados (RJ, SP, BA), cada uma presa a **uma única UF** (`uf`). O aparato
  repressivo era nacional e os mesmos agentes circulavam entre unidades de estados
  diferentes. A ADR-016 (decisão 3) projetou a tabela `pessoa_organizacoes` e o
  `docs/contrato-api.md` já definia a **saída** dos vínculos, mas faltava o **lado
  da ingestão** — nenhum script populava a tabela e não havia formato de curadoria.
- **Decisão (Yuri)**: representar a atuação de um perpetrador em **mais de um
  estado** **via vínculos a organizações** (a UF vem da organização), sem migração
  nova. Adicionar novos perpetradores ampliando a cobertura geográfica; primeiro
  lote: **Pernambuco**.
- **Formato de entrada** (bloco opcional na biografia JSON de curadoria), lido pelo
  `pipeline/06_semear_curadoria.py`:
  ```json
  "organizacoes": [
    { "slug": "<biografia tipo=organizacao>", "fonte_id": "<uuid>",
      "paginas": "...", "trecho": "...", "secao": "...", "nota_vinculo": "..." }
  ]
  ```
  `fonte_id`/`paginas`/`trecho` obrigatórios (princípio 3); `nota_vinculo`
  **obrigatória quando a pessoa é `perpetrador`** (espelha a constraint da migração
  0014). Os vínculos são gravados num **segundo passo** do seed (após o upsert de
  todas as biografias, para os ids das organizações já existirem) e de forma
  **idempotente** (regrava as linhas da própria pessoa).
- **Organização = `tipo: "organizacao"`**: a FK composta de `pessoa_organizacoes`
  exige `organizacao_tipo = 'organizacao'`. As novas unidades repressivas (ex.:
  DOPS-PE, DOI-CODI/IV Exército) entram com esse tipo. As unidades antigas gravadas
  como `tipo: "local"` (`doi-codi-sp`, `dops-mg`) **não** servem de alvo de vínculo
  enquanto forem `local`; sua reconciliação fica como **item futuro**, fora deste lote.
- **Impacto**: `pipeline/06_semear_curadoria.py` (validação + segundo passo de
  vínculos); novos JSONs de curadoria em `pipeline/dados/curadoria/biografias/`;
  nota de formato de entrada no `docs/contrato-api.md`. Sem migração de banco.
  Perpetradores entram como `status_curadoria: "rascunho"` (ADR-013) — não aparecem
  na API pública até revisão humana.

## ADR-018 — Dirigentes do regime: responsabilidade político-institucional vs. autoria direta
- **Data**: 22/06/2026
- **Decisão (Yuri)**: incluir presidentes e ministros militares da Ditadura
  (1964–1985) como `tipo: "perpetrador"`, fundamentados exclusivamente no
  Capítulo 16, Seção A do Relatório da CNV ("Responsabilidade político-institucional
  pela instituição e manutenção de estruturas e procedimentos destinados à prática de
  graves violações de direitos humanos"). Escopo definido pela lista numerada da
  própria fonte — 26 figuras (8 presidentes/junta + 18 ministros militares).
- **Distinção obrigatória**: a Seção A da CNV enquadra essas figuras no plano da
  **responsabilidade político-institucional** (conceber, planejar ou decidir políticas
  de repressão), distinta da **autoria direta** (Seção C). A linguagem das fichas
  deve refletir exatamente esse enquadramento — fórmulas como "a CNV classificou no
  plano da responsabilidade político-institucional", "segundo o Cap. 16 da CNV" —
  sem atribuir autoria direta não documentada nesta seção e sem adjetivos avaliativos.
- **Fontes**: estrito ao Cap. 16 / Vol. III da CNV. Dados biográficos externos entram
  só na prosa (não como `trecho` de fonte). Vínculo institucional descrito em prosa;
  array `organizacoes` omitido neste lote (sem fichas de Presidência/ministérios).
- **Ministros civis da Justiça**: ficam fora do escopo. O próprio §8 da Seção A
  registra que Gama e Silva e Buzaid "não tinham controle efetivo e operacional sobre
  a estrutura repressiva" — a CNV não os inclui na lista numerada de autores.
- **Grafia canônica**: segue o Cap. 16 (ADR-014), ex.: "Castello Branco" (dois L).
- **Impacto**: JSONs em `pipeline/dados/curadoria/biografias/`; todos entram como
  `rascunho` (ADR-013); extend o padrão de perpetrador estabelecido no lote RS
  (vínculo em prosa, sem nova migração).

## ADR-019 — Categoria "Território de origem" para vítimas indígenas no mapa
- **Data**: 24/06/2026
- **Contexto**: a camada de origem do mapa (ADR-016, decisão 4) plota a **cidade
  natal cartorial** das vítimas (`lat_natal`/`lng_natal`, derivada de
  `municipios_ibge`). Vítimas indígenas raramente têm naturalidade municipal
  registrada — o Estado não as inscrevia em cartório, e sua origem não é uma sede de
  município, e sim o território de um povo. Resultado: essas vítimas ficavam
  **fora da camada de origem**, um apagamento cartográfico que contraria o princípio
  6 e a visibilidade que o próprio acervo deu ao tema indígena (ADR-003, ADR-015).
- **Decisão (Yuri)**:
  1. Criar a categoria **"Território de origem"** (rótulo fixo; não "região de
     origem"), com camada de mapa própria **"Territórios de origem (povos
     indígenas)"**, **desligada por padrão** (como a camada de naturalidade).
  2. Referência geográfica primária: **polígonos oficiais de Terras Indígenas da
     FUNAI** (dado público aberto), casados pelo `terra_indigena_codigo`.
  3. **Fallback circular** quando não houver TI oficial homologada para o povo:
     o curador fornece `geometria_origem_ponto` `[lat, lng]` + `geometria_origem_raio_km`,
     convertidos num polígono circular aproximado.
  4. **Modelo de foco indígena, extensível**: a estrutura (povo + território oficial
     OU área aproximada) atende a outras origens territoriais aproximadas no futuro
     **sem nova migração**.
- **Justificativa historiográfica**: a violência da ditadura contra os povos
  indígenas tem **dimensão territorial** — grilagem, desmembramento de reservas,
  remoção forçada para abrir caminho a grandes obras e à fronteira agromineral
  (ver `tipo_crime` `grilagem_de_territorio_indigena`, ADR-015). Um ponto de cidade
  natal não captura essa dimensão; o território, sim. A decisão é coerente com o
  tratamento de primeira classe que a CNV (capítulo específico) e os comitês
  estaduais deram ao tema, já refletido nas ADR-003 e ADR-015.
- **Ressalva de transparência (obrigatória no tooltip)**: a TI é **referência
  aproximada e contemporânea** — os limites homologados hoje **não** equivalem ao
  território tradicional em 1964–1985 (em geral mais extenso e em disputa), **não**
  afirmam local exato de nascimento da pessoa, e indicam a **origem territorial do
  povo**, não a posição do indivíduo no período. Texto integral em
  `docs/taxonomia.md`, seção 8.3.
- **Impacto**:
  - **Schema**: novos campos em `biografias` (`povo_origem`, `terra_indigena_codigo`,
    `terra_indigena_nome`, `geometria_origem_ponto`, `geometria_origem_raio_km`) e
    nova tabela de referência `terras_indigenas` (polígonos FUNAI), em nova migração.
  - **Pipeline**: novo script de carga dos polígonos FUNAI (script 11) e novo script
    idempotente de casamento/geração de geometria de origem nas biografias — TI
    oficial pelo código, fallback circular pelo ponto+raio (script 12). O que não
    casar é reportado para a curadoria, nunca chutado.
  - **API**: novo endpoint `GET /api/territorios-origem` (camada do mapa); atualizar
    `docs/contrato-api.md` antes do código (CLAUDE.md).
  - **Frontend**: nova camada no mapa com toggle próprio, desligada por padrão, com
    a ressalva de transparência no tooltip de cada território.
  - **Curadoria/taxonomia**: seção 8.3 da taxonomia; guia de preenchimento nos JSONs
    de `pipeline/dados/curadoria/biografias/`. O marcador `indigena` (6.2) permanece
    obrigatório e independente.

## ADR-020 — Busca híbrida permanece experimental após empate no conjunto-ouro
- **Data**: 09/09/2026
- **Contexto**: a recuperação vetorial encontrou 13 das 32 unidades de evidência
  esperadas no top 8. Foi implementada uma alternativa híbrida que combina busca
  textual em português e vetorial por Reciprocal Rank Fusion, sem alterar as
  perguntas, o modelo de embedding ou o limite de resultados.
- **Decisão técnica**: manter a rota pública `/api/chat` na RPC vetorial
  `buscar_chunks`. A RPC `buscar_chunks_hibrida` permanece disponível somente para
  avaliação e desenvolvimento.
- **Justificativa**: as duas estratégias encontraram 13/32 evidências e acertaram
  ao menos uma evidência em 13/24 perguntas. A híbrida não produziu ganho agregado
  e deslocou as evidências de P01 e P05 da posição 1 para a posição 4.
- **Salvaguarda**: não escolher pesos a partir das 24 perguntas visíveis. Uma nova
  promoção exige ganho em perguntas reservadas, sem perda editorial relevante.
- **Registro**: `docs/avaliacao/comparacao-busca-hibrida-2026-09-09.md`.

## ADR-021 — Tabelas de eventos e territórios acessíveis somente pelo servidor
- **Data**: 09/09/2026
- **Decisão (Yuri)**: ativar RLS em `eventos_geo`, `evento_fontes`,
  `evento_marcadores`, `evento_justica_fontes`, `evento_vitimas` e
  `terras_indigenas`, sem políticas de acesso direto para `anon` ou
  `authenticated`.
- **Justificativa**: o navegador usa Supabase somente para autenticação. Os dados
  passam pelas APIs do servidor com `service_role`, onde são aplicados os filtros
  editoriais. O acesso direto anterior permitia contornar esses filtros e expunha
  permissões de escrita aos papéis públicos.
- **Impacto**: a migração 0025 remove a antiga política ampla de `eventos_geo` e
  fecha as seis tabelas. As duas APIs públicas foram testadas após a aplicação e
  responderam HTTP 200. Auditoria em `docs/auditorias/seguranca-rls-2026-09-09.md`.

## ADR-022 — Cobertura das chaves estrangeiras com índices aditivos
- **Data**: 09/09/2026
- **Decisão (Yuri)**: criar os 12 índices de cobertura indicados pelo advisor do
  Supabase nas tabelas de citações, marcadores, biografias, convites, eventos,
  feedbacks e vínculos entre pessoas e organizações.
- **Justificativa**: embora as tabelas ainda sejam pequenas, os índices evitam
  varreduras completas em consultas e na manutenção da integridade referencial à
  medida que o acervo cresce.
- **Impacto**: a migração 0026 é somente aditiva e não alterou contagens. O alerta
  `unindexed_foreign_keys` foi eliminado. Índices simples possivelmente redundantes
  permanecem até haver dados de uso suficientes para decidir sobre sua remoção.
- **Registro**: `docs/auditorias/indices-chaves-estrangeiras-2026-09-09.md`.

## ADR-023 — Próxima recuperação deve decompor e diversificar consultas
- **Data**: 09/09/2026
- **Contexto**: as 12 evidências ausentes no top 50 estão indexadas, têm conteúdo
  pertinente e similaridade acima do limiar 0,82, mas ficam além da posição 500.
  Os embeddings Python e JavaScript também foram confirmados como equivalentes.
- **Decisão técnica**: não baixar o limiar nem ampliar o top-k para centenas. A
  próxima experiência deve avaliar decomposição de perguntas compostas, diversidade
  de fontes e reranqueamento de candidatos.
- **Salvaguarda**: escolher arquitetura e parâmetros com perguntas reservadas, sem
  otimizar sobre as 24 perguntas visíveis do conjunto de desenvolvimento.
- **Registro**: `docs/avaliacao/auditoria-evidencias-fora-top50-2026-09-09.md`.

## ADR-024 — Descartar o primeiro reranqueador e priorizar busca dentro da fonte
- **Data**: 09/09/2026
- **Contexto**: o modelo bilíngue
  `unicamp-dl/mMiniLM-L6-v2-en-pt-msmarco-v2` foi testado sobre 314 candidatos,
  com as 12 evidências difíceis deliberadamente incluídas para medir o teto de
  ordenação. Nenhuma evidência chegou ao top 8.
- **Decisão técnica**: não integrar esse reranqueador. Manter a busca pública
  inalterada e conduzir a próxima experiência com seleção vetorial de fontes,
  busca textual restrita a cada fonte e decomposição das perguntas compostas.
- **Evidência**: a fonte correta já aparece no top 50 vetorial em 9 de 10 pares
  únicos pergunta–fonte. Dentro da fonte correta, a seleção textual colocou 10/12
  evidências no top 50 e oito nas primeiras 21 posições.
- **Pendência editorial**: P24 não nomeia Ismene, embora exija duas evidências desse
  relatório. O item deve receber histórico explícito ou ser dividido antes da
  avaliação reservada; o conjunto-ouro não foi alterado automaticamente.
- **Implementação experimental**: após autorização de Yuri, a migração 0027 criou
  a RPC `buscar_chunks_textuais_por_fontes`, executável somente por `service_role`.
  Na implementação PostgreSQL, com a fonte correta fornecida, 9/12 evidências
  ficaram no top 50 e 10/12 no top 100. Esse teto não mede roteamento automático.
- **Registro**:
  `docs/avaliacao/reranqueador-e-roteamento-por-fonte-2026-09-09.md`.

## ADR-025 — Roteamento automático melhora cobertura, mas ainda gera candidatos demais
- **Data**: 09/09/2026
- **Contexto**: a primeira etapa vetorial selecionou automaticamente documentos e
  a RPC da migração 0027 pesquisou os trechos dentro deles, sem injetar as fontes
  esperadas.
- **Resultado**: a cobertura do conjunto candidato subiu de 20/32 (62,5%) para
  28/32 (87,5%). Reduzir de 15 fontes × 100 trechos para 13 × 60 preservou a
  cobertura e baixou a média das perguntas difíceis de 1.197,3 para 719,3
  candidatos.
- **Decisão técnica**: manter a estratégia apenas para avaliação. O volume ainda é
  alto e não há ordenação final validada para oito trechos.
- **Próximo critério**: testar decomposição para P17 e P23 e resolver a falta de
  contexto de P24; qualquer configuração final deve ser verificada em perguntas
  reservadas.
- **Registro**:
  `docs/avaliacao/roteamento-automatico-fontes-2026-09-09.md`.

## ADR-026 — Decomposição curada define teto, não desempenho validado
- **Data**: 09/09/2026
- **Contexto**: foram formuladas subconsultas específicas após a leitura das
  respostas e evidências aprovadas para P14–P18, P23 e P24.
- **Resultado**: o conjunto candidato alcançou 32/32 evidências, com média de
  232,4 candidatos nas sete perguntas difíceis, contra 28/32 e média de 719,3 no
  roteamento 13 × 60 sem decomposição.
- **Decisão metodológica**: registrar o resultado somente como teto curado. As
  consultas tiveram acesso ao gabarito e não podem justificar promoção para a
  busca pública.
- **Critério de passagem**: gerar subconsultas sem gabarito, avaliar em perguntas
  reservadas e validar a ordenação final em até oito trechos.
- **Pendências editoriais**: explicitar o contexto de P24 e reexaminar a
  segmentação/âncora de P17 antes do teste reservado.
- **Registro**: `docs/avaliacao/decomposicao-curada-2026-09-09.md`.
- **Implementação experimental**: após autorização de Yuri, a migração 0027 criou
  a RPC restrita `buscar_chunks_textuais_por_fontes`. A validação no PostgreSQL,
  ainda com a fonte correta fornecida ao teste, encontrou 9/12 evidências no top
  50 e 10/12 no top 100. A rota pública não foi alterada.

## ADR-027 — Separar ausência de registro e crítica do inquérito de Ismene
- **Data**: 09/09/2026
- **Decisão (Yuri)**: manter P24 como pergunta geral, apoiada somente na página 350
  do Volume I da CNV, e criar P31 para avaliar as lacunas do inquérito policial no
  caso Ismene Mendes, apoiada em C20-24 e C39-42.
- **Justificativa**: a formulação anterior exigia evidências de Ismene sem nomear o
  caso. A divisão remove esse contexto implícito e permite avaliar separadamente
  detenções clandestinas e crítica documental.
- **Impacto**: o conjunto-ouro passa de 24 para 25 perguntas e mantém as mesmas 32
  unidades de evidência. P25–P30 continuam reservadas e não foram renumeradas.
- **Medição após a decisão**: vetorial e híbrida recuperaram 15/32 evidências no
  top 8; o diagnóstico vetorial encontrou 22/32 no top 50; o roteamento em duas
  etapas chegou a 29/32; e a decomposição curada chegou a 31/32. P15/E350 ficou
  fora porque a CNV Volume I não foi selecionada como fonte candidata.
- **Registro**:
  `docs/avaliacao/proposta-revisao-p17-p24-2026-09-09.md`.

## ADR-028 — Aprovar lote conversacional P25–P30
- **Data**: 10/09/2026
- **Decisão (Yuri)**: aprovar seis testes separados para continuidade de conversa,
  privacidade, pedido de esclarecimento e resistência à fabricação de citações.
- **Separação metodológica**: P25–P30 não alteram o recall das 25 perguntas factuais;
  avaliam comportamento e uso do histórico em uma rubrica própria.
- **Execução autorizada**: uma rodada de seis chamadas ao chat pelo OpenRouter, com
  teto total de US$ 0,10. O ambiente usa `deepseek/deepseek-v4-flash-0731` e limite
  de 2.048 tokens de saída por chamada.
- **Registro**: `docs/avaliacao/proposta-revisao-p25-p30-2026-09-10.md`.

## ADR-029 — Proteger contatos pessoais antes da recuperação
- **Data**: 10/09/2026
- **Contexto**: na primeira execução de P28, o modelo recusou confirmar um contato
  atual, mas reproduziu números pessoais presentes em um documento de 2014.
- **Decisão técnica e editorial**: pedidos explícitos de contato pessoal recebem
  resposta determinística sem busca nem LLM. Telefones e e-mails também são
  ocultados dos chunks, do prompt, das citações e da resposta.
- **Comportamentos relacionados**: referentes sem antecedente e ordens para fabricar
  citação também são tratados antes da busca. Continuações válidas combinam a última
  pergunta do usuário com a mensagem atual para a recuperação.
- **Resultado**: P28–P30 foram aprovadas na segunda rodada; P25–P27 ficaram parciais.
  A rota pública mantém a exigência de base documental para respostas factuais.
- **Remediação**: Yuri autorizou substituir o telefone da primeira interação de
  P28 por `[contato pessoal omitido]`. A atualização foi enviada, mas a confirmação
  remota ficou pendente porque as consultas seguintes à tabela expiraram.
- **Registro**: `docs/avaliacao/avaliacao-conversacional-2026-09-10.md`.

## ADR-030 — Continuidade documental por token assinado
- **Data**: 14/09/2026
- **Decisão (Yuri)**: aprovar CF01–CF06 como casos de desenvolvimento e implementar
  a experiência local de continuidade documental, sem chamada paga, migração,
  commit ou deploy nesta autorização.
- **Transporte**: o servidor emite token opaco, assinado, válido por 30 minutos e
  contendo somente versão, tempos, nonce e até oito fontes efetivamente citadas.
  O navegador o mantém apenas em memória. IDs de fonte livres e `interacao_id` não
  são aceitos como prova da trilha anterior.
- **Recuperação experimental**: manter a busca vetorial e o limiar 0,82; em
  seguimentos válidos, acrescentar busca textual restrita às fontes do token.
  Filtrar candidatos por termos substantivos, ordenar cada ramo separadamente e
  intercalar por posição, começando pelo vetor, sem comparar ou somar os escores.
- **Parâmetros congelados**: até oito fontes, quatro candidatos textuais por fonte,
  ao menos dois termos substantivos distintos e oito trechos finais.
- **Privacidade e falhas**: o token não contém conversa ou identidade, não é salvo
  no navegador e não permite consultar interação. Token inválido/expirado recua
  silenciosamente à busca geral. Telefones e e-mails continuam omitidos.
- **Limite metodológico**: CF01–CF06 reutilizam evidências conhecidas e não validam
  generalização. Uma eventual promoção exige outro lote após o congelamento.
- **Registro**: `docs/avaliacao/decisao-pendente-continuidade-2026-09-14.md` e
  `docs/avaliacao/revisao-tecnica-continuidade-2026-09-14.md`.


## ADR-032 — Distinguir compilação documental e fixar a identidade na ingestão
- **Data**: 05/10/2026. **Estado**: migração 0033 e atualização dos dois campos aplicadas após autorização explícita de Yuri; banco, catálogo, integridade dos chunks e APIs conferidos.
- **Decisão editorial**: adicionar `compilacao_documental`; no Dossiê de
  Familiares/IEVE, manter `confiabilidade: alta`, sem validar automaticamente
  todo o conteúdo. A nota de contexto e a crítica por trecho são obrigatórias.
- **Identidade**: o livro de 762 páginas é distinto da síntese de 16 páginas.
  Catálogo e manifesto usam o PDF completo, o hash conferido e o UUID existente
  `efc10a75-5cf4-435e-a598-7abf57f88ff7`. Data sem precisão comprovada e licença
  não demonstrada permanecem nulas; autoria não é inferida da hospedagem estatal.
- **Ingestão**: seleção ambígua por URL deve interromper o processo; UUID fixado
  exige correspondência com os metadados e o hash. O indexador individual tem
  diagnóstico como padrão; substituir chunks exige opção explícita e autorização.
- **Limites**: sem reindexação, fusão ou exclusão do registro vazio duplicado,
  promoção do candidato ou validação científica do corpus nesta fase.
- **Registro**: `docs/avaliacao/decisao-classificacao-dossie-2026-10-05.md` e
  `docs/avaliacao/implementacao-classificacao-dossie-2026-10-05.md`.
