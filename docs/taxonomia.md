# Taxonomia e Vocabulário Controlado — Projeto Bacuri

> Documento de referência do Curador para classificação de fontes, chunks, biografias
> e eventos do acervo. Toda classificação automática (IA, no pipeline) deve ser
> auditável a partir destas categorias. Mudanças aqui exigem atualização retroativa
> de metadados já gravados (registrar em `docs/decisoes.md`).

## 1. Princípios que orientam a taxonomia
- Nenhuma fonte é "neutra" — toda fonte tem proveniência, contexto de produção e
  nível de confiabilidade que devem ser explícitos ao usuário (princípio 1 e 3 do CLAUDE.md).
- A imprensa de 1964–1985 operou sob censura prévia e, em vários veículos, com
  adesão editorial ao regime: é **objeto de crítica documental**, não autoridade
  factual. Isso se reflete no campo `confiabilidade` e é obrigatório constar
  `nota_contexto` em toda citação proveniente de imprensa do período.
- Negacionismo histórico não é classificado como "opinião" ou "fonte alternativa":
  é tratado como objeto a ser refutado com documento, nome e data — nunca indexado
  como fonte do acervo positivo (ver seção 7).
- A classificação de violações segue a tipologia da CNV. Vítimas e eventos devem
  poder ser cruzados com classe social, raça/cor, gênero, orientação sexual,
  nacionalidade/origem regional e organização de pertencimento, para tornar visível
  que a repressão não atingiu todos os corpos da mesma forma.

---

## 2. `tipo_fonte` (campo obrigatório em `fontes` e em `Citacao.tipo_fonte`)

| valor | descrição | confiabilidade padrão |
|---|---|---|
| `relatorio_oficial` | Relatórios de comissões da verdade (CNV, CEMDP, comissões estaduais/municipais), órgãos públicos pós-redemocratização | `alta` |
| `documento_repressao` | Documentos produzidos pelos próprios órgãos de repressão (DOPS, DOI-CODI, SNI, CISA, CENIMAR, Polícia Federal, processos do STM/BNM) | `alta_como_evidencia_de_autoria` — autêntico quanto à autoria/intenção do órgão, mas o **conteúdo factual sobre a vítima é hostil/distorcido por definição** e deve ser contextualizado |
| `documento_inteligencia_estrangeira` | Documentos desclassificados de governos estrangeiros (CIA, Departamento de Estado dos EUA, FRUS, National Security Archive) | `media_alta` — boa qualidade informativa, mas reflete interesses geopolíticos do país de origem; contextualizar |
| `imprensa_epoca` | Jornais e revistas publicados entre 1964–1985 (incluindo imprensa alternativa/clandestina) | `baixa_factual_alta_documental` — ver subcategorias abaixo |
| `producao_academica` | Artigos (SciELO etc.), teses/dissertações (BDTD, CAPES), livros acadêmicos | `alta` (verificar revisão por pares e licença) |
| `testemunho` | Depoimentos de vítimas, familiares, militantes, ex-agentes — coletados por comissões, projetos de história oral, ou publicados em livros de memória | `alta_como_relato_subjetivo` — valor probatório e histórico mas é relato em primeira pessoa, sujeito a memória, trauma e tempo decorrido; nunca tratado como "a versão oficial dos fatos", e sim como fonte legítima e central |
| `legislacao_decisao_judicial` | Leis, decretos, sentenças (ex.: Corte IDH, caso Gomes Lund; ADPF 153) | `alta` — uso restrito ao módulo "crimes e justiça", sempre com `revisado_por_humano: true` |
| `material_didatico_educativo` | Conteúdo já curado/sintetizado para fins de ensino (ex.: textos de museus, ONGs de memória e outras iniciativas educativas) | `media` — **fonte citável** pelo bot (decisão ADR-004), com citação completa (instituição, título, link); quando possível, preferir citar também a fonte primária que o material referencia |

### 2.1 Subcategorias de `imprensa_epoca` (campo `subtipo`)
- `grande_imprensa_alinhada` — veículos que apoiaram/legitimaram o regime (ex.:
  editoriais de apoio ao golpe e à "revolução"). Confiabilidade factual: `baixa`.
- `grande_imprensa_censurada` — veículos sob censura prévia, sem alinhamento
  editorial claro; o que foi publicado pode refletir o que a censura permitiu, não
  o que ocorreu. Confiabilidade factual: `baixa`.
