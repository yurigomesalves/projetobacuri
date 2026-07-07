import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServidor } from "@/lib/server/supabase";
import { autenticarCurador, exigirAdmin } from "@/lib/server/curadoria-auth";
import type { ConvitePendente, RespostaConvite, RespostaErro } from "@/lib/shared/tipos";

export const runtime = "nodejs";

const esquemaRequisicao = z.object({
  email: z.string().email(),
});

function respostaErro(
  codigo: RespostaErro["erro"]["codigo"],
  mensagem: string,
  status: number
): NextResponse<RespostaErro> {
  return NextResponse.json({ erro: { codigo, mensagem } }, { status });
}

/** Cria um convite e devolve o link para o admin enviar manualmente. */
export async function POST(requisicao: NextRequest): Promise<NextResponse> {
  const curador = await autenticarCurador(requisicao);
  if (!exigirAdmin(curador)) {
    return respostaErro("NAO_AUTORIZADO", "Acesso não autorizado à curadoria.", 401);
  }

  let corpo: unknown;
  try {
    corpo = await requisicao.json();
  } catch {
    return respostaErro("ENTRADA_INVALIDA", "Corpo da requisição deve ser JSON válido.", 400);
  }

  const validado = esquemaRequisicao.safeParse(corpo);
  if (!validado.success) {
    return respostaErro("ENTRADA_INVALIDA", "E-mail inválido.", 400);
  }

  const { email } = validado.data;

  try {
    // Não convidar quem já tem perfil de curador.
    const { data: existente, error: erroExistente } = await supabaseServidor
      .from("curadores")
      .select("user_id")
      .eq("email", email)
      .maybeSingle();

    if (erroExistente) {
      throw new Error(`Falha ao consultar curadores: ${erroExistente.message}`);
    }

    if (existente) {
      return respostaErro("ENTRADA_INVALIDA", "Este e-mail já é de um curador cadastrado.", 400);
    }

    const token = randomBytes(32).toString("hex");

    const { data: convite, error: erroInsercao } = await supabaseServidor
      .from("convites")
      .insert({
        email,
        token,
        papel: "curador",
        criado_por: curador!.user_id,
      })
      .select("convite_id, email, expira_em")
      .single();

    if (erroInsercao || !convite) {
      throw new Error(`Falha ao criar convite: ${erroInsercao?.message}`);
    }

    const link = new URL(`/curadoria/cadastro?token=${token}`, requisicao.url).toString();

    const resposta: RespostaConvite = {
      convite_id: convite.convite_id,
      email: convite.email,
      link,
      expira_em: convite.expira_em,
    };

    return NextResponse.json(resposta, { status: 201 });
  } catch (erro) {
    console.error("Erro em POST /api/curadoria/convites:", erro);
    return respostaErro(
      "ERRO_INTERNO",
      "Não foi possível criar o convite agora. Tente novamente em alguns instantes.",
      500
    );
  }
}

/** Lista convites pendentes (não usados e não expirados). */
export async function GET(requisicao: NextRequest): Promise<NextResponse> {
  const curador = await autenticarCurador(requisicao);
  if (!exigirAdmin(curador)) {
    return respostaErro("NAO_AUTORIZADO", "Acesso não autorizado à curadoria.", 401);
  }

  try {
    const { data, error } = await supabaseServidor
      .from("convites")
      .select("convite_id, email, token, expira_em, criado_em")
      .is("usado_em", null)
      .gt("expira_em", new Date().toISOString())
      .order("criado_em", { ascending: false });

    if (error) {
      throw new Error(`Falha ao listar convites: ${error.message}`);
    }

    const itens: ConvitePendente[] = (data ?? []).map((linha) => ({
      convite_id: linha.convite_id,
      email: linha.email,
      link: new URL(`/curadoria/cadastro?token=${linha.token}`, requisicao.url).toString(),
      expira_em: linha.expira_em,
      criado_em: linha.criado_em,
    }));

    return NextResponse.json({ itens }, { status: 200 });
  } catch (erro) {
    console.error("Erro em GET /api/curadoria/convites:", erro);
    return respostaErro(
      "ERRO_INTERNO",
      "Não foi possível listar os convites agora. Tente novamente em alguns instantes.",
      500
    );
  }
}
