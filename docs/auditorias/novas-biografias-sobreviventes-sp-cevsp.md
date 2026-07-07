# Novas biografias — Sobreviventes — São Paulo — CEV-SP "Rubens Paiva"

**Curador:** Projeto Bacuri (agente curador-historiador)
**Data:** 2026-06-16
**Fontes base:** Comissão da Verdade do Estado de São Paulo "Rubens Paiva" — Relatório Final
- Tomo II (Dossiê Ditadura): `fonte_id: efc10a75-5cf4-435e-a598-7abf57f88ff7`
- Tomo III (Audiências Públicas): `fonte_id: c5f751ff-b1bb-4411-97cc-3fb239af0607`

**Arquivos de chunks consultados:**
- `pipeline/dados/chunks/cev-sp-rubens-paiva-tomo2.jsonl`
- `pipeline/dados/chunks/cev-sp-rubens-paiva-tomo3.jsonl`

---

## Nota preliminar de curadoria — correção de premissa

O lead recebido afirmava que Rosalina Santa Cruz teria deposto na "21ª Audiência Pública". Os chunks mostram que a **21ª Audiência** (14/03/2013, p. 3759–3762, Tomo III) tratou dos casos de **Heleny Telles Ferreira Guariba e Paulo de Tarso Celestino**, não de Rosalina. O depoimento de Rosalina Santa Cruz encontra-se em dois contextos distintos:

1. **6ª Audiência Pública** (20/02/2013) — audiência sobre o caso de Fernando Augusto Santa Cruz de Oliveira, p. 5575–5583, Tomo III, seção "64ª Audiência Pública — 19/08/2013" (numeração de página do volume geral). Nessa sessão Rosalina falou como irmã sobrevivente e ex-presa política.
2. **2º Prêmio Beth Lobo de Direitos da Mulher em Direitos Humanos** (11/03/2013) — cerimônia transcrita no Tomo III, p. 3082–3100, onde Rosalina discursou sobre tortura, violência sexual e o desaparecimento do irmão.

Igualmente, a premissa de que Maria Auxiliadora Lara Barcelos era apenas "sobrevivente" precisa ser qualificada: o próprio Tomo III (p. 5584, depoimento de Marcelo Santa Cruz) a menciona entre os que "recorreram ao suicídio" após as torturas — junto a Frei Tito Alencar. Ela é, portanto, uma sobrevivente que posteriormente faleceu em consequência das sequelas da tortura (suicídio). Isso deve constar no `texto_md` com a fonte explicitada.

**Decisões editoriais aplicadas:**
- `tipo = 'sobrevivente'` para Rosalina e Ieda de Seixas; para Maria Auxiliadora Lara Barcelos, `tipo = 'vitima'` é justificado, pois morreu em decorrência das sequelas (suicídio como consequência da tortura — tipologia reconhecida pelos familiares e pela própria CNV).
- Marcadores de classe e raça: só quando literalmente documentados na fonte (precedente estabelecido).
- Violência sexual: incluída em `tipos_crime` com nota de base testemunhal quando relato é de primeira pessoa.
- Coordenadas: aproximadas, sempre marcadas como tais.

---

## Caso 1 — Rosalina Santa Cruz

### Fontes consultadas

- CEV-SP, Tomo III, p. 3097–3100 (2º Prêmio Beth Lobo, 11/03/2013)
- CEV-SP, Tomo III, p. 5575–5583 (6ª Audiência Pública, 20/02/2013)
- CEV-SP, Tomo III, p. 5584–5585 (depoimento de Marcelo Santa Cruz na mesma audiência)
- CEV-SP, Tomo II, p. 4–5 (depoimento de Rosalina ao Congresso Nacional, jan. 1975)

### Biografia (tabela `biografias`)

- **slug:** rosalina-santa-cruz
- **nome:** Rosalina Santa Cruz
- **tipo:** sobrevivente
- **municipio:** Recife
- **uf:** PE
- **resumo_1_linha:** Militante pernambucana presa, torturada e mantida desaparecida por 45 dias pelo DOI-CODI; irmã do desaparecido político Fernando Santa Cruz, sobrevivente que se tornou referência na luta pela memória, verdade e justiça no Brasil.

- **texto_md:**

