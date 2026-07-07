import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServidor } from "@/lib/server/supabase";
import { dentroDoLimite } from "@/lib/server/limite";
import type { ConviteValido, RespostaErro } from "@/lib/shared/tipos";

export const runtime = "nodejs";

const esquemaQuery = z.object({
  token: z.string().min(1),
});

function obterIp(requisicao: NextRequest): string {
  const encaminhado = requisicao.headers.get("x-forwarded-for");
  if (encaminhado) {
    return encaminhado.split(",")[0].trim();
  }
  return "desconhecido";
}

function respostaErro(
  codigo: RespostaErro["erro"]["codigo"],
  mensagem: string,
  status: number
): NextResponse<RespostaErro> {
  return NextResponse.json({ erro: { codigo, mensagem } }, { status });
}

/** Valida um token de convite para abrir a tela de cadastro. Rota pública. */
export async function GET(requisicao: NextRequest): Promise<NextResponse> {
  const ip = obterIp(requisicao);
  if (!dentroDoLimite(ip)) {
    return respostaErro(
      "LIMITE_EXCEDIDO",
      "Muitas requisições em pouco tempo. Aguarde um minuto e tente novamente.",
      429
    );
  }

  const url = new URL(requisicao.url);
  const validado = esquemaQuery.safeParse({
    token: url.searchParams.get("token") ?? undefined,
  });

  if (!validado.success) {
    return respostaErro("ENTRADA_INVALIDA", "Parâmetro 'token' é obrigatório.", 400);
  }

  const { token } = validado.data;

  try {
    const { data: convite, error } = await supabaseServidor
      .from("convites")
      .select("email")
      .eq("token", token)
      .is("usado_em", null)
      .gt("expira_em", new Date().toISOString())
      .maybeSingle();

    if (error) {
      throw new Error(`Falha ao validar convite: ${error.message}`);
    }

    if (!convite) {
      return respostaErro("ACERVO_SEM_RESULTADO", "Convite inválido, já usado ou expirado.", 404);
    }

    const resposta: ConviteValido = { email: convite.email };

    return NextResponse.json(resposta, { status: 200 });
  } catch (erro) {
    console.error("Erro em GET /api/curadoria/convites/validar:", erro);
    return respostaErro(
      "ERRO_INTERNO",
      "Não foi possível validar o convite agora. Tente novamente em alguns instantes.",
      500
    );
  }
}
