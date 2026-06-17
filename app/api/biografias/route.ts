import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServidor } from "@/lib/server/supabase";
import { dentroDoLimite } from "@/lib/server/limite";
import type { BiografiaResumo, RespostaErro } from "@/lib/shared/tipos";

export const runtime = "nodejs";

const ITENS_POR_PAGINA = 20;

// Aceita ano (YYYY) ou data ISO (YYYY-MM-DD). `extremo` define para que lado o
// ano isolado é expandido: "de" → 1º de janeiro; "ate" → 31 de dezembro.
function normalizarData(extremo: "de" | "ate") {
  return z
    .string()
    .trim()
    .regex(/^\d{4}(-\d{2}-\d{2})?$/, "data deve ser YYYY ou YYYY-MM-DD")
    .transform((valor) =>
      valor.length === 4
        ? `${valor}-${extremo === "de" ? "01-01" : "12-31"}`
        : valor
    )
    .optional();
}

const esquemaQuery = z.object({
  q: z.string().trim().min(1).max(200).optional(),
  tipo: z.enum(["vitima", "organizacao", "perpetrador", "local"]).optional(),
  cidade: z.string().trim().min(1).max(200).optional(),
  uf_natal: z.string().trim().length(2).optional(),
  periodo_de: normalizarData("de"),
  periodo_ate: normalizarData("ate"),
  organizacao: z.string().trim().min(1).max(200).optional(),
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
    uf_natal: url.searchParams.get("uf_natal") ?? undefined,
    periodo_de: url.searchParams.get("periodo_de") ?? undefined,
    periodo_ate: url.searchParams.get("periodo_ate") ?? undefined,
    organizacao: url.searchParams.get("organizacao") ?? undefined,
    pagina: url.searchParams.get("pagina") ?? undefined,
  });

  if (!validado.success) {
    return respostaErro(
      "ENTRADA_INVALIDA",
      "Parâmetros inválidos. Verifique 'q', 'tipo', 'cidade', 'uf_natal', 'periodo_de', 'periodo_ate', 'organizacao' e 'pagina'.",
      400
    );
  }

  const {
    q,
    tipo,
    cidade,
    uf_natal: ufNatal,
    periodo_de: periodoDe,
    periodo_ate: periodoAte,
    organizacao,
    pagina,
  } = validado.data;

  try {
    const inicio = (pagina - 1) * ITENS_POR_PAGINA;
    const fim = inicio + ITENS_POR_PAGINA - 1;

    // Filtro por organização (ADR-016, decisão 3): resolve o slug da
    // organização → biografia_id e busca as pessoas com vínculo documentado.
    // Sem vínculo (ou organização inexistente), a lista fica vazia.
    let pessoasVinculadas: string[] | null = null;
    if (organizacao) {
      const { data: org, error: erroOrg } = await supabaseServidor
        .from("biografias")
        .select("biografia_id")
        .eq("slug", organizacao)
        .eq("tipo", "organizacao")
        .eq("status_curadoria", "publicada")
        .maybeSingle();
      if (erroOrg) {
        throw new Error(`Falha ao resolver organização: ${erroOrg.message}`);
      }

      pessoasVinculadas = [];
      if (org) {
        const { data: vinculos, error: erroVinculos } = await supabaseServidor
          .from("pessoa_organizacoes")
          .select("pessoa_id")
          .eq("organizacao_id", org.biografia_id);
        if (erroVinculos) {
          throw new Error(`Falha ao buscar vínculos: ${erroVinculos.message}`);
        }
        pessoasVinculadas = (vinculos ?? []).map((v) => v.pessoa_id as string);
      }

      // Nenhuma pessoa vinculada → resultado vazio sem ir ao banco de novo.
      if (pessoasVinculadas.length === 0) {
        return NextResponse.json({ itens: [], total: 0, pagina }, { status: 200 });
      }
    }

    let consulta = supabaseServidor
      .from("biografias")
      .select(
        "biografia_id, slug, nome, tipo, resumo_1_linha, municipio, uf, municipio_natal, uf_natal, data_inicio, data_fim",
        { count: "exact" }
      )
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
    if (ufNatal) {
      consulta = consulta.eq("uf_natal", ufNatal.toUpperCase());
    }
    // Período por interseção de intervalos (ADR-016, decisão 2). Extremos NULL
    // = "sem limite nesse lado": uma ficha só é excluída quando seu intervalo
    // termina antes de `periodo_de` ou começa depois de `periodo_ate`.
    if (periodoDe) {
      consulta = consulta.or(`data_fim.is.null,data_fim.gte.${periodoDe}`);
    }
    if (periodoAte) {
      consulta = consulta.or(`data_inicio.is.null,data_inicio.lte.${periodoAte}`);
    }
    if (pessoasVinculadas) {
      consulta = consulta.in("biografia_id", pessoasVinculadas);
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
      if (linha.municipio_natal) {
        item.municipio_natal = linha.municipio_natal;
      }
      if (linha.uf_natal) {
        item.uf_natal = linha.uf_natal;
      }
      if (linha.data_inicio) {
        item.data_inicio = linha.data_inicio;
      }
      if (linha.data_fim) {
        item.data_fim = linha.data_fim;
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
