import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { gerarResposta } from "@/lib/server/llm";

const mensagens = [{ role: "user" as const, content: "Pergunta de teste" }];
const fetchFalso = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchFalso);
  vi.stubEnv("LLM_PROVIDER", "openrouter");
  vi.stubEnv("LLM_MODELO", "modelo-autorizado");
  vi.stubEnv("OPENROUTER_API_KEY", "chave-falsa");
  vi.stubEnv("LLM_MAX_TOKENS", undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("gerarResposta", () => {
  it("limita os tokens sem trocar o modelo autorizado ou a pergunta", async () => {
    fetchFalso.mockResolvedValueOnce(Response.json({ choices: [{ message: { content: "Resposta [1]." } }] }));
    expect(await gerarResposta(mensagens)).toBe("Resposta [1].");
    const [url, opcoes] = fetchFalso.mock.calls[0];
    expect(url).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect(JSON.parse(opcoes.body)).toMatchObject({ model: "modelo-autorizado", max_tokens: 2048, messages: mensagens, reasoning: { effort: "none" } });
    expect(opcoes.signal).toBeInstanceOf(AbortSignal);
  });

  it("recusa limite inválido antes de enviar uma requisição", async () => {
    vi.stubEnv("LLM_MAX_TOKENS", "0");
    await expect(gerarResposta(mensagens)).rejects.toThrow("LLM_MAX_TOKENS");
    expect(fetchFalso).not.toHaveBeenCalled();
  });

  it("não repete nem contorna bloqueios de modelo ou privacidade", async () => {
    fetchFalso.mockResolvedValueOnce(Response.json({ error: { message: "Model blocked by guardrail" } }, { status: 404 }));
    await expect(gerarResposta(mensagens)).rejects.toThrow("status 404");
    expect(fetchFalso).toHaveBeenCalledTimes(1);
  });

  it("recusa uma resposta vazia em vez de exibir sucesso sem conteúdo", async () => {
    fetchFalso.mockResolvedValueOnce(Response.json({ choices: [{ message: { content: "  " } }] }));
    await expect(gerarResposta(mensagens)).rejects.toThrow("formato inesperado");
  });
});
