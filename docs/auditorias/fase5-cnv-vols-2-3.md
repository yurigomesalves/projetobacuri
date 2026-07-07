# Auditoria curatorial — CNV vols. II e III (5.229 chunks)

Data: 2026-06-12 | Auditor: Curador (historiador)
Amostra examinada: `pipeline/fontes.json` (entradas cnv-vol2/cnv-vol3),
`pipeline/manifesto.json`, `pipeline/03_chunkar.py` (heurísticas documentadas),
`pipeline/dados/chunks/cnv-vol2.jsonl` (997 chunks) e `cnv-vol3.jsonl`
(4.232 chunks).

## a) Metadados das fontes (`pipeline/fontes.json`)

Entradas `cnv-vol2` e `cnv-vol3`: `tipo_fonte = relatorio_oficial`,
`confiabilidade = alta`, `data_documento = 2014-12-10`, `periodo = pos_1985`,
`autor_orgao = Comissão Nacional da Verdade (CNV)`, `licenca = "documento
público oficial"` — todos **conformes** à taxonomia e ao padrão já aprovado
para o vol. I. Sem problemas.

## b) Proveniência (`pipeline/manifesto.json`)

Ambas as entradas descrevem corretamente: documento original do portal
Memórias Reveladas/Arquivo Nacional, obtido via cópia arquivada do Internet
Archive (Wayback Machine), com data de captura e sha256. Formato consistente
com o padrão aprovado na Fase 1 (mesma ressalva geral já registrada: hash
confere a cópia arquivada, não foi confrontado manualmente com o portal
oficial — não rebaixa `confiabilidade`).

- **Problema [menor]**: o sha256 de `cnv-vol3` no manifesto
  (`acf3d684035885b6fd3bab5d87500bbb647879a4a243ef8adc66a2a1a6c52379`) tem **65
  caracteres hexadecimais**, um a mais que o padrão SHA-256 (64). Provável
  erro de digitação/cópia. Recomendo ao cientista-de-dados recalcular
  `sha256sum` sobre `pipeline/dados/brutos/cnv-vol3.pdf` e corrigir o valor no
  manifesto antes da indexação (mesmo tipo de ressalva levantada e resolvida
  na Fase 1 para o vol. I).

## c) Amostra do vol. II (textos temáticos, autoria individual)

Lidos chunks de abertura (ordem=0, ficha catalográfica — igual ao padrão do
vol. I, `secao=None`), um chunk de nota de rodapé (ordem=199, `tipo_chunk:
nota_rodape`, seção "2 - violações de direitos humanos dos trabalhadores") e
um chunk de corpo (ordem=4, seção "1 – violações de direitos humanos no meio
militar"). Em todos, o campo `secao` correspondeu ao conteúdo, texto legível,
sem cabeçalho corrido vazado (a heurística de remoção de cabeçalho/rodapé do
vol. II segue o mesmo padrão validado no vol. I).

- **Ressalva editorial [importante]**: os 9 textos temáticos do vol. II são
  de **autoria individual de conselheiros da CNV**, não posição institucional
  colegiada — o próprio relatório já registra essa distinção (alguns textos
  trazem assinatura de autoria). O chatbot, ao citar trechos do vol. II,
  **deve indicar "Relatório da CNV, vol. II (texto de autoria
  individual de conselheiro)"** e não apenas "CNV concluiu que...", para não
  atribuir à instituição como um todo afirmações de responsabilidade autoral
  individual. Recomendo que o cientista-de-dados grave um metadado adicional
  (`tipo_secao: texto_tematico_individual` ou equivalente) nos chunks do vol.
  II, e que esta ressalva seja incorporada à nota de transparência editorial
  do produto (princípio 1).

## d) Amostra do vol. III (434 perfis de mortos e desaparecidos)

Lidos perfis do início (Carlos Alberto Soares de Freitas, ordem=1124-1133),
meio/fronteira problemática (ordem=1133-1142 e 1187-1195) e fim (Nativo da
Natividade de Oliveira, ordem=4224-4231, último caso cronológico, 1985 —
correto, `secao` e conteúdo coerentes, perfil completo e legível).

