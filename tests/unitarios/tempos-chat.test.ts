import { afterEach, describe, expect, it, vi } from "vitest";
import { criarMedicaoChat } from "@/lib/server/tempos-chat";

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

describe("diagnóstico de tempos do chat", () => {
  it("mede sucesso e falha sem registrar conteúdo da operação", async () => {
    vi.stubEnv("RAG_METRICAS_TEMPO", "1");
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    const medicao = criarMedicaoChat();
    expect(await medicao.medir("embedding", async () => "conteúdo privado")).toBe("conteúdo privado");
    await expect(medicao.medir("geracao", async () => { throw new Error("credencial privada"); })).rejects.toThrow();
    medicao.finalizar(false);
    const relato = JSON.parse(log.mock.calls[0][1]);
    expect(relato.etapas).toEqual([
      { etapa: "embedding", ms: expect.any(Number), sucesso: true },
      { etapa: "geracao", ms: expect.any(Number), sucesso: false },
    ]);
    expect(JSON.stringify(log.mock.calls)).not.toMatch(/conteúdo privado|credencial privada/);
  });
  it("não emite métricas quando desligado", async () => {
    vi.stubEnv("RAG_METRICAS_TEMPO", "0");
    const log = vi.spyOn(console, "info");
    const medicao = criarMedicaoChat();
    await medicao.medir("geracao", async () => 42);
    medicao.finalizar(true);
    expect(log).not.toHaveBeenCalled();
  });
});
