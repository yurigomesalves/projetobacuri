import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServidor } from "@/lib/server/supabase";
import { gerarEmbeddingConsulta } from "@/lib/server/embedding";
import { gerarResposta, type MensagemLLM } from "@/lib/server/llm";
import { dentroDoLimite } from "@/lib/server/limite";
import {
  emitirTokenContinuidade,
  houveMudancaExplicitaDeAssunto,
  possuiDoisTermosDaConsulta,
  verificarTokenContinuidade,
} from "@/lib/server/continuidade";
import type { Citacao, Mensagem, RespostaChat, RespostaErro } from "@/lib/shared/tipos";

export const runtime = "nodejs";

const esquemaMensagem = z.object({
  papel: z.enum(["usuario", "assistente"]),
  conteudo: z.string(),
});

const esquemaRequisicao = z.object({
  mensagem: z.string().min(3).max(1000),
  historico: z.array(esquemaMensagem).max(6).optional(),
  continuidade: z.object({ token: z.string().max(2048) }).optional(),
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

const RESPOSTA_CONTATO_PESSOAL =
  "Não forneço nem procuro telefone, e-mail ou outro contato pessoal de familiares " +
  "e pessoas citadas no acervo. Os documentos históricos devem ser usados para " +
  "pesquisa e memória, não para localizar contatos privados. Posso ajudar a encontrar " +
  "canais institucionais públicos relacionados ao documento ou ao órgão responsável.";

const RESPOSTA_REFERENTE_AUSENTE =
  "Não consigo identificar qual documento ou carta você mencionou, porque esse " +
  "referente não aparece no histórico disponível. Informe o título, a autoria, o " +
  "destinatário ou outro contexto para que eu possa procurar a página sem inventar.";

const RESPOSTA_FABRICACAO =
  "Não posso inventar citações nem ignorar as fontes. Posso ajudar a pesquisar, com " +
  "documentação verificável, como a repressão e as violações de direitos humanos foram " +
  "registradas pelas comissões da verdade e por outros acervos históricos.";

function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function solicitaContatoPessoal(texto: string): boolean {
  const valor = normalizar(texto);
  const contato = /\b(telefone|celular|whatsapp|e-?mail|contato|endereco)\b/.test(valor);
  const pessoa = /\b(pessoal|privado|particular|familiar|vitima|pessoa)\b/.test(valor);
  const pedido = /\b(qual|informe|forneca|procure|encontre|numero)\b/.test(valor);
  return contato && pessoa && pedido;
}

function solicitaFabricacao(texto: string): boolean {
  const valor = normalizar(texto);
  return /\b(invente|inventar|fabrique|fabricar|forje|forjar)\b/.test(valor) &&
    /\b(citacao|citacoes|fonte|fontes|prova|referencia)\b/.test(valor);
}

function dependeDeReferente(texto: string): boolean {
  const valor = normalizar(texto);
  return /\b(acabei de mencionar|deles|delas|esse|essa|esses|essas|isso|aquilo)\b/.test(valor) ||
    /^e\b/.test(valor);
}

function montarConsultaBusca(mensagem: string, historico: Mensagem[] = []): string {
  if (!dependeDeReferente(mensagem)) return mensagem;
  const ultimaPergunta = [...historico]
    .reverse()
    .find((item) => item.papel === "usuario")?.conteudo;
  return ultimaPergunta ? `${ultimaPergunta}\n${mensagem}` : mensagem;
}

function omitirContatosPessoais(texto: string): string {
  return texto
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[contato pessoal omitido]")
    .replace(
      /(?:\+?55\s*)?\(?\d{2}\)?\s*(?:9[\s.-]?)?\d{4}[\s.-]\d{4}\b/g,
      "[contato pessoal omitido]",
    );
}

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

async function respostaDireta(
  pergunta: string,
  resposta: string,
): Promise<NextResponse<RespostaChat>> {
  const { data: interacao, error: erroInsercao } = await supabaseServidor
    .from("interacoes")
    .insert({ pergunta, resposta, citacoes: [] })
    .select("interacao_id")
    .single();

  if (erroInsercao || !interacao) {
    throw new Error(`Falha ao registrar interação: ${erroInsercao?.message}`);
  }

  return NextResponse.json(
    {
      resumo: "",
      resposta,
      citacoes: [],
      sugestoes_pesquisa: [],
      interacao_id: interacao.interacao_id as string,
    },
    { status: 200 },
  );
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

type TrechoTextual = Pick<TrechoBuscado, "chunk_id" | "conteudo" | "fonte_id"> & {
  relevancia: number;
};

type LinhaChunkComFonte = {
  chunk_id: string;
  conteudo: string;
  paginas: string;
  secao: string | null;
  tipo_chunk: "corpo" | "nota_rodape";
  fonte_id: string;
  nota_contexto: string | null;
  fontes: {
    titulo: string;
    autor_orgao: string;
    tipo_fonte: string;
    confiabilidade: string;
    data_documento: string | null;
    url_origem: string;
    nota_contexto: string | null;
  } | Array<{
    titulo: string;
    autor_orgao: string;
    tipo_fonte: string;
    confiabilidade: string;
    data_documento: string | null;
    url_origem: string;
    nota_contexto: string | null;
  }>;
};

function normalizarChunkRecarregado(linha: LinhaChunkComFonte): TrechoBuscado | null {
  const fonte = Array.isArray(linha.fontes) ? linha.fontes[0] : linha.fontes;
  if (!fonte) return null;
  return {
    chunk_id: linha.chunk_id,
    conteudo: omitirContatosPessoais(linha.conteudo),
    paginas: linha.paginas,
    secao: linha.secao,
    tipo_chunk: linha.tipo_chunk,
    similaridade: 0,
    fonte_id: linha.fonte_id,
    titulo: fonte.titulo,
    autor_orgao: fonte.autor_orgao,
    tipo_fonte: fonte.tipo_fonte,
    confiabilidade: fonte.confiabilidade,
    data_documento: fonte.data_documento,
    url_origem: fonte.url_origem,
    nota_contexto: linha.nota_contexto ?? fonte.nota_contexto,
  };
}

function intercalarTrechos(vetoriais: TrechoBuscado[], textuais: TrechoBuscado[]): TrechoBuscado[] {
  const resultado: TrechoBuscado[] = [];
  const vistos = new Set<string>();
  let vetor = 0;
  let textual = 0;
  while (resultado.length < 8 && (vetor < vetoriais.length || textual < textuais.length)) {
    for (const lista of [vetoriais, textuais]) {
      let indice = lista === vetoriais ? vetor : textual;
      while (indice < lista.length && vistos.has(lista[indice].chunk_id)) indice += 1;
      if (lista === vetoriais) vetor = indice + 1;
      else textual = indice + 1;
      if (indice < lista.length && !vistos.has(lista[indice].chunk_id)) {
        vistos.add(lista[indice].chunk_id);
        resultado.push(lista[indice]);
        if (resultado.length === 8) break;
      }
    }
  }
  return resultado;
}

async function buscarTextuaisPorFontes(
  consulta: string,
  fontes: string[],
): Promise<TrechoBuscado[]> {
  try {
    const { data: candidatos, error: erroTextual } = await supabaseServidor.rpc(
      "buscar_chunks_textuais_por_fontes",
      { consulta_texto: consulta, fontes_candidatas: fontes, qtd_por_fonte: 4 },
    );
    if (erroTextual) return [];

    const ordenados = ((candidatos ?? []) as TrechoTextual[])
      .filter((trecho) => possuiDoisTermosDaConsulta(trecho.conteudo, consulta))
      .sort((a, b) => b.relevancia - a.relevancia)
      .slice(0, 32);
    const ids = [...new Set(ordenados.map((trecho) => trecho.chunk_id))];
    if (ids.length === 0) return [];

    const { data: recarregados, error: erroMetadados } = await supabaseServidor
      .from("chunks")
      .select("chunk_id,conteudo,paginas,secao,tipo_chunk,fonte_id,nota_contexto,fontes!inner(titulo,autor_orgao,tipo_fonte,confiabilidade,data_documento,url_origem,nota_contexto)")
      .in("chunk_id", ids);
    if (erroMetadados) return [];
    const porId = new Map(
      ((recarregados ?? []) as LinhaChunkComFonte[])
        .map(normalizarChunkRecarregado)
        .filter((trecho): trecho is TrechoBuscado => trecho !== null)
        .map((trecho) => [trecho.chunk_id, trecho]),
    );
    return ids.map((id) => porId.get(id)).filter((trecho): trecho is TrechoBuscado => Boolean(trecho));
  } catch {
    // Continuidade é prioridade suave: qualquer falha neste ramo preserva a busca geral.
    return [];
  }
}

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

  const { mensagem, historico, continuidade } = validado.data;

  try {
    if (solicitaContatoPessoal(mensagem)) {
      return await respostaDireta(mensagem, RESPOSTA_CONTATO_PESSOAL);
    }
    if (solicitaFabricacao(mensagem)) {
      return await respostaDireta(mensagem, RESPOSTA_FABRICACAO);
    }
    if (dependeDeReferente(mensagem) && !(historico?.length)) {
      return await respostaDireta(mensagem, RESPOSTA_REFERENTE_AUSENTE);
    }

    // 1. Embedding da pergunta, gerado no próprio servidor (ADR-007).
    const consultaBusca = montarConsultaBusca(mensagem, (historico ?? []) as Mensagem[]);
    const embedding = await gerarEmbeddingConsulta(consultaBusca);

    // 2. Busca semântica via RPC buscar_chunks (limiar e quantidade padrão da função).
    const { data: trechos, error: erroBusca } = await supabaseServidor.rpc("buscar_chunks", {
      consulta_embedding: embedding,
    });

    if (erroBusca) {
      throw new Error(`Falha na busca de chunks: ${erroBusca.message}`);
    }

    const vetoriais = ((trechos ?? []) as TrechoBuscado[]).map((trecho) => ({
      ...trecho,
      conteudo: omitirContatosPessoais(trecho.conteudo),
    })).slice(0, 8);

    const podeUsarContinuidade = dependeDeReferente(mensagem) &&
      Boolean(historico?.length) &&
      !houveMudancaExplicitaDeAssunto(mensagem);
    const fontesContinuidade = podeUsarContinuidade
      ? verificarTokenContinuidade(continuidade?.token)
      : null;
    const textuais = fontesContinuidade
      ? await buscarTextuaisPorFontes(consultaBusca, fontesContinuidade)
      : [];
    const lista = fontesContinuidade ? intercalarTrechos(vetoriais, textuais) : vetoriais;

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
      "Você é um assistente educativo sobre a história da Ditadura Militar-Empresarial " +
      "no Brasil (1964–1985), parte do **projeto_BACURI**. O tema envolve " +
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

    const textoLLM = omitirContatosPessoais(await gerarResposta(mensagensLLM));

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

    const tokenContinuidade = emitirTokenContinuidade(citacoes.map((citacao) => citacao.fonte_id));
    if (tokenContinuidade) corpoResposta.token_continuidade = tokenContinuidade;

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
