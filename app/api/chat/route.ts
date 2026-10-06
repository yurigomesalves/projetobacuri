import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServidor } from "@/lib/server/supabase";
import { gerarEmbeddingConsulta } from "@/lib/server/embedding";
import { gerarResposta, type MensagemLLM } from "@/lib/server/llm";
import {
  recuperarTrechos,
  selecionarTrechosDasConsultas,
  type TrechoRecuperado,
} from "@/lib/server/recuperacao";
import {
  decomporConsultaExperimental,
  respostaSustentadaExperimental,
} from "@/lib/server/etapas-experimentais";
import {
  aguardarNoPrazo,
  comSinalDePrazo,
  conferirPrazo,
  criarPrazoRequisicao,
} from "@/lib/server/prazo";
import { dentroDoLimite } from "@/lib/server/limite";
import { normalizarCitacoesResposta } from "@/lib/server/citacoes";
import { criarMedicaoChat } from "@/lib/server/tempos-chat";
import {
  emitirTokenContinuidade,
  houveMudancaExplicitaDeAssunto,
  verificarTokenContinuidade,
} from "@/lib/server/continuidade";
import type {
  Citacao,
  Mensagem,
  RespostaChat,
  RespostaErro,
} from "@/lib/shared/tipos";

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
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function solicitaContatoPessoal(texto: string): boolean {
  const valor = normalizar(texto);
  const contato =
    /\b(telefone|celular|whatsapp|e-?mail|contato|endereco)\b/.test(valor);
  const pessoa = /\b(pessoal|privado|particular|familiar|vitima|pessoa)\b/.test(
    valor,
  );
  const pedido = /\b(qual|informe|forneca|procure|encontre|numero)\b/.test(
    valor,
  );
  return contato && pessoa && pedido;
}

function solicitaFabricacao(texto: string): boolean {
  const valor = normalizar(texto);
  return (
    /\b(invente|inventar|fabrique|fabricar|forje|forjar)\b/.test(valor) &&
    /\b(citacao|citacoes|fonte|fontes|prova|referencia)\b/.test(valor)
  );
}

function dependeDeReferente(texto: string): boolean {
  const valor = normalizar(texto);
  return (
    /\b(acabei de mencionar|deles|delas|esse|essa|esses|essas|isso|aquilo)\b/.test(
      valor,
    ) || /^e\b/.test(valor)
  );
}

function montarConsultaBusca(
  mensagem: string,
  historico: Mensagem[] = [],
): string {
  if (!dependeDeReferente(mensagem)) return mensagem;
  const ultimaPergunta = [...historico]
    .reverse()
    .find((item) => item.papel === "usuario")?.conteudo;
  return ultimaPergunta ? `${ultimaPergunta}\n${mensagem}` : mensagem;
}

function omitirContatosPessoais(texto: string): string {
  return texto
    .replace(
      /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
      "[contato pessoal omitido]",
    )
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
  status: number,
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
  signal: AbortSignal,
): Promise<NextResponse<RespostaChat>> {
  const interacaoId = await registrarInteracao(
    { pergunta, resposta, citacoes: [] },
    signal,
  );

  return NextResponse.json(
    {
      resumo: "",
      resposta,
      citacoes: [],
      sugestoes_pesquisa: [],
      interacao_id: interacaoId,
    },
    { status: 200 },
  );
}

async function registrarInteracao(
  valores: { pergunta: string; resposta: string; citacoes: Citacao[] },
  signal: AbortSignal,
): Promise<string> {
  conferirPrazo(signal);
  const consulta = supabaseServidor
    .from("interacoes")
    .insert(valores)
    .select("interacao_id")
    .single();
  const { data: interacao, error: erroInsercao } = await aguardarNoPrazo(
    comSinalDePrazo(consulta, signal),
    signal,
  );

  if (erroInsercao || !interacao) {
    throw new Error(`Falha ao registrar interação: ${erroInsercao?.message}`);
  }
  conferirPrazo(signal);
  return interacao.interacao_id as string;
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

  // Lados vazios ou marcadores no resumo indicam formato inválido:
  // preserva o texto inteiro como resposta (plano B).
  if (!resumo || !resposta || /\[\d+\]/.test(resumo)) {
    return { resumo: "", resposta: texto.trim() };
  }

  return { resumo, resposta };
}

