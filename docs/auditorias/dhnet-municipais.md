# Auditoria — 2º Lote DHnet: 8 Comissões Municipais da Verdade

**Data da auditoria:** 2026-06-18
**Curador:** curador-historiador (Projeto Bacuri)
**Método:** amostragem de 3–5 chunks por documento (início, meio e fim), verificação cruzada
dos mapas de seções contra o chunker (`pipeline/03_chunkar_estaduais.py`), e leitura crítica
dos metadados em `pipeline/fontes.json`.

---

## 1. Veredito Geral

**APTO COM RESSALVAS**

Nenhum dos oito documentos apresenta problema bloqueante isolado que justifique
reprovação completa. A qualidade geral do chunking é satisfatória: proveniências coerentes,
numeração de páginas plausível, nomes de vítimas não separados do contexto do crime nas
amostras examinadas. Há, contudo, dois problemas que afetam múltiplos documentos e
devem ser resolvidos antes da consolidação definitiva:

1. **Nenhuma das 8 fontes possui `nota_contexto`** no `fontes.json` — campo obrigatório
   para que o chatbot situe adequadamente cada documento ao recuperá-lo.
2. **Osasco (OCR)** tem legibilidade degradada nos primeiros chunks (artefatos como
   `"oi\n\nComissão\no a\nVerdade."`, linhas de ruído `QLILPLLLID...`, caracteres trocados)
   e o campo `confiabilidade` = `"alta"` está impreciso para texto inteiramente obtido por OCR.

---

## 2. Veredito por Documento

| slug | veredito | ressalvas |
|---|---|---|
| cmv-mg-juiz-de-fora | Apto com ressalva menor | Chunks iniciais (ordens 0–8) são de pré-texto (créditos, sumário, apresentações de parceiros) com `secao: null`; sem problema semântico, mas eleva ruído; sem nota_contexto |
| cmv-pb-joao-pessoa | Apto com ressalva menor | Chunks 0–7 concentram lista de siglas (3 chunks) — alto volume de ruído enciclopédico no início; sem nota_contexto |
| cmv-rj-niteroi | Apto com ressalva importante | Caráter PRELIMINAR não consta na nota_contexto (campo inexistente); descricao_curta menciona mas o campo da fonte (`confiabilidade: "alta"`) não ressalva; referências internas não resolvidas ("Ver página ???") chegaram aos chunks |
| cmv-rj-petropolis | Apto com ressalva menor | Chunks finais (ordens 599–603) são Diário Oficial municipal (decreto de tombamento da Casa da Morte) — material útil mas heterogêneo; sem nota_contexto |
| cmv-rj-volta-redonda | Apto | Qualidade alta; depoimentos de vítimas (Ruth Jeremias) preservam contexto; recomendações preservadas; sem nota_contexto |
| cmv-sp-maua | Apto com ressalva menor | Documento mais curto (105 chunks, 72 p.); `secao: null` em todos — adequado, pois o relatório não tem divisão formal em capítulos; sem nota_contexto |
| cmv-sp-osasco | Apto com ressalva IMPORTANTE | OCR degradado nos primeiros chunks (ruído visível); `confiabilidade: "alta"` inadequado para OCR — deveria ser `"media"` com nota de processamento; `secao: null` em todos — adequado para dossiê documental heterogêneo; sem nota_contexto |
| cmv-sp-sao-paulo | Apto com ressalva menor | Nome oficial da comissão inconsistente: o título no `fontes.json` usa "Vladimir Herzog" mas os chunks mostram o nome real "Comissão da Memória e Verdade da Prefeitura do Município de São Paulo" (o epíteto "Vladimir Herzog" é uso corrente mas não é o nome legal); sem nota_contexto |

---

## 3. Ressalvas Bloqueantes

**Nenhuma ressalva isolada é bloqueante para a indexação**, mas as duas ressalvas abaixo são
**IMPORTANTES** e devem ser resolvidas em curto prazo (antes da entrega da versão beta):

