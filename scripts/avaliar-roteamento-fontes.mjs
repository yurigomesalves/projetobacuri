import fs from "node:fs/promises";
import process from "node:process";
import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !chave) throw new Error("Credenciais do Supabase ausentes.");

const maximoFontes = Number(process.env.AVALIACAO_ROTEAMENTO_FONTES ?? "13");
const quantidadePorFonte = Number(
  process.env.AVALIACAO_ROTEAMENTO_QTD ?? "60",
);
const fontesPorConsulta = Number(
  process.env.AVALIACAO_ROTEAMENTO_LOTE ?? "3",
);
const arquivoSaida =
  process.env.AVALIACAO_ROTEAMENTO_SAIDA ??
  "docs/avaliacao/resultados-roteamento-fontes-13x60.json";

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

const gruposPorPergunta = new Map();
for (const grupo of auditoria.resultados) {
  const grupos = gruposPorPergunta.get(grupo.pergunta_id) ?? [];
  grupos.push(grupo);
  gruposPorPergunta.set(grupo.pergunta_id, grupos);
}

const resultados = [];
let recuperadasNaSegundaEtapa = 0;
const paresEsperados = new Set();
const paresRoteados = new Set();

for (const item of diagnostico.resultados) {
  const fontesCandidatas = [];
  for (const trecho of item.resultados) {
    if (!fontesCandidatas.includes(trecho.fonte_id)) {
      fontesCandidatas.push(trecho.fonte_id);
    }
    if (fontesCandidatas.length >= maximoFontes) break;
  }

  const gruposAusentes = gruposPorPergunta.get(item.id) ?? [];
  for (const grupo of gruposAusentes) {
    const chavePar = `${item.id}:${grupo.fonte_id}`;
    paresEsperados.add(chavePar);
    if (fontesCandidatas.includes(grupo.fonte_id)) paresRoteados.add(chavePar);
  }

  let candidatosTextuais = [];
  if (gruposAusentes.length > 0) {
    for (
      let inicio = 0;
      inicio < fontesCandidatas.length;
      inicio += fontesPorConsulta
    ) {
      const lote = fontesCandidatas.slice(inicio, inicio + fontesPorConsulta);
      const { data, error } = await supabase.rpc(
        "buscar_chunks_textuais_por_fontes",
        {
          consulta_texto: item.pergunta,
          fontes_candidatas: lote,
          qtd_por_fonte: quantidadePorFonte,
        },
      );
      if (error) throw new Error(`${item.id}: ${error.message}`);
      candidatosTextuais.push(
        ...(data ?? []).map((chunk) => ({
          ...chunk,
          posicao_fonte: inicio + Number(chunk.posicao_fonte),
        })),
      );
    }
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
    recuperadasNaSegundaEtapa += Number(encontrada);
    return {
      rotulo: evidencia.rotulo,
      encontrada,
      etapa: encontrada ? "textual_na_fonte" : null,
      posicao_na_fonte: candidato?.posicao_na_fonte ?? null,
      posicao_fonte: candidato?.posicao_fonte ?? null,
      fonte_foi_roteada: fontesCandidatas.includes(grupo.fonte_id),
    };
  });

  const idsCandidatos = new Set([
    ...item.resultados.map((trecho) => trecho.chunk_id),
    ...candidatosTextuais.map((trecho) => trecho.chunk_id),
  ]);
  resultados.push({
    id: item.id,
    pergunta: item.pergunta,
    fontes_candidatas: fontesCandidatas.length,
    candidatos_unicos: idsCandidatos.size,
    evidencias,
  });
  console.log(
    `${item.id}: ${evidencias.filter((evidencia) => evidencia.encontrada).length}/${evidencias.length}; ${idsCandidatos.size} candidatos`,
  );
}

const totalEvidencias = resultados.reduce(
  (total, item) => total + item.evidencias.length,
  0,
);
const evidenciasEncontradas = resultados.reduce(
  (total, item) =>
    total + item.evidencias.filter((evidencia) => evidencia.encontrada).length,
  0,
);
const candidatosDasPerguntasDificeis = resultados
  .filter((item) => gruposPorPergunta.has(item.id))
  .map((item) => item.candidatos_unicos);
const resumo = {
  executado_em: new Date().toISOString(),
  estrategia: `vetorial_top_50_e_textual_nas_${maximoFontes}_fontes`,
  consulta: "pergunta_original_sem_decomposicao",
  maximo_fontes: maximoFontes,
  quantidade_por_fonte: quantidadePorFonte,
  fontes_por_consulta: fontesPorConsulta,
  unidades_evidencia: totalEvidencias,
  encontradas_no_vetorial_top_50: diagnostico.resumo.unidades_encontradas,
  recuperadas_na_segunda_etapa: recuperadasNaSegundaEtapa,
  unidades_encontradas_no_conjunto_candidato: evidenciasEncontradas,
  recall_do_conjunto_candidato: evidenciasEncontradas / totalEvidencias,
  pares_pergunta_fonte_dificeis: paresEsperados.size,
  pares_com_fonte_roteada: paresRoteados.size,
  maior_conjunto_candidato: Math.max(...candidatosDasPerguntasDificeis),
  media_candidatos_perguntas_dificeis:
    candidatosDasPerguntasDificeis.reduce((total, valor) => total + valor, 0) /
    candidatosDasPerguntasDificeis.length,
  ressalva:
    "Mede cobertura antes da ordenação final; não equivale a recall@8 da resposta pública.",
};

await fs.writeFile(
  arquivoSaida,
  `${JSON.stringify({ resumo, resultados }, null, 2)}\n`,
);
console.log(JSON.stringify(resumo, null, 2));
