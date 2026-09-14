# Checkpoint de sessão — 14 de setembro de 2026

## Fase concluída

Retomada do checkpoint de 10/09: confirmação de privacidade, revisão, aprovação e
implementação local da continuidade documental. O contrato passou à versão 1.6 e
a decisão foi registrada no ADR-030. Há muitas alterações anteriores não
commitadas; preservar o trabalho existente e consultar `git status --short`.

## Privacidade resolvida no escopo da interação P28

- Primeira ação remota: leitura somente de `resposta` e `citacoes` da interação
  `082efdb1-e05f-4c8a-abc8-3575a857881a`, exibindo apenas indicadores.
- A resposta ainda continha telefone. Reaplicada a substituição autorizada por
  `[contato pessoal omitido]`, somente na resposta e condicionada à versão lida.
- Leitura posterior em 14/09/2026 às 15:48:39 UTC confirmou resposta igual à versão
  redigida e ausência dos padrões de telefone/e-mail nos dois campos examinados.
- Registro seguro: `docs/avaliacao/verificacao-privacidade-p28-2026-09-14.json`.
  Não é uma auditoria geral do banco nem de todas as formas de dados pessoais.

## Análise da continuidade

- `fontes_ids` enviados pelo navegador não comprovam citações anteriores; declarar
  `papel = assistente` não torna a entrada confiável.
- Uma referência à interação ou um token emitido pelo servidor precisa de desenho
  explícito; UUID existente não prova vínculo com a conversa atual.
- Relevância textual não equivale à similaridade vetorial 0,82. Elegibilidade,
  fusão e limites de candidatos ainda precisam ser definidos em desenvolvimento.
- Revisão: `docs/avaliacao/revisao-tecnica-continuidade-2026-09-14.md`.
- Novos roteiros: `docs/avaliacao/casos-continuidade-fontes-2026-09-14.json`.
- Revisão editorial: `docs/avaliacao/revisao-editorial-continuidade-2026-09-14.md`.
- Os casos reutilizam evidências conhecidas: Yuri os aprovou para desenvolvimento,
  não como avaliação cega. O novo coletor executa comparação pareada de dois turnos,
  mas ainda não foi autorizado para chamadas reais.
- Backend e frontend implementaram o token opaco, assinado e válido por 30 minutos,
  sem texto da conversa ou identificador pessoal. O frontend o mantém somente em
  memória. A decisão aprovada está em
  `docs/avaliacao/decisao-pendente-continuidade-2026-09-14.md`.

## Implementação local

- `lib/server/continuidade.ts`: emissão e verificação HMAC-SHA256, UUIDs canônicos,
  expiração, validação em tempo constante e filtros de assunto/termos.
- `app/api/chat/route.ts`: busca textual adicional restrita às fontes assinadas,
  recarga de metadados, omissão de contatos, intercalação com a busca vetorial,
  deduplicação e limite final de oito trechos. Falhas adicionais preservam o vetor.
- `app/componentes/Chat.tsx`: token somente no estado da resposta anterior e envio
  apenas em seguimentos detectados; nenhuma persistência ou exibição.
- `scripts/coletar-avaliacao-continuidade.mjs`: comparação pareada com bloqueio de
  autorização e modo simulado. Seis casos correspondem a até 18 chamadas reais.
- `.env.example`: documenta `CONTINUIDADE_TOKEN_SECRET` com mínimo de 32 caracteres.
  Um segredo aleatório de 43 caracteres foi configurado em `.env.local`, sem ser
  exibido ou versionado. Antes de eventual deploy, outro segredo deve ser configurado
  no ambiente da hospedagem; ele nunca deve entrar no Git.
- Verificação: 106 testes, lint, TypeScript e build de produção com Webpack aprovados;
  modo simulado confirmou seis casos/18 chamadas sem gravar resultado.
- O build padrão com Turbopack falhou porque o ambiente não permitiu abrir uma porta
  interna durante o CSS do Leaflet. O mesmo build completo passou com Webpack, o que
  separa a limitação ambiental do código alterado.

## Ordem para retomar

1. Ler `CLAUDE.md`, este checkpoint e o estado do Git.
2. Antes de executar o coletor real, estimar as 18 chamadas e obter autorização
   específica de custo; preservar P25–P27 parciais e P28–P30 aprovadas.
3. Revisar manualmente primeiro turno, precondições e pares com/sem continuidade.
4. Congelar o resultado desta configuração e criar lote independente antes de
   considerar promoção pública. Migração, commit e deploy continuam não realizados.

Os 91 testes do checkpoint anterior cresceram para 106 após a implementação. Os
JSONs mantêm seis IDs únicos, distribuição 2/2/2 e links locais válidos;
`git diff --check` permaneceu sem erros.
