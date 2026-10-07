import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest } from "next/server";
import { supabaseServidor } from "@/lib/server/supabase";

export type MembroAutenticado = {
  userId: string;
  emailConfirmado: boolean;
  perfil: { tag: string; nivel: string; pontos: number; suspenso_em: string | null } | null;
  curador: boolean;
};

const DOMINIO_TOKEN_COMPARTILHAMENTO = "bacuri.compartilhamento.v1";
const VIDA_TOKEN_MS = 7 * 24 * 60 * 60 * 1000;

function segredoCompartilhamento(): string | null {
  const valor = process.env.BACURI_CHAVE_COMPARTILHAMENTO;
  return valor && valor.length >= 32 ? valor : null;
}

function assinar(valor: string): string {
  const segredo = segredoCompartilhamento();
  if (!segredo) throw new Error("Chave de compartilhamento ausente.");
  return createHmac("sha256", segredo).update(valor).digest("base64url");
}

/** Token opaco, separado do token de continuidade e sem dados de conteúdo. */
export function emitirTokenCompartilhamento(interacaoId: string): string | undefined {
  if (!comunidadeAtiva() || !segredoCompartilhamento()) return undefined;
  const carga = Buffer.from(JSON.stringify({ d: DOMINIO_TOKEN_COMPARTILHAMENTO, i: interacaoId, a: Date.now(), e: Date.now() + VIDA_TOKEN_MS })).toString("base64url");
  return `${carga}.${assinar(carga)}`;
}

export function verificarTokenCompartilhamento(token: string, interacaoId: string): boolean {
  if (token.length > 2048 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) return false;
  const partes = token.split(".");
  if (partes.length !== 2 || !segredoCompartilhamento()) return false;
  const esperado = Buffer.from(assinar(partes[0]));
  const recebido = Buffer.from(partes[1]);
  if (esperado.length !== recebido.length || !timingSafeEqual(esperado, recebido)) return false;
  try {
    const carga = JSON.parse(Buffer.from(partes[0], "base64url").toString("utf8"));
    return carga?.d === DOMINIO_TOKEN_COMPARTILHAMENTO && carga?.i === interacaoId && Number.isInteger(carga?.e) && Number.isInteger(carga?.a) && carga.a <= Date.now() && carga.e - carga.a <= VIDA_TOKEN_MS + 1 && carga.e >= Date.now();
  } catch { return false; }
}

export function comunidadeAtiva(): boolean {
  return process.env.BACURI_COMUNIDADE_ATIVA === "true";
}

export async function autenticarMembro(req: NextRequest): Promise<MembroAutenticado | null> {
  const valor = req.headers.get("authorization");
  const token = valor?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return null;
  const { data, error } = await supabaseServidor.auth.getUser(token);
  if (error || !data.user) return null;
  const [{ data: perfil, error: erroPerfil }, { data: curador, error: erroCurador }] = await Promise.all([
    supabaseServidor.from("membros_comunidade").select("tag, nivel, pontos, suspenso_em, encerrado_em").eq("user_id", data.user.id).maybeSingle(),
    supabaseServidor.from("curadores").select("user_id").eq("user_id", data.user.id).eq("ativo", true).maybeSingle(),
  ]);
  // Uma consulta indisponível não pode parecer um perfil novo e permitir upload.
  if (erroPerfil || erroCurador) return null;
  if (perfil?.encerrado_em) return null;
  return { userId: data.user.id, emailConfirmado: Boolean(data.user.email_confirmed_at), perfil, curador: Boolean(curador) && !perfil?.suspenso_em };
}
