# Checkpoint de sessão — 10 de setembro de 2026

> Retomado em 14/09/2026. A verificação de privacidade foi concluída e a análise
> avançou; o estado mais recente está em
> [checkpoint-sessao-2026-09-14.md](checkpoint-sessao-2026-09-14.md).

## Estado ao interromper

A fase de revisão do conjunto factual e a primeira avaliação conversacional foram
concluídas. O repositório permanece com muitas alterações não commitadas, inclusive
trabalho anterior; não descartar, reverter nem sobrescrever arquivos sem revisar o
`git status` e este checkpoint.

## Concluído

- Conjunto factual aprovado: P01–P24 e P31, com 25 perguntas e 32 unidades de
  evidência. P24 foi separada de P31 pelo ADR-027.
- Baseline vigente: vetorial e híbrida 15/32 no top 8; diagnóstico vetorial 22/32
  no top 50; roteamento 29/32; decomposição curada 31/32.
- Migração 0027 aplicada no Supabase: busca textual por fontes restrita ao papel
  `service_role`. A busca pública continua vetorial.
- P25–P30 aprovadas como lote conversacional separado pelo ADR-028.
- Duas rodadas conversacionais realizadas. Resultado vigente: P28–P30 aprovadas;
  P25–P27 parciais.
- Corrigida falha de privacidade de P28: pedidos de contato pessoal, referências sem
  histórico e ordens para fabricar citações agora são tratados antes da busca e do
  LLM. Telefones e e-mails são omitidos de chunks, prompt, citações e resposta.
- A busca de perguntas de seguimento passou a combinar a última pergunta do usuário
  com a mensagem atual quando há referente dependente do histórico.
- Contrato atualizado para v1.5 e decisão registrada no ADR-029.
- Validação final: lint, TypeScript e 91 testes aprovados; `git diff --check` sem
  erros.

## Privacidade e Supabase

- A primeira rodada de P28 gravou uma resposta com telefones presentes em documento
  histórico. A interação afetada é
  `082efdb1-e05f-4c8a-abc8-3575a857881a`.
- Yuri autorizou substituir contatos por `[contato pessoal omitido]`; a atualização
  foi enviada ao Supabase.
- Não foi possível confirmar a alteração: consultas autenticadas à tabela
  `interacoes` expiraram repetidamente, e o MCP do Supabase falhou ao renovar OAuth.
- Na retomada, a primeira ação remota deve ser uma consulta somente leitura que
  verifique apenas se ainda existe padrão de telefone/e-mail nessa interação, sem
  imprimir o conteúdo. Repetir a escrita somente se o contato ainda estiver presente.
- O arquivo bruto local `docs/avaliacao/resultados-conversacionais.json` foi redigido
  e está ignorado pelo Git. A versão segura pré-correção e o resultado pós-correção
  estão versionáveis na pasta de avaliação.

## Custo autorizado e utilizado

- Yuri autorizou até US$ 0,10 para a avaliação.
- Foram feitas 12 chamadas ao OpenRouter com
  `deepseek/deepseek-v4-flash-0731`, seis antes e seis depois da correção.
- O custo exato não foi exposto pela API; a estimativa documentada permanece muito
  abaixo do teto. Não fazer outra rodada sem nova justificativa e autorização.

## Arquivos centrais

- `docs/avaliacao/perguntas-ouro.json`
- `docs/avaliacao/perguntas-conversacionais-candidatas.json`
- `docs/avaliacao/avaliacao-conversacional-2026-09-10.md`
- `docs/avaliacao/proposta-continuidade-fontes-2026-09-10.md`
- `docs/contrato-api.md`
- `app/api/chat/route.ts`
- `tests/rotas/chat.test.ts`
- `scripts/coletar-avaliacao-conversacional.mjs`
- `docs/decisoes.md` — ADR-027, ADR-028 e ADR-029
- `docs/diario-de-bordo.md`

## Ordem para retomar

1. Ler `CLAUDE.md`, este checkpoint e `git status --short`.
2. Confirmar por leitura segura se a interação P28 foi redigida no Supabase.
3. Não implementar ainda a continuidade de fontes. Revisar primeiro a proposta
   técnica e criar casos conversacionais inéditos para validação.
4. Preservar P25–P27 como resultados parciais; não ajustar a arquitetura apenas para
   fazê-los passar.
5. Antes de qualquer migração, sobrescrita remota, nova rodada paga, commit ou deploy,
   obter autorização de Yuri conforme `CLAUDE.md`.

## Observação operacional

Uma instância de `next dev` já existia na porta 3000 durante a sessão. Não presumir
que continuará ativa. Verificar a porta antes de iniciar outro servidor e não encerrar
processos sem necessidade.
