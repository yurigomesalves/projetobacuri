import { describe, expect, it } from "vitest";
import { medirApresentacao } from "../../scripts/verificar-chat-staging.mjs";

describe("medidas de apresentação do chat", () => {
  it("mede resposta e resumo separadamente, sem alterar o texto citado", () => {
    const corpo = { resumo: "Síntese curta.", resposta: "Uma afirmação [1].\n\nUma ressalva [2]." };
    expect(medirApresentacao(corpo)).toMatchObject({ resumo_vazio: false, resumo_sem_marcadores: true, palavras_resposta: 6, blocos_resposta: 2, meta_palavras: false, meta_blocos: true, rotulos_internos: false });
    expect(corpo.resposta).toBe("Uma afirmação [1].\n\nUma ressalva [2].");
  });
  it("separa falhas de resumo de metas de extensão", () => {
    expect(medirApresentacao({ resumo: "Síntese [1].", resposta: "palavra ".repeat(250) })).toMatchObject({ resumo_sem_marcadores: false, meta_palavras: true });
    expect(medirApresentacao({ resumo: "", resposta: Array(7).fill("Texto citado [1].").join("\n\n") })).toMatchObject({ resumo_vazio: true, blocos_resposta: 7, meta_blocos: false });
  });
  it("identifica rótulos internos e resposta ausente", () => {
    expect(medirApresentacao({ resposta: "PARTE 3 — RESPOSTA COMPLETA: texto [1]." }).rotulos_internos).toBe(true);
    expect(medirApresentacao({})).toMatchObject({ palavras_resposta: 0, blocos_resposta: 0, meta_blocos: false });
  });
});
