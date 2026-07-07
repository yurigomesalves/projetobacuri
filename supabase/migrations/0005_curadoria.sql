-- Migração 0005 — Curadoria e transparência (Fase 4)
-- A decisão de curadoria sobre um feedback (aceitar ou recusar) precisa
-- registrar a justificativa — publicada em /api/transparencia — e a
-- data/hora da decisão, para auditoria editorial (princípio 1).

alter table feedbacks
  add column justificativa_decisao text check (char_length(justificativa_decisao) between 10 and 2000),
  add column decidido_em timestamptz;
