import fs from "node:fs/promises";
import process from "node:process";
import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { pipeline } from "@huggingface/transformers";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !chave) throw new Error("Credenciais do Supabase ausentes.");

const supabase = createClient(url, chave, { auth: { persistSession: false } });
const ouro = JSON.parse(await fs.readFile("docs/avaliacao/perguntas-ouro.json", "utf8"));
const limiar = Number(process.env.AVALIACAO_LIMIAR ?? "0.82");
const quantidade = Number(process.env.AVALIACAO_QTD ?? "8");
const estrategia = process.env.AVALIACAO_ESTRATEGIA ?? "vetorial";
if (!new Set(["vetorial", "hibrida"]).has(estrategia)) {
  throw new Error("AVALIACAO_ESTRATEGIA deve ser 'vetorial' ou 'hibrida'.");
}
const arquivoJson = process.env.AVALIACAO_SAIDA ?? "docs/avaliacao/resultados-baseline.json";
const arquivoMarkdown = arquivoJson.replace(/\.json$/, ".md");
const tituloRelatorio = arquivoJson.includes("diagnostico")
  ? "# Diagnóstico ampliado da recuperação vetorial"
  : estrategia === "hibrida"
    ? "# Avaliação da recuperação híbrida"
    : "# Baseline de recuperação vetorial";

const fontes = {
  cnv1: "cc230d2d-c6b6-42bf-8c94-ef2d92194990",
  cnv2: "d67febc5-8530-4961-8c71-5f2370aa390c",
  ismene: "83d25f19-2185-40e7-a3bf-896e4cf50180",
  camponesa: "49b2ea23-2a1f-4c66-8716-02d6419e8381",
  cevsp1: "68df5bef-3256-4d3c-ab48-bea0a2703652",
};

const unidades = {
  P01: [[fontes.cnv1, [68], "A"]], P02: [[fontes.cnv1, [68], "A"]],
  P03: [[fontes.cnv1, [68], "A"]], P04: [[fontes.cnv1, [68], "A"]],
  P05: [[fontes.cnv2, [300], "B"]],
  P06: [[fontes.cnv2, [300], "B"]], P07: [[fontes.cnv2, [300], "B"]],
  P08: [[fontes.cnv2, [300], "B"]], P09: [[fontes.ismene, [2, 3, 18], "C2"]],
  P10: [[fontes.ismene, [6], "C6"]], P11: [[fontes.ismene, [18], "C18"]],
  P12: [[fontes.ismene, [20, 21, 22, 23, 24], "C20-24"]],
  P13: [[fontes.ismene, [39, 40, 41, 42], "C39-42"]],
  P14: [[fontes.ismene, [47, 48, 49, 50], "C47-50"], [fontes.camponesa, [94], "D94"]],
  P15: [[fontes.cnv1, [350], "E350"]],
  P16: [[fontes.cnv2, [204], "F204"], [fontes.cnv2, [206], "F206"]],
  P17: [[fontes.cnv2, [395], "F395"]],
  P18: [[fontes.cnv2, [314], "F314"], [fontes.cevsp1, [3], "G3"]],
  P19: [[fontes.cnv1, [138], "E138"]], P20: [[fontes.cnv1, [100, 101], "E100-101"]],
  P21: [[fontes.ismene, [20, 21, 22, 23, 24], "C20-24"], [fontes.ismene, [128, 129, 130, 131], "C128-131"]],
  P22: [[fontes.ismene, [20, 21, 22, 23, 24], "C20-24"]],
  P23: [[fontes.cnv2, [9], "F9"], [fontes.camponesa, [94], "D94"], [fontes.cnv2, [204, 206], "F204/206"]],
  P24: [[fontes.cnv1, [350], "E350"]],
  P31: [[fontes.ismene, [20, 21, 22, 23, 24], "C20-24"], [fontes.ismene, [39, 40, 41, 42], "C39-42"]],
};

function contemPagina(valor, esperadas) {
  const texto = String(valor ?? "");
  const intervalos = [...texto.matchAll(/(\d+)\s*[-–—]\s*(\d+)/g)]
    .map((m) => [Number(m[1]), Number(m[2])]);
  const numeros = [...texto.matchAll(/\d+/g)].map((m) => Number(m[0]));
  return esperadas.some((pagina) =>
    numeros.includes(pagina) || intervalos.some(([a, b]) => pagina >= a && pagina <= b)
  );
}

