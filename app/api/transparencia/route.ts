import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServidor } from "@/lib/server/supabase";
import { dentroDoLimite } from "@/lib/server/limite";
import type { ItemTransparencia, RespostaErro } from "@/lib/shared/tipos";

export const runtime = "nodejs";

const ITENS_POR_PAGINA = 20;

const esquemaQuery = z.object({
  pagina: z.coerce.number().int().min(1).default(1),
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
    pagina: url.searchParams.get("pagina") ?? undefined,
  });

  if (!validado.success) {
    return respostaErro("ENTRADA_INVALIDA", "Parâmetro 'pagina' deve ser um número inteiro >= 1.", 400);
  }

  const { pagina } = validado.data;

  try {
    const inicio = (pagina - 1) * ITENS_POR_PAGINA;
    const fim = inicio + ITENS_POR_PAGINA - 1;

    const { data, count, error } = await supabaseServidor
      .from("feedbacks")
      .select(
        "feedback_id, classificacao, resposta_alternativa, fontes_sugeridas, status, justificativa_decisao, criado_em, decidido_em, decidido_por, interacao:interacoes(pergunta)",
        { count: "exact" }
      )
      .in("status", ["aceito", "recusado"])
      .order("decidido_em", { ascending: false })
      .range(inicio, fim);

    if (error) {
      throw new Error(`Falha ao buscar transparência: ${error.message}`);
    }

    // Nome do curador que decidiu (autoria pública, princípio 1). Buscado
    // numa segunda consulta simples por user_id, em vez de embedding
    // PostGREST, porque o nome da relação feedbacks->curadores via
    // `decidido_por` não é previsível sem alterar a migração.
    const idsCuradores = Array.from(
      new Set((data ?? []).map((linha) => linha.decidido_por).filter((id): id is string => Boolean(id)))
    );

    let nomesPorId = new Map<string, string>();
    if (idsCuradores.length > 0) {
      const { data: curadores, error: erroCuradores } = await supabaseServidor
        .from("curadores")
        .select("user_id, nome")
        .in("user_id", idsCuradores);

      if (erroCuradores) {
        throw new Error(`Falha ao buscar curadores: ${erroCuradores.message}`);
      }

      nomesPorId = new Map((curadores ?? []).map((c) => [c.user_id, c.nome]));
    }

    const itens: ItemTransparencia[] = (data ?? []).map((linha) => {
      const interacao = Array.isArray(linha.interacao) ? linha.interacao[0] : linha.interacao;
      return {
        feedback_id: linha.feedback_id,
        pergunta: interacao.pergunta,
        classificacao: linha.classificacao,
        resposta_alternativa: linha.resposta_alternativa ?? undefined,
        fontes_sugeridas: linha.fontes_sugeridas ?? undefined,
        status: linha.status as "aceito" | "recusado",
        justificativa_decisao: linha.justificativa_decisao ?? "",
        criado_em: linha.criado_em,
        decidido_em: linha.decidido_em ?? "",
        decidido_por_nome: linha.decidido_por ? nomesPorId.get(linha.decidido_por) : undefined,
      };
    });

    return NextResponse.json({ itens, total: count ?? 0, pagina }, { status: 200 });
  } catch (erro) {
    console.error("Erro em GET /api/transparencia:", erro);
    return respostaErro(
      "ERRO_INTERNO",
      "Não foi possível listar os itens de transparência agora. Tente novamente em alguns instantes.",
      500
    );
  }
}
