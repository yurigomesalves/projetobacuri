import { NextRequest, NextResponse } from "next/server";
import { supabaseServidor } from "@/lib/server/supabase";
import { dentroDoLimite } from "@/lib/server/limite";
import type { CuradorPublico, RespostaErro } from "@/lib/shared/tipos";

export const runtime = "nodejs";

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

/** Perfis públicos dos curadores, para o bloco "Quem faz a curadoria". */
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
      .from("curadores")
      .select("nome, foto_url, lattes_url, organizacao, sobre")
      .order("nome", { ascending: true });

    if (error) {
      throw new Error(`Falha ao listar curadores: ${error.message}`);
    }

    const itens: CuradorPublico[] = (data ?? []).map((linha) => ({
      nome: linha.nome,
      foto_url: linha.foto_url ?? undefined,
      lattes_url: linha.lattes_url ?? undefined,
      organizacao: linha.organizacao ?? undefined,
      sobre: linha.sobre ?? undefined,
    }));

    return NextResponse.json({ itens }, { status: 200 });
  } catch (erro) {
    console.error("Erro em GET /api/transparencia/curadores:", erro);
    return respostaErro(
      "ERRO_INTERNO",
      "Não foi possível listar os curadores agora. Tente novamente em alguns instantes.",
      500
    );
  }
}
