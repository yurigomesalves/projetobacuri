import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServidor } from "@/lib/server/supabase";
import { dentroDoLimite } from "@/lib/server/limite";
import type { BiografiaResumo, RespostaErro } from "@/lib/shared/tipos";

export const runtime = "nodejs";

const ITENS_POR_PAGINA = 20;

const esquemaQuery = z.object({
  q: z.string().trim().min(1).max(200).optional(),
  tipo: z.enum(["vitima", "organizacao", "perpetrador", "local"]).optional(),
  cidade: z.string().trim().min(1).max(200).optional(),
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

// Escapa caracteres especiais do operador ILIKE do Postgres (% e _) para que
// busca textual do usuário não vire um padrão de coincidência arbitrário.
function escaparIlike(valor: string): string {
  return valor.replace(/[%_]/g, (caractere) => `\\${caractere}`);
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
    q: url.searchParams.get("q") ?? undefined,
    tipo: url.searchParams.get("tipo") ?? undefined,
    cidade: url.searchParams.get("cidade") ?? undefined,
    pagina: url.searchParams.get("pagina") ?? undefined,
  });

  if (!validado.success) {
    return respostaErro(
      "ENTRADA_INVALIDA",
      "Parâmetros inválidos. Verifique 'q', 'tipo', 'cidade' e 'pagina'.",
      400
    );
  }

  const { q, tipo, cidade, pagina } = validado.data;

  try {
    const inicio = (pagina - 1) * ITENS_POR_PAGINA;
    const fim = inicio + ITENS_POR_PAGINA - 1;

    let consulta = supabaseServidor
      .from("biografias")
      .select("slug, nome, tipo, resumo_1_linha, municipio, uf", { count: "exact" })
      .eq("status_curadoria", "publicada");

    if (q) {
      consulta = consulta.ilike("nome", `%${escaparIlike(q)}%`);
    }
    if (tipo) {
      consulta = consulta.eq("tipo", tipo);
    }
    if (cidade) {
      consulta = consulta.ilike("municipio", `%${escaparIlike(cidade)}%`);
    }

    const { data, count, error } = await consulta
      .order("nome", { ascending: true })
      .range(inicio, fim);

    if (error) {
      throw new Error(`Falha ao buscar biografias: ${error.message}`);
    }

    const itens: BiografiaResumo[] = (data ?? []).map((linha) => {
      const item: BiografiaResumo = {
        slug: linha.slug,
        nome: linha.nome,
        tipo: linha.tipo as BiografiaResumo["tipo"],
        resumo_1_linha: linha.resumo_1_linha,
      };
      if (linha.municipio) {
        item.municipio = linha.municipio;
      }
      if (linha.uf) {
        item.uf = linha.uf;
      }
      return item;
    });

    return NextResponse.json({ itens, total: count ?? 0, pagina }, { status: 200 });
  } catch (erro) {
    console.error("Erro em GET /api/biografias:", erro);
    return respostaErro(
      "ERRO_INTERNO",
      "Não foi possível listar as biografias agora. Tente novamente em alguns instantes.",
      500
    );
  }
}
