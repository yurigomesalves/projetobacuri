import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { gerarResposta, gerarRespostaDetalhada } from "@/lib/server/llm";

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
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("gerarResposta", () => {
  it("não entrega geração truncada nem faz nova chamada paga para completá-la", async () => {
    fetchFalso.mockResolvedValueOnce(Response.json({
      choices: [{ finish_reason: "length", message: { content: "Afirmação citada [1] interrompida em" } }],
    }));
    await expect(gerarResposta(mensagens)).rejects.toThrow("limite de tokens");
    expect(fetchFalso).toHaveBeenCalledTimes(1);
  });

  it("preserva resposta concluída normalmente pelo provedor", async () => {
    fetchFalso.mockResolvedValueOnce(Response.json({
      choices: [{ finish_reason: "stop", message: { content: "Afirmação completa [1]." } }],
    }));
    expect(await gerarResposta(mensagens)).toBe("Afirmação completa [1].");
  });

  it("cancela a espera entre tentativas quando o prazo compartilhado termina", async () => {
    vi.useFakeTimers();
    const controlador = new AbortController();
    fetchFalso.mockResolvedValueOnce(new Response("ocupado", { status: 429, headers: { "retry-after": "25" } }));
    const pendente = gerarRespostaDetalhada(mensagens, { signal: controlador.signal });
    const verificacao = expect(pendente).rejects.toThrow();
    await vi.advanceTimersByTimeAsync(100);
    controlador.abort(new Error("Prazo vencido"));
    await verificacao;
    await vi.advanceTimersByTimeAsync(30_000);
    expect(fetchFalso).toHaveBeenCalledTimes(1);
  });

  it("não envia requisição quando o prazo já terminou", async () => {
    const controlador = new AbortController();
    controlador.abort(new Error("Prazo vencido"));
    await expect(gerarRespostaDetalhada(mensagens, { signal: controlador.signal })).rejects.toThrow();
    expect(fetchFalso).not.toHaveBeenCalled();
  });
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

  it("expõe uso somente na interface interna e respeita uma chamada experimental", async () => {
    fetchFalso.mockResolvedValueOnce(Response.json({
      choices: [{ message: { content: "[\"chunk-1\"]" } }],
      usage: { prompt_tokens: 12, completion_tokens: 4, total_tokens: 16 },
    }));

    const resultado = await gerarRespostaDetalhada(mensagens, {
      maxTokens: 128, timeoutMs: 1_000, tentativas: 1,
    });

    expect(resultado).toMatchObject({ texto: '["chunk-1"]', uso: { entrada: 12, saida: 4, total: 16 } });
    expect(JSON.parse(fetchFalso.mock.calls[0][1].body)).toMatchObject({ max_tokens: 128 });
    expect(fetchFalso).toHaveBeenCalledTimes(1);
  });
});
