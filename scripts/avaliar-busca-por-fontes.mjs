import fs from "node:fs/promises";
import process from "node:process";
import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !chave) throw new Error("Credenciais do Supabase ausentes.");

const quantidade = Number(process.env.AVALIACAO_FONTES_QTD ?? "100");
const arquivoSaida =
  process.env.AVALIACAO_FONTES_SAIDA ??
  "docs/avaliacao/resultados-busca-textual-por-fontes.json";
const supabase = createClient(url, chave, { auth: { persistSession: false } });
const perguntas = JSON.parse(
  await fs.readFile("docs/avaliacao/perguntas-ouro.json", "utf8"),
);
const auditoria = JSON.parse(
  await fs.readFile(
    "docs/avaliacao/diagnostico-evidencias-fora-top50.json",
    "utf8",
  ),
);
const perguntasPorId = new Map(
  perguntas.itens.map((item) => [item.id, item.pergunta]),
);

function contemPagina(valor, esperadas) {
  const texto = String(valor ?? "");
  const intervalos = [...texto.matchAll(/(\d+)\s*[-–—]\s*(\d+)/g)].map(
    (resultado) => [Number(resultado[1]), Number(resultado[2])],
  );
  const numeros = [...texto.matchAll(/\d+/g)].map((resultado) =>
    Number(resultado[0]),
  );
  return esperadas.some(
    (pagina) =>
      numeros.includes(pagina) ||
      intervalos.some(([inicio, fim]) => pagina >= inicio && pagina <= fim),
  );
}

const resultados = [];
for (const grupo of auditoria.resultados) {
  const pergunta = perguntasPorId.get(grupo.pergunta_id);
  const { data, error } = await supabase.rpc(
    "buscar_chunks_textuais_por_fontes",
    {
      consulta_texto: pergunta,
      fontes_candidatas: [grupo.fonte_id],
      qtd_por_fonte: quantidade,
    },
  );
  if (error) throw new Error(`${grupo.pergunta_id}: ${error.message}`);
  const indice = (data ?? []).findIndex((chunk) =>
    contemPagina(chunk.paginas, grupo.paginas_esperadas),
  );
  const posicao = indice >= 0 ? indice + 1 : null;
  resultados.push({
    pergunta_id: grupo.pergunta_id,
    rotulo: grupo.rotulo,
    fonte_id: grupo.fonte_id,
    paginas_esperadas: grupo.paginas_esperadas,
    posicao,
    encontrado_top_50: posicao !== null && posicao <= 50,
    encontrado_top_100: posicao !== null && posicao <= 100,
    quantidade_retornada: data?.length ?? 0,
  });
  console.log(
    `${grupo.pergunta_id} ${grupo.rotulo}: ${posicao ?? `fora do top ${quantidade}`}`,
  );
}

const resumo = {
  executado_em: new Date().toISOString(),
  estrategia: "fonte_oraculo_e_busca_textual_postgresql",
  observacao:
    "A fonte correta é fornecida ao experimento; isto não mede o roteamento de fontes.",
  quantidade_por_fonte: quantidade,
  unidades_evidencia: resultados.length,
  encontradas_top_50: resultados.filter((item) => item.encontrado_top_50).length,
  recall_candidato_50:
    resultados.filter((item) => item.encontrado_top_50).length /
    resultados.length,
  encontradas_top_100: resultados.filter((item) => item.encontrado_top_100)
    .length,
  recall_candidato_100:
    resultados.filter((item) => item.encontrado_top_100).length /
    resultados.length,
};

await fs.writeFile(
  arquivoSaida,
  `${JSON.stringify({ resumo, resultados }, null, 2)}\n`,
);
console.log(JSON.stringify(resumo, null, 2));
