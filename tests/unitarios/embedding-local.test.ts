import { afterEach, describe, expect, it, vi } from "vitest";

const estado = vi.hoisted(() => ({ local: true, extrair: vi.fn(), pipeline: vi.fn(), env: { cacheDir: "" } }));
vi.mock("node:fs", () => ({ existsSync: () => estado.local }));
vi.mock("@huggingface/transformers", () => ({ env: estado.env, pipeline: estado.pipeline }));
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });

async function carregar(local: boolean, vercel: string) {
  vi.resetModules();
  estado.local = local;
  vi.stubEnv("VERCEL", vercel);
  estado.extrair.mockResolvedValue({ data: new Float32Array(384).fill(0.01) });
  estado.pipeline.mockResolvedValue(estado.extrair);
  return import("@/lib/server/embedding");
}

describe("modelo de embedding empacotado", () => {
  it("carrega somente os arquivos locais na Vercel e conserva o processamento e5", async () => {
    const { gerarEmbeddingConsulta } = await carregar(true, "1");
    expect(await gerarEmbeddingConsulta("Primeira pergunta")).toHaveLength(384);
    await gerarEmbeddingConsulta("Outra pergunta");
    expect(estado.pipeline).toHaveBeenCalledTimes(1);
    expect(estado.pipeline).toHaveBeenCalledWith("feature-extraction", expect.stringContaining(".cache/modelos/Xenova/multilingual-e5-small"), {
      revision: "761b726dd34fb83930e26aab4e9ac3899aa1fa78", local_files_only: true, device: "cpu", dtype: "fp32",
    });
    expect(estado.extrair).toHaveBeenCalledWith("query: Primeira pergunta", { pooling: "mean", normalize: true });
  });
  it("recusa pacote incompleto na Vercel em vez de baixar durante a consulta", async () => {
    const { gerarEmbeddingConsulta } = await carregar(false, "1");
    await expect(gerarEmbeddingConsulta("Pergunta")).rejects.toThrow("ausente no pacote");
    expect(estado.pipeline).not.toHaveBeenCalled();
  });
  it("permite desenvolvimento sem preparar pesos locais, usando a mesma revisão", async () => {
    const { gerarEmbeddingConsulta } = await carregar(false, "");
    await gerarEmbeddingConsulta("Pergunta");
    expect(estado.pipeline).toHaveBeenCalledWith("feature-extraction", "Xenova/multilingual-e5-small", expect.objectContaining({ local_files_only: false, dtype: "fp32" }));
  });
});
