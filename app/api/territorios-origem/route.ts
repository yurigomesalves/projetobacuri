import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServidor } from "@/lib/server/supabase";
import { dentroDoLimite } from "@/lib/server/limite";
import type { RespostaErro } from "@/lib/shared/tipos";

export const runtime = "nodejs";

// ---------------------------------------------------------------------------
// Contrato: GET /api/territorios-origem?bbox=  (ADR-019)
// Camada cartográfica de território de origem dos povos indígenas vítimas.
// Desligada por padrão no mapa.
// ---------------------------------------------------------------------------

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

// Gera um polígono circular com nPontos vértices (Via B — fallback).
// Aproximação plana suficiente para display; não usar para análise geodésica.
function gerarCirculo(
  pontoGeoJSON: { type: "Point"; coordinates: [number, number] },
  raioKm: number,
  nPontos = 64
): GeoJSON.Polygon {
  const [lng, lat] = pontoGeoJSON.coordinates;
  const latRad = (lat * Math.PI) / 180;
  // 1° lat ≈ 111 km; 1° lng ≈ 111 km × cos(lat)
  const dLat = raioKm / 111;
  const dLng = raioKm / (111 * Math.cos(latRad));
  const coordenadas: [number, number][] = [];
  for (let i = 0; i <= nPontos; i++) {
    const angulo = (2 * Math.PI * i) / nPontos;
    coordenadas.push([
      lng + dLng * Math.cos(angulo),
      lat + dLat * Math.sin(angulo),
    ]);
  }
  // GeoJSON exige que o primeiro e último ponto sejam iguais (anel fechado).
  return { type: "Polygon", coordinates: [coordenadas] };
}

type GeometriaGeoJSON = GeoJSON.Polygon | GeoJSON.MultiPolygon;

// Resolve qual geometria usar para uma linha do banco.
// Via A: TI oficial via JOIN; Via B: fallback circular; null = sem área, não plota.
function resolverGeometria(linha: {
  terra_indigena_codigo: string | null;
  terras_indigenas: { geometria: unknown } | null;
  geometria_origem_ponto: unknown;
  geometria_origem_raio_km: number | null;
}): GeometriaGeoJSON | null {
  // Via A — terra indígena oficial
  if (linha.terra_indigena_codigo && linha.terras_indigenas?.geometria) {
    return linha.terras_indigenas.geometria as GeometriaGeoJSON;
  }
  // Via B — fallback circular
  if (linha.geometria_origem_ponto && linha.geometria_origem_raio_km) {
    return gerarCirculo(
      linha.geometria_origem_ponto as { type: "Point"; coordinates: [number, number] },
      linha.geometria_origem_raio_km
    );
  }
  // Sem área disponível — não plotar
  return null;
}

// Proxy de bbox: usa o primeiro vértice do anel externo do polígono.
// Suficiente para filtro visual; não é um teste de interseção exato.
function primeiroPonto(geometria: GeometriaGeoJSON): [number, number] | null {
  if (geometria.type === "Polygon") {
    return (geometria.coordinates[0]?.[0] as [number, number]) ?? null;
  }
  if (geometria.type === "MultiPolygon") {
    return (geometria.coordinates[0]?.[0]?.[0] as [number, number]) ?? null;
  }
  return null;
}

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
    // Só vítimas publicadas com povo_origem documentado.
    // Via A: JOIN a terras_indigenas pelo terra_indigena_codigo.
    // Via B: geometria_origem_ponto + geometria_origem_raio_km (fallback circular).
    const { data, error } = await supabaseServidor
      .from("biografias")
      .select(`
        slug,
        nome,
        povo_origem,
        terra_indigena_codigo,
        terra_indigena_nome,
        geometria_origem_ponto,
        geometria_origem_raio_km,
        terras_indigenas!terra_indigena_codigo(geometria)
      `)
      .eq("tipo", "vitima")
      .eq("status_curadoria", "publicada")
      .not("povo_origem", "is", null);

    if (error) {
      throw new Error(`Falha ao buscar territórios de origem: ${error.message}`);
    }

    const linhas = data ?? [];

    const features: GeoJSON.Feature[] = [];

    for (const linha of linhas) {
      const geometria = resolverGeometria(linha as Parameters<typeof resolverGeometria>[0]);

      // Vítimas sem área não entram na FeatureCollection (ADR-019).
      if (!geometria) continue;

      // Filtro de bbox por proxy (primeiro vértice do polígono).
      if (bbox) {
        const ponto = primeiroPonto(geometria);
        if (!ponto) continue;
        const [lon, lat] = ponto;
        if (!pontoDentroDoBbox(lon, lat, bbox)) continue;
      }

      features.push({
        type: "Feature",
        geometry: geometria,
        properties: {
          slug: linha.slug,
          nome: linha.nome,
          povo_origem: linha.povo_origem,
          terra_indigena_nome: linha.terra_indigena_nome ?? null,
          aproximado: true,
        },
      });
    }

    const colecao: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features,
    };

    return NextResponse.json(colecao, { status: 200 });
  } catch (erro) {
    console.error("Erro em GET /api/territorios-origem:", erro);
    return respostaErro(
      "ERRO_INTERNO",
      "Não foi possível carregar a camada de territórios de origem agora. Tente novamente em alguns instantes.",
      500
    );
  }
}