console.log("Carregando Xenova/multilingual-e5-small...");
const extrair = await pipeline("feature-extraction", "Xenova/multilingual-e5-small");
const resultados = [];

for (const [indice, item] of ouro.itens.entries()) {
  console.log(`[${indice + 1}/${ouro.itens.length}] ${item.id}`);
  const vetor = await extrair(`query: ${item.pergunta}`, { pooling: "mean", normalize: true });
  const embedding = Array.from(vetor.data);
  const rpc = estrategia === "hibrida" ? "buscar_chunks_hibrida" : "buscar_chunks";
  const parametros = estrategia === "hibrida"
    ? { consulta_texto: item.pergunta, consulta_embedding: embedding, limiar_semantico: limiar, qtd: quantidade }
    : { consulta_embedding: embedding, limiar, qtd: quantidade };
  const { data, error } = await supabase.rpc(rpc, parametros);
  if (error) throw new Error(`${item.id}: ${error.message}`);
  const trechos = data ?? [];
  const avaliacao = (unidades[item.id] ?? []).map(([fonteId, paginas, rotulo]) => {
    const posicao = trechos.findIndex((t) =>
      t.fonte_id === fonteId && contemPagina(t.paginas, paginas)
    );
    return { rotulo, encontrado: posicao >= 0, posicao: posicao >= 0 ? posicao + 1 : null };
  });
  resultados.push({
    id: item.id, pergunta: item.pergunta, quantidade_retornada: trechos.length,
    evidencias: avaliacao,
    resultados: trechos.map((t, i) => ({
      posicao: i + 1, chunk_id: t.chunk_id, fonte_id: t.fonte_id,
      titulo: t.titulo, paginas: t.paginas, secao: t.secao,
      similaridade: Number(t.similaridade),
    })),
  });
}

const totalUnidades = resultados.reduce((n, r) => n + r.evidencias.length, 0);
const unidadesEncontradas = resultados.reduce(
  (n, r) => n + r.evidencias.filter((e) => e.encontrado).length, 0
);
const perguntasComAlgumAcerto = resultados.filter((r) => r.evidencias.some((e) => e.encontrado)).length;
const resumo = {
  executado_em: new Date().toISOString(), estrategia, modelo: "Xenova/multilingual-e5-small",
  prefixo: "query: ", limiar, quantidade,
  perguntas: resultados.length, unidades_evidencia: totalUnidades,
  unidades_encontradas: unidadesEncontradas,
  recall_k: totalUnidades ? unidadesEncontradas / totalUnidades : null,
  perguntas_com_algum_acerto: perguntasComAlgumAcerto,
  taxa_perguntas_com_algum_acerto: perguntasComAlgumAcerto / resultados.length,
};

await fs.writeFile(
  arquivoJson,
  JSON.stringify({ resumo, resultados }, null, 2) + "\n"
);

const linhas = [
  tituloRelatorio, "",
  `Executado em: ${resumo.executado_em}.`, "",
  `Configuração: estratégia \`${resumo.estrategia}\`, \`${resumo.modelo}\`, prefixo \`query:\`, limiar ${resumo.limiar}, até ${resumo.quantidade} resultados.`, "",
  `Recall@${quantidade} por unidade de evidência: **${unidadesEncontradas}/${totalUnidades} (${(100 * resumo.recall_k).toFixed(1)}%)**.`,
  `Perguntas com ao menos uma evidência: **${perguntasComAlgumAcerto}/${resultados.length} (${(100 * resumo.taxa_perguntas_com_algum_acerto).toFixed(1)}%)**.`, "",
  "O mapa de fontes e páginas foi auditado visualmente em 09/09/2026; os resultados anteriores à auditoria não são diretamente comparáveis por usarem 28 unidades de evidência.", "",
  "| ID | Evidências esperadas | Encontradas | Melhor posição |", "|---|---:|---:|---:|",
  ...resultados.map((r) => {
    const achadas = r.evidencias.filter((e) => e.encontrado);
    const melhor = achadas.length ? Math.min(...achadas.map((e) => e.posicao)) : "—";
    return `| ${r.id} | ${r.evidencias.length} | ${achadas.length} | ${melhor} |`;
  }), "",
  `Resultados completos, IDs dos chunks, páginas, fontes e similaridades estão em \`${arquivoJson.split("/").at(-1)}\`.`,
  "Esta medição avalia recuperação por fonte e página; não avalia sustentação da resposta gerada.", "",
];
await fs.writeFile(arquivoMarkdown, linhas.join("\n"));
console.log(JSON.stringify(resumo, null, 2));
