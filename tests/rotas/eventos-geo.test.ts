import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { criarSupabaseFalso, type SupabaseFalso } from "../apoio/supabase-falso";
import {
  linhaEventoGeo,
  linhaEventoGeoCompleta,
  linhaFonteJoin,
  linhaMarcadorJoin,
  UUID_EVENTO,
} from "../apoio/fixtures";

const estado = vi.hoisted(() => ({ supabase: null as unknown as SupabaseFalso }));

vi.mock("@/lib/server/supabase", () => ({
  supabaseServidor: {
    from: (tabela: string) => estado.supabase.from(tabela),
    rpc: (nome: string, args?: unknown) => estado.supabase.rpc(nome, args),
  },
}));
vi.mock("@/lib/server/limite", () => ({
  dentroDoLimite: vi.fn(() => true),
}));

import { GET as listarEventos } from "@/app/api/eventos-geo/route";
import { GET as obterEvento } from "@/app/api/eventos-geo/[id]/route";
import { dentroDoLimite } from "@/lib/server/limite";

function requisicaoLista(query = ""): NextRequest {
  return new NextRequest(`http://localhost/api/eventos-geo${query}`);
}

function requisicaoDetalhe(id: string) {
  return [
    new NextRequest(`http://localhost/api/eventos-geo/${id}`),
    { params: Promise.resolve({ id }) },
  ] as const;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(dentroDoLimite).mockReturnValue(true);
  vi.spyOn(console, "error").mockImplementation(() => {});
  estado.supabase = criarSupabaseFalso();
});

describe("GET /api/eventos-geo (lista GeoJSON)", () => {
  it("devolve FeatureCollection com as propriedades do contrato", async () => {
    estado.supabase = criarSupabaseFalso({
      tabelas: { eventos_geo: { data: [linhaEventoGeo()] } },
    });

    const resposta = await listarEventos(requisicaoLista());
    const corpo = await resposta.json();

    expect(resposta.status).toBe(200);
    expect(corpo.type).toBe("FeatureCollection");
    expect(corpo.features).toHaveLength(1);
    expect(corpo.features[0]).toMatchObject({
      type: "Feature",
      geometry: { type: "Point", coordinates: [-46.63, -23.55] },
      properties: {
        evento_id: UUID_EVENTO,
        titulo: "Evento de teste",
        municipio: "São Paulo",
        uf: "SP",
        tipos_crime: ["prisao_ilegal_arbitraria"],
      },
    });
  });

  it("filtra por bbox: mantém ponto dentro e descarta ponto fora", async () => {
    estado.supabase = criarSupabaseFalso({
      tabelas: {
        eventos_geo: {
          data: [
            linhaEventoGeo(), // São Paulo (-46.63, -23.55)
            linhaEventoGeo({
              evento_id: "55555555-5555-4555-8555-555555555555",
              titulo: "Evento fora do bbox",
              geometria: { type: "Point", coordinates: [-60.02, -3.1] }, // Manaus
            }),
          ],
        },
      },
    });

    // bbox em volta de São Paulo: oeste,sul,leste,norte
    const resposta = await listarEventos(requisicaoLista("?bbox=-47,-24,-46,-23"));
    const corpo = await resposta.json();

    expect(corpo.features).toHaveLength(1);
    expect(corpo.features[0].properties.titulo).toBe("Evento de teste");
  });

  it("mantém Polygon com algum vértice do anel externo dentro do bbox", async () => {
    estado.supabase = criarSupabaseFalso({
      tabelas: {
        eventos_geo: {
          data: [
            linhaEventoGeo({
              geometria: {
                type: "Polygon",
                coordinates: [
                  [
                    [-46.7, -23.6],
                    [-46.5, -23.6],
                    [-46.5, -23.4],
                    [-46.7, -23.4],
                    [-46.7, -23.6],
                  ],
                ],
              },
            }),
          ],
        },
      },
    });

    const resposta = await listarEventos(requisicaoLista("?bbox=-47,-24,-46,-23"));
    const corpo = await resposta.json();

    expect(corpo.features).toHaveLength(1);
  });

  it("repassa tipo_crime válido como filtro à consulta", async () => {
    estado.supabase = criarSupabaseFalso({
      tabelas: { eventos_geo: { data: [] } },
    });

    const resposta = await listarEventos(
      requisicaoLista("?tipo_crime=violencia_contra_povos_indigenas")
    );

    expect(resposta.status).toBe(200);
    const filtro = estado.supabase.chamadas.find((c) => c.metodo === "contains");
    expect(filtro?.args).toEqual(["tipos_crime", ["violencia_contra_povos_indigenas"]]);
  });

  it.each([
    ["bbox com 3 números", "?bbox=1,2,3"],
    ["bbox com texto", "?bbox=a,b,c,d"],
    ["tipo_crime fora da taxonomia", "?tipo_crime=crime_inexistente"],
  ])("rejeita %s com 400 ENTRADA_INVALIDA", async (_caso, query) => {
    const resposta = await listarEventos(requisicaoLista(query));
    expect(resposta.status).toBe(400);
    expect((await resposta.json()).erro.codigo).toBe("ENTRADA_INVALIDA");
  });

  it("devolve 429 quando o rate limit estoura", async () => {
    vi.mocked(dentroDoLimite).mockReturnValue(false);
    expect((await listarEventos(requisicaoLista())).status).toBe(429);
  });
});

