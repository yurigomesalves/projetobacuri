// Prazo compartilhado para uma requisição. Ele não cancela cálculos locais
// compartilhados (como o embedding em cache), mas impede que a rota inicie
// novas etapas quando o prazo já venceu.

export class ErroPrazoEsgotado extends Error {
  constructor() {
    super("Prazo da requisição esgotado.");
    this.name = "ErroPrazoEsgotado";
  }
}

export type PrazoRequisicao = {
  signal: AbortSignal;
  encerrar: () => void;
};

const prazos = new WeakMap<AbortSignal, { encerraEm: number; controlador: AbortController }>();

export function criarPrazoRequisicao(limiteMs = 20_000): PrazoRequisicao {
  const controlador = new AbortController();
  const encerraEm = Date.now() + limiteMs;
  prazos.set(controlador.signal, { encerraEm, controlador });
  const temporizador = setTimeout(() => {
    controlador.abort(new ErroPrazoEsgotado());
  }, limiteMs);

  return {
    signal: controlador.signal,
    encerrar: () => clearTimeout(temporizador),
  };
}

export function conferirPrazo(signal: AbortSignal): void {
  const prazo = prazos.get(signal);
  if (!signal.aborted && prazo !== undefined && Date.now() >= prazo.encerraEm) {
    prazo.controlador.abort(new ErroPrazoEsgotado());
  }
  if (signal.aborted) {
    throw signal.reason instanceof Error ? signal.reason : new ErroPrazoEsgotado();
  }
}

/** Aguarda uma etapa sem deixar uma promessa que ignora AbortSignal prolongar a rota. */
export function aguardarNoPrazo<T>(etapa: PromiseLike<T>, signal: AbortSignal): Promise<T> {
  conferirPrazo(signal);
  return new Promise<T>((resolve, reject) => {
    const aoAbortar = () => {
      signal.removeEventListener("abort", aoAbortar);
      reject(signal.reason instanceof Error ? signal.reason : new ErroPrazoEsgotado());
    };
    signal.addEventListener("abort", aoAbortar, { once: true });
    Promise.resolve(etapa).then(
      (valor) => {
        signal.removeEventListener("abort", aoAbortar);
        try {
          conferirPrazo(signal);
          resolve(valor);
        } catch (erro) {
          reject(erro);
        }
      },
      (erro) => {
        signal.removeEventListener("abort", aoAbortar);
        reject(erro);
      },
    );
  });
}

/** Aplica cancelamento a builders do Supabase sem exigir isso dos dublês de teste. */
export function comSinalDePrazo<T>(consulta: T, signal: AbortSignal): T {
  const cancelavel = consulta as T & {
    abortSignal?: (sinal: AbortSignal) => T;
  };
  return typeof cancelavel.abortSignal === "function"
    ? cancelavel.abortSignal(signal)
    : consulta;
}