- `imprensa_alternativa_resistencia` — periódicos da resistência, clandestinos ou
  semiclandestinos (Opinião, Movimento, O Pasquim, imprensa sindical/estudantil).
  Confiabilidade factual: `media` (também produzida sob risco e censura, mas com
  intenção declarada de denúncia); valor documental `alto`.
- Em todos os casos, `nota_contexto` é obrigatória e deve mencionar: nome do
  veículo, data, e o fato de a imprensa operar sob Lei de Imprensa (5.250/67),
  AI-5 e censura prévia — quando aplicável ao período da publicação.

---

## 3. `confiabilidade` (campo em `fontes`)
Vocabulário fechado: `alta` | `media_alta` | `media` | `baixa` |
`alta_como_evidencia_de_autoria` | `alta_como_relato_subjetivo` |
`baixa_factual_alta_documental`

Este campo nunca deve ser usado para hierarquizar "verdade" entre testemunho e
documento oficial — ambos podem ter confiabilidade alta, mas respondem perguntas
diferentes (o testemunho conta o vivido; o documento oficial certifica/reconhece).
A confiabilidade `baixa` da imprensa diz respeito a **factualidade dos fatos
reportados no calor da censura**, não ao valor do periódico como objeto histórico.

---

## 4. Vocabulário controlado — Órgãos e estruturas da repressão (`orgao_repressor`)

| sigla | nome completo | observação |
|---|---|---|
| DOI-CODI | Destacamento de Operações de Informações – Centro de Operações de Defesa Interna | Principal aparelho de repressão e tortura nos grandes centros |
| DOPS | Departamento de Ordem Política e Social | Polícia política estadual |
| SNI | Serviço Nacional de Informações | Órgão central de inteligência do regime |
| CISA | Centro de Informações de Segurança da Aeronáutica | Inteligência da Aeronáutica |
| CENIMAR | Centro de Informações da Marinha | Inteligência da Marinha |
| CIE | Centro de Informações do Exército | Inteligência do Exército |
| DOI | Destacamento de Operações de Informações | Quando citado isoladamente (sem CODI) |
| OBAN | Operação Bandeirante | Antecessora do DOI-CODI/SP, financiada por empresários |
| PE | Polícia do Exército | — |
| EsPara / DOPS estaduais específicos | (registrar nome completo conforme documento) | Padronizar `orgao_normalizado` pela grafia **mais usada** na historiografia e nos acervos (ex.: DOPS; DEOPS/SP quando for a forma consagrada para São Paulo) — decisão ADR-002 |

> Regra: ao classificar um documento de inteligência/repressão, registrar o órgão
> EXATAMENTE como consta no documento e, se identificável, o órgão na nomenclatura
> padronizada acima (campo `orgao_normalizado`).

---

## 5. Vocabulário controlado — Organizações de resistência (`organizacao`)
Lista não exaustiva, a expandir conforme ingestão (cada item deve ter
minibiografia em `biografias`, `tipo: organizacao`):

- ALN (Ação Libertadora Nacional)
- VPR (Vanguarda Popular Revolucionária)
- VAR-Palmares (Vanguarda Armada Revolucionária Palmares)
- MR-8 (Movimento Revolucionário 8 de Outubro)
- POLOP (Organização Revolucionária Marxista – Política Operária)
- PCB (Partido Comunista Brasileiro)
- PC do B (Partido Comunista do Brasil) — protagonista da Guerrilha do Araguaia
- Ligas Camponesas
- AP (Ação Popular)
- Movimento estudantil (UNE e diretórios — registrar organização específica quando
  identificável)
- Comunidade Eclesial de Base / setores da Igreja Católica ligados à Teologia da
  Libertação
- Organizações sindicais (registrar sindicato/categoria específica)
- Organizações de luta indígena e camponesa atingidas por violência rural (ex.:
  conflitos de terra na Amazônia e Araguaia — registrar etnia/comunidade quando
  aplicável)

> Atenção: a CNV documenta também violações contra povos indígenas (ex.: povo
> Waimiri-Atroari) que não eram "organizações de resistência política" no sentido
> partidário, mas vítimas de violência de Estado associada a projetos
> desenvolvimentistas da ditadura. Classificar como `tipo_evento` próprio (ver 6.3),
> não forçar em "organização armada".

