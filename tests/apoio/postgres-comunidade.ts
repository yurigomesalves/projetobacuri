import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite-pgvector";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

/** PostgreSQL real em memória. Nunca lê credenciais nem acessa Supabase remoto.
 * Auth é representado só pelas colunas/FKs necessárias; login é testado à parte.
 */
export async function criarPostgresComunidade() {
  const db = new PGlite({ extensions: { vector } });
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role bypassrls;
    create schema auth;
    create table auth.users (
      id uuid primary key, email text unique,
      email_confirmed_at timestamptz, created_at timestamptz default now(),
      raw_user_meta_data jsonb default '{}', deleted_at timestamptz
    );
    create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema public, auth to anon, authenticated, service_role;
  `);
  const pasta = resolve("supabase/migrations");
  const bases = [
    "0001_acervo.sql", "0002_tipo_chunk.sql", "0003_interacoes_feedbacks.sql",
    "0005_curadoria.sql", "0006_biografias_eventos.sql", "0009_nota_contexto_chunk.sql", "0010_curadoria_contas.sql",
    "0015_subsecao_chunk.sql",
  ];
  const novas = (await readdir(pasta)).filter((nome) => /^00(3[4-9]|[4-9]\d)_/.test(nome)).sort();
  try {
    for (const nome of [...bases, ...novas]) {
      await db.exec(await readFile(resolve(pasta, nome), "utf8"));
    }
    return db;
  } catch (error) {
    await db.close();
    throw error;
  }
}

export const idsComunidade = {
  autor: "10000000-0000-4000-8000-000000000001",
  curador1: "10000000-0000-4000-8000-000000000002",
  curador2: "10000000-0000-4000-8000-000000000003",
  curador3: "10000000-0000-4000-8000-000000000004",
  membro: "10000000-0000-4000-8000-000000000005",
  candidato: "10000000-0000-4000-8000-000000000006",
  fonte: "20000000-0000-4000-8000-000000000001",
  chunk: "30000000-0000-4000-8000-000000000001",
  interacao: "40000000-0000-4000-8000-000000000001",
};

export async function popularBaseComunidade(db: PGlite) {
  for (const [tag, id] of Object.entries(idsComunidade).slice(0, 6)) {
    await db.query(
      "insert into auth.users(id,email,email_confirmed_at,created_at) values ($1,$2,now(),now()-interval '100 days')",
      [id, `${tag}@example.test`],
    );
  }
  for (const tag of ["curador1", "curador2", "curador3"] as const) {
    await db.query(
      "insert into curadores(user_id,nome,email,papel) values ($1,$2,$3,'curador')",
      [idsComunidade[tag], tag, `${tag}@example.test`],
    );
  }
  await db.query(
    `insert into fontes(fonte_id,titulo,autor_orgao,tipo_fonte,confiabilidade,url_origem,proveniencia)
     values ($1,'Fonte de teste','Arquivo de teste','relatorio_oficial','alta','https://example.test/fonte','Fixture de teste; não é fonte histórica real')`,
    [idsComunidade.fonte],
  );
  await db.query(
    `insert into chunks(chunk_id,fonte_id,conteudo,paginas,ordem,embedding)
     values ($1,$2,'Trecho documental de teste.','10',1,$3::vector)`,
    [idsComunidade.chunk, idsComunidade.fonte, JSON.stringify(Array.from({ length: 384 }, (_, i) => i === 0 ? 1 : 0))],
  );
  await db.query(
    "insert into interacoes(interacao_id,pergunta,resposta,citacoes) values ($1,'Pergunta de teste?','Resposta de teste [1].','[]')",
    [idsComunidade.interacao],
  );
}