export async function POST(requisicao: NextRequest): Promise<NextResponse> {
  const ip = obterIp(requisicao);
  if (!dentroDoLimite(ip)) {
    return respostaErro(
      "LIMITE_EXCEDIDO",
      "Muitas requisições em pouco tempo. Aguarde um minuto e tente novamente.",
      429,
    );
  }

  let corpo: unknown;
  try {
    corpo = await requisicao.json();
  } catch {
    return respostaErro(
      "ENTRADA_INVALIDA",
      "Corpo da requisição deve ser JSON válido.",
      400,
    );
  }

  const validado = esquemaRequisicao.safeParse(corpo);
  if (!validado.success) {
    return respostaErro(
      "ENTRADA_INVALIDA",
      "A pergunta deve ter entre 3 e 1000 caracteres, e o histórico (opcional) deve ter no máximo 6 mensagens.",
      400,
    );
  }

  const { mensagem, historico, continuidade } = validado.data;
  const inicioRequisicao = Date.now();
  const prazo = criarPrazoRequisicao();
  const medicao = criarMedicaoChat();
  let sucesso = false;
  const responderDiretamente = async (texto: string) => {
    const resultado = await medicao.medir("registro", () => respostaDireta(mensagem, texto, prazo.signal));
    sucesso = true;
    return resultado;
  };

  try {
    if (solicitaContatoPessoal(mensagem)) {
      return await responderDiretamente(RESPOSTA_CONTATO_PESSOAL);
    }
    if (solicitaFabricacao(mensagem)) {
      return await responderDiretamente(RESPOSTA_FABRICACAO);
    }
    if (dependeDeReferente(mensagem) && !historico?.length) {
      return await responderDiretamente(RESPOSTA_REFERENTE_AUSENTE);
    }

    // 1. Embedding da pergunta, gerado no próprio servidor (ADR-007).
    const consultaBusca = montarConsultaBusca(
      mensagem,
      (historico ?? []) as Mensagem[],
    );
    const consultas = (await medicao.medir("decomposicao", () => aguardarNoPrazo(
      decomporConsultaExperimental(
        consultaBusca,
        inicioRequisicao,
        prazo.signal,
      ),
      prazo.signal,
    ))) ?? [consultaBusca];
    conferirPrazo(prazo.signal);

    const podeUsarContinuidade =
      dependeDeReferente(mensagem) &&
      Boolean(historico?.length) &&
      !houveMudancaExplicitaDeAssunto(mensagem);
    const fontesContinuidade = podeUsarContinuidade
      ? verificarTokenContinuidade(continuidade?.token)
      : null;
    const recuperacoes = await Promise.all(
      consultas.map(async (consulta) => {
        const embedding = await medicao.medir("embedding", () => aguardarNoPrazo(
          gerarEmbeddingConsulta(consulta),
          prazo.signal,
        ));
        return medicao.medir("recuperacao", () => recuperarTrechos(
          consulta,
          embedding,
          fontesContinuidade,
          inicioRequisicao,
          prazo.signal,
        ));
      }),
    );
    conferirPrazo(prazo.signal);
    const recuperacao = recuperacoes[0];
    const lista: TrechoRecuperado[] = selecionarTrechosDasConsultas(
      recuperacoes.map((resultado) => resultado.finais),
    )
      .map((trecho) => ({
        ...trecho,
        conteudo: omitirContatosPessoais(trecho.conteudo),
      }));
    if (process.env.RAG_REGISTRAR_RASTROS === "1") {
      console.info(
        "Rastreamento interno de recuperação",
        recuperacao.diagnostico,
        {
          candidatos: recuperacao.candidatos.map(
            ({
              chunk_id,
              fonte_id,
              origem,
              posicao_vetorial,
              posicao_textual,
            }) => ({
              chunk_id,
              fonte_id,
              origem,
              posicao_vetorial,
              posicao_textual,
            }),
          ),
        },
      );
    }

    // 3. Regra de ouro: sem trechos relevantes, não chamamos o LLM.
    if (lista.length === 0) {
      const interacaoId = await medicao.medir("registro", () => registrarInteracao(
        {
          pergunta: mensagem,
          resposta: RESPOSTA_SEM_BASE,
          citacoes: [],
        },
        prazo.signal,
      ));

      const corpoResposta: RespostaChat = {
        resumo: "",
        resposta: RESPOSTA_SEM_BASE,
        citacoes: [],
        sugestoes_pesquisa: SUGESTOES_SEM_BASE,
        interacao_id: interacaoId,
      };
      sucesso = true;
      return NextResponse.json(corpoResposta, { status: 200 });
    }

    // 4. Monta citações na ordem dos marcadores [n].
    let citacoes: Citacao[] = lista.map((trecho, indice) => ({
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
          `Tipo: ${trecho.tipo_chunk === "nota_rodape" ? "nota de rodapé" : "corpo do texto"}`,
        );
        partes.push(`Confiabilidade da fonte: ${trecho.confiabilidade}`);
        if (trecho.nota_contexto)
          partes.push(`Nota de contexto: ${trecho.nota_contexto}`);
        partes.push(`Conteúdo: ${trecho.conteudo}`);
        return partes.join("\n");
      })
      .join("\n\n");

    const promptSistema =
      "Você é um assistente educativo sobre a história da Ditadura Militar-Empresarial " +
      "no Brasil (1964–1985), parte do **projeto_BACURI**. O tema envolve " +
      "tortura, mortes e desaparecimentos de pessoas reais, com familiares vivos: " +
      "mantenha tom sóbrio, respeitoso e factual, em português brasileiro.\n\n" +
      "Responda EXCLUSIVAMENTE com base nos trechos numerados abaixo. No segundo " +
      "bloco de desenvolvimento, cada afirmação factual derivada de um trecho " +
      "deve receber o marcador correspondente, como [1] ou [2], na própria frase " +
      "ou ao fim do período que a sustenta. Mencionar o nome de uma fonte, " +
      "instituição ou nota de rodapé não substitui o marcador que sustenta a " +
      "afirmação. Se os trechos não forem suficientes para responder a parte da " +
      "pergunta, diga isso explicitamente — nunca invente fatos, nomes, datas ou " +
      "números. Notas de rodapé fornecidas como trecho são contexto secundário; " +
      "se usar uma, mencione que se trata de uma nota de rodapé. Não trate o " +
      "negacionismo histórico como um debate em aberto: responda a ele com a " +
      "documentação apresentada.\n\n" +
      "Não complete palavras, frases ou citações interrompidas. Se um trecho " +
      "terminar no meio de afirmação, omita a parte incompleta e não atribua à " +
      "fonte continuação inferida. Não apresente como citação literal paráfrase, " +
      "reconstrução ou continuação presumida; use apenas o conteúdo que o trecho " +
      "permite sustentar.\n\n" +
      "Não deduza atribuições, competências ou práticas gerais de uma instituição " +
      "a partir de perfis individuais, notas bibliográficas ou simples menções a " +
      "processos. Preserve o sujeito e o alcance do trecho citado. Ao mencionar " +
      "recomendação, conclusão ou ação, identifique na mesma frase o órgão, autor " +
      "ou depoente responsável; não transfira afirmações entre instituições. " +
      "Distinga testemunho, análise e documento oficial. Para alegação sensível " +
      "que chegue por nota de rodapé ou por outra fonte intermediária, explicite " +
      "a cadeia de atribuição e seu caráter indireto; omita o detalhe se não puder " +
      "atribuí-lo com precisão.\n\n" +
      "Concentre a resposta na pergunta e evite digressões. Ao descrever medidas " +
      "legais, delimite o alcance efetivamente sustentado pelos trechos: não " +
      "converta medida de alcance excepcional em regra geral. Se uma fonte usar " +
      "formulação ampla, ou faltar a delimitação necessária, atribua-a " +
      "explicitamente à fonte e registre que os trechos não permitem precisar " +
      "seu alcance; se for periférico, omita. A presença de citação não torna " +
      "segura uma generalização.\n\n" +
      "Em perguntas sobre o AI-5, responda aos seus dispositivos e efeitos " +
      "diretamente documentados. Não introduza outros atos, como o AI-14, salvo " +
      "se forem indispensáveis para esclarecer a pergunta e se os trechos citados " +
      "permitirem delimitar com precisão sua data, alcance e relação com o AI-5; " +
      "caso contrário, omita-os. Não transforme formulação ampla de uma fonte " +
      "em regra geral.\n\n" +
      "Formato obrigatório: dois blocos de texto separados por uma única linha " +
      "contendo apenas ---. Não use títulos, listas, blocos de código nem rótulos " +
      "como PARTE, RESUMO ou RESPOSTA COMPLETA.\n\n" +
      "No primeiro bloco, escreva uma síntese didática de 2 a 3 frases, sem nenhum " +
      "marcador [n]. Ela sintetiza apenas informações sustentadas no desenvolvimento " +
      "citado do segundo bloco; não acrescenta inferências, datas ou sujeitos " +
      "ausentes dele. Use linguagem acessível a quem não conhece o tema.\n\n" +
      "A síntese é obrigatória, inclusive em perguntas de continuidade, e não " +
      "contém marcadores. Após ---, o desenvolvimento deve trazer os marcadores.\n\n" +
      "No segundo bloco, responda diretamente à pergunta com marcadores [1], [2] " +
      "etc. após as afirmações derivadas dos trechos. Busque 250–450 palavras e " +
      "até seis parágrafos nesse bloco. São metas de concisão: preserve atribuições, " +
      "cadeias indiretas e ressalvas documentais, mesmo quando exigirem maior " +
      "extensão. Selecione somente os pontos necessários para responder; não faça " +
      "inventário de todos os trechos nem enumeração de exemplos similares. " +
      "Planeje de três a cinco parágrafos curtos, em geral de até 80 palavras " +
      "cada; omita detalhes periféricos, nunca atribuições ou ressalvas necessárias. " +
      "Evite repetir a síntese. Inclua um convite " +
      "breve para explorar as fontes no último parágrafo, sem novas afirmações " +
      "históricas e sem criar um parágrafo adicional só para o convite.\n\n" +
      "Exemplo abstrato de estrutura, não de conteúdo a reproduzir:\n" +
      "Síntese acessível em duas ou três frases.\n---\n" +
      "Desenvolvimento documentado com as referências correspondentes [1].\n\n" +
      "Trechos disponíveis:\n\n" +
      blocosTrechos;

    const mensagensLLM: MensagemLLM[] = [
      { role: "system", content: promptSistema },
    ];

    for (const item of (historico ?? []) as Mensagem[]) {
      mensagensLLM.push({
        role: item.papel === "usuario" ? "user" : "assistant",
        content: item.conteudo,
      });
    }

    mensagensLLM.push({ role: "user", content: mensagem });

    conferirPrazo(prazo.signal);
    const textoLLM = omitirContatosPessoais(
      await medicao.medir("geracao", () => aguardarNoPrazo(
        gerarResposta(mensagensLLM, { signal: prazo.signal, maxTokens: 4096 }),
        prazo.signal,
      )),
    );
    conferirPrazo(prazo.signal);

    // Separa o resumo didático da resposta completa no primeiro `---` isolado.
    // Plano B: se o modelo não seguiu o formato, resumo fica vazio e a resposta
    // completa é preservada inteira (o contrato prevê resumo: "").
    let { resumo, resposta } = separarResumo(textoLLM);
    const veredito = await medicao.medir("verificacao", () => aguardarNoPrazo(
      respostaSustentadaExperimental(
        mensagem,
        resposta,
        citacoes.map((citacao, indice) => ({ ...citacao, trecho: lista[indice].conteudo })),
        inicioRequisicao,
        prazo.signal,
        resumo,
      ),
      prazo.signal,
    ));
    conferirPrazo(prazo.signal);
    let sugestoesPesquisa: string[] = [];
    if (veredito === false) {
      resumo = "";
      resposta = RESPOSTA_SEM_BASE;
      citacoes = [];
      sugestoesPesquisa = SUGESTOES_SEM_BASE;
    } else {
      ({ resposta, citacoes } = normalizarCitacoesResposta(resposta, citacoes));
    }

    // 6. Registra a interação para auditoria editorial (sem dados pessoais).
    const interacaoId = await medicao.medir("registro", () => registrarInteracao(
      {
        pergunta: mensagem,
        resposta,
        citacoes,
      },
      prazo.signal,
    ));

    const corpoResposta: RespostaChat = {
      resumo,
      resposta,
      citacoes,
      sugestoes_pesquisa: sugestoesPesquisa,
      interacao_id: interacaoId,
    };

    const tokenContinuidade = emitirTokenContinuidade(
      citacoes.map((citacao) => citacao.fonte_id),
    );
    if (tokenContinuidade) corpoResposta.token_continuidade = tokenContinuidade;

    sucesso = true;
    return NextResponse.json(corpoResposta, { status: 200 });
  } catch (erro) {
    console.error("Erro em /api/chat:", erro);
    return respostaErro(
      "ERRO_INTERNO",
      "Não foi possível processar sua pergunta agora. Tente novamente em alguns instantes.",
      500,
    );
  } finally {
    medicao.finalizar(sucesso);
    prazo.encerrar();
  }
}
