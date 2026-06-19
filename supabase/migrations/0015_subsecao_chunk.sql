-- 0015: Subseção nominal por chunk.
-- O chunker estaduais passa a rotular, além do capítulo de 1º nível (secao),
-- a subseção temática interna (ex.: dentro de "Outras Graves Violações",
-- as subseções de estudantes, indígenas, campo). Coluna anulável: as fontes
-- já indexadas permanecem com subsecao = NULL.
alter table chunks add column subsecao text;

comment on column chunks.subsecao is
  'Subseção nominal dentro da seção (capítulo de 1º nível). Opcional.';
