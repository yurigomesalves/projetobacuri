import { NextRequest, NextResponse } from "next/server";
import { supabaseServidor } from "@/lib/server/supabase";
import { dentroDoLimite } from "@/lib/server/limite";
import { montarCitacao, montarMarcadores } from "@/lib/server/citacoes";
import type { Biografia, VinculoOrganizacao, RespostaErro } from "@/lib/shared/tipos";

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

export async function GET(
  requisicao: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
): Promise<NextResponse> {
  const ip = obterIp(requisicao);
  if (!dentroDoLimite(ip)) {
    return respostaErro(
      "LIMITE_EXCEDIDO",
      "Muitas requisições em pouco tempo. Aguarde um minuto e tente novamente.",
      429
    );
  }

  const { slug } = await params;

  try {
    const { data: biografia, error: erroBiografia } = await supabaseServidor
      .from("biografias")
      .select(
        "biografia_id, slug, nome, tipo, resumo_1_linha, texto_md, municipio, uf, municipio_natal, uf_natal, lat_natal, lng_natal, data_inicio, data_fim, status_curadoria"
      )
      .eq("slug", slug)
      .eq("status_curadoria", "publicada")
      .maybeSingle();

    if (erroBiografia) {
      throw new Error(`Falha ao buscar biografia: ${erroBiografia.message}`);
    }

    if (!biografia) {
      return respostaErro(
        "ACERVO_SEM_RESULTADO",
        "Não há biografia publicada com esse identificador no acervo.",
        404
      );
    }

    const [
      { data: fontesLinhas, error: erroFontes },
      { data: marcadoresLinhas, error: erroMarcadores },
      { data: eventosLinhas, error: erroEventos },
      { data: vinculosLinhas, error: erroVinculos },
    ] = await Promise.all([
      supabaseServidor
        .from("biografia_fontes")
        .select(
          "fonte_id, paginas, trecho, secao, ordem, fontes (titulo, autor_orgao, tipo_fonte, confiabilidade, data_documento, url_origem, nota_contexto)"
        )
        .eq("biografia_id", biografia.biografia_id)
        .order("ordem", { ascending: true }),
      supabaseServidor
        .from("biografia_marcadores")
        .select(
          "marcador, fonte_id, paginas, trecho, secao, fontes (titulo, autor_orgao, tipo_fonte, confiabilidade, data_documento, url_origem, nota_contexto)"
        )
        .eq("biografia_id", biografia.biografia_id),
      supabaseServidor
        .from("evento_vitimas")
        .select("evento_id, eventos_geo!inner (status_curadoria)")
        .eq("biografia_id", biografia.biografia_id)
        .eq("eventos_geo.status_curadoria", "publicada"),
      supabaseServidor
        .from("pessoa_organizacoes")
        .select(
          "organizacao_id, nota_vinculo, fonte_id, paginas, trecho, secao, fontes (titulo, autor_orgao, tipo_fonte, confiabilidade, data_documento, url_origem, nota_contexto)"
        )
        .eq("pessoa_id", biografia.biografia_id),
    ]);

    if (erroFontes) {
      throw new Error(`Falha ao buscar fontes da biografia: ${erroFontes.message}`);
    }
    if (erroMarcadores) {
      throw new Error(`Falha ao buscar marcadores da biografia: ${erroMarcadores.message}`);
    }
    if (erroEventos) {
      throw new Error(`Falha ao buscar eventos da biografia: ${erroEventos.message}`);
    }
    if (erroVinculos) {
      throw new Error(`Falha ao buscar vínculos da biografia: ${erroVinculos.message}`);
    }

    const fontes = (fontesLinhas ?? []).map((linha, indice) =>
      montarCitacao(linha, indice + 1)
    );
    const marcadores = montarMarcadores(marcadoresLinhas ?? []);
    const eventos = (eventosLinhas ?? []).map((linha) => linha.evento_id as string);

    // Vínculos com organizações (ADR-016, decisão 3). Só expõe vínculos cuja
    // organização está publicada — resolve nome/slug pelo organizacao_id, pois
    // a FK é composta e não embeda direto no PostgREST.
    const organizacoes: VinculoOrganizacao[] = [];
    const idsOrgs = [
      ...new Set((vinculosLinhas ?? []).map((v) => v.organizacao_id as string)),
    ];
    if (idsOrgs.length > 0) {
      const { data: orgsLinhas, error: erroOrgs } = await supabaseServidor
        .from("biografias")
        .select("biografia_id, slug, nome")
        .in("biografia_id", idsOrgs)
        .eq("status_curadoria", "publicada");
      if (erroOrgs) {
        throw new Error(`Falha ao buscar organizações vinculadas: ${erroOrgs.message}`);
      }

      const porId = new Map(
        (orgsLinhas ?? []).map((o) => [o.biografia_id as string, o])
      );
      for (const linha of vinculosLinhas ?? []) {
        const org = porId.get(linha.organizacao_id as string);
        if (!org) continue; // organização em rascunho → não exibe
        const vinculo: VinculoOrganizacao = {
          organizacao_slug: org.slug,
          organizacao_nome: org.nome,
          fonte: montarCitacao(linha, 0),
        };
        if (linha.nota_vinculo) {
          vinculo.nota_vinculo = linha.nota_vinculo;
        }
        organizacoes.push(vinculo);
      }
    }

    const resultado: Biografia = {
      slug: biografia.slug,
      nome: biografia.nome,
      tipo: biografia.tipo as Biografia["tipo"],
      resumo_1_linha: biografia.resumo_1_linha,
      texto_md: biografia.texto_md,
      marcadores,
      fontes,
      eventos,
      status_curadoria: biografia.status_curadoria,
      organizacoes,
    };

    if (biografia.municipio) {
      resultado.municipio = biografia.municipio;
    }
    if (biografia.uf) {
      resultado.uf = biografia.uf;
    }
    if (biografia.municipio_natal) {
      resultado.municipio_natal = biografia.municipio_natal;
    }
    if (biografia.uf_natal) {
      resultado.uf_natal = biografia.uf_natal;
    }
    if (biografia.data_inicio) {
      resultado.data_inicio = biografia.data_inicio;
    }
    if (biografia.data_fim) {
      resultado.data_fim = biografia.data_fim;
    }
    if (biografia.lat_natal !== null && biografia.lat_natal !== undefined) {
      resultado.lat_natal = biografia.lat_natal;
    }
    if (biografia.lng_natal !== null && biografia.lng_natal !== undefined) {
      resultado.lng_natal = biografia.lng_natal;
    }

    return NextResponse.json(resultado, { status: 200 });
  } catch (erro) {
    console.error("Erro em GET /api/biografias/[slug]:", erro);
    return respostaErro(
      "ERRO_INTERNO",
      "Não foi possível carregar essa biografia agora. Tente novamente em alguns instantes.",
      500
    );
  }
}
