import fs from "node:fs/promises";
import process from "node:process";

const arquivoEntrada =
  process.env.AVALIACAO_CONTINUIDADE_ENTRADA ??
  "docs/avaliacao/casos-continuidade-fontes-2026-09-14.json";
const arquivoSaida =
  process.env.AVALIACAO_CONTINUIDADE_SAIDA ??
  "docs/avaliacao/resultados-continuidade.json";
const endpoint =
  process.env.AVALIACAO_CHAT_URL ?? "http://127.0.0.1:3000/api/chat";
const modoSimulado = process.env.AVALIACAO_CONTINUIDADE_DRY_RUN === "sim";

function omitirContatosPessoais(texto) {
  return texto
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[contato pessoal omitido]")
    .replace(
      /(?:\+?55\s*)?\(?\d{2}\)?\s*(?:9[\s.-]?)?\d{4}[\s.-]\d{4}\b/g,
      "[contato pessoal omitido]",
    );
}

function omitirContatosNoCorpo(valor) {
  if (typeof valor === "string") return omitirContatosPessoais(valor);
  if (Array.isArray(valor)) return valor.map(omitirContatosNoCorpo);
  if (valor && typeof valor === "object") {
    return Object.fromEntries(
      Object.entries(valor)
        .filter(([chave]) => chave !== "token_continuidade")
        .map(([chave, item]) => [chave, omitirContatosNoCorpo(item)]),
    );
  }
  return valor;
}

async function chamar(corpo) {
  const inicio = performance.now();
  try {
    const resposta = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(corpo),
    });
    const bruto = await resposta.json();
    return {
      http_status: resposta.status,
      corpo: omitirContatosNoCorpo(bruto),
      token_continuidade: typeof bruto.token_continuidade === "string"
        ? bruto.token_continuidade
        : null,
      duracao_ms: Math.round(performance.now() - inicio),
      erro_transporte: null,
    };
  } catch (erro) {
    return {
      http_status: null,
      corpo: null,
      token_continuidade: null,
      duracao_ms: Math.round(performance.now() - inicio),
      erro_transporte: erro instanceof Error ? erro.message : String(erro),
    };
  }
}

const plano = JSON.parse(await fs.readFile(arquivoEntrada, "utf8"));
if (plano.status !== "aprovado_editorialmente_para_desenvolvimento") {
  throw new Error(`Execução bloqueada: lote com status '${plano.status}'.`);
}
if (!Array.isArray(plano.casos) || plano.casos.length === 0) {
  throw new Error("Execução bloqueada: nenhum caso de continuidade encontrado.");
}

const chamadasPrevistas = plano.casos.length * 3;
if (modoSimulado) {
  console.log(JSON.stringify({
    modo: "simulado",
    casos: plano.casos.length,
    chamadas_previstas: chamadasPrevistas,
    desenho: "primeiro turno + seguimento sem token + mesmo seguimento com token",
    gravara_resultado: false,
  }));
  process.exit(0);
}

if (process.env.AVALIACAO_CONTINUIDADE_AUTORIZADA !== "sim") {
  throw new Error(
    `Execução bloqueada: ${chamadasPrevistas} chamadas previstas. Defina ` +
    "AVALIACAO_CONTINUIDADE_AUTORIZADA=sim após autorização explícita da rodada.",
  );
}

const resultados = [];
for (const [indice, caso] of plano.casos.entries()) {
  console.log(`[${indice + 1}/${plano.casos.length}] ${caso.id}`);
  const perguntaInicial = caso.roteiro_inicial_hipotetico?.pergunta;
  if (typeof perguntaInicial !== "string" || typeof caso.seguimento !== "string") {
    throw new Error(`Caso ${caso.id} sem roteiro inicial ou seguimento válido.`);
  }

  const inicial = await chamar({ mensagem: perguntaInicial, historico: [] });
  const respostaInicial = inicial.corpo?.resposta;
  const historico = typeof respostaInicial === "string"
    ? [
        { papel: "usuario", conteudo: perguntaInicial },
        { papel: "assistente", conteudo: respostaInicial },
      ]
    : null;

  let semContinuidade = null;
  let comContinuidade = null;
  let motivoBloqueio = null;
  if (!historico) {
    motivoBloqueio = "primeiro_turno_sem_resposta_utilizavel";
  } else if (!inicial.token_continuidade) {
    motivoBloqueio = "primeiro_turno_sem_token_ou_citacoes";
  } else {
    semContinuidade = await chamar({ mensagem: caso.seguimento, historico });
    comContinuidade = await chamar({
      mensagem: caso.seguimento,
      historico,
      continuidade: { token: inicial.token_continuidade },
    });
  }

  resultados.push({
    id: caso.id,
    classe: caso.classe,
    pergunta_inicial: perguntaInicial,
    seguimento: caso.seguimento,
    token_inicial_emitido: Boolean(inicial.token_continuidade),
    primeiro_turno: {
      http_status: inicial.http_status,
      corpo: inicial.corpo,
      duracao_ms: inicial.duracao_ms,
      erro_transporte: inicial.erro_transporte,
    },
    seguimento_sem_continuidade: semContinuidade && {
      http_status: semContinuidade.http_status,
      corpo: semContinuidade.corpo,
      duracao_ms: semContinuidade.duracao_ms,
      erro_transporte: semContinuidade.erro_transporte,
    },
    seguimento_com_continuidade: comContinuidade && {
      http_status: comContinuidade.http_status,
      corpo: comContinuidade.corpo,
      duracao_ms: comContinuidade.duracao_ms,
      erro_transporte: comContinuidade.erro_transporte,
    },
    motivo_bloqueio_seguimentos: motivoBloqueio,
  });
}

const artefato = {
  executado_em: new Date().toISOString(),
  endpoint,
  entrada: arquivoEntrada,
  chamadas_previstas: chamadasPrevistas,
  observacao:
    "Comparação pareada para revisão humana; tokens não são persistidos e presença de citação não comprova sustentação.",
  resultados,
};

await fs.writeFile(arquivoSaida, `${JSON.stringify(artefato, null, 2)}\n`);
console.log(`Coleta gravada em ${arquivoSaida}.`);
