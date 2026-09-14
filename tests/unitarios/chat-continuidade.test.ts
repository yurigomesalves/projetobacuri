import { describe, expect, it } from "vitest";
import { pareceContinuidade } from "@/app/componentes/Chat";

describe("heurística de continuidade no chat", () => {
  it.each([
    "E quais fontes tratam disso?",
    "O que foi dito deles?",
    "Acabei de mencionar a Comissão Nacional da Verdade; onde leio mais?",
    "Essa conclusão tem respaldo documental?",
  ])("reconhece referente dependente da resposta anterior: %s", (pergunta) => {
    expect(pareceContinuidade(pergunta)).toBe(true);
  });

  it.each([
    "Mudando de assunto, o que foi o AI-5?",
    "Em outro tema, fale da Guerrilha do Araguaia.",
    "Agora sobre organizações sindicais, quais fontes há?",
    "O que ocorreu durante o governo Geisel?",
  ])("não reaproveita contexto quando há mudança de assunto: %s", (pergunta) => {
    expect(pareceContinuidade(pergunta)).toBe(false);
  });
});
