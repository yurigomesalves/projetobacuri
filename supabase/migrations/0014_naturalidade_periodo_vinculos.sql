-- Migração 0014 — ADR-016: naturalidade, período de atuação/perseguição,
-- vínculos pessoa↔organização e tabela de referência de municípios (IBGE).
-- Fonte da verdade: docs/decisoes.md (ADR-016) e docs/taxonomia.md (5.1 e 8.2).
-- Operação ADITIVA: só acrescenta colunas e tabelas; não altera dados existentes.

-- ── 1. Naturalidade e período nas biografias ───────────────────────────────
-- Naturalidade = município de NASCIMENTO conforme fonte documental (distinta de
-- municipio/uf, que marcam o local do crime/atuação). lat/lng derivam da sede do
-- município na tabela IBGE — nunca endereço preciso. Desconhecida → NULL (nunca
-- inferir por UF de atuação ou sobrenome).
alter table biografias
  add column municipio_natal text,
  add column uf_natal         text check (uf_natal is null or length(uf_natal) = 2),
  add column lat_natal         double precision,
  add column lng_natal         double precision,
  -- Período de atuação/perseguição DOCUMENTADO (não datas de nascimento/morte).
  -- Ano apenas → YYYY-01-01 / YYYY-12-31. Extremo desconhecido → NULL.
  add column data_inicio       date,
  add column data_fim          date,
  add constraint biografias_periodo_ordem_check
    check (data_inicio is null or data_fim is null or data_fim >= data_inicio);

-- ── 2. Tabela de referência: municípios do IBGE ────────────────────────────
-- Coordenadas da SEDE do município (não endereço preciso). Alimenta
-- lat_natal/lng_natal e a camada de origem do mapa (ADR-016, decisão 4).
create table municipios_ibge (
  codigo_ibge integer primary key,            -- código de 7 dígitos do IBGE
  nome        text not null,
  uf          text not null check (length(uf) = 2),
  lat         double precision not null,
  lng         double precision not null
);

create index municipios_ibge_uf_idx   on municipios_ibge (uf);
create index municipios_ibge_nome_idx on municipios_ibge (lower(nome));

-- ── 3. Vínculo pessoa ↔ organização ────────────────────────────────────────
-- Critério ESTRITO (ADR-016, decisão 3 / taxonomia 5.1): o vínculo só é
-- registrado com fonte_id identificada e independente do aparato repressivo —
-- ou, se proveniente de documento de inteligência (DOPS/DOI-CODI/SNI),
-- corroborada por fonte independente. Reproduzir "vínculos" dessas fichas sem
-- verificação replicaria a lógica persecutória do regime.

-- Pré-requisito para validar os tipos por chave estrangeira composta:
-- garante que a pessoa é vítima/perpetrador e a organização é do tipo correto,
-- sem precisar de gatilho (trigger).
alter table biografias add constraint biografias_id_tipo_uk unique (biografia_id, tipo);

create table pessoa_organizacoes (
  id               uuid primary key default gen_random_uuid(),
  pessoa_id        uuid not null,
  -- Coluna redundante usada só pela FK composta abaixo: força a pessoa a ser
  -- 'vitima' ou 'perpetrador' (nunca organização ou local).
  pessoa_tipo      text not null check (pessoa_tipo in ('vitima', 'perpetrador')),
  organizacao_id   uuid not null,
  -- Idem: força a organização referenciada a ter tipo = 'organizacao'.
  organizacao_tipo text not null default 'organizacao'
                     check (organizacao_tipo = 'organizacao'),
  -- Citação obrigatória da fonte do vínculo (mesmo critério do ADR-001).
  fonte_id         uuid not null references fontes (fonte_id),
  paginas          text not null,
  trecho           text not null,
  secao            text,
  -- O que a fonte afirma sobre o vínculo (e o que não permite concluir).
  -- Obrigatório para perpetradores (vínculo a órgão repressivo); opcional para
  -- vítimas, onde o vínculo costuma já estar descrito no texto_md.
  nota_vinculo     text,
  criado_em        timestamptz not null default now(),
  foreign key (pessoa_id, pessoa_tipo)
    references biografias (biografia_id, tipo) on delete cascade,
  foreign key (organizacao_id, organizacao_tipo)
    references biografias (biografia_id, tipo) on delete cascade,
  constraint pessoa_organizacoes_nota_perpetrador_check
    check (pessoa_tipo <> 'perpetrador' or nota_vinculo is not null),
  unique (pessoa_id, organizacao_id)
);

create index pessoa_organizacoes_pessoa_idx on pessoa_organizacoes (pessoa_id);
create index pessoa_organizacoes_org_idx    on pessoa_organizacoes (organizacao_id);
