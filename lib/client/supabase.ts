import { createClient } from "@supabase/supabase-js";

// Cliente Supabase do navegador (singleton).
//
// A "anon key" abaixo é pública por design — ela só permite o que as
// políticas de acesso (RLS) e a validação no servidor autorizarem. Toda
// decisão sensível (quem é admin, o que pode ser alterado) é checada nas
// rotas de app/api/curadoria, nunca aqui.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);

// Retorna o token de acesso da sessão atual (ou null se não houver sessão),
// para uso no cabeçalho `Authorization: Bearer ...` das chamadas à API.
export async function tokenAtual(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
