# Fluxo de Trabalho — Equipe de Agentes e Economia de Tokens

## Por que NÃO três equipes paralelas com três líderes

Sua proposta original (Equipe de Input, Equipe de Análise, Equipe de Execução, cada qual com líder) é uma boa divisão **conceitual** — e foi preservada como FASES. Mas, como execução literal com subagentes, ela estouraria seu plano de tokens: cada subagente roda em contexto próprio, e fluxos pesados em subagentes consomem na casa de 7x os tokens de uma sessão simples. Além disso, "líderes" intermediários de IA só repassariam mensagens que você mesmo pode repassar de graça.

**Modelo adotado:** VOCÊ + a sessão principal (Claude Code ou Opencode) são o Líder Geral único (perfil próximo ao seu, que resolve conflitos — exatamente o que você pediu para os líderes). Os 5 especialistas são subagentes convocados um de cada vez, só quando a tarefa exige.

## Dual-harness: Claude Code e Opencode (DeepSeek)
O projeto roda com DOIS assistentes, você escolhe qual usar:
- **Claude Code** (`claude` no terminal): assinatura Claude Pro/Max. Configuração em `.claude/`.
- **Opencode** (`opencode` no terminal): DeepSeek gratuito. Configuração em `.opencode/`.

Ambos leem `CLAUDE.md` como constituição do projeto. Os 5 agentes existem nos dois lados (`.claude/agents/` e `.opencode/agents/`), com o mesmo conteúdo editorial, adaptados à plataforma. O `.mcp.json` é compartilhado (Supabase).

```
         VOCÊ (decisão final)
                           │
           Sessão principal (Claude Code ou Opencode)
               (líder, planejador, integrador)
                           │
    ┌──────────────┬───────┴──────┬──────────────┬──────────────┐
    │              │              │              │              │
 engenheiro-   cientista-     curador-      arquiteto-     designer-
 de-dados      de-dados       historiador   backend        frontend
 (pipeline/)   (pipeline/,    (docs/,       (app/api/,     (app/,
               supabase/)     metadados)    supabase/)     lib/client/)
```

## As fases (uma por vez, sempre)

| Fase | Equivale à sua... | Agentes ativos | Entrega |
|---|---|---|---|
| 0. Fundação | — | só sessão principal | repo GitHub + Next.js "olá mundo" na Vercel + Supabase criado |
| 1. Acervo piloto | Equipe de Input | engenheiro-de-dados → cientista-de-dados → curador-historiador | 1 documento (CNV vol. I) ingerido, chunkado, indexado e auditado; busca funcionando |
| 2. Análise/Contrato | Equipe de Análise | arquiteto-backend + designer-frontend (sequencial, em Plan Mode) | docs/contrato-api.md fechado |
| 3. Execução do chat | Equipe de Execução | arquiteto-backend, depois designer-frontend | chat com citações no ar |
| 4. Feedback do usuário | Execução | backend → frontend → curador (revisa textos) | classificação + resposta alternativa |
| 5. Acervo completo | Input de novo | engenheiro → cientista → curador | demais fontes ingeridas |
| 6. Biografias e mapa | Execução + curadoria | curador (conteúdo) → backend → frontend | /biografias e /mapa |
| 7. Crimes e justiça | Execução + curadoria reforçada | curador → backend → frontend | módulo comparativo jurídico |

A ordem 1→2→3 (acervo piloto ANTES do app) evita o erro clássico: construir uma interface linda em cima de uma busca que não funciona.

## Rituais de cada fase
1. **Abrir**: abra o assistente (`claude` ou `opencode`) na pasta do projeto. Diga: "Vamos iniciar a Fase N do docs/fluxo-de-trabalho.md. Apresente o plano antes de executar." Use o modo de planejamento antes de gerar código.
2. **Durante**: um agente por vez. Tarefas pequenas a sessão principal faz sozinha (mais barato).
3. **Fechar**: peça um resumo de 10 linhas + atualização de um `docs/diario-de-bordo.md` (excelente matéria-prima para a dissertação!). Faça commit no Git. Limpe o contexto.

## Regras de economia de tokens (resumo)
- 1 fase por sessão; limpe contexto entre fases; compacte se a sessão ficar longa.
- Planeje antes de codificar qualquer coisa não trivial.
- Subagente só para trabalho que suja o contexto (ler 50 arquivos, rodar OCR em lote, ler logs). Edição pontual: sessão principal.
- Nada de dois agentes em paralelo.
- Peça sempre "resumo curto"; não cole documentos longos no chat — aponte o caminho do arquivo e deixe o agente ler só o necessário.
- Trabalhe em janelas: se o limite do plano chegar, pare no fim de uma tarefa, faça commit, e retome quando renovar. O Git garante que nada se perde.

## Resolução de conflitos (papel que você deu aos líderes)
Se backend e frontend divergirem sobre o contrato: a sessão principal expõe as duas posições em linguagem simples, com prós/contras, e VOCÊ decide. A decisão vira uma linha em `docs/decisoes.md` (registro de decisões — transparência editorial também no processo de desenvolvimento).

## Modelo/effort por fase (sessão principal)
Os subagentes já têm modelo/configuração definida nos cabeçalhos de cada arquivo de agente (`.claude/agents/*.md` e `.opencode/agents/*.md`). Use a tabela abaixo como referência para a sessão principal, conforme a plataforma que estiver usando:

| Tipo de trabalho | Recomendação |
|---|---|
| Curadoria editorial, decisão de taxonomia, caso sensível | Modelo mais capaz disponível na plataforma |
| Pipeline, OCR, scripts repetitivos, ajustes mecânicos | Modelo mais leve/rápido |
| Implementar rota de API ou tela (UI) | Modelo intermediário |
| Planejar fase nova | Modelo intermediário, modo de planejamento |
| Diagnóstico de bug difícil | Começa com intermediário; sobe para mais capaz se travar |
