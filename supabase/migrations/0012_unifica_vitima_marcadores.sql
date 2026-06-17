-- Migração 0012 — decisões editoriais do Yuri (17/06/2026):
--
-- 1. Unifica 'vitima' e 'sobrevivente' num único tipo. Separar sobreviventes
--    de vítimas era problemático; ambas as situações passam a 'vitima'.
-- 2. Habilita o tipo 'perpetrador' (já previsto em docs/contrato-api.md) para
--    a fase de ingestão de biografias de agentes da repressão.
-- 3. Marcadores: 'camponesado' -> 'campesinato' (forma correta); remove 'pardo'
--    do vocabulário — negros e pardos passam a ser registrados como 'negro'.
--
-- Ordem: derruba as constraints antes dos UPDATEs (os novos valores ainda não
-- são aceitos pelas constraints antigas), migra os dados, recria as constraints.

-- ── Marcadores: camponesado -> campesinato, sem pardo ────────────────────────
alter table biografia_marcadores drop constraint biografia_marcadores_marcador_check;
alter table evento_marcadores    drop constraint evento_marcadores_marcador_check;

update biografia_marcadores set marcador = 'campesinato' where marcador = 'camponesado';
update evento_marcadores    set marcador = 'campesinato' where marcador = 'camponesado';

alter table biografia_marcadores add constraint biografia_marcadores_marcador_check check (
  marcador in (
    'classe_trabalhadora', 'campesinato', 'classe_media',
    'negro', 'indigena', 'mulher', 'lgbt',
    'estrangeiro_imigrante',
    'estudante', 'religioso_a', 'militar_oposicao', 'jornalista', 'advogado_a'
  )
);

alter table evento_marcadores add constraint evento_marcadores_marcador_check check (
  marcador in (
    'classe_trabalhadora', 'campesinato', 'classe_media',
    'negro', 'indigena', 'mulher', 'lgbt',
    'estrangeiro_imigrante',
    'estudante', 'religioso_a', 'militar_oposicao', 'jornalista', 'advogado_a'
  )
);

-- ── Tipo de biografia: unifica sobrevivente em vitima, habilita perpetrador ──
alter table biografias drop constraint biografias_tipo_check;

update biografias set tipo = 'vitima' where tipo = 'sobrevivente';

alter table biografias
  add constraint biografias_tipo_check
  check (tipo in ('vitima', 'perpetrador', 'local', 'organizacao'));
