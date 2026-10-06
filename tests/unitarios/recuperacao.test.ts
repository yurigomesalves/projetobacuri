import { afterEach, describe, expect, it, vi } from "vitest";
import { criarSupabaseFalso, type SupabaseFalso } from "../apoio/supabase-falso";
import { trechoBuscado } from "../apoio/fixtures";

const estado = vi.hoisted(() => ({ supabase: null as unknown as SupabaseFalso }));
vi.mock("@/lib/server/supabase", () => ({
  supabaseServidor: {
    from: (tabela: string) => estado.supabase.from(tabela),
    rpc: (nome: string, args?: unknown) => estado.supabase.rpc(nome, args),
  },
}));

import { recuperarTrechos } from "@/lib/server/recuperacao";

afterEach(() => vi.unstubAllEnvs());

describe("recuperação interna", () => {
  it("mantém a preferência de continuidade ao retornar para o controle", async () => {
    vi.stubEnv("RAG_RECUPERACAO_EXPERIMENTAL", "1");
    estado.supabase = criarSupabaseFalso({ rpc: [
      { error: { message: "RRF indisponível" } },
      { data: [trechoBuscado()] },
      { data: [] },
    ] });
    const resultado = await recuperarTrechos("O que foi o AI-5?", [0.01], ["fonte-anterior"]);
    expect(resultado.diagnostico.fonte_continuidade_usada).toBe(true);
    expect(estado.supabase.rpc).toHaveBeenLastCalledWith("buscar_chunks_textuais_por_fontes", {
      consulta_texto: "O que foi o AI-5?", fontes_candidatas: ["fonte-anterior"], qtd_por_fonte: 4,
    });
    expect(resultado.finais).toHaveLength(1);
  });
  it("não inicia fallback após cancelamento da requisição", async () => {
    vi.stubEnv("RAG_RECUPERACAO_EXPERIMENTAL", "1");
    const controlador = new AbortController();
    estado.supabase = criarSupabaseFalso();
    estado.supabase.rpc.mockImplementationOnce(() => {
      controlador.abort(new Error("Prazo vencido"));
      return Promise.resolve({ data: null, count: null, error: { message: "Abortado" } });
    });
    await expect(recuperarTrechos("O que foi o AI-5?", [0.01], null, Date.now(), controlador.signal)).rejects.toThrow();
    expect(estado.supabase.rpc).toHaveBeenCalledTimes(1);
  });
  it("recupera pelo controle também quando a RPC experimental rejeita", async () => {
    vi.stubEnv("RAG_RECUPERACAO_EXPERIMENTAL", "1");
    estado.supabase = criarSupabaseFalso({ rpc: { data: [trechoBuscado()] } });
    estado.supabase.rpc.mockRejectedValueOnce(new Error("Falha de transporte"));
    const resultado = await recuperarTrechos("O que foi o AI-5?", [0.01], null);
    expect(resultado.diagnostico.estrategia).toBe("controle");
    expect(resultado.finais).toHaveLength(1);
  });
  it("recupera evidência vetorial quando a RPC experimental falha", async () => {
    vi.stubEnv("RAG_RECUPERACAO_EXPERIMENTAL", "1");
    estado.supabase = criarSupabaseFalso({ rpc: [
      { error: { message: "RPC experimental indisponível" } },
      { data: [trechoBuscado()] },
    ] });

    const resultado = await recuperarTrechos("O que foi o AI-5?", [0.01], null);

    expect(resultado.diagnostico.estrategia).toBe("controle");
    expect(resultado.diagnostico.falhas.length).toBeGreaterThan(0);
    expect(resultado.finais[0]).toMatchObject({ chunk_id: trechoBuscado().chunk_id, origem: ["vetorial"] });
    expect(estado.supabase.rpc.mock.calls.map(([nome]) => nome)).toEqual([
      "buscar_candidatos_hibridos_rastreaveis", "buscar_chunks",
    ]);
  });

  it("não mascara falha do controle como ausência de documentos", async () => {
    vi.stubEnv("RAG_RECUPERACAO_EXPERIMENTAL", "1");
    estado.supabase = criarSupabaseFalso({ rpc: [
      { error: { message: "RRF indisponível" } },
      { error: { message: "Controle indisponível" } },
    ] });
    await expect(recuperarTrechos("O que foi o AI-5?", [0.01], null)).rejects.toThrow();
  });
  it("mantém o controle vetorial quando a variante está desligada", async () => {
    delete process.env.RAG_RECUPERACAO_EXPERIMENTAL;
    estado.supabase = criarSupabaseFalso({ rpc: { data: [trechoBuscado()] } });

    const resultado = await recuperarTrechos("O que foi o AI-5?", [0.01], null);

    expect(resultado.diagnostico.estrategia).toBe("controle");
    expect(resultado.finais).toHaveLength(1);
    expect(resultado.finais[0]).toMatchObject({ origem: ["vetorial"], posicao_vetorial: 1 });
  });

  it("guarda origem e posições RRF somente no resultado interno", async () => {
    process.env.RAG_RECUPERACAO_EXPERIMENTAL = "1";
    estado.supabase = criarSupabaseFalso({
      rpc: { data: [{ ...trechoBuscado(), posicao_textual: 2, posicao_semantica: 3, pontuacao_rrf: 0.03 }] },
    });

    const resultado = await recuperarTrechos("O que foi o AI-5?", [0.01], null);

    expect(resultado.diagnostico.estrategia).toBe("rrf_rastreavel");
    expect(resultado.candidatos[0]).toMatchObject({ origem: ["textual_global", "vetorial"], posicao_textual: 2, posicao_vetorial: 3 });
    delete process.env.RAG_RECUPERACAO_EXPERIMENTAL;
  });
});
