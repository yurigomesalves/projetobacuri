-- Migração 0008 — amplia o vocabulário de `marcadores` (taxonomia 6.2) para
-- incluir os marcadores de "papel social" já documentados em docs/taxonomia.md
-- mas ausentes do check constraint original (migração 0006): estudante,
-- religioso_a, militar_oposicao, jornalista, advogado_a.
-- Motivação: biografia de Edson Luís de Lima Souto (Calabouço, 1968).

alter table biografia_marcadores drop constraint biografia_marcadores_marcador_check;

alter table biografia_marcadores add constraint biografia_marcadores_marcador_check check (
  marcador in (
    'classe_trabalhadora', 'camponesado', 'classe_media',
    'negro', 'indigena', 'pardo', 'mulher', 'lgbt',
    'estrangeiro_imigrante',
    'estudante', 'religioso_a', 'militar_oposicao', 'jornalista', 'advogado_a'
  )
);

alter table evento_marcadores drop constraint evento_marcadores_marcador_check;

alter table evento_marcadores add constraint evento_marcadores_marcador_check check (
  marcador in (
    'classe_trabalhadora', 'camponesado', 'classe_media',
    'negro', 'indigena', 'pardo', 'mulher', 'lgbt',
    'estrangeiro_imigrante',
    'estudante', 'religioso_a', 'militar_oposicao', 'jornalista', 'advogado_a'
  )
);
