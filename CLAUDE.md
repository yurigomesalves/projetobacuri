# CLAUDE.md / AGENTS.md — Projeto Bacuri
Chatbot RAG sobre a história da Ditadura Militar-Empresarial no Brasil (1964–1985).
Produto do Mestrado Profissional em Ensino de História (ProfHistória/UFU).
Mestrando: Yuri Gomes Alves — professor de História, **não programador**.

Este arquivo é lido automaticamente por Claude Code (Claude) E por Opencode
(DeepSeek) — é a "constituição" do projeto para qualquer assistente de IA.
Configurações específicas de cada plataforma em: `.claude/` (Claude) e
`.opencode/` (Opencode/DeepSeek). Os 5 agentes especialistas existem em ambos.

## Princípios inegociáveis do produto
1. Transparência editorial — toda decisão de curadoria é documentada e pública.
2. Colaboração — historiografia, sujeitos históricos, movimentos sociais e usuários participam (feedback de respostas alternativas e classificação).
3. Referência autoral — TODA resposta do chatbot cita autor, documento, página/trecho e link da fonte. Resposta sem fonte recuperada = o bot diz que não encontrou base documental e sugere caminhos de pesquisa. Nunca inventar.
4. Software livre e código aberto — licença AGPL-3.0; preferir sempre dependências FOSS; nada de serviços pagos sem aprovação explícita do Yuri.
5. Combate ao negacionismo histórico — o acervo é a historiografia consolidada e as fontes primárias; o bot não trata negacionismo como "outro lado" de um debate em aberto, e responde a ele com documentação.
6. Perspectiva classista — a análise considera classe social e suas intersecções (colonialismo, racismo, machismo, LGBTfobia, xenofobia).
7. Compromisso com a verdade, a memória e a justiça.

## Regras de comunicação comigo (Yuri)
- Sempre em **português brasileiro**.
- Explique cada decisão técnica em linguagem simples, com analogia quando possível, ANTES de executar.
- Antes de qualquer comando destrutivo (apagar, sobrescrever, migração de banco), pare e peça confirmação.
- Ao terminar uma tarefa, entregue um resumo de no máximo 10 linhas: o que foi feito, o que falta, próximos passos.

## Economia de tokens (orçamento limitado — regra dura)
- Trabalhe em UMA fase por vez (ver docs/fluxo-de-trabalho.md). Não paralelize agentes.
- Use modo de planejamento antes de codificar.
- Delegue a subagentes apenas tarefas que poluiriam o contexto (leitura de muitos arquivos, logs, scraping de documentação). Para edições pequenas, faça na sessão principal.
- Respostas e resumos curtos. Não reler arquivos já lidos sem necessidade.
- Sugira limpar contexto ao Yuri quando uma fase terminar.

## Arquitetura (fonte da verdade: docs/contrato-api.md)
- **Monorepo simples** (sem pnpm workspaces — projeto de uma pessoa só):
  - `app/` — Next.js (App Router): páginas E rotas de API (`app/api/`). Frontend e backend juntos para simplificar.
  - `pipeline/` — scripts Python de ingestão (download, OCR, parsing, chunking, embeddings) rodando na máquina local do Yuri (Debian 13).
  - `supabase/` — migrações SQL do banco.
  - `docs/` — contrato de API, taxonomia, decisões editoriais (ADRs), fontes.
- **Banco**: Supabase free tier (Postgres + pgvector). Tabelas centrais: `fontes`, `chunks` (com coluna vector), `biografias`, `eventos_geo`, `feedbacks`.
- **Embeddings**: `intfloat/multilingual-e5-small` (384 dimensões) — na indexação via Python local (sentence-transformers); na consulta via Supabase Edge Function com Transformers.js (mesmo modelo, p/ consistência).
- **LLM de geração**: Groq (modelos abertos, free tier) por padrão; arquitetura deve permitir trocar o provedor por variável de ambiente (ex.: OpenRouter, Ollama local).
- **Mapa**: Leaflet + OpenStreetMap (nunca Google Maps — custo e não é livre).
- **Deploy**: Vercel hobby tier, deploy automático a partir do branch `main` no GitHub.

## Escopos por agente (respeitar SEMPRE)
- `engenheiro-de-dados` → só `pipeline/` e `docs/fontes-prioritarias.md`
- `cientista-de-dados` → só `pipeline/`, `supabase/` (schema vetorial) e `docs/taxonomia.md`
- `curador-historiador` → só `docs/` e arquivos de dados/metadados; NUNCA escreve código de aplicação
- `arquiteto-backend` → só `app/api/`, `supabase/`, `lib/server/`
- `designer-frontend` → só `app/` (páginas e componentes), `lib/client/`
- Mudou o contrato? Primeiro atualiza `docs/contrato-api.md`, depois o código.

## Segurança
- Chaves de API só em `.env.local`. Garantir `.env*` no `.gitignore` SEMPRE.
- Dados de feedback de usuários: não coletar dados pessoais além do necessário (LGPD). Sem rastreadores, sem analytics de terceiros.

## Sensibilidade do tema
Este projeto trata de tortura, morte e desaparecimento de pessoas reais, com familiares vivos. Tom sempre sóbrio e respeitoso, no código, nos textos de interface e nos commits. Nada de nomes de variáveis, easter eggs ou mensagens jocosas envolvendo o tema.
