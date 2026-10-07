// Embedding da consulta, gerado no próprio servidor Next.js (ADR-007:
// a Edge Function do free tier do Supabase não comporta o modelo).
//
// Usa o MESMO modelo da indexação (pipeline/04_indexar.py) para que a
// consulta caia no mesmo espaço vetorial dos chunks indexados — modelos
// diferentes produzem espaços incompatíveis e a busca degrada em silêncio.
import { env, pipeline } from "@huggingface/transformers";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const MODELO = "Xenova/multilingual-e5-small";
const REVISAO = "761b726dd34fb83930e26aab4e9ac3899aa1fa78";
const PASTA_LOCAL = resolve(".cache/modelos", MODELO);

// Na Vercel o sistema de arquivos é somente leitura, exceto /tmp:
// o cache do modelo precisa apontar para lá.
if (process.env.VERCEL) {
  env.cacheDir = "/tmp/transformers-cache";
}

// Carregamento único por instância do servidor (a primeira requisição
// após ociosidade baixa/carrega o modelo; as seguintes reaproveitam).
let carregamento: ReturnType<typeof criarPipeline> | null = null;

// Cache curto por instância: evita recalcular a mesma pergunta em reenvios e
// avaliações pareadas. Não é persistido, não contém identidade e perde-se no
// reinício da função. O tamanho limita a memória nas instâncias da Vercel.
const CACHE_MAXIMO = 256;
const CACHE_TTL_MS = 15 * 60 * 1000;
const cacheConsultas = new Map<string, { expiraEm: number; embedding: number[] }>();
const emAndamento = new Map<string, Promise<number[]>>();

function criarPipeline() {
  const local = existsSync(resolve(PASTA_LOCAL, "onnx/model.onnx"));
  if (process.env.VERCEL && !local) {
    throw new Error("Modelo de embedding ausente no pacote do deploy");
  }
  return pipeline("feature-extraction", local ? PASTA_LOCAL : MODELO, {
    revision: REVISAO,
    local_files_only: local,
    device: "cpu",
    dtype: "fp32",
  });
}

export async function gerarEmbeddingConsulta(texto: string): Promise<number[]> {
  const chave = texto.normalize("NFC").trim();
  const agora = Date.now();
  const emCache = cacheConsultas.get(chave);
  if (emCache && emCache.expiraEm > agora) return emCache.embedding;
  if (emCache) cacheConsultas.delete(chave);
  const pendente = emAndamento.get(chave);
  if (pendente) return pendente;

  const calculo = gerarEmbeddingSemCache(chave);
  emAndamento.set(chave, calculo);
  try {
    const embedding = await calculo;
    while (cacheConsultas.size >= CACHE_MAXIMO) {
      const maisAntiga = cacheConsultas.keys().next().value;
      if (maisAntiga === undefined) break;
      cacheConsultas.delete(maisAntiga);
    }
    cacheConsultas.set(chave, { expiraEm: agora + CACHE_TTL_MS, embedding });
    return embedding;
  } finally {
    emAndamento.delete(chave);
  }
}

async function gerarEmbeddingSemCache(texto: string): Promise<number[]> {
  carregamento ??= criarPipeline();
  let extrair: Awaited<ReturnType<typeof criarPipeline>>;
  try {
    extrair = await carregamento;
  } catch (erro) {
    // Falha no download/carga do modelo (ex.: rede): descarta a promessa
    // para que a próxima requisição tente de novo, em vez de falhar sempre.
    carregamento = null;
    throw erro;
  }

  // CRÍTICO: o modelo e5 exige prefixos diferentes para consulta e para
  // os textos indexados. A indexação usa "passage: "; a consulta usa
  // "query: ". Sem o prefixo, a similaridade cai sem nenhum erro visível.
  const saida = await extrair(`query: ${texto}`, {
    pooling: "mean",
    normalize: true,
  });

  return Array.from(saida.data as Float32Array);
}

/** Indexação editorial no mesmo espaço do acervo, com o prefixo de passagem. */
export async function gerarEmbeddingPassagem(texto: string): Promise<number[]> {
  carregamento ??= criarPipeline();
  try {
    const extrair = await carregamento;
    const saida = await extrair(`passage: ${texto}`, { pooling: "mean", normalize: true });
    return Array.from(saida.data as Float32Array);
  } catch (error) { carregamento = null; throw error; }
}
