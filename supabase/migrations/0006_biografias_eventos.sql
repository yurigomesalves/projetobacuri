-- Migração 0006 — Biografias e eventos georreferenciados (Fase 6)
-- Vocabulários controlados: docs/taxonomia.md (seções 5, 6, 6.2 e 6.3).
-- Princípio 3 / ADR-001: marcadores e fontes de biografias e eventos nunca são
-- texto solto — sempre referenciam a tabela `fontes` (fonte_id + páginas + trecho),
-- e a API monta a citação completa a partir desse vínculo.

-- Minibiografias de vítimas, organizações, perpetradores e locais.
create table biografias (
  biografia_id     uuid primary key default gen_random_uuid(),
  slug             text not null unique,
  nome             text not null,
  tipo             text not null check (tipo in (
                     'vitima', 'organizacao', 'perpetrador', 'local')),
  resumo_1_linha   text not null,
  texto_md         text not null,
  municipio        text,
  uf               text check (uf is null or length(uf) = 2),
  -- A API só serve conteúdo 'publicada' — publicação só após revisão humana.
  status_curadoria text not null default 'rascunho'
                     check (status_curadoria in ('rascunho', 'publicada')),
  criado_em        timestamptz not null default now()
);

-- Eventos no mapa. Geometria em GeoJSON (jsonb): Point para casos individuais,
-- Polygon/MultiPolygon para territórios (ADR-003). Sem PostGIS: o acervo tem
-- dezenas de eventos e o filtro por bbox é feito no servidor da aplicação
-- (decisão da Fase 6, contrato v1.2).
create table eventos_geo (
  evento_id        uuid primary key default gen_random_uuid(),
  titulo           text not null,
  data             date not null,
  municipio        text not null,
  uf               text not null check (length(uf) = 2),
  geometria        jsonb not null,
  descricao_md     text not null,
  tipo_evento      text not null check (tipo_evento in (
                     'caso_individual', 'operacao_repressiva',
                     'guerrilha_confronto', 'violencia_institucional_coletiva',
                     'ato_censura')),
  tipos_crime      text[] not null check (
                     tipos_crime <@ array[
                       'prisao_ilegal_arbitraria', 'tortura', 'execucao_sumaria',
                       'desaparecimento_forcado', 'ocultacao_de_cadaver',
                       'violencia_sexual', 'violencia_contra_povos_indigenas',
                       'perseguicao_exilio_banimento', 'censura'
                     ]::text[]
                     and array_length(tipos_crime, 1) >= 1),
  status_curadoria text not null default 'rascunho'
                     check (status_curadoria in ('rascunho', 'publicada')),
  -- Bloco "crimes e justiça" (Fase 7). A API SÓ serve estes campos quando
  -- revisado_por_humano = true (salvaguarda obrigatória do contrato):
  -- conteúdo jurídico nunca publicado sem revisão humana.
  justica_descricao_crimes_md    text,
  justica_enquadramento_atual_md text,
  justica_punicao_ocorrida_md    text,
  justica_nota_metodologica_md   text,
  revisado_por_humano            boolean not null default false,
  criado_em        timestamptz not null default now()
);

-- Fontes (citações) do texto de uma biografia.
create table biografia_fontes (
  id          uuid primary key default gen_random_uuid(),
  biografia_id uuid not null references biografias (biografia_id) on delete cascade,
  fonte_id    uuid not null references fontes (fonte_id),
  paginas     text not null,
  trecho      text not null,
  secao       text,
  ordem       integer not null default 1,
  unique (biografia_id, ordem)
);

-- Marcadores de interseccionalidade de uma biografia (taxonomia 6.2).
-- Campo público: cada marcador exige a fonte da classificação, linha a linha.
create table biografia_marcadores (
  id          uuid primary key default gen_random_uuid(),
  biografia_id uuid not null references biografias (biografia_id) on delete cascade,
  marcador    text not null check (marcador in (
                'classe_trabalhadora', 'camponesado', 'classe_media',
                'negro', 'indigena', 'pardo', 'mulher', 'lgbt',
                'estrangeiro_imigrante')),
  fonte_id    uuid not null references fontes (fonte_id),
  paginas     text not null,
  trecho      text not null,
  secao       text,
  unique (biografia_id, marcador)
);

-- Fontes (citações) da descrição de um evento.
create table evento_fontes (
  id          uuid primary key default gen_random_uuid(),
  evento_id   uuid not null references eventos_geo (evento_id) on delete cascade,
  fonte_id    uuid not null references fontes (fonte_id),
  paginas     text not null,
  trecho      text not null,
  secao       text,
  ordem       integer not null default 1,
  unique (evento_id, ordem)
);

-- Marcadores de interseccionalidade de um evento (mesma regra das biografias).
create table evento_marcadores (
  id          uuid primary key default gen_random_uuid(),
  evento_id   uuid not null references eventos_geo (evento_id) on delete cascade,
  marcador    text not null check (marcador in (
                'classe_trabalhadora', 'camponesado', 'classe_media',
                'negro', 'indigena', 'pardo', 'mulher', 'lgbt',
                'estrangeiro_imigrante')),
  fonte_id    uuid not null references fontes (fonte_id),
  paginas     text not null,
  trecho      text not null,
  secao       text,
  unique (evento_id, marcador)
);

-- Fontes do bloco "crimes e justiça" (preenchido na Fase 7).
create table evento_justica_fontes (
  id          uuid primary key default gen_random_uuid(),
  evento_id   uuid not null references eventos_geo (evento_id) on delete cascade,
  fonte_id    uuid not null references fontes (fonte_id),
  paginas     text not null,
  trecho      text not null,
  secao       text,
  ordem       integer not null default 1,
  unique (evento_id, ordem)
);

-- Vítimas (biografias) ligadas a um evento.
create table evento_vitimas (
  evento_id    uuid not null references eventos_geo (evento_id) on delete cascade,
  biografia_id uuid not null references biografias (biografia_id) on delete cascade,
  primary key (evento_id, biografia_id)
);

create index biografias_tipo_idx on biografias (tipo) where status_curadoria = 'publicada';
create index biografias_nome_idx on biografias (lower(nome));
create index eventos_geo_status_idx on eventos_geo (status_curadoria);
create index evento_vitimas_biografia_idx on evento_vitimas (biografia_id);
