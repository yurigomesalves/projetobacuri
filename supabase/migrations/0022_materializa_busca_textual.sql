-- Migração 0022 — coluna textual materializada e manutenção automática.
-- O preenchimento dos chunks existentes é feito em lotes após esta migração.

alter table chunks
  add column if not exists busca_textual tsvector;

comment on column chunks.busca_textual is
  'Vetor textual em português de seção, subseção e conteúdo, usado pela busca híbrida.';

create or replace function atualizar_busca_textual_chunk ()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.busca_textual := to_tsvector(
    'portuguese',
    coalesce(new.secao, '') || ' ' ||
    coalesce(new.subsecao, '') || ' ' ||
    new.conteudo
  );
  return new;
end;
$$;

drop trigger if exists chunks_atualiza_busca_textual on chunks;

create trigger chunks_atualiza_busca_textual
before insert or update of secao, subsecao, conteudo
on chunks
for each row
execute function atualizar_busca_textual_chunk();
