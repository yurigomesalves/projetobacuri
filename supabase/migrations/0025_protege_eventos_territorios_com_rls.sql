-- Migração 0025 — fecha o acesso direto às tabelas públicas de eventos e territórios.
--
-- O navegador usa Supabase apenas para autenticação. As leituras e escritas do
-- produto passam por Route Handlers com service_role, que ignora RLS e aplica os
-- filtros editoriais (por exemplo, status_curadoria = 'publicada'). Sem políticas,
-- anon e authenticated não podem contornar essas APIs nem alterar o acervo.

drop policy if exists "eventos_geo public read" on public.eventos_geo;

alter table public.eventos_geo enable row level security;
alter table public.evento_fontes enable row level security;
alter table public.evento_marcadores enable row level security;
alter table public.evento_justica_fontes enable row level security;
alter table public.evento_vitimas enable row level security;
alter table public.terras_indigenas enable row level security;