### 5.1 Vínculo pessoa↔organização (`pessoa_organizacoes`) — ADR-016
Tabela que liga uma pessoa (`biografias`) a uma organização (`biografias` com
`tipo: organizacao`). Critério **estrito**: o vínculo só é registrado com `fonte_id`
identificada (ADR-001) e independente do aparato repressivo — ou, se proveniente de
documento de inteligência (DOPS/DOI-CODI/SNI), corroborada por fonte independente.
Esses documentos rotulavam como "membros" pessoas apenas suspeitas; reproduzir tais
vínculos sem verificação replicaria a lógica persecutória do regime. O campo
`nota_vinculo` (o que a fonte afirma sobre o vínculo, e o que não permite concluir)
é **obrigatório para perpetradores** (vínculo a órgão repressivo) e opcional para
vítimas, onde o vínculo costuma já estar descrito no `texto_md`.

---

## 6. Tipologia de graves violações (conforme CNV) — campo `tipo_crime` (lista, em `eventos_geo`)

Vocabulário fechado, baseado na nomenclatura da CNV:
- `prisao_ilegal_arbitraria`
- `tortura`
- `execucao_sumaria`
- `desaparecimento_forcado`
- `ocultacao_de_cadaver`
- `violencia_sexual` — categoria que a própria CNV reconheceu como subnotificada;
  manter mesmo com poucos registros iniciais, sinalizando a lacuna documental
  como dado histórico relevante, não como ausência a esconder
- `violencia_contra_povos_indigenas` — para casos como Waimiri-Atroari e outros
  documentados pela CNV (capítulo específico do relatório). **Decisão ADR-003:**
  esses eventos terão **camada própria no mapa** (Leaflet), separada dos casos
  individuais urbanos, permitindo representar territórios/comunidades e não
  apenas pontos
- `perseguicao_exilio_banimento`
- `censura` — quando o evento documentado é um ato de censura (jornal, livro,
  obra) e não violência física direta
- `atentado_a_populacao_civil` — atentados (a bomba ou similares) cometidos por
  agentes do Estado contra a população, como o caso do Riocentro (1981).
  **Decisão ADR-008 (12/06/2026):** termo criado porque o vocabulário original,
  derivado das graves violações nucleares da CNV, não classificava corretamente
  esse tipo de evento — usar `tortura` como aproximação seria factualmente
  incorreto
- `grilagem_de_territorio_indigena` — apropriação fraudulenta ou forçada de
  terras indígenas (títulos forjados, desmembramento de reservas em favor de
  empresas), como a "Grilagem Paulista" sobre o território Waimiri-Atroari
  documentada pelo Comitê Estadual da Verdade do Amazonas. **Decisão ADR-015
  (17/06/2026).**
- `apagamento_de_registros_e_testemunhos` — ocultação deliberada da verdade
  sobre as violações: expulsão de pesquisadores e testemunhas, cassação de
  autorizações, destruição ou supressão de registros, perseguição de quem
  documentava os crimes. No caso Waimiri-Atroari, a continuidade do genocídio
  "por outros meios" na Nova República (expulsão dos Schwade, de Baines e de
  Márcio Silva). **Decisão ADR-015 (17/06/2026).**

### 6.1 Campo `status_caso` (em `BlocoJustica`, módulo crimes e justiça)
- `nao_investigado`
- `investigado_sem_punicao` (caso típico sob a Lei da Anistia/ADPF 153)
- `reconhecido_pela_cnv_sem_responsabilizacao_penal`
- `condenacao_corte_internacional` (ex.: Caso Gomes Lund, Corte IDH 2010)
- `em_tramitacao`

### 6.2 Marcadores de interseccionalidade (campo `marcadores`, lista, em `biografias` de vítimas e em `eventos_geo`)
Campo central para a perspectiva classista e suas intersecções (princípio 6).
Preencher **somente com base em fonte documentada** (CNV, biografia publicada,
testemunho) — nunca inferir.

- `classe_trabalhadora` / `campesinato` / `classe_media` (origem de classe quando
  documentada e relevante ao caso — ex.: perseguição sindical)