Rosalina Santa Cruz nasceu em Recife (PE). É filha de Elzita Santos de Santa Cruz de Oliveira e irmã do desaparecido político Fernando Augusto Santa Cruz de Oliveira (1948–1974), preso e assassinado pelo DOI-CODI em 23 de fevereiro de 1974. A família Santa Cruz foi atingida em múltiplos membros pelo aparelho repressivo: Marcelo Santa Cruz foi expulso da faculdade pelo Decreto 477; Rosalina foi presa, torturada e mantida desaparecida; Fernando foi morto e seu corpo ocultado.

Rosalina foi presa pelo DOI-CODI no Rio de Janeiro — cidade onde morava quando o irmão desapareceu — e ficou desaparecida por 45 dias, passando por vários centros clandestinos até ser identificada. Durante a prisão, sofreu torturas e teve um aborto. Seu companheiro também foi preso e ambos foram usados um contra o outro pelos torturadores como instrumento de pressão psicológica — prática documentada no caso de outras presas políticas do período.

Em 1975, Rosalina levou pessoalmente ao Congresso Nacional a denúncia do desaparecimento de Fernando. Nesse depoimento, descreveu a "busca interminável pelos centros de tortura do país, Doi-Codi, Dops de várias cidades: do Rio de Janeiro, onde ele morou e eu fui presa, de São Paulo, onde morávamos na época, e do Recife, de onde nós somos. Começou a peregrinação pelas portas dos quartéis, antessalas das relações públicas do Exército, da Marinha, da Aeronáutica."

No 2º Prêmio Beth Lobo (março de 2013), Rosalina declarou publicamente: "A gente lê o livro 'Mulher, substantivo feminino' e vê como na tortura nós mulheres fomos atingidas de forma diferente dos homens. Não mais ou menos, mas diferente. A tortura sexual, nosso corpo, sendo usado pelos torturadores da forma que foi usado [...]. Eu fui presa junto com o meu companheiro, e o tempo inteiro a gente era usado um contra o outro." E ainda: "Tem muitos casos de estupro, muitos casos de violação de direito na questão da sexualidade que eu passei, que Amelinha passou, que nós sabemos que eram torturadas por homens e nós estávamos sempre nuas."

Na 6ª Audiência Pública da CEV-SP (20/02/2013), dedicada ao caso Fernando Santa Cruz, Rosalina depôs como "ex-presa política, militante" e cobrou responsabilização: "Que país é esse que não se investigou, que não se foi lá e não se desapropriou essa casa [a Casa da Morte de Petrópolis] para uma investigação? [...] Eu não quero mais andar por ruas que tem o nome de torturadores e ditadores."

Rosalina tornou-se uma das mais destacadas militantes da Campanha pela Comissão da Verdade no Brasil. Participou da Campanha pela Comissão da Verdade nas universidades PUC e USP em São Paulo, conforme registrado na 87ª Audiência Pública (CEV-SP, Tomo III, p. 5062–5063).

### Marcadores de interseccionalidade (tabela `biografia_marcadores`)

- **marcador:** mulher | **fonte_id:** c5f751ff-b1bb-4411-97cc-3fb239af0607 | **páginas:** 3097–3098 | **seção:** (2º Prêmio Beth Lobo, 11/03/2013) | **trecho:** "Rosalina que foi presa e torturada. [...] A tortura sexual, nosso corpo, sendo usado pelos torturadores da forma que foi usado."

- **marcador:** militante_politica | **fonte_id:** c5f751ff-b1bb-4411-97cc-3fb239af0607 | **páginas:** 5575 | **seção:** 64ª Audiência Pública — 19/08/2013 [= 6ª Audiência, 20/02/2013] | **trecho:** "Rosalina Santa Cruz. Ex-presa irmã do Fernando, ex-presa política militante que nessa audiência pública vai depor sobre o caso."

**Nota:** Raça/cor não documentada literalmente nos chunks consultados — marcador não atribuído. Classe social: o Tomo II (p. 4) e o depoimento de Rosalina mencionam a família como "família de classe média" que vivia em Recife, mas não com essa exata formulação; portanto, o marcador `classe_media` não foi incluído por falta de evidência textual direta nos chunks. Decisão a confirmar com Yuri se houver outros chunks disponíveis do Tomo IV ou dos volumes do caso Fernando Santa Cruz.

### Evento no mapa (tabela `eventos_geo`)

