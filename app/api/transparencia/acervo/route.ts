import { NextRequest, NextResponse } from "next/server";
import { supabaseServidor } from "@/lib/server/supabase";
import { dentroDoLimite } from "@/lib/server/limite";
import type { ItemAcervo, RespostaAcervo, RespostaErro } from "@/lib/shared/tipos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function obterIp(requisicao: NextRequest): string {
  const encaminhado = requisicao.headers.get("x-forwarded-for");
  if (encaminhado) return encaminhado.split(",")[0].trim();
  return "desconhecido";
}

function respostaErro(
  codigo: RespostaErro["erro"]["codigo"],
  mensagem: string,
  status: number
): NextResponse<RespostaErro> {
  return NextResponse.json({ erro: { codigo, mensagem } }, { status });
}

export async function GET(requisicao: NextRequest): Promise<NextResponse> {
  const ip = obterIp(requisicao);
  if (!dentroDoLimite(ip)) {
    return respostaErro(
      "LIMITE_EXCEDIDO",
      "Muitas requisições em pouco tempo. Aguarde um minuto e tente novamente.",
      429
    );
  }

  try {
    const { data, error } = await supabaseServidor
      .from("fontes")
      .select(
        "fonte_id, titulo, autor_orgao, tipo_fonte, confiabilidade, data_documento, periodo, url_origem, nota_contexto"
      )
      .order("tipo_fonte", { ascending: true })
      .order("titulo", { ascending: true });

    if (error) throw new Error(`Falha ao consultar acervo: ${error.message}`);

    const itens = (data ?? []) as ItemAcervo[];

    const total = itens.length;
    const porTipo: Record<string, number> = {};
    for (const item of itens) {
      porTipo[item.tipo_fonte] = (porTipo[item.tipo_fonte] ?? 0) + 1;
    }

    return NextResponse.json({ itens, total, porTipo } satisfies RespostaAcervo, {
      status: 200,
    });
  } catch (erro) {
    console.error("Erro em GET /api/transparencia/acervo:", erro);
    return respostaErro(
      "ERRO_INTERNO",
      "Não foi possível listar o acervo. Tente novamente em instantes.",
      500
    );
  }
}