- `negro` / `indigena` (autodeclaração ou classificação de fonte
  histórica — registrar a fonte da classificação, tema sensível e historicamente
  invisibilizado nos registros oficiais da época). **`negro` agrega pretos e
  pardos** (critério do IBGE para população negra); não há marcador `pardo`
  separado.
- `mulher` — atenção a violência de gênero específica (ver `violencia_sexual`)
- `lgbt` — perseguição associada a orientação sexual/identidade de gênero,
  frequentemente dupla invisibilização (nem sempre nomeada nos documentos da época
  como tal; usar apenas quando há base documental ou testemunho explícito)
- `estrangeiro_imigrante` — vítimas não-brasileiras ou refugiados de outras
  ditaduras do Cone Sul (Operação Condor)
- `estudante` / `religioso_a` / `militar_oposicao` / `jornalista` / `advogado_a`
  (ocupação/papel social relevante ao caso)

> **Decisão do Yuri (11/06/2026): `marcadores` é campo PÚBLICO**, exibido nas
> biografias e eventos. Em razão disso, a regra de base documental acima é
> reforçada: cada marcador exibido deve citar a fonte da classificação
> (CNV, biografia publicada, testemunho), linha a linha — especialmente para
> raça e orientação sexual de pessoas reais com familiares vivos.

### 6.3 `tipo_evento` (para `eventos_geo`, quando o evento não é um caso individual)
- `caso_individual` — prisão/tortura/morte/desaparecimento de pessoa(s) nomeada(s)
- `operacao_repressiva` — ação coletiva (ex.: Operação Bandeirante, sequestros em
  massa de estudantes)
- `guerrilha_confronto` — ações da Guerrilha do Araguaia e similares
- `violencia_institucional_coletiva` — violência contra comunidades/povos
  (Waimiri-Atroari, remoções forçadas associadas a grandes obras)
- `ato_censura` — apreensão de jornal, livro, peça, show

---

## 7. Negacionismo — tratamento (não é categoria do acervo positivo)
Conteúdo negacionista (ex.: relativização de tortura, "ditabranda", revisão do
número de mortos sem base documental) **não recebe `tipo_fonte` do acervo** e não
é indexado como fonte recuperável pelo RAG. Quando o usuário perguntar algo
formulado em termos negacionistas, a resposta do bot deve:
1. Não validar a premissa como "um lado do debate";
2. Responder com documento, nome, data e número de página da fonte que contradiz
   a afirmação (ex.: Relatório CNV vol. I, capítulo de conclusões, p. X).

Se for necessário registrar UMA citação negacionista para fins de contraponto
pedagógico explícito (ex.: trecho de editorial de 1968 que será criticado no texto
da biografia), usar `tipo_fonte: imprensa_epoca`, `subtipo: grande_imprensa_alinhada`,
e a `nota_contexto` deve deixar claro que o trecho é objeto de crítica, citando a
fonte que o desmente.

---

## 8. Período e periodização (campo `periodo`, opcional em `eventos_geo` e `fontes`)
Vocabulário sugerido (alinhar com a periodização usada no relatório CNV):
- `1964` (golpe e primeiros atos)
- `1964-1968` (governos Castelo Branco/Costa e Silva, antes do AI-5)
- `1968-1974` (AI-5, "anos de chumbo", auge da repressão — Médici)
- `1974-1979` (Geisel, "abertura lenta")
- `1979-1985` (Figueiredo, Lei da Anistia, redemocratização)
- `pos_1985` (para documentos de comissões da verdade, julgamentos, memória)

### 8.1 Período nas biografias (`data_inicio`/`data_fim`) — ADR-016
Diferente do `periodo` textual acima (eventos/fontes), as fichas em `biografias`
ganham um par de datas que marca o **período de atuação/perseguição documentado** no
contexto da ditadura — **não** datas de nascimento/morte. Vítimas: do primeiro ato de
repressão documentado até morte/desaparecimento/retorno ou último registro.
Perpetradores: do ingresso no órgão repressivo até desligamento ou última ação.
Organizações: da fundação até dissolução ou último registro. Assim o filtro de período
da interface ("Período de atuação / perseguição") responde *quando o caso aconteceu*.
Data conhecida só pelo ano → `YYYY-01-01`/`YYYY-12-31`, com a aproximação registrada no
`texto_md`. Extremo desconhecido → `NULL` (a interface o trata como "sem limite").

