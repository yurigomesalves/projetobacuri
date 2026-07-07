// Testes dos recursos da ADR-016 nas rotas de biografias: filtros novos
// (uf_natal, período, organização), facetas e a camada de naturalidades.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { criarSupabaseFalso, type SupabaseFalso } from "../apoio/supabase-falso";
import { linhaBiografia, linhaFonteJoin, UUID_BIOGRAFIA } from "../apoio/fixtures";

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

import { GET as listarBiografias } from "@/app/api/biografias/route";
import { GET as obterBiografia } from "@/app/api/biografias/[slug]/route";
import { GET as obterFacetas } from "@/app/api/biografias/facetas/route";
import { GET as obterNaturalidades } from "@/app/api/naturalidades/route";

const UUID_ORG = "55555555-5555-4555-8555-555555555555";

function req(caminho: string): NextRequest {
  return new NextRequest(`http://localhost${caminho}`);
}

function reqDetalhe(slug: string) {
  return [
    new NextRequest(`http://localhost/api/biografias/${slug}`),
    { params: Promise.resolve({ slug }) },
  ] as const;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  estado.supabase = criarSupabaseFalso();
});

describe("GET /api/biografias — filtros da ADR-016", () => {
  it("expande período em ano para o intervalo correto e filtra por interseção", async () => {
    estado.supabase = criarSupabaseFalso({
      tabelas: { biografias: { data: [], count: 0 } },
    });

    await listarBiografias(req("/api/biografias?periodo_de=1968&periodo_ate=1979"));

    const ors = estado.supabase.chamadas.filter((c) => c.metodo === "or");
    expect(ors[0].args[0]).toBe("data_fim.is.null,data_fim.gte.1968-01-01");
    expect(ors[1].args[0]).toBe("data_inicio.is.null,data_inicio.lte.1979-12-31");
  });

  it("rejeita período com formato inválido (400)", async () => {
    const resposta = await listarBiografias(req("/api/biografias?periodo_de=68"));
    expect(resposta.status).toBe(400);
  });

  it("filtra por uf_natal normalizando para maiúsculas", async () => {
    estado.supabase = criarSupabaseFalso({
      tabelas: { biografias: { data: [], count: 0 } },
    });

    await listarBiografias(req("/api/biografias?uf_natal=pe"));

    const eqUf = estado.supabase.chamadas.find(
      (c) => c.metodo === "eq" && c.args[0] === "uf_natal"
    );
    expect(eqUf?.args).toEqual(["uf_natal", "PE"]);
  });

  it("devolve campos de naturalidade e período quando presentes", async () => {
    estado.supabase = criarSupabaseFalso({
      tabelas: {
        biografias: {
          data: [
            {
              slug: "biografia-de-teste",
              nome: "Biografia de Teste",
              tipo: "vitima",
              resumo_1_linha: "Resumo.",
              municipio_natal: "Recife",
              uf_natal: "PE",
              data_inicio: "1968-01-01",
              data_fim: "1973-12-31",
            },
          ],
          count: 1,
        },
      },
    });

    const corpo = await (await listarBiografias(req("/api/biografias"))).json();
    expect(corpo.itens[0].municipio_natal).toBe("Recife");
    expect(corpo.itens[0].uf_natal).toBe("PE");
    expect(corpo.itens[0].data_inicio).toBe("1968-01-01");
    expect(corpo.itens[0].data_fim).toBe("1973-12-31");
  });

  it("organização sem vínculos devolve lista vazia sem consultar biografias", async () => {
    estado.supabase = criarSupabaseFalso({
      tabelas: {
        biografias: { data: { biografia_id: UUID_ORG } },
        pessoa_organizacoes: { data: [] },
      },
    });

    const resposta = await listarBiografias(
      req("/api/biografias?organizacao=ap-acao-popular")
    );
    const corpo = await resposta.json();

    expect(resposta.status).toBe(200);
    expect(corpo.total).toBe(0);
    expect(corpo.itens).toEqual([]);
    // Só resolveu a organização; não houve segunda consulta a biografias.
    const consultasBiografias = estado.supabase.chamadas.filter(
      (c) => c.tabela === "biografias" && c.metodo === "select"
    );
    expect(consultasBiografias).toHaveLength(1);
  });

  it("filtra a lista pelas pessoas vinculadas à organização", async () => {
    estado.supabase = criarSupabaseFalso({
      tabelas: {
        biografias: [
          { data: { biografia_id: UUID_ORG } },
          { data: [], count: 0 },
        ],
        pessoa_organizacoes: { data: [{ pessoa_id: UUID_BIOGRAFIA }] },
      },
    });

    await listarBiografias(req("/api/biografias?organizacao=ap-acao-popular"));

    const filtroIn = estado.supabase.chamadas.find(
      (c) => c.metodo === "in" && c.args[0] === "biografia_id"
    );
    expect(filtroIn?.args[1]).toEqual([UUID_BIOGRAFIA]);
  });
});

