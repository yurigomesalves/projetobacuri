import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { criarSupabaseFalso, type SupabaseFalso } from "../apoio/supabase-falso";
import { linhaFeedback } from "../apoio/fixtures";

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

import { GET } from "@/app/api/transparencia/route";
import { dentroDoLimite } from "@/lib/server/limite";

function requisicao(query = ""): NextRequest {
  return new NextRequest(`http://localhost/api/transparencia${query}`);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(dentroDoLimite).mockReturnValue(true);
  vi.spyOn(console, "error").mockImplementation(() => {});
  estado.supabase = criarSupabaseFalso();
});

describe("GET /api/transparencia", () => {
  it("lista apenas feedbacks decididos (aceitos e recusados)", async () => {
    estado.supabase = criarSupabaseFalso({
      tabelas: {
        feedbacks: {
          data: [linhaFeedback(), linhaFeedback({ status: "recusado" })],
          count: 2,
        },
      },
    });

    const resposta = await GET(requisicao());
    const corpo = await resposta.json();

    expect(resposta.status).toBe(200);
    expect(corpo.total).toBe(2);
    expect(corpo.itens).toHaveLength(2);
    expect(corpo.itens[0]).toMatchObject({
      pergunta: "O que foi o AI-5?",
      status: "aceito",
      justificativa_decisao: "Justificativa pública da decisão, para teste.",
    });
    // Transparência editorial: feedbacks pendentes NUNCA aparecem aqui.
    const filtroStatus = estado.supabase.chamadas.find(
      (c) => c.tabela === "feedbacks" && c.metodo === "in"
    );
    expect(filtroStatus?.args).toEqual(["status", ["aceito", "recusado"]]);
  });

  it("pagina com 20 itens por página (pagina=2 consulta o intervalo 20–39)", async () => {
    estado.supabase = criarSupabaseFalso({
      tabelas: { feedbacks: { data: [], count: 25 } },
    });

    const resposta = await GET(requisicao("?pagina=2"));
    const corpo = await resposta.json();

    expect(resposta.status).toBe(200);
    expect(corpo.pagina).toBe(2);
    const intervalo = estado.supabase.chamadas.find((c) => c.metodo === "range");
    expect(intervalo?.args).toEqual([20, 39]);
  });

  it("rejeita pagina inválida com 400", async () => {
    const resposta = await GET(requisicao("?pagina=0"));
    expect(resposta.status).toBe(400);
    expect((await resposta.json()).erro.codigo).toBe("ENTRADA_INVALIDA");
  });

  it("devolve 429 quando o rate limit estoura", async () => {
    vi.mocked(dentroDoLimite).mockReturnValue(false);
    const resposta = await GET(requisicao());
    expect(resposta.status).toBe(429);
  });

  it("devolve 500 ERRO_INTERNO quando a consulta falha", async () => {
    estado.supabase = criarSupabaseFalso({
      tabelas: { feedbacks: { error: { message: "falha de leitura" } } },
    });
    const resposta = await GET(requisicao());
    expect(resposta.status).toBe(500);
    expect((await resposta.json()).erro.codigo).toBe("ERRO_INTERNO");
  });
});
