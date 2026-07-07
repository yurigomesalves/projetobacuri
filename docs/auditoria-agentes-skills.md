# Auditoria de agentes e skills — Projeto Bacuri

Data: 07/07/2026

## Papel especialista assumido

Especialista em arquitetura de agentes de IA para repositórios de software e humanidades
digitais, com foco em compatibilidade dual-harness: Claude Code/Claude e
OpenCode/DeepSeek.

## Inventário

- Constituição comum: `CLAUDE.md`
- Entrada genérica para harnesses que procuram `AGENTS.md`: `AGENTS.md`
- Agentes Claude: `.claude/agents/`
- Agentes OpenCode: `.opencode/agents/`
- Configuração OpenCode: `.opencode/opencode.jsonc`
- Skills locais separadas: não há diretório de skills neste repositório; as funções
  especializadas estão expressas como agentes.

## Agentes auditados

- `arquiteto-backend`: API Next.js, Supabase, RAG, feedbacks, biografias, mapa e migrações.
- `cientista-de-dados`: chunking, embeddings, pgvector, busca híbrida e avaliação de retrieval.
- `curador-historiador`: taxonomia, metadados, auditoria historiográfica e textos públicos.
- `designer-frontend`: interface, citações, feedback, biografias, mapa e transparência.
- `engenheiro-de-dados`: ingestão, OCR, extração, normalização e proveniência.

## Critérios dual-harness

1. Cada agente existe em `.claude/agents/` e `.opencode/agents/`.
2. Os pares mantêm o mesmo nome, descrição, escopo e corpo.
3. O campo `model` pode variar: Claude usa modelos Claude; OpenCode usa modelos DeepSeek.
4. Os nomes de ferramentas são tratados como capacidades equivalentes entre harnesses.
5. `CLAUDE.md` e `docs/contrato-api.md` continuam sendo fontes de verdade antes de código.
6. Comandos destrutivos, migrações, scraping/downloads grandes e mudanças de contrato exigem
   confirmação humana.

## Melhorias aplicadas

- Inserida seção `Compatibilidade dual-harness` em todos os agentes, nos dois harnesses.
- Atualizado o pipeline de embedding do backend e do cientista de dados para refletir o
  contrato atual: Transformers.js no servidor Next.js, não Edge Function Supabase.
- Atualizado o designer frontend para contemplar camadas de naturalidades e territórios
  de origem no mapa, conforme o contrato v1.4.
- Criado `AGENTS.md` como ponte leve para ferramentas que não leem `CLAUDE.md` diretamente.

## Manutenção futura

- Ao alterar um agente, alterar o par correspondente no outro harness na mesma tarefa.
- Ao criar skills locais no futuro, documentar aqui o diretório, o harness alvo e a
  relação com os cinco agentes.
- Ao mudar comportamento de API, atualizar primeiro `docs/contrato-api.md`, depois os
  agentes e só então o código.
