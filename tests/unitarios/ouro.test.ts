import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { trechoBuscado } from "../apoio/fixtures";
const estado = vi.hoisted(() => ({ data: [] as unknown[], chamada: vi.fn() }));
vi.mock("@/lib/server/supabase", () => ({ supabaseServidor: { rpc: (...args: unknown[]) => { estado.chamada(...args); return { abortSignal: () => Promise.resolve({ data: estado.data, error: null }) }; } } }));
vi.mock("@/lib/server/embedding", () => ({ gerarEmbeddingPassagem: vi.fn() }));
import { recuperarOuro } from "@/lib/server/ouro";
afterEach(() => vi.unstubAllEnvs());
beforeEach(() => { estado.chamada.mockClear(); estado.data = []; });
describe("recuperação editorial conservadora", () => {
  it("permanece desligada até avaliação independente", async () => {
    vi.stubEnv("BACURI_OURO_CHAT_ATIVO", "false"); expect(await recuperarOuro([1], [], new AbortController().signal)).toEqual([]); expect(estado.chamada).not.toHaveBeenCalled();
  });
  it("não usa ouro se faltar qualquer evidência documental na consulta", async () => {
    vi.stubEnv("BACURI_OURO_CHAT_ATIVO", "true");
    estado.data = [{ ouro_id: "ouro", versao_id: "versao", titulo: "Título", texto: "Uma orientação editorial", chunk_ids: ["chunk-001", "ausente"] }];
    const trecho = { ...trechoBuscado(), tipo_chunk: "corpo" as const };
    expect(await recuperarOuro([1], [trecho], new AbortController().signal)).toEqual([]);
    estado.data = [{ ...estado.data[0] as object, chunk_ids: ["chunk-001"] }];
    expect(await recuperarOuro([1], [trecho], new AbortController().signal)).toHaveLength(1);
  });
  it("consulta já cancelada não inicia operação editorial", async () => {
    vi.stubEnv("BACURI_OURO_CHAT_ATIVO", "true"); const signal = AbortSignal.abort(); expect(await recuperarOuro([1], [], signal)).toEqual([]); expect(estado.chamada).not.toHaveBeenCalled();
  });
});
