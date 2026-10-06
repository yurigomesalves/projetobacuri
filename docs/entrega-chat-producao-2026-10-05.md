# Entrega do chatbot — 05/10/2026

Branch: `entrega/chat-producao-20261005`, baseada em
`85ecfdf09e6b9832a6f61a8e256ef8c13ef14965`.

## Conteúdo

Prazo compartilhado de processamento, cancelamento de rede, fallback vetorial
em falha da recuperação experimental, normalização das citações e preservação
do texto integral quando o resumo tem formato inválido. Prompt com regra de
escopo e atribuição revisada pelo curador. Modelo de embedding preparado no
build e incluído na função de chat; pesos e credenciais fora do Git.
Etapas experimentais permanecem desligadas na configuração proposta.

## Correspondência com o candidato

Deployment testado: `dpl_D2atEEe3Ny6kmErmhWcuqQ2hUJSu`, READY,
`https://projetobacuri-2osa0bxht-yuri-gomes-alves-projects.vercel.app`.
Manifesto de referência: `manifesto-chat-validado-2026-10-05.json` nesta pasta.
Dos 84 arquivos do manifesto, 82 são idênticos na entrega. As duas diferenças
administrativas são `package.json`, que omite o comando de avaliação científica
`avaliar:reranqueamento` fora desta entrega, e `.vercelignore`, ampliado para
excluir pesquisa, dados brutos, arquivos locais e testes do envio à Vercel.
O código de aplicação, configurações Next.js, dependências e lockfile são iguais.

## Verificação

- Entrega isolada: 144 testes em 19 arquivos, lint, typecheck e build webpack aprovados.
- Simulação CLI do envio: 92 arquivos, 1.520.168 bytes; sem `.env`, pesos,
  dados de pipeline, testes, saídas de avaliação ou pasta temporária.
- Candidato remoto: bateria técnica 12/12 aprovada; logs de erro consultados sem registros.
- Artefatos da bateria preservados localmente na pasta principal, em
  `output/smoke-candidato-producao-20261005-02.json` e
  `output/respostas-candidato-producao-20261005-02/`; não incluídos nesta branch.
- Consumo observado da chave exclusiva: US$ 0,023986896; teto mensal US$ 5.

## Estado de publicação

Esta entrega não implica aprovação histórica das respostas nem promoção do
domínio. Na última inspeção, `memoria-e-verdade.vercel.app` permanece em
`dpl_7CuqHSYBaHrSdz7ZTNVHSL5ZxNcX`. As auditorias editoriais anexas se referem
à amostra da prévia; as novas respostas do candidato exigem conferência editorial
e humana antes da decisão final. Avaliação científica v4 permanece pendente.
Não houve migração de banco nesta consolidação.

## Conferência posterior do candidato

As respostas reais do candidato foram auditadas na amostra S01, S03, S04,
S06 e S12: 37 citações associadas sem ausência ou ambiguidade. Resultado em
`avaliacao/auditoria-editorial-candidato-producao-2026-10-05.md`.
A ficha `avaliacao/conferencia-humana-candidato-producao-2026-10-05.md`
preserva literalmente respostas e resumos; decisão humana permanece em branco.
Há uma ressalva menor S06 [5], descrita na auditoria e na ficha, após conferência
assistida do exemplar local do PDF. A revisão assistida não aprova a publicação.
O código de aplicação permanece o do commit `aa40d67`, sem novo deployment.

## Decisão humana recebida

Yuri registrou em 05/10/2026 decisão de seguir com pendências na amostra,
aceitando a ressalva S06 [5]. A ficha preenchida e o resumo da decisão estão
em `avaliacao/conferencia-humana-preenchida-2026-10-05.md` e
`avaliacao/registro-decisao-humana-candidato-2026-10-05.md`.
Posteriormente à primeira auditoria, a divergência entre referência da síntese
de 16 páginas e trechos do Dossiê completo gerou pendência de publicação.
Ela continua não resolvida nos metadados e não foi dispensada pelo aceite humano.
O próximo trabalho é corrigir a referência com proveniência verificável e
validar novamente as citações afetadas. Não houve promoção nesta etapa.

## Correção bibliográfica aplicada com autorização

Após confirmação explícita de Yuri, foram atualizados sete campos da fonte
`efc10a75-5cf4-435e-a598-7abf57f88ff7`. O link oficial do Dossiê completo
de 762 páginas corresponde ao exemplar indexado pelo SHA-256. Os 2.773
identificadores, conteúdos e localizadores de chunks permanecem iguais.
Um segundo registro do mesmo PDF, sem chunks, foi conferido e preservado;
não houve mesclagem, exclusão ou reindexação.
Verificação remota dos casos S01, S04 e S12: 3/3 passaram, com título, autoria
e URL corrigidos. A revisão assistida de 21 citações retirou o veto bibliográfico
somente para essa amostra. Ver `avaliacao/verificacao-correcao-dossie-2026-10-05.md`
e `avaliacao/registro-correcao-dossie-2026-10-05.json`.
Classificação da fonte e conciliação do catálogo continuam pendentes. O catálogo
de ingestão original não foi atualizado nesta aplicação pontual: não executar
reindexação sem revisar sua correspondência com a fonte corrigida.
Não houve alteração de aplicação, novo deployment ou promoção do domínio.


## Classificação e catálogo aplicados e verificados

A revisão histórica definiu a categoria compilacao_documental para o Dossiê, mantendo confiabilidade alta com nota contextual obrigatória e crítica por trecho. Catálogo, manifesto, contrato, taxonomia, rótulos e glossários estão alinhados localmente. O indexador individual agora exige identidade documental e tem diagnóstico sem escrita por padrão; substituir chunks exige confirmação explícita e backup. Sete testes de proteção, typecheck, lint e simulação da migração em tabela temporária passaram. O dry-run da CLI confirmou somente 0033.

**Aplicado após autorização explícita de Yuri:** migração 0033 registrada no histórico e atualização exclusiva de tipo_fonte/nota_contexto do UUID efc10a75-5cf4-435e-a598-7abf57f88ff7. Banco e catálogo coincidem; todos os campos dos 2.773 chunks, incluindo embeddings, têm hash idêntico antes/depois. Demais fontes e duplicado vazio preservados. APIs do candidato e do domínio público retornaram HTTP 200 com a classificação e a nota corretas, sem chamadas ao LLM. Não houve reindexação, exclusão/fusão do registro vazio ou publicação de novo deploy. Evidências e roteiro: docs/avaliacao/implementacao-classificacao-dossie-2026-10-05.md e docs/avaliacao/registro-classificacao-dossie-2026-10-05.json.


Registro da execução: docs/avaliacao/registro-aplicacao-classificacao-dossie-2026-10-05.json. A primeira tentativa pelo pooler transacional falhou sem alterar estado; a conexão em sessão aplicou somente 0033. Os rótulos e glossários atualizados permanecem nesta branch e precisam de deploy posterior; a atualização de dados já está disponível nas APIs existentes.
