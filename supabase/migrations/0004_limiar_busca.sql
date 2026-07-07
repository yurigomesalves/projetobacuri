-- Migração 0004 — Limiar de relevância da busca: 0.78 → 0.82 (Fase 3)
-- O modelo e5 comprime as similaridades para cima: nos testes de 11/06/2026,
-- uma pergunta sem relação com o acervo ("capital da Mongólia") retornou
-- trechos com similaridade até 0.80, enquanto perguntas pertinentes ficaram
-- entre 0.85 e 0.89. Com 0.82, perguntas fora do acervo recebem a resposta
-- honesta ("não há base documental") em vez de citações irrelevantes
-- (princípio 3 — referência autoral). Decisão do Yuri em 11/06/2026.

create or replace function buscar_chunks (
  consulta_embedding vector(384),
  limiar             float default 0.82,
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
returns null on null input
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
