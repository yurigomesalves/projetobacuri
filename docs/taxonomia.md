# Taxonomia e Vocabulário Controlado — Memória e Verdade

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

- `classe_trabalhadora` / `camponesado` / `classe_media` (origem de classe quando
  documentada e relevante ao caso — ex.: perseguição sindical)
- `negro` / `indigena` / `pardo` (autodeclaração ou classificação de fonte
  histórica — registrar a fonte da classificação, tema sensível e historicamente
  invisibilizado nos registros oficiais da época)
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
