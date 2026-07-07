-- Migração 0016 — ADR-019: território de origem para vítimas indígenas.
-- Implementa a categoria "Território de origem" no mapa do chatbot Bacuri,
-- permitindo exibir o polígono da Terra Indígena (FUNAI) ou, na ausência de
-- TI oficial identificada/homologada, um círculo definido por ponto + raio.
-- RESSALVA (ADR-019): as geometrias de TI são referências aproximadas
-- contemporâneas — limites homologados podem diferir dos vigentes à época
-- do crime. Essa ressalva deve aparecer na interface e nas citações.
-- Operação ADITIVA: só acrescenta colunas e tabelas; não altera dados existentes.

-- ── 1. Tabela de referência: terras indígenas (FUNAI) ──────────────────────
-- Análoga a municipios_ibge, mas para polígonos. A geometria é armazenada
-- como GeoJSON (Polygon ou MultiPolygon) em JSONB — sem PostGIS (ADR-infra).
-- O pipeline de ingestão simplifica os polígonos originais da FUNAI antes
-- de inserir (redução de vértices para viabilizar JSONB sem peso excessivo).
-- Um território pode cobrir mais de um estado; a coluna "uf" registra a UF
-- predominante apenas como campo informativo para filtragem rápida.
create table if not exists terras_indigenas (
  codigo_funai  integer primary key,
  nome          text not null,
  etnias        text,           -- povos associados (campo livre, informativo)
  uf            text,           -- UF principal (informativo; TI pode cruzar estados)
  geometria     jsonb not null, -- GeoJSON Polygon ou MultiPolygon (simplificado)
  fonte         text not null default 'FUNAI',
  atualizado_em date
);

create index if not exists terras_indigenas_nome_idx on terras_indigenas (lower(nome));
create index if not exists terras_indigenas_uf_idx   on terras_indigenas (uf);

-- ── 2. Campos de território de origem em biografias ────────────────────────
-- Todos nullable: preenchidos apenas quando documentados via curadoria (JSON
-- validado) + pipeline (06_semear). Nunca inferidos automaticamente.
--
-- Modelo de duas vias (ADR-019, decisão 2):
--   Via A — TI oficial: terra_indigena_codigo aponta para terras_indigenas;
--            o mapa exibe o polígono FUNAI. terra_indigena_nome é
--            desnormalizado para evitar JOIN na Edge Function de busca.
--   Via B — fallback circular: quando não há TI oficial identificada mas a
--            região de origem é documentável, o curador define um ponto
--            (geometria_origem_ponto, GeoJSON Point) e um raio em km
--            (geometria_origem_raio_km); o frontend gera o círculo no mapa.
--   As duas vias são mutuamente exclusivas (ver constraint abaixo).
alter table biografias
  add column if not exists povo_origem              text,
  add column if not exists terra_indigena_codigo    integer
    references terras_indigenas (codigo_funai),
  add column if not exists terra_indigena_nome      text,  -- desnorm. p/ evitar JOIN
  add column if not exists geometria_origem_ponto   jsonb, -- GeoJSON Point (fallback)
  add column if not exists geometria_origem_raio_km integer; -- raio do círculo em km

-- Constraint de exclusividade mútua entre as duas vias:
-- não é possível ter TI oficial E fallback circular simultaneamente.
alter table biografias
  add constraint biografias_origem_vias_exclusivas_check
    check (
      terra_indigena_codigo is null
      or geometria_origem_ponto is null
    );

-- Constraint de coerência do fallback: raio sem ponto não faz sentido
-- cartográfico — o ponto ancora o centro do círculo.
alter table biografias
  add constraint biografias_origem_raio_requer_ponto_check
    check (
      geometria_origem_raio_km is null
      or geometria_origem_ponto is not null
    );

comment on table  terras_indigenas is
  'Terras Indígenas homologadas ou em processo (fonte: FUNAI). Geometrias como GeoJSON simplificado. Referências aproximadas — ver ressalva ADR-019.';
comment on column terras_indigenas.geometria is
  'GeoJSON Polygon ou MultiPolygon simplificado pelo pipeline. Sem PostGIS.';

comment on column biografias.povo_origem is
  'Nome do povo/etnia conforme fonte documental (ex.: "Waimiri-Atroari"). Nunca inferido.';
comment on column biografias.terra_indigena_codigo is
  'FK para terras_indigenas. Via A (TI oficial). Mutuamente exclusivo com geometria_origem_ponto.';
comment on column biografias.terra_indigena_nome is
  'Nome da TI para exibição — desnormalizado para evitar JOIN na API de busca.';
comment on column biografias.geometria_origem_ponto is
  'GeoJSON Point [lng, lat]. Via B (fallback). Mutuamente exclusivo com terra_indigena_codigo. Exige geometria_origem_raio_km para gerar círculo no mapa.';
comment on column biografias.geometria_origem_raio_km is
  'Raio em km do círculo de origem. Só válido quando geometria_origem_ponto não é null.';
