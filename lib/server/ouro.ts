import { supabaseServidor } from "./supabase";
import { gerarEmbeddingPassagem } from "./embedding";
import { aguardarNoPrazo } from "./prazo";
import type { TrechoRecuperado } from "./recuperacao";

type Ouro = { ouro_id: string; versao_id: string; titulo: string; texto: string; chunk_ids: string[] };

export async function indexarOuro(versaoId: string) {
  const { data, error } = await supabaseServidor.from("respostas_ouro").select("ouro_id,titulo,texto").eq("versao_id", versaoId).eq("estado", "ativa").maybeSingle();
  if (error || !data) throw new Error("Resposta ouro ativa indisponível para indexação.");
  const embedding = await gerarEmbeddingPassagem(`${data.titulo}\n${data.texto}`);
  const salvo = await supabaseServidor.from("respostas_ouro").update({ embedding }).eq("ouro_id", data.ouro_id).eq("estado", "ativa");
  if (salvo.error) throw new Error("Indexação editorial indisponível.");
}

/** Referência editorial só se TODAS as fontes já estão na evidência recuperada.
 * Não altera o orçamento de fontes nem substitui a recuperação documental.
 */
export async function recuperarOuro(embedding: number[], trechos: TrechoRecuperado[], signal: AbortSignal): Promise<Ouro[]> {
  if (process.env.BACURI_OURO_CHAT_ATIVO !== "true" || signal.aborted) return [];
  const timeout = AbortSignal.timeout(800);
  const combinado = AbortSignal.any([signal, timeout]);
  try {
    const { data, error } = await aguardarNoPrazo(
      supabaseServidor.rpc("buscar_ouro_ativo", { consulta_embedding: embedding, limiar: 0.90, qtd: 2 }).abortSignal(combinado), combinado,
    );
    if (error || !Array.isArray(data)) return [];
    const disponiveis = new Set(trechos.map(t => t.chunk_id));
    return (data as Ouro[]).filter(o => o.chunk_ids.length > 0 && o.chunk_ids.every(id => disponiveis.has(id))).slice(0, 2);
  } catch { return []; }
}
