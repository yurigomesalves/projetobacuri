import type { Biografia, EventoGeo } from "./tipos";

export type RegistroCompartilhado = { origem: "biografia" | "evento"; identificador: string; conteudo: Biografia | EventoGeo };
export type ConclusaoEditorial = {
  estado_editorial?: "pendente" | "concluida" | "suspensa" | null;
  registro_link?: string; conclusao_justificativa?: string;
  concluida_em?: string; concluida_por?: string | null;
};
export const rotuloOrigem = (origem?: string) => origem === "biografia" ? "Biografia" : origem === "evento" ? "Mapa" : "Chat BACURI";
export const tituloOriginal = (origem?: string) => origem === "biografia" ? "Biografia original" : origem === "evento" ? "Registro original" : "Pergunta e resposta originais";