### 8.2 Naturalidade nas biografias (`municipio_natal`/`uf_natal`) — ADR-016
Naturalidade = município/UF de nascimento conforme fonte documental; é **distinta** do
`municipio`/`uf` já existentes, que marcam o local do crime/morte/atuação. Desconhecida
→ `NULL`, nunca inferir. As coordenadas (`lat_natal`/`lng_natal`) derivam da tabela
`municipios_ibge` (sede do município, não endereço preciso) e alimentam a camada de
origem do mapa, desligada por padrão.

### 8.3 Território de origem em `biografias` (povos indígenas) — ADR-019

A naturalidade da seção 8.2 (`municipio_natal`/`uf_natal`) pressupõe uma cidade
natal cartorial — registro de nascimento em um município do recorte do IBGE. Para
vítimas indígenas, essa premissa frequentemente não se aplica: o Estado não
registrava esses nascimentos em cartório municipal, e a referência de origem não é
uma sede de município, e sim um **território de um povo**. Sem um campo próprio,
essas vítimas ficavam invisíveis na camada de origem do mapa — exatamente o efeito
de apagamento que o projeto combate (princípio 6). O **território de origem** supre
essa lacuna sem forçar uma naturalidade municipal que a fonte não sustenta.

**O que é.** Conjunto de campos em `biografias` que associa a vítima ao
**território do povo indígena ao qual a fonte documental a vincula**, alimentando a
camada de mapa "Territórios de origem (povos indígenas)" (desligada por padrão,
como a camada de naturalidade). É **distinto** da naturalidade (8.2) e do
`municipio`/`uf` (local do crime/atuação). É também **independente** do marcador
`indigena` (seção 6.2), que continua obrigatório e citado: o marcador afirma a
identidade; o território de origem dá-lhe uma referência geográfica aproximada.

**Quando usar.** Somente quando a fonte documental (CNV, comitê estadual/temático
da verdade, produção acadêmica, testemunho) identifica a vítima como pertencente a
um povo indígena nomeado **e** é possível associar esse povo a uma terra indígena
oficial ou a uma área aproximada. **Nunca inferir povo, etnia ou território por
nome, sobrenome, fenótipo ou UF de atuação** — mesma regra estrita dos marcadores
(6.2) e da naturalidade (8.2). Na ausência de base documental, todos os campos
ficam `NULL`.

**Como preencher no JSON de curadoria.**
- `povo_origem` (text): nome do povo/etnia conforme a fonte, grafia consagrada na
  historiografia (ex.: "Waimiri-Atroari", "Krenak", "Guarani-Kaiowá").
- Referência territorial — duas vias mutuamente exclusivas:
  - **(a) Terra Indígena oficial**: `terra_indigena_nome` (text) com o nome da TI
    para exibição; o `terra_indigena_codigo` (código FUNAI) é casado pelo pipeline
    para recuperar o polígono oficial homologado. Preferir esta via quando há TI
    correspondente ao povo.
  - **(b) Fallback circular** (quando não há TI oficial homologada para o povo, mas
    a região é documentável): `geometria_origem_ponto` `[lat, lng]` e
    `geometria_origem_raio_km` (int), que o pipeline converte num polígono circular
    aproximado. O ponto e o raio são definidos pelo curador a partir da fonte, e o
    `texto_md` deve registrar em que base a área foi estimada.

**Ressalva editorial obrigatória (tooltip do mapa).** Todo ponto/polígono desta
camada exibe, sem exceção, uma nota equivalente a:

> "Território de origem do povo [povo] — referência geográfica aproximada e
> contemporânea (limites da Terra Indígena hoje), não o local exato de nascimento
> nem o limite oficial do território em 1964–1985. Indica a origem territorial do
> povo, não a localização da pessoa naquele período."

A ressalva é inegociável: a TI homologada é um recorte jurídico **posterior** e
muitas vezes **menor** que o território tradicional efetivamente ocupado e disputado
no período da ditadura. Afirmar o contrário reproduziria, por imprecisão técnica, o
próprio apagamento territorial que a fonte denuncia.

