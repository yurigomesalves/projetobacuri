# Candidato final — classificação e respostas (05/10/2026)

Estado: **pronto para decisão de publicação, com ressalvas de apresentação**.
O domínio público permanece em `dpl_7CuqHSYBaHrSdz7ZTNVHSL5ZxNcX`.

Candidato READY: `dpl_67Q3jyeCGNqNhARrEWPToNPetkwy`.
URL: https://projetobacuri-21297ye7a-yuri-gomes-alves-projects.vercel.app
Código: `7e50d6e9f38e7aef03c62ca040123c0bcdafd712`, branch
`entrega/chat-publicacao-20261005`, criada a partir de `origin/main`.
Documentação posterior não altera os arquivos da aplicação implantada.

## Resultado e alcance

- 12/12 casos remotos passaram: respostas documentais, recusas, entrada inválida
  e continuidade. Maior duração observada: 13,1 s incluindo a CLI; amostra pequena,
  sem certificação de SLO. Não houve erros HTTP 5xx nos logs consultados dessa rodada.
- Suite completa na branch limpa: 146 testes em 19 arquivos. Após o ajuste final
  do teto de saída, 39 testes de chat/LLM foram reexecutados; TypeScript, lint,
  `git diff --check` e build remoto passaram.
- S01/S03/S04/S06/S12: 31 citações com correspondência única aos chunks,
  23 consultas somente leitura, nenhuma ausência ou ambiguidade.
- O curador retirou o veto histórico somente dessa amostra. Não certifica todos
  os PDFs, paginação integral, corpus ou avaliação v4.
- Acervo conferido no navegador com recursos reais do candidato protegido:
  filtro com um Dossiê, classificação, autoria, contexto e glossário corretos;
  desktop 1280 px e celular 390 px sem transbordamento do documento ou erros no console.

## Ajustes após os candidatos descartados

Reforçada a delimitação de medidas legais e a omissão de digressões sem suporte.
O modelo não deve exibir rótulos internos. Geração terminada por limite de tokens
é recusada antes da persistência, sem chamada paga automática para completá-la.
O teto principal foi ampliado de 2.048 para 4.096 após os logs confirmarem dois
truncamentos bloqueados; prazo compartilhado de 20 segundos e flags experimentais
desativadas foram preservados. A bateria final passou com esse teto.

Permanecem duas ressalvas não bloqueantes: S01/S12 retornam `resumo` vazio pelo
fallback seguro, preservando o texto integral; as cinco respostas têm 7–9
parágrafos, além da orientação de até seis. Não prometer resumo separado ou
contagem rígida de parágrafos. A conferência humana do candidato anterior continua
preservada; não foi transferida automaticamente para estes novos textos.

Consumo observado da rodada final: US$ 0,017501; etapa completa, incluindo
candidatos descartados: US$ 0,067126. Limite mensal da chave: US$ 5; restante
observado: US$ 4,885359. Valores são diferenças informadas pela API, sujeitos à
atualização de contabilização; nenhuma credencial foi registrada.

## Decisão e publicação

A ficha das novas respostas é
`conferencia-humana-candidato-classificacao-final-2026-10-05.md`.
O parecer assistido é
`auditoria-editorial-candidato-classificacao-final-2026-10-05.md`.
O registro técnico é
`registro-validacao-candidato-classificacao-final-2026-10-05.json`.
Artefatos locais: `output/deploy-classificacao-final-2026-10-05-02/`.

A branch limpa exclui os 13 commits anteriores de pesquisas v4 e preserva a árvore
local de trabalho. Preparar PR em rascunho, sem mesclar ou promover. O passo 5 de
`docs/plano-deploy-producao-2026-10-05.md` requer decisão final sobre este candidato
concreto. Depois da decisão, alinhar `main`, conferir a implantação automática e
promover o candidato validado se necessário; confirmar o domínio após a operação.

A migração 0033 e a classificação do Dossiê já foram aplicadas com autorização:
2.773 chunks/embeddings preservados e catálogo alinhado. Não reaplicar a migração
nem executar `supabase db push` global desta branch: o banco remoto também tem
28–32, fora desta entrega. Reversão de deployment não desfaz classificação ou banco.
Deployment anterior para reversão: `dpl_7CuqHSYBaHrSdz7ZTNVHSL5ZxNcX`.
