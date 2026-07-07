-- Migração de conteúdo: "civil-militar" -> "militar-empresarial" (texto autoral)
-- Aplicada em 2026-06-22 via Supabase MCP (execute_sql).
--
-- Contexto: adoção da denominação historiográfica "Ditadura Militar-Empresarial"
-- no lugar de "Ditadura Civil-Militar". Padronização feita primeiro no repositório
-- (código + docs) e, aqui, no conteúdo autoral já gravado no banco.
--
-- ESCOPO: apenas texto da voz do projeto (curadoria). Cobre tanto "ditadura
-- civil-militar" quanto "golpe civil-militar" (decisão editorial do Yuri).
--
-- PRESERVADO (NÃO alterar — princípio de referência autoral; mudar falsificaria a fonte):
--   * fontes.nota_contexto (Relatório de Volta Redonda): contém a classificação
--     entre aspas da própria comissão — 'ditadura civil-militar tardia'.
--   * chunks.conteudo, fontes.titulo, biografia_fontes.trecho e demais campos de
--     trecho: texto verbatim copiado das fontes.
--
-- Duas passagens de regexp_replace preservam a caixa (maiúscula/minúscula).
-- Idempotente: reexecutar não tem efeito (não resta "civil-militar" nos campos alvo).

UPDATE biografias
SET texto_md = regexp_replace(
      regexp_replace(texto_md, 'Civil[- ]Militar', 'Militar-Empresarial', 'g'),
      'civil[- ]militar', 'militar-empresarial', 'g')
WHERE texto_md ~* 'civil[- ]militar';

UPDATE biografias
SET resumo_1_linha = regexp_replace(
      regexp_replace(resumo_1_linha, 'Civil[- ]Militar', 'Militar-Empresarial', 'g'),
      'civil[- ]militar', 'militar-empresarial', 'g')
WHERE resumo_1_linha ~* 'civil[- ]militar';

UPDATE eventos_geo
SET descricao_md = regexp_replace(
      regexp_replace(descricao_md, 'Civil[- ]Militar', 'Militar-Empresarial', 'g'),
      'civil[- ]militar', 'militar-empresarial', 'g')
WHERE descricao_md ~* 'civil[- ]militar';
