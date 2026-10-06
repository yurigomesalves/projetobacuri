# Memória do projeto — conteúdo e design das respostas do chat

**Encerramento: 6 de outubro de 2026.** Yuri decidiu encerrar esta frente para mudar a direção do desenvolvimento. Esta memória permite retomar o tema; não ordena continuar avaliações ou modificar a aplicação. O estado abaixo é o verificado nesta data. Conferir Git e deployment atuais antes de agir em outra sessão.

## Resultado e produção

Concluímos correção editorial, organização dos resumos e melhoria visual das respostas. As entregas foram autorizadas, mescladas e publicadas. O chat usa trechos do acervo, apresenta síntese quando o formato é válido, mantém o desenvolvimento citado e oferece referências conferíveis. Instruções e validações reduzem erros; não garantem a correção histórica de todas as gerações.

- Site: https://memoria-e-verdade.vercel.app.
- Main da aplicação: `94cc5200f6822b4ef9ef49a7756bb6771e6b0cbd`.
- Deployment verificado: `dpl_FCHRTeRQBtF2ZiKmPeTd6Xcj2xE6`, READY.
- Teste público após PR #4: página e chat HTTP 200, resumo preenchido e quatro citações na pergunta sobre o AI-5; screenshot registrado.
- Pasta principal sincronizada; configuração pessoal `.codex/config.toml` preservada.

