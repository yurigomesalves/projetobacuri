// Embedding da consulta, gerado no próprio servidor Next.js (ADR-007:
// a Edge Function do free tier do Supabase não comporta o modelo).
//
// Usa o MESMO modelo da indexação (pipeline/04_indexar.py) para que a
// consulta caia no mesmo espaço vetorial dos chunks indexados — modelos
// diferentes produzem espaços incompatíveis e a busca degrada em silêncio.
import { env, pipeline } from "@huggingface/transformers";

const MODELO = "Xenova/multilingual-e5-small";

// Na Vercel o sistema de arquivos é somente leitura, exceto /tmp:
// o cache do modelo precisa apontar para lá.
if (process.env.VERCEL) {
  env.cacheDir = "/tmp/transformers-cache";
}

// Carregamento único por instância do servidor (a primeira requisição
// após ociosidade baixa/carrega o modelo; as seguintes reaproveitam).
let carregamento: ReturnType<typeof criarPipeline> | null = null;

function criarPipeline() {
  return pipeline("feature-extraction", MODELO);
}

export async function gerarEmbeddingConsulta(texto: string): Promise<number[]> {
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
