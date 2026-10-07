import { lerBiografiaPublica, lerEventoPublico } from "./registros-publicos";

/** Usa a mesma projeção pública dos detalhes, inclusive a revisão humana da justiça. */
export async function copiarRegistroPublico(origem: string, identificador: string) {
  if (origem === "biografia") return lerBiografiaPublica(identificador);
  if (origem === "evento") return lerEventoPublico(identificador);
  return null;
}
