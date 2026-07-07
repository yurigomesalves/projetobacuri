-- Migração 0017 — ADR-010: novo tipo_evento `centro_clandestino_repressao`
-- para marcar centros clandestinos de tortura e extermínio (Casa da Morte/Petrópolis,
-- CISA/Galeão, DOI-CODI/RJ, etc.). Operação ADITIVA — apenas amplia o vocabulário
-- fechado do check em eventos_geo; não altera nenhum dado existente.

alter table eventos_geo drop constraint eventos_geo_tipo_evento_check;

alter table eventos_geo add constraint eventos_geo_tipo_evento_check check (
  tipo_evento in (
    'caso_individual', 'operacao_repressiva',
    'guerrilha_confronto', 'violencia_institucional_coletiva',
    'ato_censura', 'centro_clandestino_repressao'
  )
);