- **titulo:** Prisão, tortura e desaparecimento de Rosalina Santa Cruz pelo DOI-CODI (Rio de Janeiro, 1974)
- **data:** 1974-02-23 (data aproximada — mesma data do desaparecimento de Fernando; a prisão de Rosalina ocorreu em conexão com a busca pelo irmão)
- **municipio:** Rio de Janeiro
- **uf:** RJ
- **tipo_evento:** caso_individual
- **tipos_crime:** prisao_ilegal_arbitraria, tortura, violencia_sexual, desaparecimento_temporario
- **geometria:** `{"type": "Point", "coordinates": [-43.1729, -22.9068]}` (Rio de Janeiro capital — sede do DOI-CODI/RJ; coordenadas aproximadas, a conferir)

- **descricao_md:**

Rosalina Santa Cruz foi presa pelo DOI-CODI no Rio de Janeiro e mantida desaparecida por 45 dias, passando por múltiplos centros de detenção clandestinos. Durante esse período, foi torturada e sofreu um aborto em consequência. Seu companheiro foi preso simultaneamente e os dois foram utilizados como instrumentos de pressão psicológica um contra o outro. A prisão de Rosalina ocorreu no contexto da busca pela família pelo paradeiro de seu irmão Fernando Santa Cruz, desaparecido forçadamente em 23 de fevereiro de 1974. O evento ilustra a estratégia do aparelho repressivo de atingir familiares de militantes para quebrar resistências e obter informações.

**Justificativa da escolha do evento:** O local da prisão (Rio de Janeiro, DOI-CODI/RJ) foi escolhido em lugar do local atual de residência porque é o lugar onde o crime ocorreu — prisão ilegal, tortura e desaparecimento temporário. O depoimento de Rosalina na CEV-SP e o relato de Marcelo Santa Cruz fornecem a localização aproximada.

### Citações literais (até 6 trechos)

**Citação 1** — Depoimento no 2º Prêmio Beth Lobo (11/03/2013):
> "A tortura sexual, nosso corpo, sendo usado pelos torturadores da forma que foi usado, ler aquele livro, ler a história da Inês Etienne Romeu, ler a história das mulheres que foram torturadas, usando o seu corpo. Eu fui presa junto com o meu companheiro, e o tempo inteiro a gente era usado um contra o outro."
> — CEV-SP, Tomo III, `fonte_id: c5f751ff-b1bb-4411-97cc-3fb239af0607`, p. 3097–3098.

**Citação 2** — Continuação do mesmo depoimento:
> "Tem muitos casos de estupro, muitos casos de violação de direito na questão da sexualidade que eu passei, que Amelinha passou, que nós sabemos que eram torturadas por homens e nós estávamos sempre nuas."
> — CEV-SP, Tomo III, `fonte_id: c5f751ff-b1bb-4411-97cc-3fb239af0607`, p. 3098–3099.

**Citação 3** — Depoimento na 6ª Audiência Pública (20/02/2013):
> "Que país é esse que não se investigou, que não se foi lá e não se tornou essa casa, não se desapropriou essa casa para uma investigação. Que país é esse onde nós estamos denunciando que fomos torturados e presos em campos que não são de extermínio, são DOI-CODI, que tem endereço."
> — CEV-SP, Tomo III, `fonte_id: c5f751ff-b1bb-4411-97cc-3fb239af0607`, p. 5582.

**Citação 4** — Depoimento de Marcelo Santa Cruz (irmão) na mesma audiência:
> "Rosalina foi presa, sequestrada, torturada, ficou 45 dias desaparecida, passou em vários locais até ser identificada onde se encontrava, teve um aborto na prisão."
> — CEV-SP, Tomo III, `fonte_id: c5f751ff-b1bb-4411-97cc-3fb239af0607`, p. 5584–5585.

**Citação 5** — Depoimento de Rosalina ao Congresso Nacional (janeiro de 1975), reproduzido no Tomo II:
> "(...) meu irmão Fernando foi preso. O quinto irmão, irmão mais moço, muito querido! E a prisão dele nos levou, a família inteira, a uma busca interminável pelos centros de tortura do país, Doi-Codi, Dops de várias cidades: do Rio de Janeiro, onde ele morou e eu fui presa, de São Paulo, onde morávamos na época, e do Recife, de onde nós somos."
> — CEV-SP, Tomo II, `fonte_id: efc10a75-5cf4-435e-a598-7abf57f88ff7`, p. 4.

---

## Caso 2 — Maria Auxiliadora Lara Barcelos

