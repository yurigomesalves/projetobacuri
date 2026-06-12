import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServidor } from "@/lib/server/supabase";
import { autenticado } from "@/lib/server/curadoria-auth";
import type { FeedbackCuradoria, RespostaErro } from "@/lib/shared/tipos";

export const runtime = "nodejs";

const esquemaRequisicao = z.object({
  decisao: z.enum(["aceito", "recusado"]),
  justificativa: z.string().min(10).max(2000),
});

function respostaErro(
  codigo: RespostaErro["erro"]["codigo"],
  mensagem: string,
  status: number
): NextResponse<RespostaErro> {
  return NextResponse.json({ erro: { codigo, mensagem } }, { status });
}

export async function PATCH(
  requisicao: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  if (!autenticado(requisicao)) {
    return respostaErro("NAO_AUTORIZADO", "Acesso não autorizado à curadoria.", 401);
  }

  const { id } = await params;

  if (!z.string().uuid().safeParse(id).success) {
    return respostaErro("ENTRADA_INVALIDA", "Identificador de feedback inválido.", 400);
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
      "Dados inválidos: 'decisao' deve ser 'aceito' ou 'recusado', e 'justificativa' deve ter entre 10 e 2000 caracteres.",
      400
    );
  }

  const { decisao, justificativa } = validado.data;

  try {
    const { data: existente, error: erroBusca } = await supabaseServidor
      .from("feedbacks")
      .select("feedback_id, status")
      .eq("feedback_id", id)
      .maybeSingle();

    if (erroBusca) {
      throw new Error(`Falha ao buscar feedback: ${erroBusca.message}`);
    }

    if (!existente) {
      return respostaErro("ENTRADA_INVALIDA", "Feedback não encontrado.", 400);
    }

    if (existente.status !== "pendente") {
      return respostaErro("ENTRADA_INVALIDA", "feedback já decidido", 409);
    }

    const { data: atualizado, error: erroAtualizacao } = await supabaseServidor
      .from("feedbacks")
      .update({
        status: decisao,
        justificativa_decisao: justificativa,
        decidido_em: new Date().toISOString(),
      })
      .eq("feedback_id", id)
      .select(
        "feedback_id, classificacao, resposta_alternativa, fontes_sugeridas, status, justificativa_decisao, criado_em, decidido_em, interacao:interacoes(interacao_id, pergunta, resposta, citacoes)"
      )
      .single();

    if (erroAtualizacao || !atualizado) {
      throw new Error(`Falha ao atualizar feedback: ${erroAtualizacao?.message}`);
    }

    const interacao = Array.isArray(atualizado.interacao)
      ? atualizado.interacao[0]
      : atualizado.interacao;

    const item: FeedbackCuradoria = {
      feedback_id: atualizado.feedback_id,
      classificacao: atualizado.classificacao,
      resposta_alternativa: atualizado.resposta_alternativa ?? undefined,
      fontes_sugeridas: atualizado.fontes_sugeridas ?? undefined,
      status: atualizado.status,
      justificativa_decisao: atualizado.justificativa_decisao ?? undefined,
      criado_em: atualizado.criado_em,
      decidido_em: atualizado.decidido_em ?? undefined,
      interacao: {
        interacao_id: interacao.interacao_id,
        pergunta: interacao.pergunta,
        resposta: interacao.resposta,
        citacoes: interacao.citacoes ?? [],
      },
    };

    return NextResponse.json(item, { status: 200 });
  } catch (erro) {
    console.error("Erro em PATCH /api/curadoria/feedbacks/[id]:", erro);
    return respostaErro(
      "ERRO_INTERNO",
      "Não foi possível registrar a decisão agora. Tente novamente em alguns instantes.",
      500
    );
  }
}
