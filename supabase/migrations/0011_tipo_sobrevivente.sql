-- Adiciona 'sobrevivente' ao check constraint de biografias.tipo.
-- Necessário para registrar ex-presas políticas que sobreviveram à ditadura
-- (ex.: Rosalina Santa Cruz, Ieda Akselrud de Seixas).

ALTER TABLE biografias
  DROP CONSTRAINT IF EXISTS biografias_tipo_check;

ALTER TABLE biografias
  ADD CONSTRAINT biografias_tipo_check
  CHECK (tipo IN ('vitima', 'sobrevivente', 'local', 'organizacao'));
