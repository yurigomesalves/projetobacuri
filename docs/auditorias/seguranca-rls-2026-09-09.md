# Auditoria de RLS — eventos e territórios

Data: 09/09/2026.

## Achado

O linter de segurança do Supabase apontou seis tabelas expostas pelo schema
`public` sem Row Level Security: `eventos_geo`, `evento_fontes`,
`evento_marcadores`, `evento_justica_fontes`, `evento_vitimas` e
`terras_indigenas`. Os papéis `anon` e `authenticated` possuem permissões de
leitura e escrita nessas tabelas. Em `eventos_geo`, uma política de leitura pública
existe, mas o RLS está desativado e a política não protege a tabela.

## Caminho de acesso do produto

O cliente do navegador usa o Supabase somente para Supabase Auth. As páginas
públicas consultam Route Handlers em `app/api/`; esses handlers usam o cliente de
`lib/server/supabase.ts`, configurado com `service_role`. A curadoria também grava
por rotas autenticadas do servidor. Portanto, o produto não depende de acesso
direto de `anon` ou `authenticated` às seis tabelas.

## Correção aplicada

A migração `0025_protege_eventos_territorios_com_rls.sql` remove a política ampla
de `eventos_geo` e ativa RLS nas seis tabelas sem criar políticas para o navegador.
Com isso, o banco bloqueia acesso direto pelos papéis públicos, enquanto as APIs do
servidor continuam operando com `service_role` e preservam os filtros editoriais.

## Verificação

- RLS ativo e zero políticas públicas nas seis tabelas.
- Sob o papel `anon`, a leitura retornou zero linhas em todas elas.
- Com acesso do servidor, permaneceram visíveis 307 eventos, 388 vínculos de fontes,
  28 marcadores, 331 vínculos de vítimas e 627 terras indígenas.
- `GET /api/eventos-geo` e `GET /api/territorios-origem` responderam HTTP 200.
- O advisor deixou de apontar `RLS disabled in public` e
  `Policy exists RLS disabled`. O aviso informativo `RLS enabled no policy` é o
  comportamento intencional: acesso somente pelas APIs do servidor.

Não foram incluídas correções para a extensão `vector`, proteção contra senhas
vazadas ou índices de chaves estrangeiras; esses avisos exigem fases próprias.