### 3.1 — Osasco: `confiabilidade` incorreta para texto OCR [IMPORTANTE]

O campo `confiabilidade: "alta"` pressupõe texto digital nativo ou fonte primária sem
mediação técnica degradante. O Osasco é inteiramente OCR (Tesseract 300 DPI). Os primeiros
chunks mostram artefatos evidentes: `"oi\n\nComissão\no a\nVerdade."` (chunk 0),
`"QLILPLLLID...ANNAN AAA..."` (chunk 0, linha de ruído gráfico), caracteres trocados.
O valor correto é `confiabilidade: "media"` com `descricao_curta` e `nota_contexto`
registrando explicitamente o processamento OCR.

**Ação necessária (sessão principal):** UPDATE em `fontes.json` e no banco.

### 3.2 — Niterói: versão preliminar não sinalizada no campo estrutural [IMPORTANTE]

O documento é o "II Relatório Parcial de Pesquisa e Atividades (Versão Preliminar)" —
conforme o próprio chunk 0. O campo `descricao_curta` registra isso, mas o campo
`confiabilidade: "alta"` e a ausência de `nota_contexto` significam que o chatbot pode
apresentá-lo como relatório final consolidado. Além disso, os Anexos contêm referências
internas não resolvidas ("Ver pagina ???", chunks 143–146), que chegaram aos chunks sem
filtro — sinal de que o documento foi publicado sem revisão final, reforçando o caráter
preliminar. A `nota_contexto` proposta abaixo subsana isso.

**Ação necessária (sessão principal):** UPDATE em `fontes.json` e no banco inserindo
`nota_contexto`; considerar também rebaixar `confiabilidade` para `"media"` dado o caráter
não-definitivo.

---

## 4. Ressalvas Não-Bloqueantes (Backlog)

### 4.1 — Chunks de pré-texto (créditos, sumários, listas de siglas) sem `secao`

Em Juiz de Fora (8 chunks com `secao: null`), João Pessoa (7 chunks de lista de siglas)
e Petrópolis (6 chunks com `secao: null`), os chunks iniciais reproduzem páginas de créditos,
listas de colaboradores e sumários. Isso não distorce sentido historiográfico, mas eleva ruído
nas buscas. Recomenda-se ao cientista-de-dados avaliar filtro de `tipo_chunk` ou estratégia
de chunking que exclua ou sinalize páginas de aparato editorial.

### 4.2 — Nome oficial da comissão de São Paulo (inconsistência editorial)

O `titulo` no `fontes.json` é "Relatório Final da Comissão Municipal da Verdade de São Paulo
Vladimir Herzog", mas o nome institucional correto, conforme os próprios chunks, é "Comissão
da Memória e Verdade da Prefeitura do Município de São Paulo" — sem o epíteto "Vladimir
Herzog" no nome legal. O epíteto homenageia o jornalista assassinado no DOI-CODI/SP em
1975 e é amplamente usado, mas deve aparecer na nota_contexto, não no título formal.

### 4.3 — Decreto do Diário Oficial de Petrópolis nos chunks finais

Os chunks 599–603 de Petrópolis reproduzem integralmente o Decreto Municipal nº 610/2018
(tombamento da Casa da Morte), publicado como Anexo. O decreto tem valor histórico real
(oficializa reconhecimento do sítio de tortura), mas o chunker mistura texto técnico-legal
(metragem de testada, CEP, etc.) ao corpo analítico. Sem impacto semântico grave, mas
deve-se ponderar filtro de granularidade em revisão futura.

### 4.4 — Volta Redonda: extensão até 1989 e nome da comissão

A comissão se chama "D. Waldyr Calheiros" (bispo que foi alvo de IPM), mas o relatório
cobre eventos até 1989 (massacre dos metalúrgicos da CSN em novembro de 1988, morte de
Juarez Antunes em fevereiro de 1989). O recorte padrão do projeto é 1964–1985, mas a CMV
documenta o que chama de "ditadura tardia" — fato que a nota_contexto deve esclarecer para
que o chatbot não filtre indevidamente essas seções.