describe("GET /api/eventos-geo/[id] (detalhe)", () => {
  function tabelasDetalhe(evento: Record<string, unknown>) {
    return {
      eventos_geo: { data: evento },
      evento_fontes: { data: [linhaFonteJoin()] },
      evento_marcadores: { data: [linhaMarcadorJoin()] },
      evento_vitimas: {
        data: [{ biografia_id: "x", biografias: { slug: "biografia-de-teste", status_curadoria: "publicada" } }],
      },
    };
  }

  it("devolve o evento publicado SEM o bloco justica quando revisado_por_humano=false (salvaguarda ADR-009)", async () => {
    estado.supabase = criarSupabaseFalso({
      tabelas: tabelasDetalhe(linhaEventoGeoCompleta({ revisado_por_humano: false })),
    });

    const resposta = await obterEvento(...requisicaoDetalhe(UUID_EVENTO));
    const corpo = await resposta.json();

    expect(resposta.status).toBe(200);
    expect(corpo.evento_id).toBe(UUID_EVENTO);
    expect(corpo.fontes[0]).toMatchObject({ n: 1, autor_orgao: "Comissão Nacional da Verdade" });
    expect(corpo.vitimas).toEqual(["biografia-de-teste"]);
    expect("justica" in corpo).toBe(false);
  });

  it("inclui o bloco justica com fontes próprias quando revisado_por_humano=true", async () => {
    estado.supabase = criarSupabaseFalso({
      tabelas: {
        ...tabelasDetalhe(linhaEventoGeoCompleta({ revisado_por_humano: true })),
        evento_justica_fontes: { data: [linhaFonteJoin()] },
      },
    });

    const resposta = await obterEvento(...requisicaoDetalhe(UUID_EVENTO));
    const corpo = await resposta.json();

    expect(resposta.status).toBe(200);
    expect(corpo.justica).toMatchObject({
      revisado_por_humano: true,
      descricao_crimes_md: "Descrição dos crimes (teste).",
    });
    expect(corpo.justica.fontes).toHaveLength(1);
    expect(corpo.justica.fontes[0].n).toBe(1);
  });

  it("devolve 400 para id que não é UUID", async () => {
    const resposta = await obterEvento(...requisicaoDetalhe("nao-e-uuid"));
    expect(resposta.status).toBe(400);
    expect((await resposta.json()).erro.codigo).toBe("ENTRADA_INVALIDA");
  });

  it("devolve 404 ACERVO_SEM_RESULTADO para evento inexistente ou não publicado", async () => {
    estado.supabase = criarSupabaseFalso({
      tabelas: { eventos_geo: { data: null } },
    });

    const resposta = await obterEvento(...requisicaoDetalhe(UUID_EVENTO));

    expect(resposta.status).toBe(404);
    expect((await resposta.json()).erro.codigo).toBe("ACERVO_SEM_RESULTADO");
  });
});
