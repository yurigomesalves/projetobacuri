import { afterEach, describe, expect, it, vi } from "vitest";
import { aguardarNoPrazo, conferirPrazo, criarPrazoRequisicao } from "@/lib/server/prazo";

afterEach(() => vi.useRealTimers());

describe("prazo da requisição", () => {
  it("recusa resultado que chega após o prazo mesmo com timer atrasado", async () => {
    vi.useFakeTimers();
    const inicio = Date.now();
    const prazo = criarPrazoRequisicao();
    let concluir!: (valor: string) => void;
    const etapa = new Promise<string>((resolve) => { concluir = resolve; });
    const pendente = aguardarNoPrazo(etapa, prazo.signal);
    const verificacao = expect(pendente).rejects.toThrow("Prazo");
    vi.setSystemTime(inicio + 20_001);
    concluir("resultado tardio");
    await verificacao;
    prazo.encerrar();
  });

  it("encerra o timer após conclusão e detecta vencimento pelo relógio", () => {
    vi.useFakeTimers();
    const inicio = Date.now();
    const prazo = criarPrazoRequisicao();
    vi.setSystemTime(inicio + 20_001);
    expect(() => conferirPrazo(prazo.signal)).toThrow("Prazo");
    prazo.encerrar();
    expect(vi.getTimerCount()).toBe(0);
  });
});
