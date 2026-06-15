import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServidor } from "@/lib/server/supabase";
import { gerarEmbeddingConsulta } from "@/lib/server/embedding";
import { gerarResposta, type MensagemLLM } from "@/lib/server/llm";
import { dentroDoLimite } from "@/lib/server/limite";
import type { Citacao, Mensagem, RespostaChat, RespostaErro } from "@/lib/shared/tipos";

export const runtime = "nodejs";

const esquemaMensagem = z.object({
  papel: z.enum(["usuario", "assistente"]),
  conteudo: z.string(),
});

const esquemaRequisicao = z.object({
  mensagem: z.string().min(3).max(1000),
  historico: z.array(esquemaMensagem).max(6).optional(),
});

// Resposta padrão quando nenhum trecho do acervo atinge o limiar de
// relevância (princípio 3 — referência autoral: nunca responder sem fonte).
const RESPOSTA_SEM_BASE =
  "Não encontrei, no acervo documental disponível atualmente, trechos " +
  "suficientemente relacionados à sua pergunta para responder com " +
  "responsabilidade e com as devidas referências.\n\n" +
  "Algumas sugestões para tentar de novo:\n" +
  "- Use termos mais específicos do período (datas, nomes de pessoas, " +
  "órgãos, locais ou operações).\n" +
  "- Tente reformular a pergunta de outra forma, com sinônimos ou termos " +
  "da época.\n" +
  "- Pergunte sobre um documento, relatório ou evento específico.\n\n" +
  "Enquanto o acervo deste projeto ainda está em construção, vale a pena " +
  "explorar diretamente o Relatório da Comissão Nacional da Verdade (CNV), " +
  "o portal Memórias Reveladas do Arquivo Nacional e o acervo do Memorial " +
  "da Resistência de São Paulo.";

const SUGESTOES_SEM_BASE = [
  "Reformule a pergunta com nomes, datas ou locais específicos do período.",
  "Consulte o Relatório da Comissão Nacional da Verdade (CNV).",
  "Consulte o portal Memórias Reveladas (Arquivo Nacional).",
  "Consulte o acervo do Memorial da Resistência de São Paulo.",
];

function obterIp(requisicao: NextRequest): string {
  const encaminhado = requisicao.headers.get("x-forwarded-for");
  if (encaminhado) {
    return encaminhado.split(",")[0].trim();
  }
  return "desconhecido";
}

function respostaErro(
  codigo: RespostaErro["erro"]["codigo"],
  mensagem: string,
  status: number
): NextResponse<RespostaErro> {
  return NextResponse.json({ erro: { codigo, mensagem } }, { status });
}

function truncar(texto: string, limite = 400): string {
  if (texto.length <= limite) return texto;
  return texto.slice(0, limite).trimEnd() + "…";
}

// Separa o resumo didático da resposta completa no primeiro `---` em linha
// isolada (formato pedido ao LLM). Plano B: sem separador no formato esperado,
// devolve resumo vazio e o texto inteiro como resposta — o contrato admite
// resumo: "" e jamais perdemos a resposta com as citações.
function separarResumo(texto: string): { resumo: string; resposta: string } {
  const separador = /^[ \t]*-{3,}[ \t]*$/m;
  const correspondencia = separador.exec(texto);

  if (!correspondencia) {
    return { resumo: "", resposta: texto.trim() };
  }

  const resumo = texto
    .slice(0, correspondencia.index)
    // Remove um eventual rótulo "RESUMO:" que o modelo tenha incluído.
    .replace(/^\s*(parte\s*1\s*[—-]?\s*)?resumo\s*:?\s*/i, "")
    .trim();
  const resposta = texto
    .slice(correspondencia.index + correspondencia[0].length)
    .replace(/^\s*(parte\s*3\s*[—-]?\s*)?resposta(\s+completa)?\s*:?\s*/i, "")
    .trim();

  // Se algum dos lados ficou vazio, o formato não foi seguido de fato:
  // preserva o texto inteiro como resposta (plano B).
  if (!resumo || !resposta) {
    return { resumo: "", resposta: texto.trim() };
  }

  return { resumo, resposta };
}

