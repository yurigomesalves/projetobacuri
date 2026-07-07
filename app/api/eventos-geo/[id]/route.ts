import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServidor } from "@/lib/server/supabase";
import { dentroDoLimite } from "@/lib/server/limite";
import { montarCitacao, montarMarcadores } from "@/lib/server/citacoes";
import type { BlocoJustica, EventoGeo, RespostaErro } from "@/lib/shared/tipos";

export const runtime = "nodejs";

const esquemaParametros = z.object({
  id: z.string().uuid(),
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

export async function GET(
  requisicao: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const ip = obterIp(requisicao);
  if (!dentroDoLimite(ip)) {
    return respostaErro(
      "LIMITE_EXCEDIDO",
      "Muitas requisições em pouco tempo. Aguarde um minuto e tente novamente.",
      429
    );
  }

  const { id } = await params;
  const validado = esquemaParametros.safeParse({ id });

  if (!validado.success) {
    return respostaErro(
      "ENTRADA_INVALIDA",
      "O identificador do evento deve ser um UUID válido.",
      400
    );
  }

  try {
    const { data: evento, error: erroEvento } = await supabaseServidor
      .from("eventos_geo")
      .select(
        "evento_id, titulo, data, municipio, uf, geometria, descricao_md, tipos_crime, status_curadoria, justica_descricao_crimes_md, justica_enquadramento_atual_md, justica_punicao_ocorrida_md, justica_nota_metodologica_md, revisado_por_humano"
      )
      .eq("evento_id", validado.data.id)
      .eq("status_curadoria", "publicada")
      .maybeSingle();

    if (erroEvento) {
      throw new Error(`Falha ao buscar evento: ${erroEvento.message}`);
    }

    if (!evento) {
      return respostaErro(
        "ACERVO_SEM_RESULTADO",
        "Não há evento publicado com esse identificador no acervo.",
        404
      );
    }

    const [
      { data: fontesLinhas, error: erroFontes },
      { data: marcadoresLinhas, error: erroMarcadores },
      { data: vitimasLinhas, error: erroVitimas },
    ] = await Promise.all([
      supabaseServidor
        .from("evento_fontes")
        .select(
          "fonte_id, paginas, trecho, secao, ordem, fontes (titulo, autor_orgao, tipo_fonte, confiabilidade, data_documento, url_origem, nota_contexto)"
        )
        .eq("evento_id", evento.evento_id)
        .order("ordem", { ascending: true }),
      supabaseServidor
        .from("evento_marcadores")
        .select(
          "marcador, fonte_id, paginas, trecho, secao, fontes (titulo, autor_orgao, tipo_fonte, confiabilidade, data_documento, url_origem, nota_contexto)"
        )
        .eq("evento_id", evento.evento_id),
      supabaseServidor
        .from("evento_vitimas")
        .select("biografia_id, biografias!inner (slug, status_curadoria)")
        .eq("evento_id", evento.evento_id)
        .eq("biografias.status_curadoria", "publicada"),
    ]);

    if (erroFontes) {
      throw new Error(`Falha ao buscar fontes do evento: ${erroFontes.message}`);
    }
    if (erroMarcadores) {
      throw new Error(`Falha ao buscar marcadores do evento: ${erroMarcadores.message}`);
    }
    if (erroVitimas) {
      throw new Error(`Falha ao buscar vítimas do evento: ${erroVitimas.message}`);
    }

    const fontes = (fontesLinhas ?? []).map((linha, indice) =>
      montarCitacao(linha, indice + 1)
    );
    const marcadores = montarMarcadores(marcadoresLinhas ?? []);
    const vitimas = (vitimasLinhas ?? []).map((linha) => {
      const biografia = Array.isArray(linha.biografias) ? linha.biografias[0] : linha.biografias;
      return biografia.slug as string;
    });

    const resultado: EventoGeo = {
      evento_id: evento.evento_id,
      titulo: evento.titulo,
      data: evento.data,
      municipio: evento.municipio,
      uf: evento.uf,
      geometria: evento.geometria as EventoGeo["geometria"],
      descricao_md: evento.descricao_md,
      vitimas,
      tipos_crime: evento.tipos_crime,
      marcadores,
      fontes,
    };

    // Salvaguarda do módulo "crimes e justiça" (contrato v1.2): o bloco só
    // entra na resposta quando revisado por humano. Até a Fase 7,
    // revisado_por_humano é sempre false em todos os registros.
    if (evento.revisado_por_humano) {
      const { data: justicaFontesLinhas, error: erroJusticaFontes } = await supabaseServidor
        .from("evento_justica_fontes")
        .select(
          "fonte_id, paginas, trecho, secao, ordem, fontes (titulo, autor_orgao, tipo_fonte, confiabilidade, data_documento, url_origem, nota_contexto)"
        )
        .eq("evento_id", evento.evento_id)
        .order("ordem", { ascending: true });

      if (erroJusticaFontes) {
        throw new Error(
          `Falha ao buscar fontes do bloco de justiça: ${erroJusticaFontes.message}`
        );
      }

      const justica: BlocoJustica = {
        descricao_crimes_md: evento.justica_descricao_crimes_md ?? "",
        enquadramento_atual_md: evento.justica_enquadramento_atual_md ?? "",
        punicao_ocorrida_md: evento.justica_punicao_ocorrida_md ?? "",
        nota_metodologica_md: evento.justica_nota_metodologica_md ?? "",
        fontes: (justicaFontesLinhas ?? []).map((linha, indice) =>
          montarCitacao(linha, indice + 1)
        ),
        revisado_por_humano: evento.revisado_por_humano,
      };

      resultado.justica = justica;
    }

    return NextResponse.json(resultado, { status: 200 });
  } catch (erro) {
    console.error("Erro em GET /api/eventos-geo/[id]:", erro);
    return respostaErro(
      "ERRO_INTERNO",
      "Não foi possível carregar esse evento agora. Tente novamente em alguns instantes.",
      500
    );
  }
}
