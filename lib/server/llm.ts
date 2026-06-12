// Abstração do provedor de LLM de geração.
//
// Todos os provedores suportados (Groq, OpenRouter, Ollama) expõem uma API
// compatível com o endpoint de chat/completions da OpenAI, então um único
// fetch nativo serve para os três — basta variar baseURL, chave e modelo.
// Provedor escolhido por LLM_PROVIDER (padrão: groq). Modelos de pesos
// abertos por padrão (princípio 4 — software livre).

export type MensagemLLM = {
  role: "system" | "user" | "assistant";
  content: string;
};

type ConfiguracaoProvedor = {
  baseUrl: string;
  chave: string | undefined;
  modeloPadrao: string | undefined;
};

function obterConfiguracao(): ConfiguracaoProvedor {
  const provedor = (process.env.LLM_PROVIDER ?? "groq").toLowerCase();

  switch (provedor) {
    case "groq":
      return {
        baseUrl: "https://api.groq.com/openai/v1/chat/completions",
        chave: process.env.GROQ_API_KEY,
        modeloPadrao: "llama-3.3-70b-versatile",
      };
    case "openrouter":
      return {
        baseUrl: "https://openrouter.ai/api/v1/chat/completions",
        chave: process.env.OPENROUTER_API_KEY,
        // OpenRouter não tem um padrão sensato fixo: exige LLM_MODELO.
        modeloPadrao: undefined,
      };
    case "ollama":
      return {
        baseUrl:
          (process.env.OLLAMA_BASE_URL ?? "http://localhost:11434") +
          "/v1/chat/completions",
        chave: process.env.OLLAMA_API_KEY,
        // Ollama local: o modelo depende do que foi baixado, exige LLM_MODELO.
        modeloPadrao: undefined,
      };
    default:
      throw new Error(`LLM_PROVIDER desconhecido: ${provedor}`);
  }
}

/**
 * Envia o histórico de mensagens ao provedor de LLM configurado e devolve
 * o texto da resposta do assistente.
 */
export async function gerarResposta(mensagens: MensagemLLM[]): Promise<string> {
  const { baseUrl, chave, modeloPadrao } = obterConfiguracao();
  const modelo = process.env.LLM_MODELO ?? modeloPadrao;

  if (!modelo) {
    throw new Error(
      "LLM_MODELO não definido — obrigatório para o provedor configurado."
    );
  }

  const cabecalhos: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (chave) {
    cabecalhos["Authorization"] = `Bearer ${chave}`;
  }

  // Modelos gratuitos (ex.: OpenRouter ":free") ficam congestionados com
  // frequência (429). Repetimos algumas vezes, respeitando o Retry-After.
  const TENTATIVAS = 3;
  let resposta: Response | null = null;

  for (let tentativa = 1; tentativa <= TENTATIVAS; tentativa++) {
    resposta = await fetch(baseUrl, {
      method: "POST",
      headers: cabecalhos,
      body: JSON.stringify({
        model: modelo,
        messages: mensagens,
        temperature: 0.2,
      }),
    });

    const transitorio = resposta.status === 429 || resposta.status >= 500;
    if (resposta.ok || !transitorio || tentativa === TENTATIVAS) break;

    const retryAfter = Number(resposta.headers.get("retry-after"));
    const esperaMs = Math.min(
      (Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 5 * tentativa) * 1000,
      25_000
    );
    console.warn(
      `Provedor de LLM respondeu ${resposta.status}; nova tentativa em ${esperaMs / 1000}s (${tentativa}/${TENTATIVAS}).`
    );
    await new Promise((resolver) => setTimeout(resolver, esperaMs));
  }

  if (!resposta || !resposta.ok) {
    const corpo = resposta ? await resposta.text() : "sem resposta";
    throw new Error(
      `Falha ao chamar o provedor de LLM (status ${resposta?.status}): ${corpo}`
    );
  }

  const dados = await resposta.json();
  const conteudo = dados?.choices?.[0]?.message?.content;

  if (typeof conteudo !== "string") {
    throw new Error("Resposta do provedor de LLM em formato inesperado.");
  }

  return conteudo;
}