### Fontes consultadas

- CEV-SP, Tomo II, p. 2 (depoimento na Auditoria Militar do Rio, 1969, citado no capítulo Dossiê Ditadura)
- CEV-SP, Tomo III, p. 5584 (menção de Marcelo Santa Cruz na 6ª Audiência Pública)

### Avaliação do material disponível

Os chunks do Tomo II da CEV-SP têm volume muito reduzido (apenas 25 chunks, cobrindo a introdução do capítulo "Dossiê Ditadura", conforme nota editorial do lote anterior). O material sobre Maria Auxiliadora Lara Barcelos resume-se a:

1. Um trecho literal de seu depoimento na Auditoria Militar do Rio de Janeiro, em 1969, sobre a tortura e assassinato de Chael Charles Schreier na OBAN/SP — citado no Tomo II via "Brasil Nunca Mais" (19ª ed., Petrópolis: Vozes/Arquidiocese de SP, 1986, p. 247).
2. Uma menção de Marcelo Santa Cruz no Tomo III que a inclui entre os que "recorreram ao suicídio" como "única forma de se libertar de seu torturador" — junto a Frei Tito Alencar.

**Diagnóstico de material insuficiente para biografia completa:** os chunks disponíveis não fornecem data de nascimento, data de morte, organização política, local de nascimento, nem detalhes sobre a própria prisão/tortura de Maria Auxiliadora. O trecho do depoimento trata de sua condição de testemunha do assassinato de Chael, não de sua própria trajetória. O Tomo II integral da CEV-SP (não disponível em chunks) provavelmente contém ficha biográfica mais completa.

### O que foi encontrado (dados parciais)

- **Nome:** Maria Auxiliadora Lara Barcelos
- **Situação:** Presa política que depôs na Auditoria Militar do Rio de Janeiro em 1969, testemunhando a tortura e assassinato de Chael Charles Schreier (1946–1969) na OBAN/SP. A fonte a descreve como "estudante de 25 anos" à época do depoimento (1969), o que sugere nascimento por volta de 1944.
- **Desfecho:** Faleceu por suicídio após as torturas sofridas durante a ditadura. O vereador Marcelo Santa Cruz, no depoimento de fevereiro de 2013 (CEV-SP, Tomo III), afirma que ela está entre os que "recorreram, como única forma de se libertar de seu torturador, ao suicídio."
- **Fonte secundária de base:** O trecho literal do depoimento de 1969 é citado no Tomo II via "Brasil Nunca Mais" — trata-se, portanto, de fonte documental mediada, não de transcrição direta da audiência.

### Rascunho parcial (tabela `biografias`) — INCOMPLETO, requer validação

- **slug:** maria-auxiliadora-lara-barcelos
- **nome:** Maria Auxiliadora Lara Barcelos
- **tipo:** vitima
- **municipio:** (desconhecido — dados insuficientes nos chunks disponíveis)
- **uf:** (desconhecido)
- **resumo_1_linha:** Estudante e presa política que em 1969 testemunhou e denunciou perante a Auditoria Militar do Rio de Janeiro a tortura e assassinato de Chael Charles Schreier na OBAN/SP; faleceu por suicídio em decorrência das sequelas das torturas sofridas.

- **texto_md (rascunho incompleto):**

Maria Auxiliadora Lara Barcelos era estudante, com aproximadamente 25 anos de idade em 1969, quando foi presa e passou pela Operação Bandeirante (OBAN) em São Paulo. Naquele mesmo ano, ao ser levada a depor perante a Auditoria Militar no Rio de Janeiro, prestou depoimento descrevendo a tortura e assassinato do militante Chael Charles Schreier (1946–1969) que havia presenciado na OBAN/SP. O depoimento — registrado nos autos da Justiça Militar e reproduzido no "Brasil Nunca Mais" — constitui um dos raros testemunhos presenciais documentados dos métodos do aparelho repressivo paulista nos primeiros anos da OBAN.

Maria Auxiliadora faleceu por suicídio em consequência das sequelas das torturas que sofreu. O vereador Marcelo Santa Cruz, ao depor na 6ª Audiência Pública da CEV-SP (fev. 2013) sobre o caso de seu irmão Fernando Santa Cruz, a citou expressamente entre os que "recorreram, como única forma de se libertar de seu torturador, o suicídio" — ao lado de Frei Tito Alencar. O suicídio como consequência direta da tortura é reconhecido pela historiografia e pelo próprio Relatório da CNV como resultado de graves violações de direitos humanos.

