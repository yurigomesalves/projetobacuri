import fs from "node:fs/promises";
import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { pipeline } from "@huggingface/transformers";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !chave) throw new Error("Credenciais do Supabase ausentes.");

const supabase = createClient(url, chave, { auth: { persistSession: false } });
const limiteRanking = Number(process.env.AUDITORIA_LIMITE ?? "500");
const ouro = JSON.parse(await fs.readFile("docs/avaliacao/perguntas-ouro.json", "utf8"));
const perguntas = new Map(ouro.itens.map((item) => [item.id, item.pergunta]));

const fontes = {
  cnv1: "cc230d2d-c6b6-42bf-8c94-ef2d92194990",
  cnv2: "d67febc5-8530-4961-8c71-5f2370aa390c",
  ismene: "83d25f19-2185-40e7-a3bf-896e4cf50180",
  camponesa: "49b2ea23-2a1f-4c66-8716-02d6419e8381",
  cevsp1: "68df5bef-3256-4d3c-ab48-bea0a2703652",
};

const alvos = [
  { pergunta_id: "P14", rotulo: "C47-50", fonte_id: fontes.ismene, paginas: [47, 48, 49, 50] },
  { pergunta_id: "P14", rotulo: "D94", fonte_id: fontes.camponesa, paginas: [94] },
  { pergunta_id: "P15", rotulo: "E350", fonte_id: fontes.cnv1, paginas: [350] },
  { pergunta_id: "P16", rotulo: "F204", fonte_id: fontes.cnv2, paginas: [204] },
  { pergunta_id: "P17", rotulo: "F395", fonte_id: fontes.cnv2, paginas: [395] },
  { pergunta_id: "P18", rotulo: "F314", fonte_id: fontes.cnv2, paginas: [314] },
  { pergunta_id: "P18", rotulo: "G3", fonte_id: fontes.cevsp1, paginas: [3] },
  { pergunta_id: "P23", rotulo: "F9", fonte_id: fontes.cnv2, paginas: [9] },
  { pergunta_id: "P23", rotulo: "D94", fonte_id: fontes.camponesa, paginas: [94] },
  { pergunta_id: "P23", rotulo: "F204/206", fonte_id: fontes.cnv2, paginas: [204, 206] },
];

function contemPagina(valor, esperadas) {
  const texto = String(valor ?? "");
  const intervalos = [...texto.matchAll(/(\d+)\s*[-–—]\s*(\d+)/g)]
    .map((m) => [Number(m[1]), Number(m[2])]);
  const numeros = [...texto.matchAll(/\d+/g)].map((m) => Number(m[0]));
  return esperadas.some((pagina) =>
    numeros.includes(pagina) || intervalos.some(([a, b]) => pagina >= a && pagina <= b)
  );
}

const chunksPorFonte = new Map();
for (const fonteId of new Set(alvos.map((alvo) => alvo.fonte_id))) {
  const { data, error } = await supabase
    .from("chunks")
    .select("chunk_id, fonte_id, ordem, paginas, secao, subsecao, tipo_chunk, conteudo, embedding")
    .eq("fonte_id", fonteId)
    .order("ordem");
  if (error) throw new Error(`Fonte ${fonteId}: ${error.message}`);
  chunksPorFonte.set(fonteId, data ?? []);
}

console.log("Carregando Xenova/multilingual-e5-small...");
const extrair = await pipeline("feature-extraction", "Xenova/multilingual-e5-small");
const rankings = new Map();
const vetoresConsulta = new Map();

function lerVetor(valor) {
  if (Array.isArray(valor)) return valor.map(Number);
  if (typeof valor === "string") return JSON.parse(valor);
  throw new Error("Formato de embedding armazenado não reconhecido.");
}

function cosseno(a, b) {
  let produto = 0;
  let normaA = 0;
  let normaB = 0;
  for (let i = 0; i < a.length; i += 1) {
    produto += a[i] * b[i];
    normaA += a[i] * a[i];
    normaB += b[i] * b[i];
  }
  return produto / (Math.sqrt(normaA) * Math.sqrt(normaB));
}

const chunksAlvo = new Map();
for (const alvo of alvos) {
  for (const chunk of chunksPorFonte.get(alvo.fonte_id) ?? []) {
    if (contemPagina(chunk.paginas, alvo.paginas)) chunksAlvo.set(chunk.chunk_id, chunk);
  }
}

