import { NextRequest, NextResponse } from "next/server";
import { supabaseServidor } from "@/lib/server/supabase";
import { dentroDoLimite } from "@/lib/server/limite";
import { montarCitacao, montarMarcadores } from "@/lib/server/citacoes";
import type { Biografia, RespostaErro } from "@/lib/shared/tipos";

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
        "biografia_id, slug, nome, tipo, resumo_1_linha, texto_md, municipio, uf, status_curadoria"
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

    const [{ data: fontesLinhas, error: erroFontes }, { data: marcadoresLinhas, error: erroMarcadores }, { data: eventosLinhas, error: erroEventos }] =
      await Promise.all([
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

    const fontes = (fontesLinhas ?? []).map((linha, indice) =>
      montarCitacao(linha, indice + 1)
    );
    const marcadores = montarMarcadores(marcadoresLinhas ?? []);
    const eventos = (eventosLinhas ?? []).map((linha) => linha.evento_id as string);

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
    };

    if (biografia.municipio) {
      resultado.municipio = biografia.municipio;
    }
    if (biografia.uf) {
      resultado.uf = biografia.uf;
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
