import fs from "node:fs/promises";
import process from "node:process";

const arquivoEntrada =
  process.env.AVALIACAO_CONVERSA_ENTRADA ??
  "docs/avaliacao/perguntas-conversacionais-candidatas.json";
const arquivoSaida =
  process.env.AVALIACAO_CONVERSA_SAIDA ??
  "docs/avaliacao/resultados-conversacionais.json";
const endpoint =
  process.env.AVALIACAO_CHAT_URL ?? "http://127.0.0.1:3000/api/chat";

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
      Object.entries(valor).map(([chave, item]) => [chave, omitirContatosNoCorpo(item)]),
    );
  }
  return valor;
}

if (process.env.AVALIACAO_CONVERSA_AUTORIZADA !== "sim") {
  throw new Error(
    "Execução bloqueada: defina AVALIACAO_CONVERSA_AUTORIZADA=sim após autorização explícita.",
  );
}

const plano = JSON.parse(await fs.readFile(arquivoEntrada, "utf8"));
if (plano.status !== "aprovado_editorialmente") {
  throw new Error(
    `Execução bloqueada: o lote está com status '${plano.status}', não aprovado_editorialmente.`,
  );
}

const resultados = [];
for (const [indice, item] of plano.itens.entries()) {
  console.log(`[${indice + 1}/${plano.itens.length}] ${item.id}`);
  const inicio = performance.now();
  let resposta;
  try {
    const requisicao = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        mensagem: item.pergunta,
        historico: item.historico,
      }),
    });
    const corpo = omitirContatosNoCorpo(await requisicao.json());
    resposta = {
      http_status: requisicao.status,
      corpo,
      erro_transporte: null,
    };
  } catch (erro) {
    resposta = {
      http_status: null,
      corpo: null,
      erro_transporte: erro instanceof Error ? erro.message : String(erro),
    };
  }
  resultados.push({
    id: item.id,
    tipo: item.tipo,
    pergunta: item.pergunta,
    comportamento_esperado: item.comportamento,
    duracao_ms: Math.round(performance.now() - inicio),
    ...resposta,
  });
}

const artefato = {
  executado_em: new Date().toISOString(),
  endpoint,
  entrada: arquivoEntrada,
  modelo_provedor: "registrado_pelo_servidor_quando_disponivel",
  observacao:
    "Coleta bruta para revisão humana; presença de citação não comprova sustentação.",
  resultados,
};

await fs.writeFile(arquivoSaida, `${JSON.stringify(artefato, null, 2)}\n`);
console.log(`Coleta gravada em ${arquivoSaida}.`);