---

## 5. Mapa de Seções — Divergências Encontradas

### 5.1 — Juiz de Fora: mapa vs. sumário real

O sumário interno (chunk 7, p. 11) lista:
- Capítulo 3 iniciando em p. 84 ("As vítimas e o município de Juiz de Fora" = p. 84)
- Capítulo 4 iniciando em p. 113

O chunker marca `(82, "Capítulo 3 – Vítimas da ditadura")` e `(112, "Capítulo 4 – Justiça
e legislação de exceção")`. Há deslocamento de 2 páginas em ambos os casos (84→82 e
113→112). O comentário no código registra "p. 82 (Cap3), 112 (Cap4)", sugerindo que o
pesquisador verificou as páginas no jsonl extraído (que tem offset de 1–2 páginas em relação
ao número impresso). O risco de vazamento de seção é baixo (2 páginas), mas deve ser
documentado. **Não bloqueante.**

### 5.2 — Niterói: mapa correto vs. sumário real

O sumário (chunk 0) lista: Cap. I = p. 10, Cap. II = p. 31, Cap. III = p. 59, Cap. IV = p. 80,
Anexos = p. 130. O mapa do chunker usa exatamente esses valores. A verificação dos chunks
confirma:
- Chunk 57 (p. 59): início do Cap. III marcado corretamente
- Chunks 139–142 (pp. 125–129): dentro do Cap. IV — correto
- Chunk 143 (pp. 143–144): marcado como "Anexos" — correto

**Mapa de Niterói: consistente com o sumário.** Não há seções puladas.

### 5.3 — João Pessoa: capítulos 1 a 9 e Fotos

O sumário (implícito nos capítulos referenciados nos chunks de siglário) lista 9 capítulos +
Referências + Anexos + Fotos. O mapa do chunker mapeia todas essas entradas. A verificação
dos chunks no fim do arquivo (ordens 630–634) confirma que a seção "Fotos" (p. 332+) está
corretamente rotulada. **Nenhuma seção pulada detectada.**

### 5.4 — Petrópolis: mapa vs. sumário

O código comenta "Sumário pags 12–13. O jsonl tem offset +1 vs. número impresso". Os
chunks do meio (ordem 299–302, pp. 193–196) aparecem corretamente na seção "3. A
Redemocratização e a Retomada das Lutas Sociais (1980-1989)", que o mapa fixa em p. 176.
O final (ordens 600–603, p. 400) está na seção "Anexos" (mapa: p. 392). **Consistente.**

### 5.5 — Volta Redonda: partes vs. 14 casos

O mapa usa as 5 Partes como unidade, sem mapear os 14 casos individuais dentro de cada
Parte. Isso é decisão explícita e documentada no código. Os chunks verificados (ordens 359–363)
aparecem corretamente na "Parte III" (1970–1973). As "Recomendações" (ordem 718+) estão
corretamente rotuladas. **Consistente. Granularidade aceitável para a escala do acervo.**

### 5.6 — São Paulo (CMV): 6 partes mapeadas vs. sumário

O sumário nos chunks 1–3 lista: Parte I (p. 15), Parte II (p. 61), Parte III (p. 115),
Parte IV (p. 247), Parte V – Caderno de Imagens (p. 327), Parte VI – Anexos (p. 349).
O mapa do chunker usa exatamente esses valores. Os chunks verificados (ordens 259–263,
pp. 181–185) estão corretamente na Parte III. Chunks finais (ordens 514–518, pp. 386–389)
estão na Parte VI. **Consistente.**

### 5.7 — Mauá e Osasco: `secao: None` — adequado

Mauá não tem divisão formal em capítulos (estrutura de relatório de câmara municipal, com
atas de audiência e depoimentos em sequência). Osasco é um dossiê de decretos, atas e
regimento interno — heterogêneo por natureza. Em ambos os casos `None` é a escolha correta.
**Nenhuma divergência.**