### d.1) Erro grave de atribuição — **BLOQUEANTE** (resolvido na reauditoria, ver abaixo)

A correção de errata aplicada em `pipeline/03_chunkar.py`
(`ERRATAS_INDICE_PERFIS_VOL3 = {136: 554}`) **não resolveu o problema, criou
outro**:

- Os chunks de ordem 1133-1142 (páginas 554-557) recebem
  `secao = "Perfil – Joaquim Alencar de Seixas"`, mas o **conteúdo integral**
  desses chunks é a biografia de **Antônio Joaquim de Souza Machado** (advogado
  mineiro, militante da VAR-Palmares, desaparecido em 15/2/1971 no Rio de
  Janeiro, vinculado ao caso da "Casa da Morte de Petrópolis" junto com Carlos
  Alberto Soares de Freitas). É uma vítima real, distinta, com biografia,
  filiação e circunstâncias de desaparecimento próprias — **não é Joaquim
  Alencar de Seixas**.
- O perfil **verdadeiro** de Joaquim Alencar de Seixas (nascido no Pará,
  operário, militante do MRT, morto sob tortura em 17/4/1971 em São Paulo
  junto com seu filho adolescente Ivan Akselrud de Seixas, após a ação contra
  o industrial Henning Albert Boilesen) está nos chunks de ordem 1191-1195
  (páginas 583-584), mas estes recebem `secao = "Perfil – Abílio Clemente
  Filho"`.

Ou seja: o índice cronológico tem a entrada 136 ("Joaquim Alencar de Seixas")
apontando originalmente para a página 543 — valor já reconhecidamente errado
— mas a página correta do perfil de Seixas é **583**, não 554. A correção
554 capturou o início de um perfil intercalado (Antônio Joaquim de Souza
Machado) que **não consta com esse nome na faixa 130-140 do índice
cronológico** examinada — sugiro ao cientista-de-dados reconferir se esse
nome aparece sob outra entrada do índice (cronológico ou alfabético) com
página própria, ou se há uma lacuna/erro adicional na numeração de páginas
do índice nessa faixa (entradas ~134-140).

**Por que isso é gravíssimo**: um usuário que pergunte sobre Joaquim Alencar
de Seixas e receba como resposta a biografia de Antônio Joaquim de Souza
Machado (ou vice-versa) recebe uma **atribuição factual incorreta sobre a
morte de uma pessoa real**, com familiares vivos (Ivan Akselrud de Seixas é
sobrevivente e segue atuante). Isso viola diretamente os princípios de
referência autoral e de tratamento digno a vítimas e familiares.

### d.2) Chunk ordem=2875 ("Perfil – Wânio José de Mattos", 514 tokens)

Confirmado: o chunk excede o limite de 512 tokens do `intfloat/multilingual-e5-small`
em 2 tokens. Conteúdo lido — contém as "Conclusões e recomendações" do
perfil de Wânio José de Mattos (desaparecimento no Estádio Nacional de
Santiago, Operação Condor) na íntegra, incluindo a recomendação de reparação
à filha da vítima. **Decisão já tomada e referendada por este Curador**:
aceitar o chunk como está — a perda de 2 tokens afeta apenas a cauda do
vetor de embedding (truncamento mínimo), o conteúdo recuperável/citável
permanece íntegro e preserva nome da vítima, contexto do crime e
recomendação no mesmo chunk, que é o critério historiográfico mais
importante. Não bloqueia a indexação.

### d.3) Chunks sem `secao` (52, páginas 7-25)

Amostra confirmou: ordem=0 (capa/ficha catalográfica + início do índice
cronológico, página 3-7) e ordem=7 (continuação do índice cronológico,
entradas 130-151, página 9) — são de fato material pré-perfis (apresentação,
introdução, índices). `secao=None` está correto e segue a convenção já
documentada na Fase 1 (páginas anteriores ao primeiro perfil/capítulo).
Sem problemas.

## e) Veredito da primeira rodada: **REPROVADO** (apenas para o vol. III; vol.
II já estava **APROVADO COM RESSALVAS**)

### Vol. II — APROVADO COM RESSALVAS
1. **[importante]** Adotar metadado/nota indicando autoria individual de
   conselheiro nos 9 textos temáticos, refletido na citação ao usuário.

