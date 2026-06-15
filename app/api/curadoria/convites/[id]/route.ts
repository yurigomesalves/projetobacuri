import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServidor } from "@/lib/server/supabase";
import { autenticarCurador, exigirAdmin } from "@/lib/server/curadoria-auth";
import type { RespostaErro } from "@/lib/shared/tipos";

export const runtime = "nodejs";

function respostaErro(
  codigo: RespostaErro["erro"]["codigo"],
  mensagem: string,
  status: number
): NextResponse<RespostaErro> {
  return NextResponse.json({ erro: { codigo, mensagem } }, { status });
}

/** Revoga um convite pendente (não usado). */
export async function DELETE(
  requisicao: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const curador = await autenticarCurador(requisicao);
  if (!exigirAdmin(curador)) {
    return respostaErro("NAO_AUTORIZADO", "Acesso não autorizado à curadoria.", 401);
  }

  const { id } = await params;

  if (!z.string().uuid().safeParse(id).success) {
    return respostaErro("ENTRADA_INVALIDA", "Identificador de convite inválido.", 400);
  }

  try {
    const { error } = await supabaseServidor
      .from("convites")
      .delete()
      .eq("convite_id", id)
      .is("usado_em", null);

    if (error) {
      throw new Error(`Falha ao revogar convite: ${error.message}`);
    }

    return NextResponse.json({ status: "revogado" }, { status: 200 });
  } catch (erro) {
    console.error("Erro em DELETE /api/curadoria/convites/[id]:", erro);
    return respostaErro(
      "ERRO_INTERNO",
      "Não foi possível revogar o convite agora. Tente novamente em alguns instantes.",
      500
    );
  }
}
