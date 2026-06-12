import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { criarSupabaseFalso, type SupabaseFalso } from "../apoio/supabase-falso";
import { trechoBuscado, UUID_INTERACAO } from "../apoio/fixtures";

// `vi.mock` é içado para antes dos imports; `vi.hoisted` cria o estado
// compartilhado que as fábricas dos mocks leem em tempo de execução.
const estado = vi.hoisted(() => ({ supabase: null as unknown as SupabaseFalso }));

vi.mock("@/lib/server/supabase", () => ({
  supabaseServidor: {
    from: (tabela: string) => estado.supabase.from(tabela),
    rpc: (nome: string, args?: unknown) => estado.supabase.rpc(nome, args),
  },
}));
vi.mock("@/lib/server/embedding", () => ({
  gerarEmbeddingConsulta: vi.fn(async () => Array.from({ length: 384 }, () => 0.01)),
}));
vi.mock("@/lib/server/llm", () => ({
  gerarResposta: vi.fn(async () => "O AI-5 suspendeu garantias constitucionais [1][2]."),
}));
vi.mock("@/lib/server/limite", () => ({
  dentroDoLimite: vi.fn(() => true),
}));

import { POST } from "@/app/api/chat/route";
import { gerarEmbeddingConsulta } from "@/lib/server/embedding";
import { gerarResposta } from "@/lib/server/llm";
import { dentroDoLimite } from "@/lib/server/limite";

function requisicao(corpo: unknown): NextRequest {
  return new NextRequest("http://localhost/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof corpo === "string" ? corpo : JSON.stringify(corpo),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(dentroDoLimite).mockReturnValue(true);
  vi.spyOn(console, "error").mockImplementation(() => {});
  estado.supabase = criarSupabaseFalso();
});

describe("POST /api/chat — resposta com base documental", () => {
  it("devolve 200 com citações numeradas em sequência e interacao_id", async () => {
    estado.supabase = criarSupabaseFalso({
      rpc: {
        data: [
          trechoBuscado(),
          trechoBuscado({ chunk_id: "chunk-002", tipo_chunk: "nota_rodape", paginas: "99" }),
        ],
      },
      tabelas: { interacoes: { data: { interacao_id: UUID_INTERACAO } } },
    });

    const resposta = await POST(requisicao({ mensagem: "O que foi o AI-5?" }));
    const corpo = await resposta.json();

    expect(resposta.status).toBe(200);
    expect(corpo.resposta).toContain("[1]");
    expect(corpo.interacao_id).toBe(UUID_INTERACAO);
    expect(corpo.sugestoes_pesquisa).toEqual([]);
    expect(corpo.citacoes).toHaveLength(2);
    // Princípio 3: toda citação carrega autoria, página e link da fonte.
    expect(corpo.citacoes[0]).toMatchObject({
      n: 1,
      autor_orgao: "Comissão Nacional da Verdade",
      paginas: "45-46",
      url_origem: "https://exemplo.org/cnv/volume1.pdf",
      tipo_chunk: "corpo",
    });
    expect(corpo.citacoes[1]).toMatchObject({ n: 2, tipo_chunk: "nota_rodape" });
  });

  it("trunca trechos longos das citações em 400 caracteres", async () => {
    const conteudoLongo = "a".repeat(600);
    estado.supabase = criarSupabaseFalso({
      rpc: { data: [trechoBuscado({ conteudo: conteudoLongo })] },
      tabelas: { interacoes: { data: { interacao_id: UUID_INTERACAO } } },
    });

    const resposta = await POST(requisicao({ mensagem: "O que foi o AI-5?" }));
    const corpo = await resposta.json();

    expect(corpo.citacoes[0].trecho.length).toBeLessThanOrEqual(401);
    expect(corpo.citacoes[0].trecho.endsWith("…")).toBe(true);
  });

  it("aceita histórico de até 6 mensagens e o repassa ao LLM", async () => {
    estado.supabase = criarSupabaseFalso({
      rpc: { data: [trechoBuscado()] },
      tabelas: { interacoes: { data: { interacao_id: UUID_INTERACAO } } },
    });
    const historico = [
      { papel: "usuario", conteudo: "Pergunta anterior." },
      { papel: "assistente", conteudo: "Resposta anterior [1]." },
    ];

    const resposta = await POST(requisicao({ mensagem: "E depois disso?", historico }));

    expect(resposta.status).toBe(200);
    const mensagensLLM = vi.mocked(gerarResposta).mock.calls[0][0];
    // sistema + 2 do histórico + pergunta atual
    expect(mensagensLLM).toHaveLength(4);
    expect(mensagensLLM[1]).toEqual({ role: "user", content: "Pergunta anterior." });
    expect(mensagensLLM[2]).toEqual({ role: "assistant", content: "Resposta anterior [1]." });
    expect(mensagensLLM[3]).toEqual({ role: "user", content: "E depois disso?" });
  });
});

