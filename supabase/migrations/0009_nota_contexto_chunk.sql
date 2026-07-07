-- Migração 0009 — Nota de contexto por trecho (chunk) — dívida técnica CEV-SP
-- A auditoria do curador-historiador sobre o Tomo I da CEV-SP "Rubens Paiva"
-- (14/06/2026) apontou trechos que, recuperados isoladamente pelo RAG, podem
-- ser lidos como posição da comissão quando na verdade são fontes primárias
-- REPRODUZIDAS por ela:
--   - pp. ~701–844: boletins de inteligência (CI-SI/SNI) dos órgãos de
--     repressão, reproduzidos na íntegra;
--   - pp. ~460–472: lista francesa "Les tortionnaires" (boletim DIAL, 1976),
--     reprodução escaneada com OCR degradado.
-- Até aqui a "nota de contexto" só existia na tabela `fontes` (vale para o
-- documento inteiro) — granularidade grossa demais para marcar páginas
-- específicas. Esta migração move a nota também para o nível do trecho.
-- O consumidor já existe: app/api/chat/route.ts e app/componentes/Citacoes.tsx
-- já leem e exibem `nota_contexto` (princípio 1 — transparência editorial).

alter table chunks
  add column if not exists nota_contexto text;

comment on column chunks.nota_contexto is
  'Aviso editorial específico deste trecho (ex.: documento primário reproduzido '
  'por uma comissão da verdade, não a posição dela). Exibido na citação e '
  'enviado ao LLM. Quando nulo, vale a nota_contexto da fonte.';

-- buscar_chunks passa a devolver a nota do trecho com fallback para a da fonte.
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
    coalesce(c.nota_contexto, f.nota_contexto) as nota_contexto
  from chunks c
  join fontes f using (fonte_id)
  where 1 - (c.embedding <=> consulta_embedding) >= limiar
  order by c.embedding <=> consulta_embedding
  limit qtd;
$$;