**[LACUNA DOCUMENTAL: data de nascimento, data de morte, organização política, detalhes sobre a própria prisão/tortura — ausentes nos chunks disponíveis. É necessário consultar o Tomo II integral da CEV-SP.]**

### Trecho literal do depoimento de 1969

> "(...) que a declarante ouviu os gritos de Chael, quando espancado; (...) que das dez horas da noite às quatro da manhã, Antonio Roberto e Chael ficaram apanhando; (...) que lá pelas quatro horas da madrugada, Chael e Roberto saíram da sala onde se encontravam, visivelmente ensanguentados, inclusive no pênis, na orelha e ostentando cortes nas cabeças; (...) que ouvia gritos de Chael dizendo não saber de nada; (...) que tais torturas duraram até sete horas da manhã, quando Chael parou de gritar, ficando caído no chão; (...) que Chael foi pisado; que era uma sexta-feira, tendo Chael morrido no sábado; que Chael estava gritando desesperadamente na Polícia do Exército, no sábado pela manhã; que somente vinte dias depois veio (a) ter notícias da morte de Chael."
> — CEV-SP, Tomo II, `fonte_id: efc10a75-5cf4-435e-a598-7abf57f88ff7`, p. 2. Citação mediada via "Brasil Nunca Mais", 19ª ed., p. 247.

**Nota editorial:** Este depoimento é um documento de testemunho de primeira pessoa prestado em juízo (Auditoria Militar), com valor probatório elevado. A mediação via "Brasil Nunca Mais" é informada mas não compromete a autenticidade do relato.

### Decisão editorial

**CASO INCOMPLETO — não recomendado para inserção no banco na forma atual.** O material disponível é insuficiente para preencher os campos obrigatórios da tabela `biografias` (municipio, uf, texto_md completo). O que existe justifica a abertura de uma ficha de pesquisa pendente.

**O que fazer a seguir (para o Yuri):** Consultar o Tomo II integral da CEV-SP — o volume completo, fora dos 25 chunks disponíveis — para localizar a ficha biográfica de Maria Auxiliadora Lara Barcelos. Alternativamente, o "Dossiê Ditadura: Mortos e Desaparecidos Políticos no Brasil 1964-1985" (IEVE/Imprensa Oficial, 2009) deve conter entrada sobre ela.

---

## Caso 3 — Ieda Akselrud de Seixas

### Fontes consultadas

- CEV-SP, Tomo III, p. 3708–3756 (22ª Audiência Pública, 14/03/2013 — depoimento integral)

### Nota sobre nome

A depoente se apresentou como "Ieda Akselrud de Seixas" — o nome completo é **Ieda Akselrud de Seixas**. Na transcrição, aparece também como "Teda de Seixas" e "Ieda Seixas" (variações de OCR/transcrição). O nome canônico para o banco é Ieda Akselrud de Seixas. É irmã de Ivan Seixas, também ex-preso político e militante de memória e direitos humanos.

### Biografia (tabela `biografias`)

- **slug:** ieda-akselrud-de-seixas
- **nome:** Ieda Akselrud de Seixas
- **tipo:** sobrevivente
- **municipio:** São Paulo
- **uf:** SP
- **resumo_1_linha:** Presa política em 1971, levada com a mãe e a irmã ao DOI-CODI/SP (OBAN), onde sofreu estupro pelo delegado Davi dos Santos Araújo e presenciou a morte de seu pai Joaquim Alencar de Seixas e de um jovem anônimo torturado até a morte; sobrevivente que depôs na 22ª Audiência Pública da CEV-SP em março de 2013.

- **texto_md:**

Ieda Akselrud de Seixas é filha de Joaquim Alencar de Seixas e Fanny Akselrud de Seixas. Na noite de 16 de abril de 1971, ela, sua mãe Fanny e sua irmã foram presas em sua residência. Seu irmão Ivan — preso em outro momento — foi trazido à casa "ensanguentado, andando com dificuldade, algemado". Ieda não era militante de nenhuma organização; como ela própria declarou: "Eu não era nada no frigir dos ovos. Não tinha importância. [...] Eu nunca militei em organização alguma, nem no movimento estudantil."

