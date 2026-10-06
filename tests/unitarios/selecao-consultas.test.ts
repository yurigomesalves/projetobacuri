import { describe, expect, it } from "vitest";
import { selecionarTrechosDasConsultas } from "@/lib/server/recuperacao";
import { vi } from "vitest";

vi.mock("@/lib/server/supabase", () => ({ supabaseServidor: {} }));

const lista = (prefixo: string, tamanho = 8) => Array.from({ length: tamanho }, (_, i) => ({ chunk_id: `${prefixo}${i + 1}` }));

describe("seleção dos trechos de múltiplas consultas", () => {
  it("inclui as subconsultas mesmo quando a pergunta original preenche oito vagas", () => {
    expect(selecionarTrechosDasConsultas([lista("o"), lista("a"), lista("b")]).map((t) => t.chunk_id))
      .toEqual(["o1", "a1", "b1", "o2", "a2", "b2", "o3", "a3"]);
  });

  it("preenche vagas após listas vazias e duplicadas", () => {
    const original = lista("o");
    expect(selecionarTrechosDasConsultas([original, [], original])).toEqual(original);
    expect(selecionarTrechosDasConsultas([[], [], []])).toEqual([]);
  });

  it("preserva metadados da primeira ocorrência e ordem quando há uma consulta", () => {
    const original = [{ chunk_id: "x", paginas: "10" }, { chunk_id: "y", paginas: "11" }];
    expect(selecionarTrechosDasConsultas([original])).toEqual(original);
    expect(selecionarTrechosDasConsultas([original, [{ chunk_id: "x", paginas: "99" }]])[0]).toBe(original[0]);
  });
});
