import { NextRequest, NextResponse } from "next/server";
import { autenticarCurador } from "@/lib/server/curadoria-auth";
import type { Curador, RespostaErro } from "@/lib/shared/tipos";

export const runtime = "nodejs";

// Identidade do curador autenticado. O frontend usa esta rota logo após o login
// para saber o nome (cabeçalho da área) e o papel — só admin vê o painel de
// convites. Devolve 401 se o token não for válido ou a pessoa não for curadora.

function respostaErro(
  codigo: RespostaErro["erro"]["codigo"],
  mensagem: string,
  status: number
): NextResponse<RespostaErro> {
  return NextResponse.json({ erro: { codigo, mensagem } }, { status });
}

export async function GET(requisicao: NextRequest): Promise<NextResponse> {
  const curador = await autenticarCurador(requisicao);
  if (!curador) {
    return respostaErro("NAO_AUTORIZADO", "Acesso não autorizado à curadoria.", 401);
  }

  const dados: Curador = curador;
  return NextResponse.json(dados, { status: 200 });
}
