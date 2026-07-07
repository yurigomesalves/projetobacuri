# Projeto Bacuri

Acervo digital e chatbot de pesquisa sobre a Ditadura Militar-Empresarial no Brasil
(1964–1985). Toda resposta do assistente cita autor, documento, página/trecho
e link da fonte; sem base documental recuperada, o assistente informa que não
encontrou fontes e sugere caminhos de pesquisa.

Produto educacional do Mestrado Profissional em Ensino de História
(ProfHistória/UFU), de Yuri Gomes Alves.

## Princípios

- Transparência editorial: decisões de curadoria documentadas em `docs/`.
- Referência autoral obrigatória em toda resposta.
- Combate ao negacionismo histórico com documentação.
- Software livre (licença AGPL-3.0) e dependências FOSS.

## Estrutura

- `app/` — aplicação Next.js (páginas e rotas de API)
- `pipeline/` — scripts Python de ingestão de documentos (roda localmente)
- `supabase/` — migrações SQL do banco
- `docs/` — contrato de API, taxonomia, decisões editoriais e diário de bordo

## Desenvolvimento

```bash
npm install
npm run dev
```

Copie `.env.example` para `.env.local` e preencha as variáveis.
