-- Migração 0027 — segunda etapa experimental: busca textual dentro de fontes.
-- Não altera a RPC pública buscar_chunks nem a rota /api/chat.

create or replace function buscar_chunks_textuais_por_fontes (
  consulta_texto    text,
  fontes_candidatas uuid[],
  qtd_por_fonte     integer default 50
)
returns table (
  chunk_id         uuid,
  conteudo         text,
  paginas          text,
  secao            text,
  tipo_chunk       text,
  fonte_id         uuid,
  titulo           text,
  autor_orgao      text,
  url_origem       text,
  relevancia       real,
  posicao_na_fonte bigint,
  posicao_fonte    bigint
)
returns null on null input
language sql stable
security invoker
set search_path = public
as $$
  with consulta as (
    select string_agg(quote_literal(lexema), ' | ')::tsquery as termos
    from unnest(
      tsvector_to_array(to_tsvector('portuguese', consulta_texto))
    ) as lexema
  ),
  fontes_roteadas as (
    select fonte_id, min(ordem)::bigint as posicao_fonte
    from unnest(fontes_candidatas[1:20]) with ordinality
      as candidata(fonte_id, ordem)
    group by fonte_id
  ),
  correspondencias as (
    select
      c.chunk_id,
      c.conteudo,
      c.paginas,
      c.secao,
      c.tipo_chunk,
      c.fonte_id,
      ts_rank_cd(c.busca_textual, q.termos) as relevancia,
      row_number() over (
        partition by c.fonte_id
        order by ts_rank_cd(c.busca_textual, q.termos) desc, c.chunk_id
      ) as posicao_na_fonte,
      fs.posicao_fonte
    from chunks c
    join fontes_roteadas fs using (fonte_id)
    cross join consulta q
    where q.termos is not null
      and c.busca_textual @@ q.termos
  )
  select
    c.chunk_id,
    c.conteudo,
    c.paginas,
    c.secao,
    c.tipo_chunk,
    c.fonte_id,
    f.titulo,
    f.autor_orgao,
    f.url_origem,
    c.relevancia,
    c.posicao_na_fonte,
    c.posicao_fonte
  from correspondencias c
  join public.fontes f using (fonte_id)
  where c.posicao_na_fonte <= least(greatest(qtd_por_fonte, 1), 100)
  order by c.posicao_fonte, c.posicao_na_fonte, c.chunk_id;
$$;

revoke execute on function buscar_chunks_textuais_por_fontes(text, uuid[], integer)
  from public, anon, authenticated;
grant execute on function buscar_chunks_textuais_por_fontes(text, uuid[], integer)
  to service_role;
