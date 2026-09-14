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

const maximoFontes = Number(process.env.AVALIACAO_DECOMPOSICAO_FONTES ?? "13");
const quantidadePorFonte = Number(process.env.AVALIACAO_DECOMPOSICAO_QTD ?? "12");
const fontesPorConsulta = Number(process.env.AVALIACAO_DECOMPOSICAO_LOTE ?? "1");
const arquivoSaida =
  process.env.AVALIACAO_DECOMPOSICAO_SAIDA ??
  "docs/avaliacao/resultados-decomposicao-curada.json";

const supabase = createClient(url, chave, { auth: { persistSession: false } });
const diagnostico = JSON.parse(
  await fs.readFile("docs/avaliacao/resultados-diagnostico-50.json", "utf8"),
);
const auditoria = JSON.parse(
  await fs.readFile(
    "docs/avaliacao/diagnostico-evidencias-fora-top50.json",
    "utf8",
  ),
);
const plano = JSON.parse(
  await fs.readFile(
    "docs/avaliacao/consultas-decomposicao-desenvolvimento.json",
    "utf8",
  ),
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

function fontesDistintas(resultados, limite) {
  const fontes = [];
  for (const resultado of resultados) {
    if (!fontes.includes(resultado.fonte_id)) fontes.push(resultado.fonte_id);
    if (fontes.length >= limite) break;
  }
  return fontes;
}

async function buscarTextual(consulta, fontes) {
  const candidatos = [];
  for (let inicio = 0; inicio < fontes.length; inicio += fontesPorConsulta) {
    const lote = fontes.slice(inicio, inicio + fontesPorConsulta);
    const { data, error } = await supabase.rpc(
      "buscar_chunks_textuais_por_fontes",
      {
        consulta_texto: consulta,
        fontes_candidatas: lote,
        qtd_por_fonte: quantidadePorFonte,
      },
    );
    if (error) throw error;
    candidatos.push(
      ...(data ?? []).map((chunk) => ({
        ...chunk,
        posicao_fonte: inicio + Number(chunk.posicao_fonte),
      })),
    );
  }
  return candidatos;
}

const gruposPorPergunta = new Map();
for (const grupo of auditoria.resultados) {
  const grupos = gruposPorPergunta.get(grupo.pergunta_id) ?? [];
  grupos.push(grupo);
  gruposPorPergunta.set(grupo.pergunta_id, grupos);
}

let extrairEmbedding;
const resultados = [];
let recuperadasNaDecomposicao = 0;

for (const item of diagnostico.resultados) {
  const configuracao = plano.itens[item.id];
  const gruposAusentes = gruposPorPergunta.get(item.id) ?? [];
  let fontes = fontesDistintas(item.resultados, maximoFontes);
  const candidatosTextuais = [];

  if (configuracao?.fontes_adicionais) {
    extrairEmbedding ??= await pipeline(
      "feature-extraction",
      "Xenova/multilingual-e5-small",
    );
    const vetor = await extrairEmbedding(
      `query: ${configuracao.consulta_roteamento}`,
      { pooling: "mean", normalize: true },
    );
    const { data, error } = await supabase.rpc("buscar_chunks", {
      consulta_embedding: Array.from(vetor.data),
      limiar: 0,
      qtd: 50,
    });
    if (error) throw new Error(`${item.id}: ${error.message}`);
    const adicionais = fontesDistintas(data ?? [], configuracao.fontes_adicionais);
    fontes = [...new Set([...fontes, ...adicionais])];
  }

  for (const [indice, consulta] of (configuracao?.consultas ?? []).entries()) {
    const encontrados = await buscarTextual(consulta, fontes);
    candidatosTextuais.push(
      ...encontrados.map((chunk) => ({
        ...chunk,
        consulta_indice: indice + 1,
      })),
    );
  }

  const evidencias = item.evidencias.map((evidencia) => {
    if (evidencia.encontrado) {
      return {
        rotulo: evidencia.rotulo,
        encontrada: true,
        etapa: "vetorial_top_50",
        posicao: evidencia.posicao,
      };
    }
    const grupo = gruposAusentes.find(
      (candidato) => candidato.rotulo === evidencia.rotulo,
    );
    if (!grupo) throw new Error(`${item.id}: evidência ${evidencia.rotulo} sem mapa`);
    const candidato = candidatosTextuais.find(
      (chunk) =>
        chunk.fonte_id === grupo.fonte_id &&
        contemPagina(chunk.paginas, grupo.paginas_esperadas),
    );
    const encontrada = Boolean(candidato);
    recuperadasNaDecomposicao += Number(encontrada);
    return {
      rotulo: evidencia.rotulo,
      encontrada,
      etapa: encontrada ? "decomposicao_curada" : null,
      consulta_indice: candidato?.consulta_indice ?? null,
      posicao_na_fonte: candidato?.posicao_na_fonte ?? null,
      posicao_fonte: candidato?.posicao_fonte ?? null,
      fonte_foi_roteada: fontes.includes(grupo.fonte_id),
    };
  });

  const ids = new Set([
    ...item.resultados.map((chunk) => chunk.chunk_id),
    ...candidatosTextuais.map((chunk) => chunk.chunk_id),
  ]);
  resultados.push({
    id: item.id,
    fontes_candidatas: fontes.length,
    consultas: configuracao?.consultas.length ?? 0,
    candidatos_unicos: ids.size,
    evidencias,
  });
  console.log(
    `${item.id}: ${evidencias.filter((evidencia) => evidencia.encontrada).length}/${evidencias.length}; ${ids.size} candidatos`,
  );
}

const totalEvidencias = resultados.reduce(
  (total, item) => total + item.evidencias.length,
  0,
);
const totalEncontradas = resultados.reduce(
  (total, item) =>
    total + item.evidencias.filter((evidencia) => evidencia.encontrada).length,
  0,
);
const candidatosDificeis = resultados
  .filter((item) => item.consultas > 0)
  .map((item) => item.candidatos_unicos);
const resumo = {
  executado_em: new Date().toISOString(),
  tipo: plano.estado,
  ressalva: plano.ressalva,
  maximo_fontes_originais: maximoFontes,
  quantidade_por_fonte_e_consulta: quantidadePorFonte,
  fontes_por_consulta: fontesPorConsulta,
  unidades_evidencia: totalEvidencias,
  recuperadas_na_decomposicao: recuperadasNaDecomposicao,
  unidades_encontradas_no_conjunto_candidato: totalEncontradas,
  recall_do_conjunto_candidato: totalEncontradas / totalEvidencias,
  maior_conjunto_candidato: Math.max(...candidatosDificeis),
  media_candidatos_perguntas_dificeis:
    candidatosDificeis.reduce((total, valor) => total + valor, 0) /
    candidatosDificeis.length,
};

await fs.writeFile(
  arquivoSaida,
  `${JSON.stringify({ resumo, resultados }, null, 2)}\n`,
);
console.log(JSON.stringify(resumo, null, 2));
