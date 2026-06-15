-- Migração 0010 — Contas individuais de curadoria, convites e perfis públicos (Fase 7)
-- Substitui a senha única compartilhada (CURADORIA_SENHA) por contas individuais
-- ancoradas no Supabase Auth. Concretiza os princípios 1 (transparência: cada
-- decisão passa a ter autoria) e 2 (colaboração: curadores identificados, com perfil
-- público na página de transparência).
--
-- Acesso é só por convite (sem cadastro aberto): um admin gera um convite, a pessoa
-- abre o link, cria login/senha e preenche o perfil. Tudo lido/escrito pelo servidor
-- com a chave service_role — por isso RLS habilitado e SEM políticas (mesmo padrão das
-- migrações 0001/0003).

-- Perfil de cada curador, atrelado 1:1 ao usuário do Supabase Auth (auth.users).
-- email é desnormalizado aqui só para exibição/listagem sem precisar consultar o
-- schema auth. Campos de perfil (foto, lattes, organização, sobre) são públicos:
-- aparecem na página de transparência ("Quem faz a curadoria").
create table curadores (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  nome        text not null check (char_length(nome) between 2 and 120),
  email       text not null,
  papel       text not null default 'curador' check (papel in ('admin', 'curador')),
  foto_url    text,
  lattes_url  text,
  organizacao text check (char_length(organizacao) <= 200),
  sobre       text check (char_length(sobre) <= 2000),
  criado_em   timestamptz not null default now()
);

-- Convites de curadoria. O `token` aleatório vai no link que o admin envia por fora
-- (decisão: convite por link manual, sem dependência de servidor de e-mail).
-- `usado_em` nulo = convite ainda válido; `expira_em` encerra a validade (7 dias).
create table convites (
  convite_id uuid primary key default gen_random_uuid(),
  email      text not null,
  token      text not null unique,
  papel      text not null default 'curador' check (papel in ('admin', 'curador')),
  criado_por uuid references auth.users (id) on delete set null,
  usado_em   timestamptz,
  expira_em  timestamptz not null default (now() + interval '7 days'),
  criado_em  timestamptz not null default now()
);

-- Autoria da decisão de curadoria: quem aceitou/recusou cada feedback. Exibido na
-- transparência (nome do curador). on delete set null preserva o histórico mesmo se a
-- conta for removida.
alter table feedbacks
  add column decidido_por uuid references auth.users (id) on delete set null;

-- Segurança: como nas demais tabelas de curadoria/auditoria, todo acesso é pelo
-- servidor com service_role (que ignora RLS). RLS habilitado e sem políticas.
alter table curadores enable row level security;
alter table convites  enable row level security;