---

## 6. Osasco (OCR): Avaliação de Legibilidade

A amostragem revelou degradação variável:

- **Chunks iniciais (0–4):** ruído grave. Chunk 0 começa com `"oi\n\nComissão\no a\nVerdade."`,
  seguido de linha ilegível (`QLILPLLLID...`). O conteúdo subsequente (decreto de denominação
  de ruas) é razoavelmente legível, mas com pontuação inconsistente (`-—-`, hifens duplos) e
  números romanos mal reconhecidos (`XVil`, `XVIl`).
- **Chunks do meio (80–90, atas de reunião):** legibilidade boa. O OCR recuperou satisfatoriamente
  as atas de reunião da CMVO (pp. 48–88), que são documentos datilografados com layout simples.
  O conteúdo histórico — contato da comissão com o capitão Wilson Damasceno (denunciado como
  torturador), negativa do Exército de autorizar depoimentos — está preservado e compreensível.
- **Chunks finais (130–134):** legíveis, com ruído residual de cabeçalhos de papel timbrado da
  Prefeitura de Osasco.

**Conclusão sobre Osasco:** o dossiê tem utilidade histórica real (atas que documentam
resistência da estrutura militar à comissão; decreto de denominação de ruas com nomes de
vítimas), mas não é um relatório analítico. O `secao: None` é correto. O campo
`confiabilidade` deve ser corrigido para `"media"`.

---

## 7. As 8 `nota_contexto` Propostas

As notas abaixo estão prontas para copiar diretamente no `fontes.json` e via UPDATE no banco.
Seguem o estilo das notas existentes: frase única ou parágrafo curto, sóbrio, com alcance
geográfico, particularidades e advertências para o chatbot.

---

### 7.1 `cmv-mg-juiz-de-fora`

```
"nota_contexto": "A Comissão Municipal da Verdade de Juiz de Fora (CMV-JF), criada em 2013 e concluída em 2015, teve suporte acadêmico da UFJF e acesso inédito ao acervo digitalizado da Auditoria da 4ª Circunscrição Judiciária Militar. Juiz de Fora ocupa posição estratégica na história do golpe: foi de lá que partiram as tropas do General Olympio Mourão Filho na madrugada de 31 de março de 1964. O relatório documenta 37 depoimentos, o sistema de repressão local (incluindo a Operação Popeye), vítimas com vínculos juiz-foranos mortas em outros estados, e o papel de veículos de comunicação (Diários Associados) na sustentação ideológica do golpe. Alcance geográfico: município de Juiz de Fora e bairristas que migraram para outros centros repressivos."
```

---

### 7.2 `cmv-pb-joao-pessoa`

```
"nota_contexto": "A Comissão Municipal da Verdade de João Pessoa (CMV-JP), criada em 2015 e concluída em 2020, é um dos relatórios mais tardios do ciclo municipal, publicado pela Editora do CCTA/UFPB. Cobre 9 capítulos temáticos: instalação da ditadura na Paraíba, resistência, papel da Prefeitura e da Câmara de João Pessoa, aparato repressivo (SNI, DOPS-PB, CENIMAR), movimentos de resistência, memória histórica e histórias de vida. Apoia-se em acervo do DOPS-PB (disponibilizado pelo Conselho Estadual de Direitos Humanos da PB), no Arquivo Nacional e em oitivas. Alcance geográfico: município de João Pessoa e paraibanos perseguidos em outros estados. O relatório inclui documentos do SNI sobre vigilância de religiosos católicos ligados à Diocese da Paraíba — fonte relevante para pesquisa sobre Igreja e resistência."
```

---

### 7.3 `cmv-rj-niteroi`