type TrechoBuscado = {
  chunk_id: string;
  conteudo: string;
  paginas: string;
  secao: string | null;
  tipo_chunk: "corpo" | "nota_rodape";
  similaridade: number;
  fonte_id: string;
  titulo: string;
  autor_orgao: string;
  tipo_fonte: string;
  confiabilidade: string;
  data_documento: string | null;
  url_origem: string;
  nota_contexto: string | null;
};

export async function POST(requisicao: NextRequest): Promise<NextResponse> {
  const ip = obterIp(requisicao);
  if (!dentroDoLimite(ip)) {
    return respostaErro(
      "LIMITE_EXCEDIDO",
      "Muitas requisições em pouco tempo. Aguarde um minuto e tente novamente.",
      429
    );
  }

  let corpo: unknown;
  try {
    corpo = await requisicao.json();
  } catch {
    return respostaErro("ENTRADA_INVALIDA", "Corpo da requisição deve ser JSON válido.", 400);
  }

  const validado = esquemaRequisicao.safeParse(corpo);
  if (!validado.success) {
    return respostaErro(
      "ENTRADA_INVALIDA",
      "A pergunta deve ter entre 3 e 1000 caracteres, e o histórico (opcional) deve ter no máximo 6 mensagens.",
      400
    );
  }

  const { mensagem, historico } = validado.data;

  try {
    // 1. Embedding da pergunta, gerado no próprio servidor (ADR-007).
    const embedding = await gerarEmbeddingConsulta(mensagem);

    // 2. Busca semântica via RPC buscar_chunks (limiar e quantidade padrão da função).
    const { data: trechos, error: erroBusca } = await supabaseServidor.rpc("buscar_chunks", {
      consulta_embedding: embedding,
    });

    if (erroBusca) {
      throw new Error(`Falha na busca de chunks: ${erroBusca.message}`);
    }

    const lista = (trechos ?? []) as TrechoBuscado[];

    // 3. Regra de ouro: sem trechos relevantes, não chamamos o LLM.
    if (lista.length === 0) {
      const { data: interacao, error: erroInsercao } = await supabaseServidor
        .from("interacoes")
        .insert({
          pergunta: mensagem,
          resposta: RESPOSTA_SEM_BASE,
          citacoes: [],
        })
        .select("interacao_id")
        .single();

      if (erroInsercao || !interacao) {
        throw new Error(`Falha ao registrar interação: ${erroInsercao?.message}`);
      }

      const corpoResposta: RespostaChat = {
        resumo: "",
        resposta: RESPOSTA_SEM_BASE,
        citacoes: [],
        sugestoes_pesquisa: SUGESTOES_SEM_BASE,
        interacao_id: interacao.interacao_id as string,
      };
      return NextResponse.json(corpoResposta, { status: 200 });
    }

    // 4. Monta citações na ordem dos marcadores [n].
    const citacoes: Citacao[] = lista.map((trecho, indice) => ({
      n: indice + 1,
      fonte_id: trecho.fonte_id,
      titulo: trecho.titulo,
      autor_orgao: trecho.autor_orgao,
      tipo_fonte: trecho.tipo_fonte,
      confiabilidade: trecho.confiabilidade,
      data_documento: trecho.data_documento ?? undefined,
      paginas: trecho.paginas ?? undefined,
      secao: trecho.secao ?? undefined,
      trecho: truncar(trecho.conteudo),
      url_origem: trecho.url_origem,
      nota_contexto: trecho.nota_contexto ?? undefined,
      tipo_chunk: trecho.tipo_chunk,
    }));

    // 5. Prompt de sistema: responder somente com base nos trechos.
    const blocosTrechos = lista
      .map((trecho, indice) => {
        const partes = [
          `[${indice + 1}] Fonte: ${trecho.titulo} — ${trecho.autor_orgao}`,
          `Páginas: ${trecho.paginas}`,
        ];
        if (trecho.secao) partes.push(`Seção: ${trecho.secao}`);
        partes.push(
          `Tipo: ${trecho.tipo_chunk === "nota_rodape" ? "nota de rodapé" : "corpo do texto"}`
        );
        partes.push(`Confiabilidade da fonte: ${trecho.confiabilidade}`);
        if (trecho.nota_contexto) partes.push(`Nota de contexto: ${trecho.nota_contexto}`);
        partes.push(`Conteúdo: ${trecho.conteudo}`);
        return partes.join("\n");
      })
      .join("\n\n");

    const promptSistema =
      "Você é um assistente educativo sobre a história da Ditadura Civil-Militar " +
      "no Brasil (1964–1985), parte do Projeto Bacuri. O tema envolve " +
      "tortura, mortes e desaparecimentos de pessoas reais, com familiares vivos: " +
      "mantenha tom sóbrio, respeitoso e factual, em português brasileiro.\n\n" +
      "Responda EXCLUSIVAMENTE com base nos trechos numerados abaixo. Após cada " +
      "afirmação derivada de um trecho, indique o marcador correspondente, como " +
      "[1] ou [2]. Se os trechos não forem suficientes para responder a parte da " +
      "pergunta, diga isso explicitamente — nunca invente fatos, nomes, datas ou " +
      "números. Notas de rodapé fornecidas como trecho são contexto secundário; " +
      "se usar uma, mencione que se trata de uma nota de rodapé. Não trate o " +
      "negacionismo histórico como um debate em aberto: responda a ele com a " +
      "documentação apresentada.\n\n" +
      "Ao final do seu raciocínio, produza a resposta em duas partes, nesta ordem:\n\n" +
      "PARTE 1 — RESUMO: escreva de 2 a 3 frases que sintetizem a resposta de " +
      "forma didática, em linguagem acessível a quem não tem familiaridade com o " +
      "tema. Não use marcadores de citação [n] nesta parte — as fontes aparecem na " +
      "resposta completa, logo abaixo. Não inclua nenhuma informação, nome, data ou " +
      "afirmação que não esteja sustentada pelos trechos fornecidos. Mantenha tom " +
      "sóbrio e respeitoso: o tema trata de tortura, morte e desaparecimento de " +
      "pessoas reais, com familiares vivos.\n\n" +
      "PARTE 2 — SEPARADOR: escreva, em uma linha isolada, exatamente:\n---\n\n" +
      "PARTE 3 — RESPOSTA COMPLETA: escreva a resposta detalhada, com os marcadores " +
      "[1], [2] etc. indicando a origem de cada afirmação. Termine incentivando o " +
      "usuário a explorar as fontes citadas para aprofundar a pesquisa.\n\n" +
      "Trechos disponíveis:\n\n" +
      blocosTrechos;

    const mensagensLLM: MensagemLLM[] = [{ role: "system", content: promptSistema }];

    for (const item of (historico ?? []) as Mensagem[]) {
      mensagensLLM.push({
        role: item.papel === "usuario" ? "user" : "assistant",
        content: item.conteudo,
      });
    }

    mensagensLLM.push({ role: "user", content: mensagem });

    const textoLLM = await gerarResposta(mensagensLLM);

    // Separa o resumo didático da resposta completa no primeiro `---` isolado.
    // Plano B: se o modelo não seguiu o formato, resumo fica vazio e a resposta
    // completa é preservada inteira (o contrato prevê resumo: "").
    const { resumo, resposta } = separarResumo(textoLLM);

    // 6. Registra a interação para auditoria editorial (sem dados pessoais).
    const { data: interacao, error: erroInsercao } = await supabaseServidor
      .from("interacoes")
      .insert({
        pergunta: mensagem,
        resposta,
        citacoes,
      })
      .select("interacao_id")
      .single();

    if (erroInsercao || !interacao) {
      throw new Error(`Falha ao registrar interação: ${erroInsercao?.message}`);
    }

    const corpoResposta: RespostaChat = {
      resumo,
      resposta,
      citacoes,
      sugestoes_pesquisa: [],
      interacao_id: interacao.interacao_id as string,
    };

    return NextResponse.json(corpoResposta, { status: 200 });
  } catch (erro) {
    console.error("Erro em /api/chat:", erro);
    return respostaErro(
      "ERRO_INTERNO",
      "Não foi possível processar sua pergunta agora. Tente novamente em alguns instantes.",
      500
    );
  }
}