const consistencia = new Map();
let conferidos = 0;
for (const chunk of chunksAlvo.values()) {
  const vetorJs = await extrair(`passage: ${chunk.conteudo}`, {
    pooling: "mean",
    normalize: true,
  });
  consistencia.set(
    chunk.chunk_id,
    cosseno(Array.from(vetorJs.data), lerVetor(chunk.embedding))
  );
  conferidos += 1;
  if (conferidos % 10 === 0) console.log(`Conferindo embeddings: ${conferidos}/${chunksAlvo.size}`);
}

for (const perguntaId of new Set(alvos.map((alvo) => alvo.pergunta_id))) {
  const pergunta = perguntas.get(perguntaId);
  if (!pergunta) throw new Error(`Pergunta ${perguntaId} ausente do conjunto-ouro.`);
  console.log(`Buscando ${perguntaId} até a posição ${limiteRanking}...`);
  const vetor = await extrair(`query: ${pergunta}`, { pooling: "mean", normalize: true });
  vetoresConsulta.set(perguntaId, Array.from(vetor.data));
  const { data, error } = await supabase.rpc("buscar_chunks", {
    consulta_embedding: Array.from(vetor.data),
    limiar: 0,
    qtd: limiteRanking,
  });
  if (error) throw new Error(`${perguntaId}: ${error.message}`);
  rankings.set(perguntaId, data ?? []);
}

const resultados = alvos.map((alvo) => {
  const chunks = (chunksPorFonte.get(alvo.fonte_id) ?? [])
    .filter((chunk) => contemPagina(chunk.paginas, alvo.paginas));
  const ranking = rankings.get(alvo.pergunta_id) ?? [];
  const vetorConsulta = vetoresConsulta.get(alvo.pergunta_id);
  const posicoes = chunks.map((chunk) => {
    const indice = ranking.findIndex((item) => item.chunk_id === chunk.chunk_id);
    return {
      chunk_id: chunk.chunk_id,
      posicao: indice >= 0 ? indice + 1 : null,
      similaridade: indice >= 0 ? Number(ranking[indice].similaridade) : null,
      similaridade_direta: cosseno(vetorConsulta, lerVetor(chunk.embedding)),
    };
  });
  const encontradas = posicoes.filter((item) => item.posicao !== null);
  return {
    pergunta_id: alvo.pergunta_id,
    pergunta: perguntas.get(alvo.pergunta_id),
    rotulo: alvo.rotulo,
    fonte_id: alvo.fonte_id,
    paginas_esperadas: alvo.paginas,
    chunks_indexados: chunks.length,
    melhor_posicao: encontradas.length
      ? Math.min(...encontradas.map((item) => item.posicao))
      : null,
    maior_similaridade_alvo: Math.max(...posicoes.map((item) => item.similaridade_direta)),
    similaridade_corte_500: ranking.length ? Number(ranking.at(-1).similaridade) : null,
    chunks: chunks.map((chunk) => ({
      ...chunk,
      embedding: undefined,
      cosseno_python_javascript: consistencia.get(chunk.chunk_id),
      ranking: posicoes.find((item) => item.chunk_id === chunk.chunk_id),
    })),
  };
});

const saida = {
  executado_em: new Date().toISOString(),
  modelo: "Xenova/multilingual-e5-small",
  prefixo: "query: ",
  limite_ranking: limiteRanking,
  consistencia_embeddings: {
    chunks_conferidos: consistencia.size,
    menor_cosseno: Math.min(...consistencia.values()),
    media_cosseno: [...consistencia.values()].reduce((a, b) => a + b, 0) / consistencia.size,
    maior_cosseno: Math.max(...consistencia.values()),
  },
  resultados,
};

await fs.writeFile(
  "docs/avaliacao/diagnostico-evidencias-fora-top50.json",
  JSON.stringify(saida, null, 2) + "\n"
);

console.log("\nResumo:");
for (const item of resultados) {
  console.log(
    `${item.pergunta_id} ${item.rotulo}: ${item.chunks_indexados} chunks; ` +
    `melhor posição ${item.melhor_posicao ?? `>${limiteRanking}`}`
  );
}
