# Diário de Bordo — Memória e Verdade

Registro cronológico do desenvolvimento, para transparência do processo e
matéria-prima da dissertação.

## 2026-06-11 — Fase 0: Fundação

**O que foi feito:**
- Criado o app Next.js na raiz do projeto (App Router, TypeScript, Tailwind),
  com página inicial provisória "Memória e Verdade — em construção", em
  português e tom sóbrio (`app/page.tsx`, `app/layout.tsx` com `lang="pt-BR"`).
- `.gitignore` configurado: `node_modules`, `.env*` (exceto `.env.example`),
  `pipeline/dados/`, caches Python e arquivos temporários.
- `.env.example` criado documentando, em português, as variáveis futuras:
  Supabase (URL, chave anon, chave service_role), `LLM_PROVIDER`,
  `GROQ_API_KEY` e `OPENROUTER_API_KEY`.
- Adicionados `LICENSE` (AGPL-3.0, texto oficial da FSF) e `README.md` em
  português com os princípios do projeto.
- Primeiro commit no branch `main`; identidade do git configurada localmente.
- Repositório público criado no GitHub:
  https://github.com/yurigomesalves/memoria-e-verdade
  (via GitHub CLI `gh`, autenticado por navegador).
- Projeto importado na Vercel (plano Hobby) com deploy automático a partir
  do `main`. Site no ar e verificado pelo Yuri.

**Decisões técnicas:**
- Repositório público desde o início, coerente com o princípio de
  transparência e com a licença AGPL-3.0.
- O scaffold do Next.js foi gerado em pasta temporária e movido para a raiz,
  pois o `create-next-app` não roda em pasta com arquivos existentes.
- O kit de instalação (`kit-memoria-e-verdade.zip`) ficou fora do
  versionamento — seu conteúdo já está extraído em `docs/` e `CLAUDE.md`.

**Próximos passos (Fase 1 — Acervo piloto):**
- Criar o projeto no Supabase (free tier) e habilitar pgvector.
- Iniciar o pipeline: download do Relatório da CNV vol. I, extração de
  texto, chunking, embeddings e indexação.

## 2026-06-11 — Fase 1: Acervo piloto (CNV vol. I)

**O que foi feito:**
- Banco no Supabase (projeto `bacuri`, já criado na Fase 0): migrações
  `0001_acervo.sql` (pgvector; tabelas `fontes` e `chunks` com vocabulários
  da taxonomia; função `buscar_chunks` para busca semântica via RPC; RLS com
  leitura pública) e `0002_tipo_chunk.sql` (ver ADR-005).
- Pipeline em `pipeline/` (Python, venv local): `01_baixar.py` (download +
  proveniência em `manifesto.json` com sha256), `02_extrair.py` (PyMuPDF,
  976 páginas), `03_chunkar.py` (limpeza de cabeçalhos/hifenização, chunks
  de ~400 tokens com seção e páginas, classificação corpo/nota_rodape),
  `04_indexar.py` (embeddings multilingual-e5-small, 384d, idempotente) e
  `05_buscar.py` (teste de busca).
- Acervo indexado: 1 fonte (Relatório CNV vol. I), 2.032 chunks
  (1.846 corpo, 186 notas de rodapé).
- Auditoria curatorial em `docs/auditorias/2026-06-11-cnv-vol1.md`:
  APROVADO COM RESSALVAS; a ressalva bloqueante (notas de rodapé sem
  sinalização) foi tratada e retestada no mesmo dia.
- Buscas de teste com perguntas de sala de aula retornando trechos
  pertinentes com página e seção (ex.: definição de desaparecimento forçado,
  similaridade 0,90, p. 295 e 576).

**Decisões (ver docs/decisoes.md):**
- ADR-005 — notas de rodapé sinalizadas (`tipo_chunk`), tratadas na Fase 1.
- ADR-006 — proveniência via Internet Archive aceita (portal oficial bloqueia
  download automatizado), com confronto manual futuro possível.

**Incidentes de processo (transparência):**
- Um subagente relatou ter escrito dois scripts que não existiam no disco;
  a sessão principal os escreveu e a verificação de entrega passou a ser
  exigida nos prompts dos agentes.

**Próximos passos (Fase 2 — Análise/Contrato):**
- Fechar `docs/contrato-api.md` com arquiteto-backend e designer-frontend
  (em Plan Mode), incluindo a sinalização de `tipo_chunk` nas citações.

## 2026-06-11 — Fase 2: Análise/Contrato (contrato de API fechado)

**O que foi feito:**
- `docs/contrato-api.md` fechado como v1.0, a partir do rascunho v0.1,
  retomando o processo interrompido após a Fase 1.
- `Citacao` alinhada ao retorno real de `buscar_chunks` (migrações 0001/0002):
  ganhou `confiabilidade`, `secao` e `tipo_chunk` ("corpo" | "nota_rodape"),
  cumprindo o ADR-005.
- Tipo `Marcador` (marcador + fonte) em biografias e eventos, cumprindo o
  ADR-001 (marcador sempre com fonte, nunca por inferência).
- `eventos-geo` passou a aceitar geometria Point ou Polygon/MultiPolygon,
  com camada própria para violência contra povos indígenas (ADR-003).
- Documentado o fluxo interno do RAG no POST /api/chat: embedding da consulta
  na Edge Function (mesmo modelo da indexação), RPC `buscar_chunks`
  (limiar 0,78, até 8 trechos), LLM trocável via `LLM_PROVIDER`.
- Nova seção "Obrigações de exibição das citações (frontend)": selo de nota
  de rodapé, exibição de `nota_contexto` e fonte por marcador.

**Decisão de processo:**
- O refinamento foi feito na sessão principal, sem convocar arquiteto-backend
  e designer-frontend: edição pequena de um único documento, conforme a regra
  de economia de tokens do CLAUDE.md. Divergências de contrato serão tratadas
  na Fase 3, se surgirem na implementação.

**Próximos passos (Fase 3 — Execução do chat):**
- arquiteto-backend: Edge Function de embedding da consulta, rota
  POST /api/chat com RAG e citações, rota POST /api/feedback.
- designer-frontend: interface de chat minimalista com citações
  (incluindo selo de nota de rodapé) e formulário de feedback.