describe("POST /api/chat — sem base documental (princípio 3: nunca inventar)", () => {
  it("devolve 200 com resposta padrão, sugestões de pesquisa e SEM chamar o LLM", async () => {
    estado.supabase = criarSupabaseFalso({
      rpc: { data: [] },
      tabelas: { interacoes: { data: { interacao_id: UUID_INTERACAO } } },
    });

    const resposta = await POST(requisicao({ mensagem: "Pergunta totalmente fora do acervo" }));
    const corpo = await resposta.json();

    expect(resposta.status).toBe(200);
    expect(corpo.resposta).toContain("Não encontrei");
    expect(corpo.citacoes).toEqual([]);
    expect(corpo.sugestoes_pesquisa.length).toBeGreaterThan(0);
    expect(corpo.interacao_id).toBe(UUID_INTERACAO);
    expect(gerarResposta).not.toHaveBeenCalled();
  });
});

describe("POST /api/chat — validação de entrada", () => {
  it.each([
    ["mensagem curta demais", { mensagem: "oi" }],
    ["mensagem longa demais", { mensagem: "a".repeat(1001) }],
    [
      "histórico com mais de 6 mensagens",
      {
        mensagem: "Pergunta válida?",
        historico: Array.from({ length: 7 }, () => ({ papel: "usuario", conteudo: "x" })),
      },
    ],
    ["papel desconhecido no histórico", {
      mensagem: "Pergunta válida?",
      historico: [{ papel: "sistema", conteudo: "x" }],
    }],
  ])("rejeita %s com 400 ENTRADA_INVALIDA", async (_caso, corpo) => {
    const resposta = await POST(requisicao(corpo));
    const json = await resposta.json();

    expect(resposta.status).toBe(400);
    expect(json.erro.codigo).toBe("ENTRADA_INVALIDA");
    expect(gerarEmbeddingConsulta).not.toHaveBeenCalled();
  });

  it("rejeita corpo que não é JSON com 400", async () => {
    const resposta = await POST(requisicao("isto não é json"));
    expect(resposta.status).toBe(400);
    expect((await resposta.json()).erro.codigo).toBe("ENTRADA_INVALIDA");
  });
});

describe("POST /api/chat — limites e falhas", () => {
  it("devolve 429 LIMITE_EXCEDIDO quando o rate limit estoura", async () => {
    vi.mocked(dentroDoLimite).mockReturnValue(false);

    const resposta = await POST(requisicao({ mensagem: "O que foi o AI-5?" }));

    expect(resposta.status).toBe(429);
    expect((await resposta.json()).erro.codigo).toBe("LIMITE_EXCEDIDO");
  });

  it("devolve 500 ERRO_INTERNO quando a busca vetorial falha, sem vazar detalhes", async () => {
    estado.supabase = criarSupabaseFalso({
      rpc: { error: { message: "detalhe interno do banco" } },
    });

    const resposta = await POST(requisicao({ mensagem: "O que foi o AI-5?" }));
    const corpo = await resposta.json();

    expect(resposta.status).toBe(500);
    expect(corpo.erro.codigo).toBe("ERRO_INTERNO");
    expect(JSON.stringify(corpo)).not.toContain("detalhe interno do banco");
  });

  it("devolve 500 ERRO_INTERNO quando o LLM falha", async () => {
    estado.supabase = criarSupabaseFalso({
      rpc: { data: [trechoBuscado()] },
      tabelas: { interacoes: { data: { interacao_id: UUID_INTERACAO } } },
    });
    vi.mocked(gerarResposta).mockRejectedValueOnce(new Error("provedor fora do ar"));

    const resposta = await POST(requisicao({ mensagem: "O que foi o AI-5?" }));

    expect(resposta.status).toBe(500);
    expect((await resposta.json()).erro.codigo).toBe("ERRO_INTERNO");
  });
});