describe("GET /api/biografias/[slug] — vínculos com organizações", () => {
  it("expõe vínculos cuja organização está publicada, com fonte e nota", async () => {
    estado.supabase = criarSupabaseFalso({
      tabelas: {
        biografias: [
          { data: linhaBiografia({ tipo: "perpetrador" }) },
          { data: [{ biografia_id: UUID_ORG, slug: "doi-codi", nome: "DOI-CODI" }] },
        ],
        biografia_fontes: { data: [linhaFonteJoin()] },
        biografia_marcadores: { data: [] },
        evento_vitimas: { data: [] },
        pessoa_organizacoes: {
          data: [
            {
              organizacao_id: UUID_ORG,
              nota_vinculo: "Lotado no DOI-CODI conforme ficha funcional.",
              ...linhaFonteJoin(),
            },
          ],
        },
      },
    });

    const corpo = await (await obterBiografia(...reqDetalhe("biografia-de-teste"))).json();

    expect(corpo.organizacoes).toHaveLength(1);
    expect(corpo.organizacoes[0].organizacao_slug).toBe("doi-codi");
    expect(corpo.organizacoes[0].organizacao_nome).toBe("DOI-CODI");
    expect(corpo.organizacoes[0].nota_vinculo).toContain("DOI-CODI");
    expect(corpo.organizacoes[0].fonte.url_origem).toBe(
      "https://exemplo.org/cnv/volume1.pdf"
    );
  });

  it("omite vínculo cuja organização não está publicada", async () => {
    estado.supabase = criarSupabaseFalso({
      tabelas: {
        biografias: [
          { data: linhaBiografia() },
          { data: [] }, // organização em rascunho: não retorna
        ],
        biografia_fontes: { data: [linhaFonteJoin()] },
        biografia_marcadores: { data: [] },
        evento_vitimas: { data: [] },
        pessoa_organizacoes: {
          data: [{ organizacao_id: UUID_ORG, ...linhaFonteJoin() }],
        },
      },
    });

    const corpo = await (await obterBiografia(...reqDetalhe("biografia-de-teste"))).json();
    expect(corpo.organizacoes).toEqual([]);
  });
});

describe("GET /api/biografias/facetas", () => {
  it("agrega tipos, ufs natais, período e organizações com vínculo publicado", async () => {
    estado.supabase = criarSupabaseFalso({
      tabelas: {
        biografias: [
          {
            data: [
              { biografia_id: "p1", tipo: "vitima", uf_natal: "PE", data_inicio: "1968-01-01", data_fim: "1973-12-31" },
              { biografia_id: "p2", tipo: "vitima", uf_natal: "BA", data_inicio: "1964-04-01", data_fim: null },
              { biografia_id: "o1", tipo: "organizacao", uf_natal: null, data_inicio: null, data_fim: null },
            ],
          },
          { data: [{ biografia_id: "o1", slug: "ap-acao-popular", nome: "Ação Popular" }] },
        ],
        pessoa_organizacoes: {
          data: [
            { pessoa_id: "p1", organizacao_id: "o1" },
            { pessoa_id: "p2", organizacao_id: "o1" },
          ],
        },
      },
    });

    const corpo = await (await obterFacetas(req("/api/biografias/facetas"))).json();

    expect(corpo.tipos).toEqual([
      { valor: "organizacao", total: 1 },
      { valor: "vitima", total: 2 },
    ]);
    expect(corpo.ufs_natais).toEqual([
      { uf: "BA", total: 1 },
      { uf: "PE", total: 1 },
    ]);
    expect(corpo.periodo).toEqual({ min: "1964-04-01", max: "1973-12-31" });
    expect(corpo.organizacoes).toEqual([
      { slug: "ap-acao-popular", nome: "Ação Popular", total: 2 },
    ]);
  });
});

describe("GET /api/naturalidades", () => {
  it("devolve GeoJSON de Point com a cidade natal das vítimas", async () => {
    estado.supabase = criarSupabaseFalso({
      tabelas: {
        biografias: {
          data: [
            {
              slug: "biografia-de-teste",
              nome: "Biografia de Teste",
              municipio_natal: "Recife",
              uf_natal: "PE",
              lat_natal: -8.05,
              lng_natal: -34.9,
            },
          ],
        },
      },
    });

    const corpo = await (await obterNaturalidades(req("/api/naturalidades"))).json();

    expect(corpo.type).toBe("FeatureCollection");
    expect(corpo.features).toHaveLength(1);
    expect(corpo.features[0].geometry).toEqual({
      type: "Point",
      coordinates: [-34.9, -8.05],
    });
    expect(corpo.features[0].properties).toEqual({
      slug: "biografia-de-teste",
      nome: "Biografia de Teste",
      municipio_natal: "Recife",
      uf_natal: "PE",
    });
  });

  it("aplica o filtro de bbox no servidor", async () => {
    estado.supabase = criarSupabaseFalso({
      tabelas: {
        biografias: {
          data: [
            { slug: "dentro", nome: "Dentro", municipio_natal: "Recife", uf_natal: "PE", lat_natal: -8.05, lng_natal: -34.9 },
            { slug: "fora", nome: "Fora", municipio_natal: "Porto Alegre", uf_natal: "RS", lat_natal: -30.0, lng_natal: -51.2 },
          ],
        },
      },
    });

    // bbox cobrindo só o Nordeste (oeste,sul,leste,norte).
    const corpo = await (
      await obterNaturalidades(req("/api/naturalidades?bbox=-40,-12,-34,-7"))
    ).json();

    expect(corpo.features).toHaveLength(1);
    expect(corpo.features[0].properties.slug).toBe("dentro");
  });

  it("rejeita bbox malformado (400)", async () => {
    const resposta = await obterNaturalidades(req("/api/naturalidades?bbox=1,2,3"));
    expect(resposta.status).toBe(400);
  });
});
