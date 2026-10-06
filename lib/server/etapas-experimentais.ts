// Etapas pagas opcionais. Permanecem desligadas até autorização explícita no
// ambiente; falhas devolvem null para que o chamador use o caminho determinístico.
import { gerarRespostaDetalhada } from "@/lib/server/llm";
import type { Citacao } from "@/lib/shared/tipos";

const AUTORIZADA = () => process.env.RAG_ETAPAS_PAGAS_AUTORIZADAS === "sim";
const ativa = (nome: "RAG_DECOMPOR_CONSULTA" | "RAG_RERANQUEAR_LLM" | "RAG_VERIFICAR_RESPOSTA") =>
  AUTORIZADA() && process.env[nome] === "1";

function extrairJson(texto: string): unknown | null {
  try { return JSON.parse(texto); } catch {
    const bloco = texto.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
    try { return bloco ? JSON.parse(bloco) : null; } catch { return null; }
  }
}

function timeoutRestante(inicio: number): number | null {
  const restante = 20_000 - (Date.now() - inicio);
  return restante >= 500 ? restante : null;
}

export async function decomporConsultaExperimental(pergunta: string, inicio: number, signal?: AbortSignal): Promise<string[] | null> {
  if (!ativa("RAG_DECOMPOR_CONSULTA")) return null;
  const timeoutMs = timeoutRestante(inicio);
  if (!timeoutMs) return null;
  try {
    const resultado = await gerarRespostaDetalhada([
      { role: "system", content: "Decomponha a pergunta histórica em no máximo duas subconsultas de busca. Não invente nomes, datas ou documentos. Responda somente JSON: {\"consultas\":[\"...\"]}." },
      { role: "user", content: pergunta },
    ], { maxTokens: 160, timeoutMs, tentativas: 1, signal });
    const valor = extrairJson(resultado.texto) as { consultas?: unknown } | null;
    const consultas = Array.isArray(valor?.consultas) ? valor.consultas : [];
    const validas = consultas.filter((consulta): consulta is string => typeof consulta === "string" && consulta.trim().length >= 3 && consulta.length <= 1000)
      .map((consulta) => consulta.trim());
    return validas.length ? [...new Set([pergunta, ...validas])].slice(0, 3) : null;
  } catch { return null; }
}

export async function reranquearIdsExperimental(
  pergunta: string, candidatos: Array<{ chunk_id: string; conteudo: string }>, inicio: number, signal?: AbortSignal,
): Promise<string[] | null> {
  if (!ativa("RAG_RERANQUEAR_LLM") || !candidatos.length) return null;
  const timeoutMs = timeoutRestante(inicio);
  if (!timeoutMs) return null;
  const permitidos = new Set(candidatos.map((candidato) => candidato.chunk_id));
  const contexto = candidatos.map((candidato) =>
    `ID: ${candidato.chunk_id}\nTRECHO: ${candidato.conteudo.slice(0, 550)}`,
  ).join("\n\n");
  try {
    const resultado = await gerarRespostaDetalhada([
      { role: "system", content: "Ordene somente os IDs dos trechos que sustentam melhor a pergunta. Não invente IDs. Responda somente JSON: {\"ordem\":[\"id\"]}." },
      { role: "user", content: `Pergunta: ${pergunta}\n\nCandidatos:\n${contexto}` },
    ], { maxTokens: 256, timeoutMs, tentativas: 1, signal });
    const valor = extrairJson(resultado.texto) as { ordem?: unknown } | null;
    if (!Array.isArray(valor?.ordem)) return null;
    const ordem = valor.ordem.filter((id): id is string => typeof id === "string" && permitidos.has(id));
    return ordem.length ? [...new Set(ordem)] : null;
  } catch { return null; }
}

export async function respostaSustentadaExperimental(
  pergunta: string, resposta: string, citacoes: Citacao[], inicio: number, signal?: AbortSignal, resumo = "",
): Promise<boolean | null> {
  if (!ativa("RAG_VERIFICAR_RESPOSTA")) return null;
  const timeoutMs = timeoutRestante(inicio);
  if (!timeoutMs) return null;
  const evidencias = citacoes.map((citacao) => `[${citacao.n}] ${citacao.trecho}`).join("\n");
  try {
    const resultado = await gerarRespostaDetalhada([
      { role: "system", content: "Verifique se todas as afirmações do resumo e da resposta completa são sustentadas exclusivamente pelos trechos. Se qualquer uma das partes for insuficiente ou contradita, reprove o conjunto. Responda somente JSON: {\"veredito\":\"sustentada\"|\"insuficiente\"|\"contradita\"}." },
      { role: "user", content: `Pergunta: ${pergunta}\nResumo: ${resumo}\nResposta completa: ${resposta}\nTrechos:\n${evidencias}` },
    ], { maxTokens: 64, timeoutMs, tentativas: 1, signal });
    const valor = extrairJson(resultado.texto) as { veredito?: unknown } | null;
    if (valor?.veredito === "sustentada") return true;
    if (valor?.veredito === "insuficiente" || valor?.veredito === "contradita") return false;
    return null;
  } catch { return null; }
}
