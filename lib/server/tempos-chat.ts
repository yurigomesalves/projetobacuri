import { randomUUID } from "node:crypto";

const instancia = randomUUID();
let ordem = 0;
type Etapa = "decomposicao" | "embedding" | "recuperacao" | "geracao" | "verificacao" | "registro";

/** Diagnóstico sem texto da conversa ou identidade do usuário. */
export function criarMedicaoChat() {
  const habilitada = process.env.RAG_METRICAS_TEMPO === "1";
  const requisicao = ++ordem;
  const inicio = performance.now();
  const etapas: { etapa: Etapa; ms: number; sucesso: boolean }[] = [];
  return {
    async medir<T>(etapa: Etapa, operacao: () => PromiseLike<T>): Promise<T> {
      if (!habilitada) return operacao();
      const desde = performance.now();
      let sucesso = false;
      try {
        const valor = await operacao();
        sucesso = true;
        return valor;
      } finally {
        etapas.push({ etapa, ms: Math.round(performance.now() - desde), sucesso });
      }
    },
    finalizar(sucesso: boolean) {
      if (habilitada) console.info("BACURI_TEMPOS_CHAT", JSON.stringify({
        instancia, requisicao, sucesso, total_ms: Math.round(performance.now() - inicio), etapas,
      }));
    },
  };
}
