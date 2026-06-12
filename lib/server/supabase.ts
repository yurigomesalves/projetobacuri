import { createClient } from "@supabase/supabase-js";

// Cliente Supabase para uso EXCLUSIVO no servidor (Route Handlers).
// Usa a chave service_role, que ignora RLS — por isso nunca pode ser
// exposta ao navegador (não usar prefixo NEXT_PUBLIC_ na chave).
// A URL do projeto é pública (NEXT_PUBLIC_SUPABASE_URL), mas a chave aqui
// só existe em variável de ambiente do servidor (.env.local / Vercel).
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const chaveServico = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !chaveServico) {
  throw new Error(
    "Configuração do Supabase ausente: defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY."
  );
}

export const supabaseServidor = createClient(url, chaveServico, {
  auth: { persistSession: false },
});
