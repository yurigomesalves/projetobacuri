import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServidor } from "@/lib/server/supabase";
import { dentroDoLimite } from "@/lib/server/limite";
import type { RespostaErro } from "@/lib/shared/tipos";

export const runtime = "nodejs";

const esquemaQuery = z.object({
  bbox: z
    .string()
    .optional()
    .transform((valor) => {
      if (!valor) return undefined;
      const partes = valor.split(",").map((p) => Number(p.trim()));
      if (partes.length !== 4 || partes.some((n) => Number.isNaN(n))) {
        return null; // sinaliza inválido
      }
      const [oeste, sul, leste, norte] = partes;
      return { oeste, sul, leste, norte };
    }),
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

type Bbox = { oeste: number; sul: number; leste: number; norte: number };

function pontoDentroDoBbox(lon: number, lat: number, bbox: Bbox): boolean {
  return lon >= bbox.oeste && lon <= bbox.leste && lat >= bbox.sul && lat <= bbox.norte;
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
    bbox: url.searchParams.get("bbox") ?? undefined,
  });

  if (!validado.success || validado.data.bbox === null) {
    return respostaErro(
      "ENTRADA_INVALIDA",
      "Parâmetro 'bbox' inválido. Use o formato 'oeste,sul,leste,norte' com 4 números.",
      400
    );
  }

  const { bbox } = validado.data;

  try {
    // Camada de ORIGEM (ADR-016, decisão 4): só vítimas publicadas com
    // naturalidade documentada e coordenadas da sede do município natal. Fichas
    // sem naturalidade conhecida não entram (não inferir).
    const { data, error } = await supabaseServidor
      .from("biografias")
      .select("slug, nome, municipio_natal, uf_natal, lat_natal, lng_natal")
      .eq("tipo", "vitima")
      .eq("status_curadoria", "publicada")
      .not("lat_natal", "is", null)
      .not("lng_natal", "is", null);

    if (error) {
      throw new Error(`Falha ao buscar naturalidades: ${error.message}`);
    }

    let linhas = data ?? [];

    if (bbox) {
      linhas = linhas.filter((linha) =>
        pontoDentroDoBbox(linha.lng_natal as number, linha.lat_natal as number, bbox)
      );
    }

    const features: GeoJSON.Feature[] = linhas.map((linha) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [linha.lng_natal as number, linha.lat_natal as number],
      },
      properties: {
        slug: linha.slug,
        nome: linha.nome,
        municipio_natal: linha.municipio_natal,
        uf_natal: linha.uf_natal,
      },
    }));

    const colecao: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features,
    };

    return NextResponse.json(colecao, { status: 200 });
  } catch (erro) {
    console.error("Erro em GET /api/naturalidades:", erro);
    return respostaErro(
      "ERRO_INTERNO",
      "Não foi possível carregar a camada de naturalidades agora. Tente novamente em alguns instantes.",
      500
    );
  }
}