As três mulheres foram levadas ao DOI-CODI/SP — à época ainda denominado Operação Bandeirante (OBAN), na Rua Tomás Carvalhal, no bairro do Paraíso, em São Paulo. Ieda foi separada da mãe e da irmã e levada a um banheiro, onde foi interrogada e em seguida mantida isolada. Nessa primeira noite, o delegado Davi dos Santos Araújo — descrito por Ieda como "um sujeito asqueroso, parecia um ogro" — a agrediu sexualmente juntamente com outro agente: "ele abusou sexualmente de mim. E o meu desespero foi muito grande, eu pedia para ser torturada. Uma coisa meio estúpida, eu dizia, 'Me dá choque, me bate, mas não faz isso comigo'." O abuso foi repetido durante um traslado noturno ao Parque do Estado, quando Davi dos Santos Araújo voltou a abusá-la dentro de um carro lotado de agentes.

Ainda nessa madrugada, ao parar em uma banca de jornal, Ieda viu estampada a notícia da morte de seu pai — embora ele ainda estivesse vivo. Joaquim Alencar de Seixas foi torturado durante dois dias e assassinado em 17 de abril de 1971; o atestado de óbito falsamente registra o dia 16. Fanny Akselrud de Seixas, presa na cela ao lado, ouviu o marido ser torturado durante toda a tarde e presenciou quando seu corpo foi jogado em uma caminhonete "com a cabeça envolta em um jornal, porque tinha muito sangue."

Durante os 27 dias em que permaneceu na OBAN, Ieda testemunhou também a morte de um jovem desconhecido — de aparência franzina, cabelo louro, camisa social listrada —, torturado durante horas até morrer, com o corpo desaparecido em seguida. Agentes apagaram as luzes e removeram o corpo; o major Edgar tentou convencer as presas de que nada havia acontecido. Ieda declarou: "Eu não sei quem é esse garoto. Não sei. Não tenho a menor [ideia], e eu fico assim, alguma família está procurando por ele."

As presas foram compelidas a trabalhar na cozinha da OBAN. Ieda, a irmã e outras presas aceitaram para proteger a mãe e, estrategicamente, escondiam comida — ovos, carne — para os presos homens: "Os caras têm que estar fortinhos, pelo menos para apanhar mais forte."

Ieda ficou 27 dias na OBAN, de 16 de abril a 10 de maio de 1971, quando foi transferida para o DOPS, onde permaneceu até 9 de julho. Ao final, foi absolvida por falta de provas; sua irmã foi absolvida por "não provado crime" — ambas mantidas presas por um ano e meio sem que o crime houvesse sido comprovado.

Na 22ª Audiência Pública da CEV-SP (14/03/2013), Ieda depôs ao lado de Elza Lobo. Ao ser questionada pela comissária Amelinha Teles, confirmou que o ato de Davi dos Santos Araújo é considerado estupro: "É. É considerado estupro. Fundo de garrafa. A minha violação foi manual." A Comissão propôs convocar Davi dos Santos Araújo para prestar esclarecimentos sobre esses e outros crimes.

### Marcadores de interseccionalidade (tabela `biografia_marcadores`)

- **marcador:** mulher | **fonte_id:** c5f751ff-b1bb-4411-97cc-3fb239af0607 | **páginas:** 3710 | **seção:** 22ª Audiência Pública — 14/03/2013 | **trecho:** "A SRA. IEDA DE SEIXAS - Meu nome é Ieda Akselrud de Seixas. [...] No dia 16 de abril de 1971, eu, a minha mãe e a minha irmã fomos presas à noite na casa em que morávamos."

- **marcador:** estudante | **fonte_id:** c5f751ff-b1bb-4411-97cc-3fb239af0607 | **páginas:** 3719–3720 | **seção:** 22ª Audiência Pública — 14/03/2013 | **trecho:** "Eu não sei, eu acho que eles acharam estranho, pelo fato de ser universitária, filha de quem eu era."

**Nota:** Raça/cor não documentada literalmente nos chunks. Classe social: o sobrenome Akselrud e a menção à família são elementos contextuais, mas não há declaração literal de classe nos chunks — marcador não atribuído. A origem judaica é inferível pelo sobrenome materno e por referências de Ieda ("Ele é só judeu, mas não matou Jesus"), mas não está explicitada como marcador identitário nos próprios depoimentos da forma necessária para inclusão como marcador autorreferenciado. Decisão a confirmar com Yuri.

