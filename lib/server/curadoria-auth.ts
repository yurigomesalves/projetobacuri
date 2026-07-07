import { NextRequest } from "next/server";
import { supabaseServidor } from "@/lib/server/supabase";
import type { Curador } from "@/lib/shared/tipos";

// Autenticação das rotas de curadoria via Supabase Auth.
//
// O navegador envia `Authorization: Bearer <access_token>` (JWT obtido no
// login). Aqui validamos esse token com o Supabase e, em seguida, buscamos a
// linha correspondente em `curadores` para saber nome/papel. Sem token válido
// ou sem linha em `curadores`, o acesso é negado (retorna null) — a senha
// única compartilhada (CURADORIA_SENHA) foi removida do projeto.

/**
 * Extrai o curador autenticado a partir do header Authorization, ou null se
 * o token estiver ausente, inválido, ou se a pessoa não tiver perfil em
 * `curadores` (ainda não convidada/cadastrada).
 */
export async function autenticarCurador(req: NextRequest): Promise<Curador | null> {
  const cabecalho = req.headers.get("authorization");
  if (!cabecalho) {
    return null;
  }

  const partes = cabecalho.split(" ");
  if (partes.length !== 2 || partes[0] !== "Bearer" || !partes[1]) {
    return null;
  }

  const token = partes[1];

  const { data: userData, error: erroUsuario } = await supabaseServidor.auth.getUser(token);
  if (erroUsuario || !userData?.user) {
    return null;
  }

  const { data: curador, error: erroCurador } = await supabaseServidor
    .from("curadores")
    .select("user_id, nome, email, papel")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (erroCurador || !curador) {
    return null;
  }

  return {
    user_id: curador.user_id,
    nome: curador.nome,
    email: curador.email,
    papel: curador.papel,
  };
}

/** True se o curador autenticado tem papel 'admin'. */
export function exigirAdmin(curador: Curador | null): boolean {
  return curador?.papel === "admin";
}
