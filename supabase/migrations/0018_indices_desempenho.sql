-- Migração 0018 — índices de desempenho para consultas de biografias e eventos
-- Recomendado pelo arquiteto-backend na auditoria de 2026-07-07.

-- Índice GIN para filtro por tipos_crime (contains) em eventos_geo
create index if not exists idx_eventos_geo_tipos_crime
  on eventos_geo using gin (tipos_crime);

-- Índices para filtros da API de biografias (uf_natal, período)
create index if not exists idx_biografias_uf_natal
  on biografias (uf_natal)
  where uf_natal is not null;

create index if not exists idx_biografias_data_inicio
  on biografias (data_inicio)
  where data_inicio is not null;

create index if not exists idx_biografias_data_fim
  on biografias (data_fim)
  where data_fim is not null;

-- Índice para camada de naturalidades (filtro por bbox aproximado)
create index if not exists idx_biografias_lat_natal
  on biografias (lat_natal)
  where lat_natal is not null;

create index if not exists idx_biografias_lng_natal
  on biografias (lng_natal)
  where lng_natal is not null;

-- Índice para camada de territórios de origem (filtro por povo_origem)
create index if not exists idx_biografias_povo_origem
  on biografias (povo_origem)
  where povo_origem is not null;
