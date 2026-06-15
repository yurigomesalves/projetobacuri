import { NextRequest, NextResponse } from "next/server";
import { supabaseServidor } from "@/lib/server/supabase";
import { autenticarCurador, exigirAdmin } from "@/lib/server/curadoria-auth";
import type { CuradorPublico, PapelCurador, RespostaErro } from "@/lib/shared/tipos";

export const runtime = "nodejs";

function respostaErro(
  codigo: RespostaErro["erro"]["codigo"],
  mensagem: string,
  status: number
): NextResponse<RespostaErro> {
  return NextResponse.json({ erro: { codigo, mensagem } }, { status });
}

type ItemCuradorAdmin = CuradorPublico & { email: string; papel: PapelCurador };

/** Lista os curadores cadastrados, para o painel do admin. */
export async function GET(requisicao: NextRequest): Promise<NextResponse> {
  const curador = await autenticarCurador(requisicao);
  if (!exigirAdmin(curador)) {
    return respostaErro("NAO_AUTORIZADO", "Acesso não autorizado à curadoria.", 401);
  }

  try {
    const { data, error } = await supabaseServidor
      .from("curadores")
      .select("nome, email, papel, foto_url, lattes_url, organizacao, sobre")
      .order("nome", { ascending: true });

    if (error) {
      throw new Error(`Falha ao listar curadores: ${error.message}`);
    }

    const itens: ItemCuradorAdmin[] = (data ?? []).map((linha) => ({
      nome: linha.nome,
      email: linha.email,
      papel: linha.papel,
      foto_url: linha.foto_url ?? undefined,
      lattes_url: linha.lattes_url ?? undefined,
      organizacao: linha.organizacao ?? undefined,
      sobre: linha.sobre ?? undefined,
    }));

    return NextResponse.json({ itens }, { status: 200 });
  } catch (erro) {
    console.error("Erro em GET /api/curadoria/curadores:", erro);
    return respostaErro(
      "ERRO_INTERNO",
      "Não foi possível listar os curadores agora. Tente novamente em alguns instantes.",
      500
    );
  }
}
