import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServidor } from "@/lib/server/supabase";
import { dentroDoLimite } from "@/lib/server/limite";
import type { RespostaErro, RespostaFeedback } from "@/lib/shared/tipos";

export const runtime = "nodejs";

const esquemaRequisicao = z.object({
  interacao_id: z.string().uuid(),
  classificacao: z.enum(["util", "incompleta", "incorreta"]),
  resposta_alternativa: z.string().max(3000).optional(),
  fontes_sugeridas: z.string().optional(),
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

export async function POST(requisicao: NextRequest): Promise<NextResponse> {
  const ip = obterIp(requisicao);
  if (!dentroDoLimite(ip)) {
    return respostaErro(
      "LIMITE_EXCEDIDO",
      "Muitas requisições em pouco tempo. Aguarde um minuto e tente novamente.",
      429
    );
  }

  let corpo: unknown;
  try {
    corpo = await requisicao.json();
  } catch {
    return respostaErro("ENTRADA_INVALIDA", "Corpo da requisição deve ser JSON válido.", 400);
  }

  const validado = esquemaRequisicao.safeParse(corpo);
  if (!validado.success) {
    return respostaErro(
      "ENTRADA_INVALIDA",
      "Dados inválidos: verifique 'interacao_id', 'classificacao' (util, incompleta ou incorreta) e o tamanho de 'resposta_alternativa' (até 3000 caracteres).",
      400
    );
  }

  const { interacao_id, classificacao, resposta_alternativa, fontes_sugeridas } = validado.data;

  try {
    const { data: interacao, error: erroBusca } = await supabaseServidor
      .from("interacoes")
      .select("interacao_id")
      .eq("interacao_id", interacao_id)
      .maybeSingle();

    if (erroBusca) {
      throw new Error(`Falha ao verificar interação: ${erroBusca.message}`);
    }

    if (!interacao) {
      return respostaErro("ENTRADA_INVALIDA", "interacao_id não corresponde a nenhuma interação registrada.", 400);
    }

    const { error: erroInsercao } = await supabaseServidor.from("feedbacks").insert({
      interacao_id,
      classificacao,
      resposta_alternativa: resposta_alternativa ?? null,
      fontes_sugeridas: fontes_sugeridas ?? null,
      status: "pendente",
    });

    if (erroInsercao) {
      throw new Error(`Falha ao registrar feedback: ${erroInsercao.message}`);
    }

    const corpoResposta: RespostaFeedback = { status: "recebido_para_curadoria" };
    return NextResponse.json(corpoResposta, { status: 201 });
  } catch (erro) {
    console.error("Erro em /api/feedback:", erro);
    return respostaErro(
      "ERRO_INTERNO",
      "Não foi possível registrar o feedback agora. Tente novamente em alguns instantes.",
      500
    );
  }
}
