-- Migração 0002 — Sinalização de notas de rodapé (auditoria de 11/06/2026)
-- A CNV usa notas extensas no fim dos capítulos; sem sinalização, um chunk de
-- nota pode ser citado como se fosse o corpo do relatório. Decisão do Yuri em
-- docs/decisoes.md (11/06/2026).

alter table chunks
  add column tipo_chunk text not null default 'corpo'
  check (tipo_chunk in ('corpo', 'nota_rodape'));

-- Recria a função de busca incluindo tipo_chunk no retorno, para que a camada
-- de citações possa sinalizar "nota de rodapé" ao usuário.
drop function buscar_chunks (vector(384), float, integer);

create function buscar_chunks (
  consulta_embedding vector(384),
  limiar             float default 0.78,
  qtd                integer default 8
)
returns table (
  chunk_id       uuid,
  conteudo       text,
  paginas        text,
  secao          text,
  tipo_chunk     text,
  similaridade   float,
  fonte_id       uuid,
  titulo         text,
  autor_orgao    text,
  tipo_fonte     text,
  confiabilidade text,
  data_documento date,
  url_origem     text,
  nota_contexto  text
)
language sql stable
as $$
  select
    c.chunk_id,
    c.conteudo,
    c.paginas,
    c.secao,
    c.tipo_chunk,
    1 - (c.embedding <=> consulta_embedding) as similaridade,
    f.fonte_id,
    f.titulo,
    f.autor_orgao,
    f.tipo_fonte,
    f.confiabilidade,
    f.data_documento,
    f.url_origem,
    f.nota_contexto
  from chunks c
  join fontes f using (fonte_id)
  where 1 - (c.embedding <=> consulta_embedding) >= limiar
  order by c.embedding <=> consulta_embedding
  limit qtd;
$$;