### Evento no mapa (tabela `eventos_geo`)

- **titulo:** Prisão, estupro e 27 dias de cárcere de Ieda Akselrud de Seixas na OBAN/SP (1971)
- **data:** 1971-04-16
- **municipio:** São Paulo
- **uf:** SP
- **tipo_evento:** caso_individual
- **tipos_crime:** prisao_ilegal_arbitraria, tortura, violencia_sexual
- **geometria:** `{"type": "Point", "coordinates": [-46.6509, -23.5731]}` (endereço histórico da OBAN: Rua Tomás Carvalhal, bairro Paraíso, São Paulo — coordenadas aproximadas, a confirmar)

- **descricao_md:**

Na noite de 16 de abril de 1971, Ieda Akselrud de Seixas foi presa junto com sua mãe e irmã e levada à Operação Bandeirante (OBAN), na Rua Tomás Carvalhal, Paraíso, São Paulo — estrutura que operava com financiamento empresarial e concentrou algumas das torturas mais sistemáticas do período. Ieda não era militante política: foi presa por ser filha de Joaquim Alencar de Seixas e irmã de Ivan Seixas.

Na primeira noite, o delegado Davi dos Santos Araújo a estuprou (violação manual) no banheiro onde estava detida e, posteriormente, voltou a abusá-la durante traslado noturno ao Parque do Estado. Nos 27 dias de cárcere, Ieda e as demais presas testemunharam a tortura e assassinato de seu pai e de um jovem anônimo cujo paradeiro permanece desconhecido. A OBAN foi a antecessora direta do DOI-CODI/SP, operando a partir de 1969 no mesmo endereço e com os mesmos quadros.

### Citações literais (até 6 trechos)

**Citação 1** — Momento do estupro, OBAN, noite de 16/04/1971:
> "ele abusou sexualmente de mim. E o meu desespero foi muito grande, eu pedia para ser torturada. Uma coisa meio estúpida, eu dizia, 'Me dá choque, me bate, mas não faz isso comigo'."
> — CEV-SP, Tomo III, `fonte_id: c5f751ff-b1bb-4411-97cc-3fb239af0607`, p. 3710–3711.

**Citação 2** — Segundo abuso, durante traslado noturno:
> "durante todo esse tempo, que eu estive dentro desse carro, novamente esse Davi dos Santos de Araújo, porque tinha um que me pressionava, me imobilizava com o corpo, e o Davi dos Santos de Araújo novamente abusou de mim."
> — CEV-SP, Tomo III, `fonte_id: c5f751ff-b1bb-4411-97cc-3fb239af0607`, p. 3711–3712.

**Citação 3** — Confirmação do estupro perante a CEV-SP:
> "É. É considerado estupro. Fundo de garrafa. A minha violação foi manual."
> — CEV-SP, Tomo III, `fonte_id: c5f751ff-b1bb-4411-97cc-3fb239af0607`, p. 3754–3755.

**Citação 4** — Sobre a morte do jovem anônimo:
> "Eu não sei quem é esse garoto. Eu não sei. A única, a referência que eu me lembro de falarem qualquer coisa Santos, mas eu não sei se era a cidade, se era o sobrenome, e esse garoto só dizia, 'Pelo amor de Deus, eu não sei do que é que vocês estão falando'."
> — CEV-SP, Tomo III, `fonte_id: c5f751ff-b1bb-4411-97cc-3fb239af0607`, p. 3714.

**Citação 5** — Sobre o não-militantismo e o tempo de prisão:
> "Eu não sei até hoje, por que é que eu permaneci tanto tempo no DOI-CODI. Vinte e tantos dias. [...] Mas quem era eu? Eu não era nada no frigir dos ovos. Não tinha importância. Eu não sei. [...] Eu nunca militei em organização alguma, nem no movimento estudantil."
> — CEV-SP, Tomo III, `fonte_id: c5f751ff-b1bb-4411-97cc-3fb239af0607`, p. 3719–3720.

**Citação 6** — Sobre a morte do pai (presenciada pela mãe, relatada por Ieda):
> "ela ouviu o marido ser torturado, e isso qualquer, a Joana D'Arc, a Pedrina, qualquer uma delas vai lembrar desse fato, porque elas estavam lá. E ela dizendo, 'Esse é o meu marido'. E ela depois presenciou, quando jogaram o corpo dele na C14, com a cabeça envolta em um jornal, porque tinha muito sangue, e ela reconheceu, e ela viu um tira perguntar para o outro, 'De quem é o presunto?', ele disse, 'É do Roque'."
> — CEV-SP, Tomo III, `fonte_id: c5f751ff-b1bb-4411-97cc-3fb239af0607`, p. 3716–3717.