```
"nota_contexto": "ATENÇÃO: este documento é o II Relatório Parcial de Pesquisa e Atividades da Comissão da Verdade de Niterói (CVN), publicado em outubro de 2015 em VERSÃO PRELIMINAR, elaborado para subsidiar o Relatório Final da Comissão Estadual da Verdade do Rio de Janeiro (CEV-Rio). Não é o relatório final da CVN. O texto contém referências internas não resolvidas ('Ver pagina ???'). As informações factuais devem ser cotejadas com a CEV-Rio antes de serem apresentadas como definitivas. O relatório foca três temas: o Estádio Caio Martins como primeiro estádio-prisão da América Latina (abril de 1964), a repressão aos Operários Navais de Niterói e São Gonçalo, o Centro de Armamento da Marinha (CAM) e a Ilha das Flores como espaços de tortura. Alcance geográfico: município de Niterói e antigo estado do Rio de Janeiro."
```

---

### 7.4 `cmv-rj-petropolis`

```
"nota_contexto": "A Comissão Municipal da Verdade de Petrópolis (CMVP), criada em 2014 e concluída em 2018, é um dos relatórios municipais mais completos do acervo: 400 páginas com cronologia da ditadura na cidade (1964–1989), seção de vítimas, testemunhos, textos temáticos e oitivas realizadas junto ao Ministério Público Federal. Destaque para a investigação da 'Casa da Morte' (Rua Arthur Barbosa, 50) — sítio de tortura e execução clandestino reconhecido pela CNV e tombado pelo município em 2018 (Decreto 610/2018, reproduzido nos Anexos). O relatório dialoga diretamente com o caso de Inês Etiene Romeu, única sobrevivente identificada do local. Alcance geográfico: município de Petrópolis e trabalhadores têxteis, metalúrgicos e lapidários da região serrana fluminense."
```

---

### 7.5 `cmv-rj-volta-redonda`

```
"nota_contexto": "A Comissão Municipal da Verdade D. Waldyr Calheiros de Volta Redonda (2013–2015), cujo nome homenageia o bispo diocesano perseguido pela ditadura, organizou seu relatório em torno de 14 casos de graves violações documentadas por IPMs (Inquéritos Policiais Militares) e depoimentos. O eixo central é a Companhia Siderúrgica Nacional (CSN) e seu entorno operário: sindicalistas da CSN, a Juventude Diocesana Católica (1969), os Grupos dos Onze, o PCB regional. ATENÇÃO: o relatório cobre eventos até 1989, incluindo o massacre de novembro de 1988 em que três metalúrgicos (Walmir, Barroso e Willian) foram mortos pelo Exército durante greve na CSN — episódio que a CMV classifica como 'ditadura civil-militar tardia'. O chatbot deve apresentar esses eventos dentro do recorte estendido reconhecido pela própria comissão. Alcance geográfico: Volta Redonda, Barra Mansa, Barra do Piraí e Piraí (sul fluminense)."
```

---

### 7.6 `cmv-sp-maua`

```
"nota_contexto": "A Comissão da Verdade do Município de Mauá (2013–2014) foi criada por iniciativa de vereadores da Câmara Municipal (Processo 82.275/2013) e realizou duas audiências públicas, em abril e agosto de 2014. Trata-se de um relatório de câmara municipal — mais breve (72 p.) e de natureza distinta dos relatórios de comissões com estrutura técnica própria: documenta essencialmente os depoimentos colhidos nas audiências e as conclusões dos vereadores sobre violações ocorridas no município. A base industrial de Mauá (Grande ABC paulista) e o papel das CEBs e da Igreja são eixos dos depoimentos. Sem divisão formal em capítulos; o chatbot deve tratar este documento como registro de audiências, não como análise historiográfica sistemática."
```

---

### 7.7 `cmv-sp-osasco`

