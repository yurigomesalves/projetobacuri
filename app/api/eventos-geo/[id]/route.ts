import { lerEventoPublico } from "@/lib/server/registros-publicos";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { dentroDoLimite } from "@/lib/server/limite";
import type { RespostaErro } from "@/lib/shared/tipos";

export const runtime = "nodejs";

const esquemaParametros = z.object({
  id: z.string().uuid(),
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

export async function GET(
  requisicao: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const ip = obterIp(requisicao);
  if (!dentroDoLimite(ip)) {
    return respostaErro(
      "LIMITE_EXCEDIDO",
      "Muitas requisições em pouco tempo. Aguarde um minuto e tente novamente.",
      429
    );
  }

  const { id } = await params;
  const validado = esquemaParametros.safeParse({ id });

  if (!validado.success) {
    return respostaErro(
      "ENTRADA_INVALIDA",
      "O identificador do evento deve ser um UUID válido.",
      400
    );
  }

  try {
    const resultado = await lerEventoPublico(id);
    if (!resultado) return respostaErro("ACERVO_SEM_RESULTADO", "Registro publicado não encontrado no acervo.", 404);
    return NextResponse.json(resultado, { status: 200 });
  } catch (erro) {
    console.error("Erro em GET /api/eventos-geo/[id]:", erro);
    return respostaErro(
      "ERRO_INTERNO",
      "Não foi possível carregar esse evento agora. Tente novamente em alguns instantes.",
      500
    );
  }
}
