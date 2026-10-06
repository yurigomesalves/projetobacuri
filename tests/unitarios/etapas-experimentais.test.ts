import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const gerarRespostaDetalhada = vi.hoisted(() => vi.fn());
vi.mock("@/lib/server/llm", () => ({ gerarRespostaDetalhada }));

import {
  decomporConsultaExperimental,
  reranquearIdsExperimental,
  respostaSustentadaExperimental,
} from "@/lib/server/etapas-experimentais";

beforeEach(() => {
  vi.stubEnv("RAG_ETAPAS_PAGAS_AUTORIZADAS", "sim");
  vi.clearAllMocks();
});
afterEach(() => vi.unstubAllEnvs());

describe("etapas experimentais pagas", () => {
  it("envia resumo e resposta completa para a mesma verificação", async () => {
    vi.stubEnv("RAG_VERIFICAR_RESPOSTA", "1");
    gerarRespostaDetalhada.mockResolvedValueOnce({ texto: '{"veredito":"contradita"}' });
    expect(await respostaSustentadaExperimental("Pergunta", "Resposta com fonte [1].", [], Date.now(), undefined, "Resumo sem sustentação."))
      .toBe(false);
    const mensagens = gerarRespostaDetalhada.mock.calls[0][0];
    expect(mensagens[1].content).toContain("Resumo: Resumo sem sustentação.");
    expect(mensagens[1].content).toContain("Resposta completa: Resposta com fonte [1].");
  });
  it("não chama o provedor enquanto a flag específica estiver desligada", async () => {
    vi.stubEnv("RAG_DECOMPOR_CONSULTA", "0");
    expect(await decomporConsultaExperimental("O que ocorreu?", Date.now())).toBeNull();
    expect(gerarRespostaDetalhada).not.toHaveBeenCalled();
  });

  it("valida subconsultas e preserva a pergunta original", async () => {
    vi.stubEnv("RAG_DECOMPOR_CONSULTA", "1");
    gerarRespostaDetalhada.mockResolvedValueOnce({ texto: '{"consultas":["Quem foi citado?","Em que data?"]}' });
    await expect(decomporConsultaExperimental("O que ocorreu?", Date.now())).resolves.toEqual([
      "O que ocorreu?", "Quem foi citado?", "Em que data?",
    ]);
  });

  it("descarta IDs inventados no reranqueamento", async () => {
    vi.stubEnv("RAG_RERANQUEAR_LLM", "1");
    gerarRespostaDetalhada.mockResolvedValueOnce({ texto: '{"ordem":["b","inexistente","a"]}' });
    await expect(reranquearIdsExperimental("Pergunta", [
      { chunk_id: "a", conteudo: "A" }, { chunk_id: "b", conteudo: "B" },
    ], Date.now())).resolves.toEqual(["b", "a"]);
  });

  it("retorna reprovação sem tentar gerar outra resposta", async () => {
    vi.stubEnv("RAG_VERIFICAR_RESPOSTA", "1");
    gerarRespostaDetalhada.mockResolvedValueOnce({ texto: '{"veredito":"insuficiente"}' });
    await expect(respostaSustentadaExperimental("Pergunta", "Resposta", [], Date.now())).resolves.toBe(false);
    expect(gerarRespostaDetalhada).toHaveBeenCalledTimes(1);
  });
});
