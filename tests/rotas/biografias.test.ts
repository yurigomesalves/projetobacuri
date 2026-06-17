import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { criarSupabaseFalso, type SupabaseFalso } from "../apoio/supabase-falso";
import { linhaBiografia, linhaFonteJoin, linhaMarcadorJoin, UUID_EVENTO } from "../apoio/fixtures";

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
import { dentroDoLimite } from "@/lib/server/limite";

function requisicaoLista(query = ""): NextRequest {
  return new NextRequest(`http://localhost/api/biografias${query}`);
}

function requisicaoDetalhe(slug: string) {
  return [
    new NextRequest(`http://localhost/api/biografias/${slug}`),
    { params: Promise.resolve({ slug }) },
  ] as const;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(dentroDoLimite).mockReturnValue(true);
  vi.spyOn(console, "error").mockImplementation(() => {});
  estado.supabase = criarSupabaseFalso();
});

describe("GET /api/biografias (lista)", () => {
  it("lista resumos e filtra por status_curadoria='publicada' no banco", async () => {
    estado.supabase = criarSupabaseFalso({
      tabelas: {
        biografias: {
          data: [
            {
              slug: "biografia-de-teste",
              nome: "Biografia de Teste",
              tipo: "vitima",
              resumo_1_linha: "Resumo de uma linha para fins de teste.",
              municipio: "São Paulo",
              uf: "SP",
            },
          ],
          count: 1,
        },
      },
    });

    const resposta = await listarBiografias(requisicaoLista());
    const corpo = await resposta.json();

    expect(resposta.status).toBe(200);
    expect(corpo.total).toBe(1);
    expect(corpo.itens[0]).toMatchObject({
      slug: "biografia-de-teste",
      tipo: "vitima",
      municipio: "São Paulo",
      uf: "SP",
    });
    // Regra do contrato: a lista só serve biografias publicadas.
    const filtroPublicada = estado.supabase.chamadas.find(
      (c) => c.tabela === "biografias" && c.metodo === "eq"
    );
    expect(filtroPublicada?.args).toEqual(["status_curadoria", "publicada"]);
  });

  it("omite municipio/uf quando são nulos", async () => {
    estado.supabase = criarSupabaseFalso({
      tabelas: {
        biografias: {
          data: [
            {
              slug: "organizacao-de-teste",
              nome: "Organização de Teste",
              tipo: "organizacao",
              resumo_1_linha: "Resumo.",
              municipio: null,
              uf: null,
            },
          ],
          count: 1,
        },
      },
    });

    const corpo = await (await listarBiografias(requisicaoLista())).json();

    expect("municipio" in corpo.itens[0]).toBe(false);
    expect("uf" in corpo.itens[0]).toBe(false);
  });

  it("escapa % e _ na busca textual antes do ILIKE", async () => {
    estado.supabase = criarSupabaseFalso({
      tabelas: { biografias: { data: [], count: 0 } },
    });

    const resposta = await listarBiografias(requisicaoLista("?q=100%25_teste"));

    expect(resposta.status).toBe(200);
    const buscaNome = estado.supabase.chamadas.find((c) => c.metodo === "ilike");
    expect(buscaNome?.args).toEqual(["nome", "%100\\%\\_teste%"]);
  });

  it("rejeita tipo fora da taxonomia com 400", async () => {
    const resposta = await listarBiografias(requisicaoLista("?tipo=heroi"));
    expect(resposta.status).toBe(400);
    expect((await resposta.json()).erro.codigo).toBe("ENTRADA_INVALIDA");
  });

  it("devolve 429 quando o rate limit estoura", async () => {
    vi.mocked(dentroDoLimite).mockReturnValue(false);
    expect((await listarBiografias(requisicaoLista())).status).toBe(429);
  });
});

describe("GET /api/biografias/[slug] (detalhe)", () => {
  it("devolve a biografia publicada com fontes numeradas, marcadores e eventos", async () => {
    estado.supabase = criarSupabaseFalso({
      tabelas: {
        biografias: { data: linhaBiografia() },
        biografia_fontes: { data: [linhaFonteJoin(), linhaFonteJoin({ paginas: "121" })] },
        biografia_marcadores: { data: [linhaMarcadorJoin()] },
        evento_vitimas: { data: [{ evento_id: UUID_EVENTO }] },
        pessoa_organizacoes: { data: [] },
      },
    });

    const resposta = await obterBiografia(...requisicaoDetalhe("biografia-de-teste"));
    const corpo = await resposta.json();

    expect(resposta.status).toBe(200);
    expect(corpo.slug).toBe("biografia-de-teste");
    expect(corpo.texto_md).toContain("# Biografia");
    expect(corpo.fontes.map((f: { n: number }) => f.n)).toEqual([1, 2]);
    expect(corpo.fontes[0].url_origem).toBe("https://exemplo.org/cnv/volume1.pdf");
    expect(corpo.marcadores[0]).toMatchObject({
      marcador: "6.2.repressao_a_trabalhadores",
      fonte: { n: 0 },
    });
    expect(corpo.eventos).toEqual([UUID_EVENTO]);
  });

  it("devolve 404 ACERVO_SEM_RESULTADO para slug inexistente ou não publicado", async () => {
    estado.supabase = criarSupabaseFalso({
      tabelas: { biografias: { data: null } },
    });

    const resposta = await obterBiografia(...requisicaoDetalhe("nao-existe"));

    expect(resposta.status).toBe(404);
    expect((await resposta.json()).erro.codigo).toBe("ACERVO_SEM_RESULTADO");
  });

  it("devolve 500 ERRO_INTERNO quando uma consulta auxiliar falha", async () => {
    estado.supabase = criarSupabaseFalso({
      tabelas: {
        biografias: { data: linhaBiografia() },
        biografia_fontes: { error: { message: "falha de leitura" } },
        biografia_marcadores: { data: [] },
        evento_vitimas: { data: [] },
      },
    });

    const resposta = await obterBiografia(...requisicaoDetalhe("biografia-de-teste"));

    expect(resposta.status).toBe(500);
    expect((await resposta.json()).erro.codigo).toBe("ERRO_INTERNO");
  });
});
