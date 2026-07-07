-- Migração 0007 — ADR-008: novo tipo_crime `atentado_a_populacao_civil`
-- (caso Riocentro). Atualiza o vocabulário fechado do check em eventos_geo.

alter table eventos_geo drop constraint eventos_geo_tipos_crime_check;

alter table eventos_geo add constraint eventos_geo_tipos_crime_check check (
  tipos_crime <@ array[
    'prisao_ilegal_arbitraria', 'tortura', 'execucao_sumaria',
    'desaparecimento_forcado', 'ocultacao_de_cadaver',
    'violencia_sexual', 'violencia_contra_povos_indigenas',
    'perseguicao_exilio_banimento', 'censura',
    'atentado_a_populacao_civil'
  ]::text[]
  and array_length(tipos_crime, 1) >= 1
);
