# AGENTS.md — Projeto Bacuri

Este repositório usa `CLAUDE.md` como constituição principal para assistentes de IA.
Leia `CLAUDE.md` antes de qualquer tarefa.

Os agentes especialistas estão espelhados para dois harnesses:

- Claude Code/Claude: `.claude/agents/`
- OpenCode/DeepSeek: `.opencode/agents/`

Regra de manutenção: cada agente deve ter o mesmo `name`, `description`, escopo e corpo
nas duas pastas. Apenas campos próprios do harness, como `model` e declaração de ferramentas, devem variar. Não há skills
locais separadas neste repositório; as capacidades especializadas estão materializadas
como agentes e pelas regras globais de `CLAUDE.md`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
