-- Migração 0001 — Acervo piloto (Fase 1)
-- Tabelas centrais do acervo documental: fontes e chunks (com busca vetorial).
-- Vocabulários controlados: ver docs/taxonomia.md (seções 2, 3, 8 e 9).

create extension if not exists vector;

-- Fontes documentais do acervo (taxonomia.md, seção 9)
create table fontes (
  fonte_id        uuid primary key default gen_random_uuid(),
  titulo          text not null,
  autor_orgao     text not null,
  tipo_fonte      text not null check (tipo_fonte in (
                    'relatorio_oficial', 'documento_repressao',
                    'documento_inteligencia_estrangeira', 'imprensa_epoca',
                    'producao_academica', 'testemunho',
                    'legislacao_decisao_judicial', 'material_didatico_educativo')),
  subtipo         text,
  confiabilidade  text not null check (confiabilidade in (
                    'alta', 'media_alta', 'media', 'baixa',
                    'alta_como_evidencia_de_autoria', 'alta_como_relato_subjetivo',
                    'baixa_factual_alta_documental')),
  data_documento  date,
  periodo         text check (periodo in (
                    '1964', '1964-1968', '1968-1974', '1974-1979',
                    '1979-1985', 'pos_1985')),
  url_origem      text not null,
  licenca         text,
  proveniencia    text not null,
  nota_contexto   text,
  criado_em       timestamptz not null default now(),
  -- nota_contexto é obrigatória para imprensa da época e documentos da repressão
  constraint nota_contexto_obrigatoria check (
    tipo_fonte not in ('imprensa_epoca', 'documento_repressao')
    or nota_contexto is not null
  )
);

-- Trechos (chunks) dos documentos, com embedding para busca semântica.
-- Modelo: intfloat/multilingual-e5-small — 384 dimensões.
create table chunks (
  chunk_id   uuid primary key default gen_random_uuid(),
  fonte_id   uuid not null references fontes (fonte_id) on delete cascade,
  conteudo   text not null,
  paginas    text not null,   -- ex.: '342' ou '342-343' (paginação do PDF original)
  secao      text,            -- capítulo/seção do documento, quando identificável
  ordem      integer not null, -- posição do chunk na sequência do documento
  embedding  vector(384) not null,
  criado_em  timestamptz not null default now(),
  unique (fonte_id, ordem)
);

create index chunks_embedding_idx on chunks
  using hnsw (embedding vector_cosine_ops);

create index chunks_fonte_idx on chunks (fonte_id);

-- Busca semântica: devolve os chunks mais próximos da consulta, já com os
-- metadados da fonte necessários para montar a citação (princípio 3 do projeto:
-- toda resposta cita autor, documento, página e link).
create or replace function buscar_chunks (
  consulta_embedding vector(384),
  limiar             float default 0.78,
  qtd                integer default 8
)
returns table (
  chunk_id       uuid,
  conteudo       text,
  paginas        text,
  secao          text,
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

-- Segurança: acervo é público para leitura; escrita só com a chave de serviço
-- (service_role ignora RLS por definição — nenhuma política de escrita é criada).
alter table fontes enable row level security;
alter table chunks enable row level security;

create policy fontes_leitura_publica on fontes
  for select using (true);

create policy chunks_leitura_publica on chunks
  for select using (true);
