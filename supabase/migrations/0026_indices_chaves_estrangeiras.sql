-- Migração 0026 — índices de cobertura para as chaves estrangeiras apontadas
-- pelo advisor de desempenho do Supabase em 09/09/2026.
-- Operação aditiva: não remove índices existentes nem altera dados.

create index if not exists biografia_fontes_fonte_id_idx
  on public.biografia_fontes (fonte_id);

create index if not exists biografia_marcadores_fonte_id_idx
  on public.biografia_marcadores (fonte_id);

create index if not exists biografias_terra_indigena_codigo_idx
  on public.biografias (terra_indigena_codigo);

create index if not exists convites_criado_por_idx
  on public.convites (criado_por);

create index if not exists evento_fontes_fonte_id_idx
  on public.evento_fontes (fonte_id);

create index if not exists evento_justica_fontes_fonte_id_idx
  on public.evento_justica_fontes (fonte_id);

create index if not exists evento_marcadores_fonte_id_idx
  on public.evento_marcadores (fonte_id);

create index if not exists feedbacks_decidido_por_idx
  on public.feedbacks (decidido_por);

create index if not exists feedbacks_interacao_id_idx
  on public.feedbacks (interacao_id);

create index if not exists pessoa_organizacoes_fonte_id_idx
  on public.pessoa_organizacoes (fonte_id);

create index if not exists pessoa_organizacoes_organizacao_fk_idx
  on public.pessoa_organizacoes (organizacao_id, organizacao_tipo);

create index if not exists pessoa_organizacoes_pessoa_fk_idx
  on public.pessoa_organizacoes (pessoa_id, pessoa_tipo);
