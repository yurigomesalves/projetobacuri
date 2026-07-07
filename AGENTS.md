# AGENTS.md — Projeto Bacuri

Este repositório usa `CLAUDE.md` como constituição principal para assistentes de IA.
Leia `CLAUDE.md` antes de qualquer tarefa.

Os agentes especialistas estão espelhados para dois harnesses:

- Claude Code/Claude: `.claude/agents/`
- OpenCode/DeepSeek: `.opencode/agents/`

Regra de manutenção: cada agente deve ter o mesmo `name`, `description`, escopo e corpo
nas duas pastas. Apenas o campo `model` deve variar conforme o harness. Não há skills
locais separadas neste repositório; as capacidades especializadas estão materializadas
como agentes e pelas regras globais de `CLAUDE.md`.
