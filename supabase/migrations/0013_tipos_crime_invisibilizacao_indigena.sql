-- Migração 0013 — ADR-015: dois novos tipos_crime para a violência colonial
-- documentada no relatório do Comitê Estadual da Verdade do Amazonas
-- (genocídio Waimiri-Atroari): `grilagem_de_territorio_indigena` e
-- `apagamento_de_registros_e_testemunhos`. Operação ADITIVA — apenas amplia o
-- vocabulário fechado do check em eventos_geo; não altera nenhum dado existente.

alter table eventos_geo drop constraint eventos_geo_tipos_crime_check;

alter table eventos_geo add constraint eventos_geo_tipos_crime_check check (
  tipos_crime <@ array[
    'prisao_ilegal_arbitraria', 'tortura', 'execucao_sumaria',
    'desaparecimento_forcado', 'ocultacao_de_cadaver',
    'violencia_sexual', 'violencia_contra_povos_indigenas',
    'perseguicao_exilio_banimento', 'censura',
    'atentado_a_populacao_civil',
    'grilagem_de_territorio_indigena',
    'apagamento_de_registros_e_testemunhos'
  ]::text[]
  and array_length(tipos_crime, 1) >= 1
);