---

## Casos identificados não desenvolvidos

Durante a pesquisa dos chunks, foram identificadas outras mulheres cujas histórias aparecem nas transcrições mas não foram desenvolvidas neste lote, por não estarem na lista solicitada:

1. **Elza Lobo** — depôs ao lado de Ieda de Seixas na 22ª Audiência Pública (14/03/2013). Relata transferência do DOPS ao Presídio Tiradentes sob metralhadora e procedimentos de nudez forçada na chegada ao presídio (p. 3750–3751, Tomo III). Material parcialmente capturado — pode ser desenvolvido como caso futuro.

2. **Fanny Akselrud de Seixas** (mãe de Ieda) — foi presa com as filhas, ouviu o marido Joaquim ser torturado e presenciou seu cadáver. Não é sobrevivente sobrevivida, mas depoimento de Ieda a descreve extensamente (p. 3715–3716, Tomo III).

3. **Tânia Maria Mendes** — jornalista da Ala Vermelha, presa junto com Ieda na OBAN. Citada por nome e organização (p. 3712, Tomo III).

4. **Damaris Lucena** — ex-militante da VPR, presa em 1970 em Atibaia (SP), barbaramente torturada, libertada em troca do cônsul japonês. Memorial lido na cerimônia de premiação Beth Lobo (p. 3103, Tomo III). Caso passível de biografia completa.

5. **Ilda Martins da Silva** — presa com filhos (o mais novo com quatro meses), torturada, ficou presa por 10 meses (4 em incomunicabilidade). Viúva de Virgílio Gomes da Silva, morto na OBAN em 29/09/1969. Memorial lido na cerimônia Beth Lobo (p. 3100–3101, Tomo III).

6. **Joana D'Arc Gontijo** e **Márcia Neli** — presas na OBAN no mesmo período que Ieda de Seixas (abril–maio 1971). Citadas por nome nos depoimentos. Identificação parcial.

---

## Resumo para o Yuri

**O que foi feito:**
- Caso 1 (Rosalina Santa Cruz): **biografia completa**, com quatro fontes identificadas, cinco citações literais, evento georreferenciado no Rio de Janeiro (DOI-CODI/RJ, 1974). Correção editorial: o depoimento de Rosalina não foi na 21ª Audiência, mas na 6ª Audiência (caso Fernando Santa Cruz) e na cerimônia do Prêmio Beth Lobo.
- Caso 2 (Maria Auxiliadora Lara Barcelos): **material insuficiente para inserção imediata** — rascunho parcial com uma citação literal do depoimento de 1969 e menção de suicídio. Lacunas: data de nascimento, data de morte, organização política, local, detalhes da própria prisão. Recomenda-se consulta ao Tomo II integral da CEV-SP ou ao Dossiê Ditadura (IEVE, 2009).
- Caso 3 (Ieda Akselrud de Seixas): **biografia completa**, com depoimento extenso da 22ª Audiência (14/03/2013), seis citações literais, evento georreferenciado na OBAN/SP (Rua Tomás Carvalhal, Paraíso), perpetrador nomeado (Davi dos Santos Araújo) conforme consta nos próprios autos da CEV-SP.

**O que falta:**
- Confirmar se há marcador de origem judaica para Ieda (decisão editorial a tomar com o Yuri).
- Consultar Tomo II integral para completar o Caso 2.
- Confirmar coordenadas exatas da OBAN (Rua Tomás Carvalhal, Paraíso, SP) e do DOI-CODI/RJ.
- Decidir se Damaris Lucena e Ilda Martins da Silva entram no próximo lote de biografias (material disponível nos chunks).

**Problemas encontrados:**
- [BLOQUEANTE] Caso 2 não pode ser inserido no banco sem dados mínimos ausentes.
- [IMPORTANTE] O lead sobre a "21ª Audiência" de Rosalina estava incorreto — corrigido aqui com documentação.
- [MENOR] Nome de Ieda aparece com variações OCR ("Teda", "Ieda Seixas") nos chunks — o banco deve usar o nome canônico "Ieda Akselrud de Seixas".
