-- Migração 0021 — consulta lexical disjuntiva para perguntas naturais longas.
-- Cada lexema pode recuperar candidatos; ts_rank_cd ordena os que cobrem mais termos.

create or replace function buscar_chunks_hibrida (
  consulta_texto      text,
  consulta_embedding  vector(384),
  limiar_semantico    float default 0.82,
  qtd                 integer default 8,
  peso_textual        float default 1,
  peso_semantico      float default 1,
  rrf_k               integer default 50
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
returns null on null input
language sql stable
set search_path = public
as $$
  with lexemas as (
    select unnest(
      tsvector_to_array(to_tsvector('portuguese', consulta_texto))
    ) as lexema
  ),
  parametros as (
    select to_tsquery(
      'portuguese',
      coalesce(string_agg(quote_literal(lexema), ' | '), '')
    ) as consulta_lexical
    from lexemas
  ),
  textual_base as materialized (
    select
      c.chunk_id,
      ts_rank_cd(
        to_tsvector(
          'portuguese',
          coalesce(c.secao, '') || ' ' ||
          coalesce(c.subsecao, '') || ' ' ||
          c.conteudo
        ),
        p.consulta_lexical
      ) as relevancia
    from chunks c
    cross join parametros p
    where to_tsvector(
      'portuguese',
      coalesce(c.secao, '') || ' ' ||
      coalesce(c.subsecao, '') || ' ' ||
      c.conteudo
    ) @@ p.consulta_lexical
    order by relevancia desc, c.chunk_id
    limit least(greatest(qtd, 1), 30) * 2
  ),
  textual as (
    select
      chunk_id,
      row_number() over (order by relevancia desc, chunk_id) as posicao
    from textual_base
  ),
  semantica_base as materialized (
    select
      c.chunk_id,
      c.embedding <=> consulta_embedding as distancia
    from chunks c
    where 1 - (c.embedding <=> consulta_embedding) >= limiar_semantico
    order by distancia
    limit least(greatest(qtd, 1), 30) * 2
  ),
  semantica as (
    select
      chunk_id,
      row_number() over (order by distancia, chunk_id) as posicao
    from semantica_base
  ),
  combinada as (
    select
      coalesce(t.chunk_id, s.chunk_id) as chunk_id,
      coalesce(peso_textual / (greatest(rrf_k, 1) + t.posicao), 0) +
      coalesce(peso_semantico / (greatest(rrf_k, 1) + s.posicao), 0) as pontuacao_rrf
    from textual t
    full outer join semantica s using (chunk_id)
  )
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
    coalesce(c.nota_contexto, f.nota_contexto) as nota_contexto
  from combinada h
  join chunks c using (chunk_id)
  join fontes f using (fonte_id)
  order by h.pontuacao_rrf desc, similaridade desc, c.chunk_id
  limit least(greatest(qtd, 1), 30);
$$;