**TI desconhecida ou inexistente.** Quando a fonte identifica o povo mas não há TI
homologada, nem base para estimar uma área (ponto+raio), preencher apenas
`povo_origem` e deixar `terra_indigena_nome`/`terra_indigena_codigo` e a geometria
de fallback como `NULL`. Registrar no `texto_md` o contexto: qual é o povo, por que
não há referência territorial disponível (ex.: território não demarcado, povo
removido/dizimado, ausência de processo na FUNAI) e qual fonte sustenta a
identificação. A vítima continua aparecendo nas demais camadas e na ficha; apenas
não recebe ponto na camada de territórios de origem — e a razão fica documentada,
não escondida (princípio 1).

---

## 9. Campos obrigatórios mínimos por fonte (`fontes`)
```
{
  fonte_id, titulo, autor_orgao, tipo_fonte, subtipo?, confiabilidade,
  data_documento?, periodo?, url_origem, licenca?, proveniencia,
  nota_contexto?  // obrigatória se tipo_fonte = imprensa_epoca ou documento_repressao
}
```
`proveniencia`: descrever de onde veio o arquivo (ex.: "Memórias Reveladas/Arquivo
Nacional, baixado em 11/06/2026, Relatório CNV vol. III, PDF com camada de texto").

---

## 10. Pendências que exigem decisão do Yuri

Nenhuma pendência aberta. Todas as decisões iniciais foram tomadas em
11/06/2026 e registradas em `docs/decisoes.md`:
- ADR-001 — `marcadores` é campo público, com fonte por marcador (seção 6.2).
- ADR-002 — grafia dos órgãos repressivos padronizada pela forma mais usada
  na historiografia/acervos (seção 4).
- ADR-003 — `violencia_contra_povos_indigenas` é `tipo_crime` de primeira
  classe, com camada própria no mapa (seção 6).
- ADR-004 — materiais de outras iniciativas (museus, ONGs de memória) entram
  como fonte citável (seção 2).

## 11. Biografias de perpetradores — critérios editoriais

Perpetradores são agentes do Estado cujo envolvimento em graves violações de direitos humanos foi documentado pela Comissão Nacional da Verdade (CNV), pela CEMDP, por comissões estaduais da verdade ou por decisões judiciais. Não são "o outro lado de um debate": são sujeitos históricos cuja autoria de crimes está estabelecida por fontes identificadas. O tratamento editorial segue os princípios abaixo.

**Linguagem e atribuição.** Toda afirmação factual sobre um perpetrador exige fonte recuperada (autor, documento, página, trecho). Usa-se a linguagem das próprias comissões: "reconhecido pela CNV como responsável por", "apontado como autor de", "segundo depoimento prestado à CNV". Adjetivos avaliativos são proscritos; descrevem-se cargos, órgãos, atos e responsabilizações, sempre com referência.

**Fontes e verificação.** A fonte principal para perpetradores é o Capítulo 16 do Relatório da CNV (vol. I, 2014), especialmente as Seções A (dirigentes do regime), B (gestores de estruturas repressivas) e C (autores diretos de graves violações). Depoimentos de sobreviventes e ex-agentes registrados pela CNV são citáveis quando identificados no relatório. Documentos dos próprios órgãos de repressão têm `tipo_fonte: documento_repressao` e `confiabilidade: alta_como_evidencia_de_autoria` — o conteúdo sobre vítimas é hostil por definição e deve ser contextualizado. Dados biográficos verificáveis que não constem do acervo (ex.: data de morte posterior aos relatórios) podem figurar na prosa do `texto_md` sob responsabilidade do curador, mas nunca como `trecho` atribuído a uma fonte.

**Marcadores.** Os marcadores de interseccionalidade (seção 6.2) voltam-se a vítimas. Para perpetradores, os campos `orgao_vinculo`, `patente` e `funcao` devem constar no `resumo_1_linha` e no `texto_md`; `marcadores` fica vazio (`[]`).

**Status e revisão.** Toda biografia de perpetrador é criada com `status_curadoria: "rascunho"` e só vai a `"publicada"` após revisão humana do curador (Yuri). O conteúdo é sensível: envolve nomes de pessoas eventualmente vivas e familiares.

**Anti-negacionismo.** A existência de Lei de Anistia (1979) e o entendimento do STF na ADPF 153 (2010) não alteram os fatos históricos documentados. Quando pertinente, o texto menciona o estado de responsabilização jurídica (tipicamente `reconhecido_pela_cnv_sem_responsabilizacao_penal`), sem relativizar os crimes.
