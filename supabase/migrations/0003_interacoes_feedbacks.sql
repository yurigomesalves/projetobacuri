-- Migração 0003 — Interações e feedbacks (Fase 3: execução do chat)
-- `interacoes` registra cada pergunta/resposta para auditoria editorial
-- (princípio 1 — transparência) sem dados pessoais do usuário (LGPD).
-- `feedbacks` é a fila de curadoria humana (princípio 2 — colaboração):
-- nenhum feedback altera o acervo automaticamente.

-- Registro de cada interação do chat, para auditoria editorial.
-- Guardamos apenas pergunta, resposta e as citações usadas — nada que
-- identifique o usuário (sem IP, sem cookies, sem sessão).
create table interacoes (
  interacao_id uuid primary key default gen_random_uuid(),
  pergunta     text not null,
  resposta     text not null,
  citacoes     jsonb not null default '[]',
  criado_em    timestamptz not null default now()
);

-- Fila de curadoria: usuários podem classificar respostas e sugerir
-- alternativas/fontes. Tudo passa por revisão humana antes de qualquer
-- mudança no acervo (princípios 1 e 2).
create table feedbacks (
  feedback_id          uuid primary key default gen_random_uuid(),
  interacao_id         uuid not null references interacoes (interacao_id) on delete cascade,
  classificacao        text not null check (classificacao in ('util', 'incompleta', 'incorreta')),
  resposta_alternativa text check (char_length(resposta_alternativa) <= 3000),
  fontes_sugeridas     text,
  status               text not null default 'pendente' check (status in ('pendente', 'aceito', 'recusado')),
  criado_em            timestamptz not null default now()
);

-- Segurança: estas tabelas guardam conteúdo de auditoria e curadoria, não
-- acervo público. RLS habilitado e SEM políticas de leitura/escrita —
-- todo acesso é feito pelo servidor com a chave service_role, que ignora
-- RLS por definição (mesmo padrão da migração 0001 para escrita).
alter table interacoes enable row level security;
alter table feedbacks enable row level security;
