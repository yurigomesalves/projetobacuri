import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServidor } from "@/lib/server/supabase";
import { dentroDoLimite } from "@/lib/server/limite";
import type { Facetas, RespostaErro } from "@/lib/shared/tipos";

export const runtime = "nodejs";

const esquemaQuery = z.object({
  tipo: z.enum(["vitima", "organizacao", "perpetrador", "local"]).optional(),
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
    tipo: url.searchParams.get("tipo") ?? undefined,
  });

  if (!validado.success) {
    return respostaErro("ENTRADA_INVALIDA", "Parâmetro 'tipo' inválido.", 400);
  }

  const { tipo } = validado.data;

  try {
    // Acervo pequeno (dezenas/centenas de fichas): trazemos as colunas das
    // biografias publicadas e agregamos em memória, evitando RPCs específicas.
    const { data: biografias, error: erroBio } = await supabaseServidor
      .from("biografias")
      .select("biografia_id, tipo, uf_natal, data_inicio, data_fim")
      .eq("status_curadoria", "publicada");

    if (erroBio) {
      throw new Error(`Falha ao buscar biografias: ${erroBio.message}`);
    }

    const linhas = biografias ?? [];

    // `tipos`: contagem por tipo sobre TODAS as publicadas (o filtro `tipo`
    // refina apenas as demais facetas, sem esconder as opções de tipo).
    const contagemTipos = new Map<string, number>();
    for (const linha of linhas) {
      contagemTipos.set(linha.tipo, (contagemTipos.get(linha.tipo) ?? 0) + 1);
    }
    const tipos = [...contagemTipos.entries()]
      .map(([valor, total]) => ({ valor, total }))
      .sort((a, b) => a.valor.localeCompare(b.valor, "pt-BR"));

    // Subconjunto sob o filtro `tipo`, base de ufs_natais e periodo.
    const subconjunto = tipo ? linhas.filter((l) => l.tipo === tipo) : linhas;

    const contagemUfs = new Map<string, number>();
    let periodoMin: string | null = null;
    let periodoMax: string | null = null;
    for (const linha of subconjunto) {
      if (linha.uf_natal) {
        contagemUfs.set(linha.uf_natal, (contagemUfs.get(linha.uf_natal) ?? 0) + 1);
      }
      if (linha.data_inicio && (periodoMin === null || linha.data_inicio < periodoMin)) {
        periodoMin = linha.data_inicio;
      }
      if (linha.data_fim && (periodoMax === null || linha.data_fim > periodoMax)) {
        periodoMax = linha.data_fim;
      }
    }
    const ufs_natais = [...contagemUfs.entries()]
      .map(([uf, total]) => ({ uf, total }))
      .sort((a, b) => a.uf.localeCompare(b.uf, "pt-BR"));

    // `organizacoes`: organizações publicadas com ≥1 vínculo a pessoa
    // publicada (respeitando o filtro `tipo` quando for tipo de pessoa).
    const idsPessoasPublicadas = new Set(
      linhas
        .filter((l) => l.tipo === "vitima" || l.tipo === "perpetrador")
        .filter((l) => !tipo || tipo === "organizacao" || l.tipo === tipo)
        .map((l) => l.biografia_id as string)
    );

    const { data: orgs, error: erroOrgs } = await supabaseServidor
      .from("biografias")
      .select("biografia_id, slug, nome")
      .eq("tipo", "organizacao")
      .eq("status_curadoria", "publicada");
    if (erroOrgs) {
      throw new Error(`Falha ao buscar organizações: ${erroOrgs.message}`);
    }

    const { data: vinculos, error: erroVinc } = await supabaseServidor
      .from("pessoa_organizacoes")
      .select("pessoa_id, organizacao_id");
    if (erroVinc) {
      throw new Error(`Falha ao buscar vínculos: ${erroVinc.message}`);
    }

    // Conta pessoas publicadas distintas por organização.
    const pessoasPorOrg = new Map<string, Set<string>>();
    for (const v of vinculos ?? []) {
      const pessoaId = v.pessoa_id as string;
      const orgId = v.organizacao_id as string;
      if (!idsPessoasPublicadas.has(pessoaId)) continue;
      if (!pessoasPorOrg.has(orgId)) {
        pessoasPorOrg.set(orgId, new Set());
      }
      pessoasPorOrg.get(orgId)!.add(pessoaId);
    }

    const organizacoes = (orgs ?? [])
      .map((o) => ({
        slug: o.slug as string,
        nome: o.nome as string,
        total: pessoasPorOrg.get(o.biografia_id as string)?.size ?? 0,
      }))
      .filter((o) => o.total > 0)
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

    const facetas: Facetas = {
      tipos,
      ufs_natais,
      organizacoes,
      periodo: { min: periodoMin, max: periodoMax },
    };

    return NextResponse.json(facetas, { status: 200 });
  } catch (erro) {
    console.error("Erro em GET /api/biografias/facetas:", erro);
    return respostaErro(
      "ERRO_INTERNO",
      "Não foi possível carregar os filtros agora. Tente novamente em alguns instantes.",
      500
    );
  }
}