| Entrega | Registro | Incorporado |
| --- | --- | --- |
| Base editorial e fontes | [PR #2](https://github.com/yurigomesalves/projetobacuri/pull/2), merge `35b1f43` | Base anterior aos resumos: regras de atribuição e alcance documental, referências e correção da apresentação/classificação do Dossiê como compilação documental. Registro local em `.local/pesquisa-preservada/docs/avaliacao/publicacao-chat-2026-10-06.md`. |
| Resumos e concisão | [PR #3](https://github.com/yurigomesalves/projetobacuri/pull/3), merge `545e375` | Orientação de formato em mensagem de sistema após o histórico; síntese de 2–3 frases; desenvolvimento com meta de 250–450 palavras; marcadores junto às afirmações e proibição de completar trechos interrompidos. |
| Design da resposta | [PR #4](https://github.com/yurigomesalves/projetobacuri/pull/4), merge `94cc520` | Painel “Em síntese”; desenvolvimento aberto; fontes compactas; metadados e contexto visíveis; apenas trechos expansíveis; marcadores focalizam a referência. “Resposta documentada” depende de citações; sem elas, “Resposta”. |

Metas de extensão não cortam conteúdo. Atribuições, cadeias indiretas e ressalvas têm prioridade. O resumo não recebe marcadores nem deve acrescentar fatos ao desenvolvimento. Se a separação de formato falhar, o resumo fica vazio e o texto integral é preservado; a interface não inventa uma síntese.

Conservados prazo compartilhado de 20 segundos e teto principal de 4.096 tokens. Geração truncada ou referências inválidas produzem erro operacional, não falsa declaração de ausência de fontes. Não foi criada chamada paga automática para corrigir formato. PRs #3/#4 não fizeram migração/reindexação nem ativaram etapas experimentais.

## Testes e limites dos resultados

### Conteúdo

- **Base PR #2:** 12/12 testes operacionais e revisão editorial amostral de 31 citações. Após publicação, três casos adicionais passaram: AI-5, Comissão Especial e continuidade. Não certificam os PDFs integrais ou futuras gerações.
- **PR #3:** cinco candidatos e um reteste focalizado. A primeira rodada continuava extensa; a segunda teve resumo vazio na continuidade. O candidato 03 foi vetado por completar citação interrompida e deixar afirmação sobre nota sem marcador. O candidato 04 teve estouro de prazo e, no reteste, resumo vazio. Resultados anteriores foram preservados.
- **Aceitação do candidato 05:** S01/S03/S04/S06/S12 aprovados; cinco resumos preenchidos; desenvolvimentos de 291–389 palavras e cinco blocos. As 22 citações tiveram correspondência única nos trechos. A revisão editorial retirou o veto dessa amostra, com ressalva menor de concordância em S03 (“ataques armados e aéreas”). O texto registrado não foi editado para esconder o erro.
- A média exploratória do campo `resposta` caiu de 753,4 para 359,4 palavras. Amostra pequena e diferenças de formato impedem tratar a comparação como prova estatística de melhoria geral.
- **152 testes em 20 arquivos** passaram, além de lint, tipos e builds. Validade estrutural dos marcadores não comprova sustentação histórica de cada afirmação.

Consultar [verificação dos resumos](avaliacao/verificacao-resumos-concisao-2026-10-06.md) e [auditoria editorial final](avaliacao/auditoria-resumos-candidato-05-2026-10-06.md). Consumo observado das avaliações do PR #3: aproximadamente US$ 0,065. O limite mensal da chave era US$ 5; números históricos não informam saldo atual.

### Interface e publicação

- **Nove cenários Playwright** passaram no build de produção local: 390/768/1440px nos temas claro/escuro, resumo vazio, resposta sem fontes e duas mensagens com destinos próprios para marcadores.
- Conferidos foco nas referências, expansão por Enter, contexto visível, link original, feedback e ausência de overflow horizontal. A matriz usou dados simulados e redução de movimento; não avaliou geração nem constituiu auditoria completa por leitor de tela.
- Yuri conferiu screenshots de resposta real arquivada no novo layout e autorizou a publicação. Depois dela, uma pergunta real no site respondeu com HTTP 200, resumo e quatro citações; a tela publicada foi capturada.

Consultar [relatório de design](avaliacao/design-resposta-chat-2026-10-06.md). Capturas e respostas sanitizadas: `output/design-resposta-chat-2026-10-06/`; teste público final na subpasta `publicacao/`.

### Pesquisa reaproveitável, ainda experimental

Estudos de busca, roteamento de fontes, decomposição e continuidade estão em `docs/avaliacao/`, com trabalho adicional em `.local/pesquisa-preservada/`. O laboratório v3 comparou deduplicação, expansão de páginas e cross-encoder: ganho exploratório de Recall@8 de 19/28 para 24/28, com latência mediana local passando de cerca de 45 ms para 8,7 segundos. O relatório recomenda manter experimental: são comparações pós-hoc em lotes consumidos, e o percurso/índice local não equivale à aplicação pública.

Consultar `.local/pesquisa-preservada/docs/avaliacao/recuperacao-v3/README.md` e `relatorio-automatico-recuperacao-v3.md`. Reaproveitar casos, rubricas, auditorias e procedimentos de reprodução; reavaliar métodos antes de integrá-los à nova direção. Avaliação científica v4 não foi executada nesta fase.

## Onde ficam as definições das respostas

| Camada | Local | Controle |
| --- | --- | --- |
| Instruções ao modelo | `app/api/chat/route.ts`: `promptSistema`, `orientacaoFormato` | Tom, uso exclusivo dos trechos, atribuição, delimitação, resumo, concisão e citações. Formato após histórico, antes da pergunta. |
| Recuperação | `lib/server/recuperacao.ts`, embedding e RPCs do Supabase | Seleção de evidências. Ajustar prompt não resolve evidência não recuperada. |
| Referências e formato | `lib/server/citacoes.ts`; `separarResumo` na rota | Validação/renumeração de marcadores, fontes efetivamente usadas e preservação do texto quando a síntese é inválida. |
| Modelo e limites | `lib/server/llm.ts`, `lib/server/prazo.ts`, `.env.local` e Vercel | Provedor, modelo, credenciais e limites. Produção usa OpenRouter; o padrão Groq descrito na constituição não informa o provedor efetivo desse deployment. Não registrar chaves nesta memória. |
| Design | `app/componentes/Chat.tsx`, `Citacoes.tsx`, `app/globals.css` | Hierarquia visual, referências, estados com/sem resumo ou citações. |
| Contrato e princípios | [contrato-api.md](contrato-api.md), `CLAUDE.md` e documentos editoriais | Comportamento esperado e orientação aos assistentes de desenvolvimento. O chatbot não lê `CLAUDE.md` automaticamente. |
| Curadoria do acervo | Tabelas `fontes` e `chunks` no Supabase | Autoria, páginas, tipo, proveniência e notas de contexto usadas no prompt e nas citações. |

**Os testes não treinaram o OpenRouter.** Produziram evidências para ajustar código, instruções e curadoria. Não existe uma memória aprendida do modelo que substitua esses registros.

## Pendências para retomada futura

1. **Preview:** o chat do Preview do PR #4 retornou 404 do OpenRouter com a configuração então usada; não foi corrigido nesta frente. Produção funcionou no teste real posterior. Antes de retomar, investigar modelo, credencial e configuração, incluindo restrições de endpoints/dados. O diagnóstico transitório da sessão não substitui uma auditoria preservada dessas configurações; não enfraquecer restrições nem trocar credenciais silenciosamente para contornar a falha.
2. **Amostra ampliada:** a bateria completa de 12 casos para a versão final de resumo/design foi sugerida, mas não executada após essas entregas. A bateria de 12 da base PR #2 não deve ser atribuída à versão final.
3. **Formato e redação:** resumo vazio, variação de extensão e concordância inadequada podem ocorrer. O fallback é deliberado; não esconder essas situações por corte de texto, síntese fabricada ou repetição paga automática.
4. **Latência e apoio histórico:** houve falha de prazo em candidato anterior. Medições não garantem latência/disponibilidade. Correspondência de citações continua distinta da auditoria semântica das afirmações.
5. **Pesquisa e revisão humana:** métodos locais, v4/lotes independentes e conferência integral do corpus não foram validados por estas entregas. Esta memória não preenche campos de revisão humana nem autoriza promoção automática de experimentos.

Esses itens ficam registrados; não são trabalho obrigatório antes de iniciar a nova direção da aplicação.

## Preservação e roteiro de retomada

- GitHub guarda entregas dos PRs #2/#3/#4 e relatórios versionados. `output/` contém evidências locais ignoradas pelo Git, inclusive rodadas descartadas; preservar em backup externo.
- Pesquisa anterior: branch local `pesquisa/preservada-2026-10-06`, checkout `.local/pesquisa-preservada`. Backup: `.local/reconciliacao-2026-10-06`, com manifesto de hashes e bundle Git. Não fundir esse estado antigo em main sem revisão.
- Relatórios anteriores à publicação podem mencionar PR em rascunho/autorização pendente: são registros históricos. Esta memória atualiza o encerramento sem apagar resultados anteriores.
- Ao retomar: ler esta memória e o contrato; conferir Git/deployment/configuração; escolher o objetivo da nova fase; usar casos anteriores para regressão; separar casos independentes para medir ganhos; registrar versões de prompt/modelo/índice, custo e critérios de aceitação.
- Preservar apoio documental, transparência das fontes e revisão editorial. Produzir resultado concreto para conferência antes de solicitar autorização de nova publicação.

**Decisão de encerramento:** conteúdo e design entregues em produção; pendências e pesquisa preservadas; próxima direção a ser definida por Yuri.
