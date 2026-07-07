import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServidor } from "@/lib/server/supabase";
import { dentroDoLimite } from "@/lib/server/limite";
import type { RespostaErro } from "@/lib/shared/tipos";

export const runtime = "nodejs";

const TIPOS_CRIME = [
  "prisao_ilegal_arbitraria",
  "tortura",
  "execucao_sumaria",
  "desaparecimento_forcado",
  "ocultacao_de_cadaver",
  "violencia_sexual",
  "violencia_contra_povos_indigenas",
  "perseguicao_exilio_banimento",
  "censura",
  "atentado_a_populacao_civil",
  "grilagem_de_territorio_indigena",
  "apagamento_de_registros_e_testemunhos",
] as const;

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
  tipo_crime: z.enum(TIPOS_CRIME).optional(),
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

// Filtro de bbox sem PostGIS (decisão da Fase 6, contrato v1.2): para Point
// basta o ponto estar dentro do bbox; para Polygon/MultiPolygon, basta
// QUALQUER vértice do anel externo estar dentro do bbox — heurística
// suficiente para um acervo de dezenas de eventos.
function geometriaIntersectaBbox(geometria: GeoJSON.Geometry, bbox: Bbox): boolean {
  if (geometria.type === "Point") {
    const [lon, lat] = geometria.coordinates;
    return pontoDentroDoBbox(lon, lat, bbox);
  }

  if (geometria.type === "Polygon") {
    const anelExterno = geometria.coordinates[0] ?? [];
    return anelExterno.some(([lon, lat]) => pontoDentroDoBbox(lon, lat, bbox));
  }

  if (geometria.type === "MultiPolygon") {
    return geometria.coordinates.some((poligono) => {
      const anelExterno = poligono[0] ?? [];
      return anelExterno.some(([lon, lat]) => pontoDentroDoBbox(lon, lat, bbox));
    });
  }

  return false;
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
    tipo_crime: url.searchParams.get("tipo_crime") ?? undefined,
  });

  if (!validado.success || validado.data.bbox === null) {
    return respostaErro(
      "ENTRADA_INVALIDA",
      "Parâmetros inválidos. 'bbox' deve ter o formato 'oeste,sul,leste,norte' com 4 números, e 'tipo_crime' deve ser um valor válido da taxonomia.",
      400
    );
  }

  const { bbox, tipo_crime: tipoCrime } = validado.data;

  try {
    let consulta = supabaseServidor
      .from("eventos_geo")
      .select("evento_id, titulo, data, municipio, uf, geometria, tipos_crime")
      .eq("status_curadoria", "publicada");

    if (tipoCrime) {
      consulta = consulta.contains("tipos_crime", [tipoCrime]);
    }

    const { data, error } = await consulta;

    if (error) {
      throw new Error(`Falha ao buscar eventos: ${error.message}`);
    }

    let linhas = data ?? [];

    if (bbox) {
      linhas = linhas.filter((linha) =>
        geometriaIntersectaBbox(linha.geometria as GeoJSON.Geometry, bbox)
      );
    }

    const features: GeoJSON.Feature[] = linhas.map((linha) => ({
      type: "Feature",
      geometry: linha.geometria as GeoJSON.Geometry,
      properties: {
        evento_id: linha.evento_id,
        titulo: linha.titulo,
        data: linha.data,
        municipio: linha.municipio,
        uf: linha.uf,
        tipos_crime: linha.tipos_crime,
      },
    }));

    const colecao: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features,
    };

    return NextResponse.json(colecao, { status: 200 });
  } catch (erro) {
    console.error("Erro em GET /api/eventos-geo:", erro);
    return respostaErro(
      "ERRO_INTERNO",
      "Não foi possível carregar os eventos do mapa agora. Tente novamente em alguns instantes.",
      500
    );
  }
}
