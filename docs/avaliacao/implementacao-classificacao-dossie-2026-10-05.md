# Classificação e catálogo do Dossiê — aplicação verificada (05/10/2026)

> Atualização posterior à aplicação: os rótulos e glossários estão no candidato final READY `dpl_67Q3jyeCGNqNhARrEWPToNPetkwy`, com12/12casos remotos aprovados. O domínio público ainda aguarda decisão de publicação. O estado da etapa de migração abaixo foi preservado; veja `verificacao-candidato-classificacao-final-2026-10-05.md`.

Estado: migração 0033 aplicada e classificação atualizada após autorização explícita de Yuri. Catálogo e banco coincidem; os 2.773 chunks e seus embeddings foram preservados. As APIs do candidato e do domínio público entregam a nova classificação e a nota. Não houve reindexação, fusão/exclusão do duplicado, geração paga ou publicação de novo deploy. Os rótulos e glossários atualizados permanecem na branch de entrega, aguardando deploy.

O registro completo da execução é `registro-aplicacao-classificacao-dossie-2026-10-05.json`. A preparação descrita abaixo foi concluída antes da autorização, conforme CLAUDE.md.

## Decisão e escopo

A [revisão histórica](decisao-classificacao-dossie-2026-10-05.md) distingue
`compilacao_documental` de relatório oficial, testemunho individual e material
didático. A confiabilidade do Dossiê permanece `alta`, com crítica por trecho.
Não foi adotado o subtipo opcional, nem criado um novo nível de confiabilidade.

No registro `efc10a75-5cf4-435e-a598-7abf57f88ff7`, a aplicação autorizada mudou
somente `tipo_fonte` e `nota_contexto`; os sete campos bibliográficos já corrigidos,
os 2.773 chunks e seus embeddings permanecem preservados. O registro vazio
`d6f2e787-ee4a-49a3-9992-534be02ba8f2` não será alterado, excluído ou fundido.

## Catálogo e proveniência

`pipeline/fontes.json` usa o UUID canônico, o hash esperado, autoria de
Familiares/IEVE, o PDF completo e os metadados corrigidos. A obra da CEV-SP
`cev-sp-rubens-paiva-tomo2` permanece uma síntese distinta, com sua URL, hash
e classificação próprios; corrigiu-se apenas a alegação de que o livro completo
não havia sido localizado.

`pipeline/manifesto.json` conserva os valores anteriores em
`historico_reconciliacao`. A data do download comprovado é 05/10/2026, com
precisão de dia; o horário não foi inventado. A integridade do exemplar local
foi conferida: 77.707.471 bytes, SHA-256
`e902047328adfa21ca523121684dd657ded74e28015199e2df59950cba0758a4`.

O indexador individual deve conferir a identidade documental antes de escolher
uma fonte, carregar o modelo ou escrever. A reindexação destrutiva não é
transacional e continua exigindo backup e autorização; esta fase não a executa.
O indexador em lote da Covemg não é objeto desta correção e não deve ser usado
para o Dossiê.

Antes da aplicação, os dois campos de classificação divergiam do catálogo e a ingestão deveria interromper sem escrita. Após a aplicação, os metadados do catálogo e do registro real coincidem integralmente.

## Migração e verificações já realizadas

`0033_compilacao_documental.sql` amplia a restrição de tipos e exige nota não
vazia para a nova categoria. Não muda as categorias existentes ou a regra de
confiabilidade; não modifica registros ou chunks por si só.

O ensaio em tabela temporária passou com rollback: categoria aceita, nota vazia
rejeitada, categoria desconhecida rejeitada e registro duplicado preservado.
As fontes reais permaneceram `relatorio_oficial` durante o ensaio.

O histórico remoto já contém 0001–0032. A CLI confirmou em dry-run que somente
0033 seria aplicada, usando cópia isolada dessas migrações em
`/tmp/bacuri-migracao-classificacao-20261005`. Não se deve usar diretamente uma
checkout que omita versões já existentes no histórico remoto.

