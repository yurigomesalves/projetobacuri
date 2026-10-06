# Verificação de resumos e concisão — 6 de outubro de 2026

Implementação em branch isolado `melhoria/resumos-concisao-20261006`, baseada no main reconciliado. PR [#3](https://github.com/yurigomesalves/projetobacuri/pull/3) em rascunho. A versão pública continua no deployment `dpl_67Q3jyeCGNqNhARrEWPToNPetkwy`.

## Comportamento

A instrução de geração distingue resumo de 2–3 frases sem marcadores e desenvolvimento citado. A meta de 250–450 palavras e até seis parágrafos não corta texto automaticamente. Atribuições, cadeias indiretas e ressalvas têm prioridade. Mantidos fallback de resumo vazio, validação de referências, saída de 4.096 tokens e prazo compartilhado de 20 segundos, sem chamadas pagas adicionais para corrigir o formato.

O script operacional permite selecionar `AVALIACAO_SMOKE_CASOS=S01,S03,S04,S06`; S01 é obrigatório porque fornece a continuidade S12, executada ao final. Sem essa variável, conserva a bateria completa. Cada resultado documental agora informa resumo vazio, marcadores no resumo, palavras, blocos separados por linhas vazias e rótulos internos. Essas medidas não comprovam sustentação histórica; metas de apresentação ficam separadas da aprovação do contrato.

## Validação local

152 testes em 20 arquivos passaram, incluindo preservação de texto com separadores posteriores ou lados vazios e medidas de apresentação independentes das citações. Lint, checagem de tipos, autoteste do script e build webpack passaram. O build local usa as dependências existentes; a compilação remota da Vercel também passou.

## Primeira amostra

Código `5ef8f06e7cf73c024e4a527f07b076deadcc0aac`; candidato `dpl_2kRiwxXnVkNJdST9v1GVGQ6j624j`, READY, criado com configuração de produção e `--skip-domain`, sem promover o domínio público.

| Caso | Palavras no desenvolvimento | Blocos | Resumo preenchido sem marcadores |
| --- | ---: | ---: | --- |
| S01 | 849 | 7 | Sim |
| S03 | 553 | 6 | Sim |
| S04 | 553 | 5 | Sim |
| S06 | 516 | 6 | Sim |
| S12 | 881 | 7 | Sim |

5/5 casos passaram nos critérios operacionais; 33 citações encontraram correspondência única com os trechos do banco em 23 consultas somente de leitura. A concisão exige revisão: nenhum desenvolvimento ficou no intervalo de palavras pretendido. O máximo observado de duração do cliente foi 14.380,4 ms, em amostra pequena. Isso não estabelece uma garantia de latência.

Evidências locais em `output/resumos-concisao-2026-10-06/`: respostas sanitizadas sem token de continuidade, relatório operacional, medidas de apresentação e trechos integrais associados para revisão editorial. O custo observado desta amostra foi US$ 0,015174216; contabilização sujeita a atraso.

Esta primeira amostra não autoriza publicação. Revisão editorial e eventual reforço da instrução de concisão devem preceder a apresentação do candidato final. Nenhuma avaliação científica v4, reindexação ou migração de banco foi executada.

## Segunda amostra e ajuste de continuidade

O curador aprovou a seleção dos pontos necessários à pergunta em vez de inventariar todos os trechos. O candidato `dpl_2w69jNsMrXxX7KTXLf9MVo8ouCTn`, código `6430d94`, passou nos cinco casos; palavras 324/446/439/560/379 e blocos 5/6/5/8/5. S12 conservou o fallback seguro de resumo vazio. A auditoria editorial não encontrou veto histórico, mas registrou a pendência de apresentação e a extensão de S06. Evidências preservadas em `output/resumos-concisao-final-2026-10-06/`; 27 citações únicas, 20 consultas somente leitura.

Após revisão do curador, a instrução geral foi delimitada: marcadores acompanham as afirmações factuais no desenvolvimento após `---`; a síntese permanece obrigatória também na continuidade e não recebe marcadores. O parser, o fallback e o tratamento das citações não foram alterados para forçar um resumo artificial.

## Candidato 03

Código `6e74581`, deployment `dpl_GjrwujcRKMn6QgisH6WeNebG8jQN`, URL https://projetobacuri-5u9ulpzyc-yuri-gomes-alves-projects.vercel.app, READY com configuração de produção e acesso protegido. Criado sem promover `memoria-e-verdade.vercel.app`.

| Caso | Palavras | Blocos | Resumo preenchido sem marcadores |
| --- | ---: | ---: | --- |
| S01 | 410 | 6 | Sim |
| S03 | 358 | 6 | Sim |
| S04 | 481 | 5 | Sim |
| S06 | 406 | 5 | Sim |
| S12 | 330 | 5 | Sim |

5/5 casos passaram nos critérios operacionais. Não apareceram rótulos internos. Todos ficaram dentro da orientação de seis blocos; quatro no intervalo de 250–450 palavras, com S04 acima da meta em 31 palavras. As 23 citações tiveram correspondência única em 19 consultas somente de leitura. O máximo observado de duração do cliente foi 14.426,4 ms.

Em comparação exploratória com os cinco textos do candidato publicado, a média de palavras do campo `resposta` caiu de 753,4 para 397,0 (aproximadamente 47%). Os dois textos antigos com resumo vazio continham o texto integral preservado, enquanto os novos separam a síntese; essa diferença de formato e a amostra pequena limitam a comparação. Não se trata de avaliação estatística da qualidade nem garantia para novas perguntas.

Os 152 testes passaram novamente após essa mudança. Lint e checagem de tipos passaram; o build remoto do candidato também passou. A auditoria editorial vetou o candidato 03: S04 completou uma citação interrompida sem apoio no chunk e S01 descreveu uma nota sem marcador. Correspondência de citações e qualidade de apresentação não bastam para comprovar sustentação histórica. Esse candidato não deve ser publicado. Evidências preservadas em `output/resumos-candidato-03-2026-10-06/`; os resultados anteriores não foram sobrescritos.

Consumo observado das três rodadas: US$ 0,039172272 (de US$ 0,127067460 a US$ 0,166239732). Restante observado no limite mensal de US$ 5: US$ 4,833760268, sujeito a atraso de contabilização. Não houve chamada adicional de correção no fluxo do usuário; as rodadas foram testes explícitos de candidatos diferentes.

O fallback ainda pode ser necessário em futuras gerações; a falha de S12 na segunda amostra foi mantida no registro. A extensão é orientação editorial, não limite que apaga conteúdo. PR permanece em rascunho e a publicação requer decisão específica sobre este candidato após revisão das evidências.

## Candidato 04 e reteste focalizado

Código `c834f98`, deployment `dpl_DAwNZu2hLRLv7DBVpyecUiPKmV7P`, confirmado READY por inspeção independente apesar de erro transitório de autorização no acompanhamento da CLI. As instruções passaram a proibir completar trechos interrompidos e a explicitar que nomear uma fonte não substitui o marcador. O login permaneceu válido; não houve novo login nem repetição do deploy.

A amostra inicial teve três aprovações: S01 retornou 500 por prazo, conforme indicadores sanitizados dos logs; S12 não foi executado porque dependia do token de S01. O reteste somente de S01/S12 passou no contrato, mas S12 voltou ao fallback de resumo vazio. O prazo compartilhado não foi aumentado e não foi introduzida repetição paga no fluxo do usuário. Evidências preservadas em `output/resumos-candidato-04-2026-10-06/` e `output/resumos-candidato-04-reteste-2026-10-06/`. Esta rodada não atende à meta de cinco resumos preenchidos.

## Organização das instruções após o histórico

Para avaliar a influência do histórico sobre o formato, a orientação existente foi movida para uma mensagem de sistema após o histórico, antes da pergunta atual. Não houve duplicação da orientação, alteração do histórico nem nova chamada ao modelo. As regras editoriais e fontes continuam na primeira mensagem de sistema. O teste verifica histórico intacto e orientação confiável sem incorporar a pergunta ou o histórico como instruções. O contrato `Message[]` do [OpenRouter](https://github.com/openrouterteam/docs/blob/main/api_reference/overview.mdx) foi conferido na documentação atual; a eficácia da organização depende da avaliação real, não apenas da aceitação sintática.

## Candidato 05 — amostra de aceitação

Código `9d7c8a6`, deployment `dpl_5Aefw5cPyifaVHg8cKtVEzX8HPJ3`, URL https://projetobacuri-aw30cyvmo-yuri-gomes-alves-projects.vercel.app, READY com configuração de produção e proteção de acesso. O domínio público segue no deployment anterior; não foi promovido este candidato.

| Caso | Palavras | Blocos | Resumo preenchido sem marcadores |
| --- | ---: | ---: | --- |
| S01 | 359 | 5 | Sim |
| S03 | 384 | 5 | Sim |
| S04 | 389 | 5 | Sim |
| S06 | 374 | 5 | Sim |
| S12 | 291 | 5 | Sim |

5/5 casos passaram no contrato e nas metas de apresentação da amostra, sem rótulos internos. As 22 citações tiveram correspondência única com os trechos em 18 consultas somente de leitura. O máximo observado de duração do cliente foi 12.157,2 ms. Isso não garante latência nem formato em futuras gerações; o fallback continua disponível.

A média de palavras do campo `resposta` nesta amostra foi 359,4, contra 753,4 nos cinco textos do candidato publicado (redução exploratória de aproximadamente 52%). A comparação tem as mesmas limitações de formato e tamanho amostral descritas acima. A auditoria editorial final fica em `auditoria-resumos-candidato-05-2026-10-06.md` e deve ser consultada separadamente da validação estrutural.

Os 152 testes passaram após a organização final das mensagens, com lint e checagem de tipos sem erros e build remoto aprovado. Evidências completas em `output/resumos-candidato-05-2026-10-06/`; todos os candidatos e a falha de prazo anteriores foram mantidos em seus diretórios originais.

Consumo observado desde o início das avaliações desta implementação: US$ 0,065337888 (de US$ 0,127067460 a US$ 0,192405348), incluindo as rodadas substituídas e o reteste focalizado. Restante observado no limite mensal de US$ 5: US$ 4,807594652. A contabilização pode ter atraso ou incluir outra utilização simultânea da chave.

A entrega contém apenas a implementação, os testes, os relatórios e a proteção de `.local`; configuração pessoal, pesquisa e evidências brutas ficam locais. Nenhuma migração, reindexação ou etapa experimental foi ativada. A autorização anterior cobria a versão já publicada; a mesclagem deste PR e a promoção do candidato 05 dependem de uma nova decisão específica, conforme o plano aprovado.

### Decisão editorial da amostra final

O curador retirou o veto desta amostra e recomendou seguir com ressalva menor. Os cinco resumos e desenvolvimentos têm apoio nos trechos; S04 não completou a citação interrompida, S01 não deixou a descrição de nota sem marcador, S06 preservou a cadeia indireta e S03 manteve a atribuição testemunhal. A ressalva é de concordância no resumo S03: “ataques armados e aéreas”, em vez de “ataques armados e aéreos”. A resposta registrada não foi editada para ocultar o erro. A revisão não certifica outras gerações, corpus, PDFs integrais ou avaliação v4, nem substitui a decisão de publicação.

A consulta de logs do candidato 05 não encontrou HTTP 5xx na janela iniciada em 2026-10-06T04:22:00Z. A ocorrência de prazo do candidato 04 permanece registrada; a consulta final é observação pontual, não garantia de disponibilidade.
