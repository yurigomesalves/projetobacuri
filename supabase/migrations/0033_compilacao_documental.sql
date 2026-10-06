-- Decisão editorial: docs/avaliacao/decisao-classificacao-dossie-2026-10-05.md.
-- Amplia o vocabulário sem reclassificar outras obras ou tocar nos chunks.
-- A correção do único Dossiê é feita separadamente, com conferência e rollback.
alter table public.fontes drop constraint fontes_tipo_fonte_check;
alter table public.fontes add constraint fontes_tipo_fonte_check check (
  tipo_fonte in (
    'relatorio_oficial', 'documento_repressao',
    'documento_inteligencia_estrangeira', 'imprensa_epoca',
    'producao_academica', 'testemunho',
    'legislacao_decisao_judicial', 'material_didatico_educativo',
    'compilacao_documental'
  )
);
alter table public.fontes drop constraint nota_contexto_obrigatoria;
alter table public.fontes add constraint nota_contexto_obrigatoria check (
  (tipo_fonte not in ('imprensa_epoca', 'documento_repressao')
    or nota_contexto is not null)
  and (tipo_fonte <> 'compilacao_documental'
    or nullif(btrim(nota_contexto), '') is not null)
);
