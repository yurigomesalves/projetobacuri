import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServidor } from "@/lib/server/supabase";
import { autenticarCurador } from "@/lib/server/curadoria-auth";
import type { FeedbackCuradoria, RespostaErro } from "@/lib/shared/tipos";

export const runtime = "nodejs";

const ITENS_POR_PAGINA = 20;

const esquemaQuery = z.object({
  status: z.enum(["pendente", "aceito", "recusado"]).default("pendente"),
  pagina: z.coerce.number().int().min(1).default(1),
});

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

  const url = new URL(requisicao.url);
  const validado = esquemaQuery.safeParse({
    status: url.searchParams.get("status") ?? undefined,
    pagina: url.searchParams.get("pagina") ?? undefined,
  });

  if (!validado.success) {
    return respostaErro(
      "ENTRADA_INVALIDA",
      "Parâmetros inválidos: 'status' deve ser pendente, aceito ou recusado, e 'pagina' deve ser um número inteiro >= 1.",
      400
    );
  }

  const { status, pagina } = validado.data;

  try {
    const inicio = (pagina - 1) * ITENS_POR_PAGINA;
    const fim = inicio + ITENS_POR_PAGINA - 1;

    const { data, count, error } = await supabaseServidor
      .from("feedbacks")
      .select(
        "feedback_id, classificacao, resposta_alternativa, fontes_sugeridas, status, justificativa_decisao, criado_em, decidido_em, interacao:interacoes(interacao_id, pergunta, resposta, citacoes)",
        { count: "exact" }
      )
      .eq("status", status)
      .order("criado_em", { ascending: false })
      .range(inicio, fim);

    if (error) {
      throw new Error(`Falha ao buscar feedbacks: ${error.message}`);
    }

    const itens: FeedbackCuradoria[] = (data ?? []).map((linha) => {
      const interacao = Array.isArray(linha.interacao) ? linha.interacao[0] : linha.interacao;
      return {
        feedback_id: linha.feedback_id,
        classificacao: linha.classificacao,
        resposta_alternativa: linha.resposta_alternativa ?? undefined,
        fontes_sugeridas: linha.fontes_sugeridas ?? undefined,
        status: linha.status,
        justificativa_decisao: linha.justificativa_decisao ?? undefined,
        criado_em: linha.criado_em,
        decidido_em: linha.decidido_em ?? undefined,
        interacao: {
          interacao_id: interacao.interacao_id,
          pergunta: interacao.pergunta,
          resposta: interacao.resposta,
          citacoes: interacao.citacoes ?? [],
        },
      };
    });

    return NextResponse.json({ itens, total: count ?? 0, pagina }, { status: 200 });
  } catch (erro) {
    console.error("Erro em GET /api/curadoria/feedbacks:", erro);
    return respostaErro(
      "ERRO_INTERNO",
      "Não foi possível listar os feedbacks agora. Tente novamente em alguns instantes.",
      500
    );
  }
}