O atalho local da CLI Supabase está separado de seu binário Go; o dry-run usou
o binário da instalação npm completa já existente, sem reinstalar ou alterar
o sistema. Uso de `--dry-run` e histórico conferidos na
[documentação oficial da CLI](https://github.com/supabase/cli/blob/develop/apps/cli/docs/supabase/db/push.md).

Typecheck e lint passaram; os rótulos e os dois glossários incluem o texto
aprovado pela revisão histórica. A API mantém o formato: `tipo_fonte` é string.

Os sete testes de `pipeline/tests/test_identidade_documental.py` passaram.
Eles verificam o UUID em presença de URL duplicada, UUID ausente/divergente,
ambiguidade sem UUID, identidade por manifesto/hash, diagnóstico sem escrita
nem importação do modelo, recusa da substituição sem opção explícita e falha
de embeddings antes de qualquer exclusão. A preparação exige um vetor finito
de 384 dimensões por chunk; uma fonte nova só é registrada depois dessa validação.
Registros legados sem `slug` no manifesto só são aceitos se o caminho local
coincidir exatamente com `dados/brutos/{slug}.pdf` e a URL identificar o documento,
sem escolher arbitrariamente uma entrada.

A conferência do catálogo contra o snapshot real confirmou que apenas
`tipo_fonte` e `nota_contexto` divergem enquanto a migração está pendente;
os metadados bibliográficos já coincidem. Esta conferência não grava dados.

Evidências locais em `output/classificacao-dossie-2026-10-05/`:
`estado-banco-antes.json`, `fontes-antes.json`, `manifesto-antes.json`,
`proposta-classificacao.json`, `simulacao-banco.json`,
`historico-migracoes.json`, `plano-migracao-cli.txt`,
`rollback-classificacao.json` e `conferencia-catalogo.json`.

## Roteiro de aplicação executado após confirmação

1. Conferir novamente o estado da fonte, a contagem de chunks e o histórico;
   interromper se houver alteração desde a preparação.
2. Guardar rollback dos dois campos e definições anteriores das restrições.
3. Aplicar somente 0033 pela CLI na cópia isolada, registrando-a no histórico.
4. Atualizar os dois campos somente no UUID canônico, com condição sobre os
   valores anteriores; nenhum campo do duplicado ou dos chunks será escrito.
5. Conferir a equivalência com o catálogo, a preservação dos chunks e do registro
   vazio, e a entrega da classificação pela API. Registrar resultados.

O rollback de dados deve preceder eventual reversão das restrições e exige
autorização própria. Se outras fontes já usarem a nova categoria, não se pode
retirá-la automaticamente. A publicação dos novos rótulos exige deploy posterior;
esta preparação não promove nenhum candidato ao domínio público.


## Resultado da aplicação autorizada

A primeira tentativa da CLI pela porta 6543 falhou com prepared statement already exists. Uma leitura posterior confirmou que restrições, fontes, histórico e hashes dos chunks não haviam mudado. A migração foi aplicada pela conexão em modo sessão (porta 5432), mantendo as credenciais apenas no processo, conforme a [documentação do Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres). Não foi necessário editar o arquivo de ambiente.

Somente 0033 entrou no histórico. A atualização condicional alterou apenas tipo_fonte e nota_contexto do UUID canônico. Confiabilidade alta, bibliografia, demais fontes e registro duplicado vazio foram preservados. A comparação do hash agregado de todas as colunas dos 2.773 chunks, inclusive embeddings, foi idêntica antes e depois. As duas APIs retornaram HTTP 200 e os novos metadados, sem chamadas ao LLM.

Evidências adicionais em output/classificacao-dossie-2026-10-05/: preflight-aplicacao.json, estado-apos-falha-cli.json, dry-run-aplicacao-sessao.json, resultado-migracao-sessao.json, estado-apos-migracao.json, rollback-metadados-aplicacao.json, fonte-classificada.json, estado-validado.json, validacao-aplicacao.json e validacao-api.json.