### Vol. III — REPROVADO até correção do item d.1
1. **[bloqueante]** Corrigir o mapeamento de páginas dos perfis na faixa das
   entradas ~134-140 do índice cronológico (em torno das páginas 554-584).
2. **[menor]** Corrigir sha256 de `cnv-vol3` no manifesto (item b).
3. **[aceito]** Chunk ordem=2875 (Wânio José de Mattos, 514 tokens) — sem
   ação necessária.

---

## Reauditoria — 2026-06-12 (sessão posterior, mesmo dia)

### Correção do item d.1 (bloqueante) — verificada e aprovada

O cientista-de-dados identificou a causa raiz: erro de digitação/OCR no
próprio índice cronológico impresso do vol. III — a entrada 136 ("Joaquim
Alencar de Seixas") apontava para a página 543, que pertence à tabela de
"Identificação da autoria" do perfil anterior (Carlos Alberto Soares de
Freitas / Antônio Joaquim de Souza Machado), não ao início de um perfil. A
errata foi corrigida para `{136: 583}`.

Reli a faixa completa (ordem=1124 a 1195, páginas 549-584) após o
reprocessamento:

- **Antônio Joaquim de Souza Machado** (ordem=1133-1142, páginas 554-557):
  agora `secao = "Perfil – Antônio Joaquim de Souza Machado"`. Conteúdo —
  biografia, filiação, circunstâncias de desaparecimento na Casa da Morte de
  Petrópolis, identificação de cadeia de comando (DOI-CODI/RJ e CIE) e
  conclusões/recomendações — **corresponde integralmente ao nome em
  `secao`**. Correto.
- **Devanir José de Carvalho** (ordem=1180-1187, páginas 576-579):
  `secao = "Perfil – Devanir José de Carvalho"`, conteúdo corresponde
  (operário metalúrgico, MRT, morto sob tortura em abril de 1971 sob custódia
  do delegado Sérgio Fleury). Correto.
- **Abílio Clemente Filho** (ordem=1187-1191, páginas 580-582):
  `secao = "Perfil – Abílio Clemente Filho"`, conteúdo corresponde
  (desaparecido na praia de José Menino, Santos, em 10/4/1971). A biografia
  de Joaquim Alencar de Seixas **não mais está misturada a este perfil**.
  Correto.
- **Joaquim Alencar de Seixas** (ordem=1191-1195, páginas 583-584): agora
  `secao = "Perfil – Joaquim Alencar de Seixas"`, com o chunk de abertura
  ("BIOGRAFIA\nNascido no Pará, Joaquim Alencar de Seixas...") corretamente
  no início do perfil. Conteúdo — filho Ivan Akselrud de Seixas, caso
  Boilesen, tortura conjunta pai/filho no DOI-CODI/SP — corresponde
  integralmente ao nome em `secao`. Correto.

**O erro de atribuição que motivou o veredito de reprovação está corrigido.**
Nome da vítima e contexto do crime permanecem na mesma unidade recuperável
em todos os quatro perfis revisados.

### Verificação automatizada dos 434 perfis

Tomo nota da verificação automática implementada pelo cientista-de-dados
(nome da vítima, normalizado, deve aparecer nas duas primeiras páginas do
perfil): 433/434 confirmados. Considero essa verificação um bom controle de
qualidade estrutural recorrente — registro como prática a manter em volumes
futuros.

### Divergência ortográfica — entrada 427: "Goldemberg" vs. "Goldenberg"

Verifiquei o chunk de abertura do perfil (ordem=4165, página 1962,
`secao = "Perfil – Liliana Inés Goldemberg"`): o corpo da biografia grafa
consistentemente **"Liliana Inés Goldenberg"** (nascida em Buenos Aires,
militante de Montoneros/FAR, suicídio em Foz do Iguaçu em 2/8/1980 ao tentar
reentrar na Argentina). A mesma grafia "Goldenberg" aparece também nas
menções a ela dentro de outros dois perfis correlatos da Operação Condor
(Norberto Armando Habegger, ordem=4070, e Mónica Suzana Pinus de Binstock,
ordem=4143) — ou seja, o corpo do relatório é uniforme em "Goldenberg"; é o
índice cronológico (páginas 7-14) que traz "Goldemberg".

**Decisão**: manter no campo `secao` a grafia do **corpo do relatório**,
"Perfil – Liliana Inés Goldenberg" — alterar a fonte usada para o nome
(deixar de usar a string do índice cronológico apenas para esta entrada).

Justificativa:
1. O corpo do relatório é a parte substantiva e citável; o índice é mero
   sumário de navegação. Em caso de divergência, a forma que aparecerá nas
   citações do chatbot deve ser a que consta no texto que o usuário vai ler.
2. "Goldenberg" é grafia consistente em **três ocorrências independentes**
   no corpo (perfil próprio + duas menções em perfis correlatos), contra uma
   única ocorrência de "Goldemberg" no índice — peso de evidência interna ao
   próprio documento favorece "Goldenberg".
3. Não é uma correção "inventada": é a opção por uma grafia que o próprio
   documento da CNV usa majoritariamente. Recomendo registrar uma nota breve
   na metadata do perfil ("CNV: índice cronológico grafa 'Goldemberg'; corpo
   do relatório grafa 'Goldenberg'") para transparência, caso uma busca pelo
   nome com a grafia do índice seja feita por um usuário — o
   cientista-de-dados pode avaliar indexar ambas as grafias como sinônimos de
   busca, sem alterar o `secao` exibido.
4. Trata-se de pessoa estrangeira (argentina), vítima da Operação Condor —
   o cuidado com a grafia correta do nome é também uma forma de respeito à
   memória e à família, dentro do princípio de tratamento digno.

### Correção do falso positivo do sha256 (item b)

A ressalva sobre o sha256 de `cnv-vol3` ter 65 caracteres é **retirada**: a
sessão principal já verificou que o hash registrado no manifesto tem 64
caracteres hexadecimais e confere com `sha256sum` do arquivo em disco
(`pipeline/dados/brutos/cnv-vol3.pdf`). A leitura anterior de "65 caracteres"
foi um engano de contagem do auditor, do mesmo tipo já ocorrido e corrigido
na Fase 1 para o vol. I.

### Ressalva de autoria individual do vol. II — atendida

Confirmado em `pipeline/fontes.json`: o campo `autor_orgao` da entrada
`cnv-vol2` passou de "Comissão Nacional da Verdade (CNV)" para "Conselheiros
da Comissão Nacional da Verdade (textos de autoria individual, não posição
colegiada da CNV)". Atende à ressalva 1 do item c. Recomendo que a camada de
citações (Fase 3) leia este campo e o exiba ao usuário ao citar trechos do
vol. II — isso é uma decisão de implementação do arquiteto-backend/designer,
fora do escopo deste Curador, mas registro aqui para rastreabilidade.

## Veredito final (reauditoria)

- **Vol. II: APROVADO** (ressalva de autoria individual atendida via
  metadado; falta apenas a exibição na camada de citações, fora do escopo
  desta auditoria).
- **Vol. III: APROVADO COM RESSALVA MENOR**
  - O erro bloqueante de atribuição (item d.1) está **corrigido e
    verificado**.
  - **[menor, pendente]**: ajustar a grafia "Goldemberg" → "Goldenberg" no
    `secao` da entrada 427, conforme decisão acima. Não bloqueia a indexação
    — pode ser corrigido antes ou em ciclo de ajuste posterior, mas
    recomendo fazê-lo antes da Fase 3 (citações), já que afeta o nome exibido
    ao usuário para uma vítima da Operação Condor.

Ambos os volumes estão liberados para indexação, condicionado ao ajuste
menor acima (que não impede a indexação em si, apenas deveria ser corrigido
antes de o nome "Goldemberg" aparecer em uma citação ao usuário).

## Decisões que precisam do Yuri

- Nenhuma decisão de princípio pendente. A decisão sobre a grafia
  "Goldenberg" foi tomada por este Curador com base em critério documental
  (corpo do relatório vs. índice) — Yuri pode revisar se desejar, mas não é
  bloqueante.
- Vol. II e vol. III liberados para indexação.
