#!/usr/bin/env node
// Script único: cria (ou reaproveita) o primeiro usuário admin da curadoria.
//
// Uso (a dependência `dotenv` NÃO está instalada no projeto, então as
// variáveis precisam estar no ambiente do shell — ex.: exportando-as antes,
// ou prefixando o comando):
//
//   NEXT_PUBLIC_SUPABASE_URL=... \
//   SUPABASE_SERVICE_ROLE_KEY=... \
//   ADMIN_EMAIL=... \
//   ADMIN_SENHA=... \
//   [ADMIN_NOME=...] \
//   node scripts/criar-admin.mjs
//
// Se preferir, instale `dotenv` (npm install -D dotenv) e troque a leitura
// abaixo por `import 'dotenv/config'` no topo do arquivo para carregar
// automaticamente o .env.local.

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const chaveServico = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.ADMIN_EMAIL;
const senha = process.env.ADMIN_SENHA;
const nome = process.env.ADMIN_NOME || "Administrador";

if (!url || !chaveServico || !email || !senha) {
  console.error(
    "Erro: defina NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAIL e ADMIN_SENHA no ambiente."
  );
  process.exit(1);
}

const supabase = createClient(url, chaveServico, {
  auth: { persistSession: false },
});

async function main() {
  let userId;

  // Tenta criar o usuário. Se já existir, busca o id na lista de usuários.
  const { data: criado, error: erroCriacao } = await supabase.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
  });

  if (erroCriacao) {
    console.log(`Aviso: não foi possível criar o usuário (${erroCriacao.message}). Procurando usuário existente...`);

    const { data: lista, error: erroLista } = await supabase.auth.admin.listUsers();
    if (erroLista) {
      console.error(`Erro ao listar usuários: ${erroLista.message}`);
      process.exit(1);
    }

    const existente = lista.users.find((u) => u.email === email);
    if (!existente) {
      console.error("Erro: usuário não foi criado e não foi encontrado na lista de usuários.");
      process.exit(1);
    }

    userId = existente.id;
    console.log(`Usuário existente reaproveitado: ${userId}`);
  } else {
    userId = criado.user.id;
    console.log(`Usuário criado: ${userId}`);
  }

  // Garante o perfil de admin em `curadores` (upsert por user_id).
  const { error: erroPerfil } = await supabase
    .from("curadores")
    .upsert(
      {
        user_id: userId,
        nome,
        email,
        papel: "admin",
      },
      { onConflict: "user_id" }
    );

  if (erroPerfil) {
    console.error(`Erro ao criar/atualizar perfil de admin: ${erroPerfil.message}`);
    process.exit(1);
  }

  console.log(`Administrador "${nome}" <${email}> configurado com sucesso.`);
}

main().catch((erro) => {
  console.error("Erro inesperado:", erro);
  process.exit(1);
});
