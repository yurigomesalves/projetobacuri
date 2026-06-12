import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { criarSupabaseFalso, type SupabaseFalso } from "../apoio/supabase-falso";
import { UUID_INTERACAO } from "../apoio/fixtures";

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

import { POST } from "@/app/api/feedback/route";
import { dentroDoLimite } from "@/lib/server/limite";

function requisicao(corpo: unknown): NextRequest {
  return new NextRequest("http://localhost/api/feedback", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(corpo),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(dentroDoLimite).mockReturnValue(true);
  vi.spyOn(console, "error").mockImplementation(() => {});
  estado.supabase = criarSupabaseFalso();
});

describe("POST /api/feedback", () => {
  it("registra feedback válido com status 'pendente' (fila de curadoria) e devolve 201", async () => {
    estado.supabase = criarSupabaseFalso({
      tabelas: {
        interacoes: { data: { interacao_id: UUID_INTERACAO } },
        feedbacks: { data: null },
      },
    });

    const resposta = await POST(
      requisicao({
        interacao_id: UUID_INTERACAO,
        classificacao: "incompleta",
        resposta_alternativa: "Faltou citar o contexto do AI-5.",
        fontes_sugeridas: "Relatório da CNV, Volume I.",
      })
    );
    const corpo = await resposta.json();

    expect(resposta.status).toBe(201);
    expect(corpo).toEqual({ status: "recebido_para_curadoria" });
    // O feedback NUNCA entra direto na base: nasce pendente, para curadoria.
    const insercao = estado.supabase.chamadas.find(
      (c) => c.tabela === "feedbacks" && c.metodo === "insert"
    );
    expect(insercao?.args[0]).toMatchObject({
      interacao_id: UUID_INTERACAO,
      classificacao: "incompleta",
      status: "pendente",
    });
  });

  it("rejeita interacao_id que não corresponde a interação registrada", async () => {
    estado.supabase = criarSupabaseFalso({
      tabelas: { interacoes: { data: null } },
    });

    const resposta = await POST(
      requisicao({ interacao_id: UUID_INTERACAO, classificacao: "util" })
    );

    expect(resposta.status).toBe(400);
    expect((await resposta.json()).erro.codigo).toBe("ENTRADA_INVALIDA");
  });

  it.each([
    ["classificacao inválida", { interacao_id: UUID_INTERACAO, classificacao: "otima" }],
    ["interacao_id que não é UUID", { interacao_id: "123", classificacao: "util" }],
    [
      "resposta_alternativa longa demais",
      {
        interacao_id: UUID_INTERACAO,
        classificacao: "incorreta",
        resposta_alternativa: "a".repeat(3001),
      },
    ],
  ])("rejeita %s com 400 sem tocar no banco", async (_caso, corpo) => {
    const resposta = await POST(requisicao(corpo));

    expect(resposta.status).toBe(400);
    expect(estado.supabase.from).not.toHaveBeenCalled();
  });

  it("devolve 429 quando o rate limit estoura", async () => {
    vi.mocked(dentroDoLimite).mockReturnValue(false);

    const resposta = await POST(
      requisicao({ interacao_id: UUID_INTERACAO, classificacao: "util" })
    );

    expect(resposta.status).toBe(429);
    expect((await resposta.json()).erro.codigo).toBe("LIMITE_EXCEDIDO");
  });

  it("devolve 500 ERRO_INTERNO quando a gravação falha", async () => {
    estado.supabase = criarSupabaseFalso({
      tabelas: {
        interacoes: { data: { interacao_id: UUID_INTERACAO } },
        feedbacks: { error: { message: "falha de gravação" } },
      },
    });

    const resposta = await POST(
      requisicao({ interacao_id: UUID_INTERACAO, classificacao: "util" })
    );

    expect(resposta.status).toBe(500);
    expect((await resposta.json()).erro.codigo).toBe("ERRO_INTERNO");
  });
});