```
"nota_contexto": "ATENÇÃO: este documento é um DOSSIÊ DOCUMENTAL heterogêneo (117 p.), não um relatório analítico. Reúne: decreto municipal de denominação de ruas (homenagens a vítimas da ditadura), regimento interno da Comissão Municipal da Verdade de Osasco (CMVO), lei de criação da CMVO (Lei 4.650/2014) e atas de reunião da comissão (2015). O PDF é inteiramente escaneado, sem camada de texto; o texto foi obtido por OCR (Tesseract 300 DPI) e apresenta degradação variável — legível no corpo das atas, com ruído nos cabeçalhos e na primeira página. As atas de reunião têm valor histórico: documentam o contato da CMVO com o Capitão Wilson Damasceno (denunciado como torturador) e a recusa do 4º BIL em autorizar depoimentos. Osasco (Grande ABC) tem história operária intensa; a comissão investigava especialmente a repressão ao movimento sindical metalúrgico. Alcance geográfico: município de Osasco/SP."
```

---

### 7.8 `cmv-sp-sao-paulo`

```
"nota_contexto": "A Comissão da Memória e Verdade da Prefeitura do Município de São Paulo (CMV) — conhecida pelo epíteto 'Vladimir Herzog', em homenagem ao jornalista assassinado no DOI-CODI/SP em 1975 — foi instituída em 2013 e publicou seu relatório em dezembro de 2016. É a comissão municipal mais abrangente do acervo (396 p., 6 partes): contexto histórico, cooperação entre Prefeitura e aparato repressivo (prefeitos biônicos, Sistema de Segurança Interna), perseguição a servidores municipais, desaparecimento e ocultação de cadáveres nos cemitérios de São Paulo (especialmente a vala clandestina de Perus). A investigação dos cemitérios municipais — com a participação da Prefeitura na ocultação de corpos de desaparecidos políticos — é o núcleo mais singular deste relatório em relação à produção das demais comissões. Alcance geográfico: município de São Paulo e sistema funerário municipal (cemitérios Dom Bosco/Perus, Vila Formosa, Campo Grande, Lajeado)."
```

---

## 8. Pontos que Precisam de Decisão do Yuri

1. **Osasco — rebaixar `confiabilidade` para `"media"`?** Recomendo que sim, e que a
   `descricao_curta` já menciona o OCR. Requer UPDATE no banco (`fontes` e `chunks`
   associados) e no `fontes.json`. Confirme antes de executar.

2. **Niterói — rebaixar `confiabilidade` para `"media"`?** O documento é versão preliminar
   com passagens incompletas. Argumento: a `nota_contexto` com o alerta já cobre bem o
   risco, sem necessidade de rebaixar o campo formal; mas é uma decisão editorial. Recomendo
   deixar `"alta"` com a nota — o texto é sóbrio e fundamentado, a fraqueza é de completude,
   não de idoneidade da fonte.

3. **São Paulo — corrigir o título no `fontes.json`?** O campo `titulo` atual é "...Vladimir
   Herzog". Recomendo corrigir para o nome legal ("Comissão da Memória e Verdade da
   Prefeitura do Município de São Paulo") e mencionar o epíteto apenas na `nota_contexto`.

4. **Pré-texto nos chunks (créditos, listas de siglas):** avaliar com o cientista-de-dados se
   há custo-benefício em implementar filtro de `tipo_chunk = "pre_texto"` para excluir esses
   chunks das buscas semânticas, sem apagá-los do banco.

---

## 9. Resumo de Ações para a Sessão Principal

| Prioridade | Ação | Arquivo(s) |
|---|---|---|
| IMPORTANTE | Adicionar `nota_contexto` às 8 fontes (textos acima) | `fontes.json` + UPDATE banco |
| IMPORTANTE | Corrigir `confiabilidade` Osasco para `"media"` | `fontes.json` + UPDATE banco |
| IMPORTANTE | Adicionar alerta de versão preliminar à nota de Niterói | feito via nota_contexto acima |
| Menor | Corrigir título São Paulo (retirar "Vladimir Herzog" do campo `titulo`) | `fontes.json` + UPDATE banco |
| Backlog | Avaliar filtro de pré-texto com cientista-de-dados | `pipeline/03_chunkar_estaduais.py` |
| Backlog | Verificar se CEV-Rio tem relatório final de Niterói para completar o acervo | curadoria futura |
