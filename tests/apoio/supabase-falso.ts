// Dublê do cliente Supabase para testes das rotas de API.
//
// As rotas usam dois padrões do supabase-js:
//   1. supabaseServidor.rpc("buscar_chunks", {...})  -> Promise<{data, error}>
//   2. supabaseServidor.from("tabela").select(...).eq(...).range(...) etc.,
//      encerrando com .single()/.maybeSingle() OU com `await` direto na cadeia.
//
// Este dublê reproduz os dois: cada método encadeável devolve o próprio
// objeto, e o objeto é "thenable" (pode ser aguardado com await). O resultado
// de cada consulta é configurado por tabela; chamadas repetidas à mesma
// tabela consomem uma fila, na ordem em que a rota as faz.

import { vi } from "vitest";

export type ResultadoFalso = {
  data?: unknown;
  count?: number | null;
  error?: { message: string } | null;
};

export type ChamadaRegistrada = {
  tabela: string;
  metodo: string;
  args: unknown[];
};

type ConfiguracaoFalsa = {
  rpc?: ResultadoFalso | ResultadoFalso[];
  tabelas?: Record<string, ResultadoFalso | ResultadoFalso[]>;
};

export type SupabaseFalso = ReturnType<typeof criarSupabaseFalso>;

export function criarSupabaseFalso(config: ConfiguracaoFalsa = {}) {
  const filasTabelas = new Map<string, ResultadoFalso[]>();
  for (const [tabela, resultado] of Object.entries(config.tabelas ?? {})) {
    filasTabelas.set(tabela, Array.isArray(resultado) ? [...resultado] : [resultado]);
  }
  const filaRpc = !config.rpc
    ? []
    : Array.isArray(config.rpc)
      ? [...config.rpc]
      : [config.rpc];

  // Registro de todas as chamadas encadeadas, para os testes poderem afirmar
  // COMO a rota consultou o banco (ex.: filtrou por status_curadoria).
  const chamadas: ChamadaRegistrada[] = [];

  function completar(resultado: ResultadoFalso) {
    return {
      data: resultado.data ?? null,
      count: resultado.count ?? null,
      error: resultado.error ?? null,
    };
  }

  function criarConsulta(tabela: string, resultado: ResultadoFalso) {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const consulta: any = {};
    const metodosEncadeaveis = [
      "select",
      "insert",
      "update",
      "delete",
      "eq",
      "neq",
      "in",
      "ilike",
      "contains",
      "order",
      "range",
      "limit",
    ];
    for (const metodo of metodosEncadeaveis) {
      consulta[metodo] = (...args: unknown[]) => {
        chamadas.push({ tabela, metodo, args });
        return consulta;
      };
    }
    consulta.single = () => Promise.resolve(completar(resultado));
    consulta.maybeSingle = () => Promise.resolve(completar(resultado));
    consulta.then = (
      aoResolver?: (valor: unknown) => unknown,
      aoRejeitar?: (motivo: unknown) => unknown
    ) => Promise.resolve(completar(resultado)).then(aoResolver, aoRejeitar);
    return consulta;
    /* eslint-enable @typescript-eslint/no-explicit-any */
  }

  return {
    chamadas,
    from: vi.fn((tabela: string) => {
      const fila = filasTabelas.get(tabela);
      const resultado =
        fila && fila.length > 0
          ? fila.shift()!
          : { error: { message: `tabela não configurada no teste: ${tabela}` } };
      return criarConsulta(tabela, resultado);
    }),
    rpc: vi.fn((nome: string) => {
      const resultado =
        filaRpc.length > 0
          ? filaRpc.shift()!
          : { error: { message: `rpc não configurada no teste: ${nome}` } };
      return Promise.resolve(completar(resultado));
    }),
  };
}
