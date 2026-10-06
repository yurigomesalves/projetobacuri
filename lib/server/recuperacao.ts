// Recuperação interna do chat. O tipo inclui procedência para avaliação e logs
// internos; a rota projeta apenas os oito trechos finais em citações públicas.
import { supabaseServidor } from "@/lib/server/supabase";
import { possuiTermosSuficientesDaConsulta } from "@/lib/server/continuidade";
import { reranquearIdsExperimental } from "@/lib/server/etapas-experimentais";
import {
  aguardarNoPrazo,
  comSinalDePrazo,
  conferirPrazo,
} from "@/lib/server/prazo";

export type TrechoRecuperado = {
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

export type ProcedenciaCandidato = {
  origem: Array<"vetorial" | "textual_global" | "textual_por_fonte">;
  posicao_vetorial?: number;
  posicao_textual?: number;
  pontuacao_rrf?: number;
};

export type CandidatoRecuperado = TrechoRecuperado & ProcedenciaCandidato;

/** Intercala consultas sem comparar scores de buscas diferentes. */
export function selecionarTrechosDasConsultas<T extends { chunk_id: string }>(listas: T[][]): T[] {
  const finais: T[] = [];
  const vistos = new Set<string>();
  const tamanho = Math.max(0, ...listas.map((lista) => lista.length));
  for (let posicao = 0; posicao < tamanho; posicao++) {
    for (const lista of listas) {
      const trecho = lista[posicao];
      if (!trecho || vistos.has(trecho.chunk_id)) continue;
      vistos.add(trecho.chunk_id);
      finais.push(trecho);
      if (finais.length === 8) return finais;
    }
  }
  return finais;
}

export type ResultadoRecuperacao = {
  finais: CandidatoRecuperado[];
  candidatos: CandidatoRecuperado[];
  diagnostico: {
    estrategia: "controle" | "rrf_rastreavel";
    duracao_ms: number;
    fonte_continuidade_usada: boolean;
    falhas: string[];
  };
};

type LinhaTextual = Pick<TrechoRecuperado, "chunk_id" | "conteudo" | "fonte_id"> & {
  relevancia: number;
  posicao_na_fonte?: number;
};

type LinhaChunkComFonte = Omit<TrechoRecuperado, "titulo" | "autor_orgao" | "tipo_fonte" | "confiabilidade" | "data_documento" | "url_origem"> & {
  fontes: Pick<TrechoRecuperado, "titulo" | "autor_orgao" | "tipo_fonte" | "confiabilidade" | "data_documento" | "url_origem" | "nota_contexto"> | Array<Pick<TrechoRecuperado, "titulo" | "autor_orgao" | "tipo_fonte" | "confiabilidade" | "data_documento" | "url_origem" | "nota_contexto">>;
};

const EXPERIMENTAL = () => process.env.RAG_RECUPERACAO_EXPERIMENTAL === "1";
const numeroAmbiente = (nome: string, padrao: number) => {
  const valor = Number(process.env[nome] ?? padrao);
  return Number.isFinite(valor) && valor > 0 ? valor : padrao;
};

function acrescentarOrigem(trecho: TrechoRecuperado, origem: ProcedenciaCandidato["origem"][number], posicao: number, campos: Partial<ProcedenciaCandidato> = {}): CandidatoRecuperado {
  return {
    ...trecho,
    origem: [origem],
    ...(origem === "vetorial" ? { posicao_vetorial: posicao } : { posicao_textual: posicao }),
    ...campos,
  };
}

function fundirCandidatos(candidatos: CandidatoRecuperado[]): CandidatoRecuperado[] {
  const porId = new Map<string, CandidatoRecuperado>();
  for (const candidato of candidatos) {
    const anterior = porId.get(candidato.chunk_id);
    if (!anterior) {
      porId.set(candidato.chunk_id, candidato);
      continue;
    }
    porId.set(candidato.chunk_id, {
      ...anterior,
      origem: [...new Set([...anterior.origem, ...candidato.origem])],
      posicao_vetorial: Math.min(anterior.posicao_vetorial ?? Infinity, candidato.posicao_vetorial ?? Infinity) || undefined,
      posicao_textual: Math.min(anterior.posicao_textual ?? Infinity, candidato.posicao_textual ?? Infinity) || undefined,
      pontuacao_rrf: Math.max(anterior.pontuacao_rrf ?? 0, candidato.pontuacao_rrf ?? 0) || undefined,
    });
  }
  return [...porId.values()];
}

function intercalar(candidatosVetoriais: CandidatoRecuperado[], candidatosTextuais: CandidatoRecuperado[]): CandidatoRecuperado[] {
  const resultado: CandidatoRecuperado[] = [];
  const vistos = new Set<string>();
  const listas = [candidatosVetoriais, candidatosTextuais];
  let indice = 0;
  while (resultado.length < 8 && listas.some((lista) => indice < lista.length)) {
    for (const lista of listas) {
      const atual = lista[indice];
      if (atual && !vistos.has(atual.chunk_id)) {
        vistos.add(atual.chunk_id);
        resultado.push(atual);
        if (resultado.length === 8) return resultado;
      }
    }
    indice += 1;
  }
  return resultado;
}

async function recarregarTextuais(
  candidatos: LinhaTextual[],
  signal?: AbortSignal,
): Promise<CandidatoRecuperado[]> {
  const ids = [...new Set(candidatos.map((candidato) => candidato.chunk_id))];
  if (!ids.length) return [];
  if (signal) conferirPrazo(signal);
  const consulta = supabaseServidor
    .from("chunks")
    .select("chunk_id,conteudo,paginas,secao,tipo_chunk,fonte_id,nota_contexto,fontes!inner(titulo,autor_orgao,tipo_fonte,confiabilidade,data_documento,url_origem,nota_contexto)")
    .in("chunk_id", ids);
  const { data, error } = signal
    ? await aguardarNoPrazo(comSinalDePrazo(consulta, signal), signal)
    : await consulta;
  if (error) throw new Error(`Falha ao recarregar metadados textuais: ${error.message}`);
  const porId = new Map<string, TrechoRecuperado>();
  for (const linha of (data ?? []) as unknown as LinhaChunkComFonte[]) {
    const fonte = Array.isArray(linha.fontes) ? linha.fontes[0] : linha.fontes;
    if (fonte) porId.set(linha.chunk_id, { ...linha, ...fonte, nota_contexto: linha.nota_contexto ?? fonte.nota_contexto });
  }
  return candidatos.map((candidato, indice) => {
    const trecho = porId.get(candidato.chunk_id);
    return trecho ? acrescentarOrigem(trecho, "textual_por_fonte", indice + 1) : null;
  }).filter((trecho): trecho is CandidatoRecuperado => trecho !== null);
}

async function buscarTextuaisPorFontes(
  consulta: string,
  fontes: string[],
  qtdPorFonte: number,
  signal?: AbortSignal,
): Promise<CandidatoRecuperado[]> {
  if (!fontes.length) return [];
  if (signal) conferirPrazo(signal);
  const busca = supabaseServidor.rpc("buscar_chunks_textuais_por_fontes", {
    consulta_texto: consulta, fontes_candidatas: fontes.slice(0, 8), qtd_por_fonte: qtdPorFonte,
  });
  const { data, error } = signal
    ? await aguardarNoPrazo(comSinalDePrazo(busca, signal), signal)
    : await busca;
  if (error) throw new Error(`Falha na busca textual por fonte: ${error.message}`);
  const filtrados = ((data ?? []) as LinhaTextual[])
    .filter((trecho) => possuiTermosSuficientesDaConsulta(trecho.conteudo, consulta))
    .sort((a, b) => b.relevancia - a.relevancia)
    .slice(0, 96);
  return recarregarTextuais(filtrados, signal);
}

async function recuperarControle(
  consulta: string,
  embedding: number[],
  continuidade: string[],
  inicio: number,
  falhas: string[],
  signal?: AbortSignal,
): Promise<ResultadoRecuperacao> {
  if (signal) conferirPrazo(signal);
  const busca = supabaseServidor.rpc("buscar_chunks", {
    consulta_embedding: embedding,
  });
  const { data, error } = signal
    ? await aguardarNoPrazo(comSinalDePrazo(busca, signal), signal)
    : await busca;
  if (error) throw new Error(`Falha na busca de chunks: ${error.message}`);
  const vetoriais = ((data ?? []) as TrechoRecuperado[])
    .slice(0, 8)
    .map((trecho, indice) => acrescentarOrigem(trecho, "vetorial", indice + 1));
  let textuais: CandidatoRecuperado[] = [];
  if (continuidade.length) {
    try {
      textuais = await buscarTextuaisPorFontes(consulta, continuidade, 4, signal);
    } catch (erro) {
      if (signal?.aborted) throw erro;
      falhas.push("busca_textual_por_fonte");
    }
  }
  const finais = continuidade.length ? intercalar(vetoriais, textuais) : vetoriais;
  return {
    finais,
    candidatos: fundirCandidatos([...vetoriais, ...textuais]),
    diagnostico: {
      estrategia: "controle",
      duracao_ms: Math.round(performance.now() - inicio),
      fonte_continuidade_usada: continuidade.length > 0,
      falhas,
    },
  };
}

/** Busca sem mudar o contrato público; a variante RRF requer a migração 0028. */
export async function recuperarTrechos(
  consulta: string,
  embedding: number[],
  fontesContinuidade: string[] | null,
  inicioRequisicao = Date.now(),
  signal?: AbortSignal,
): Promise<ResultadoRecuperacao> {
  const inicio = performance.now();
  const falhas: string[] = [];
  const continuidade = fontesContinuidade ?? [];
  if (signal) conferirPrazo(signal);
  if (!EXPERIMENTAL()) {
    return recuperarControle(
      consulta,
      embedding,
      continuidade,
      inicio,
      falhas,
      signal,
    );
  }

  let data: unknown;
  try {
    if (signal) conferirPrazo(signal);
    const busca = supabaseServidor.rpc("buscar_candidatos_hibridos_rastreaveis", {
      consulta_texto: consulta, consulta_embedding: embedding, limiar_semantico: 0.82, qtd: 50,
      peso_textual: numeroAmbiente("RAG_RRF_PESO_TEXTUAL", 1), peso_semantico: numeroAmbiente("RAG_RRF_PESO_SEMANTICO", 1), rrf_k: numeroAmbiente("RAG_RRF_K", 50),
    });
    const resultado = signal
      ? await aguardarNoPrazo(comSinalDePrazo(busca, signal), signal)
      : await busca;
    if (resultado.error) throw new Error(`Falha na busca RRF rastreável: ${resultado.error.message}`);
    data = resultado.data;
  } catch (erro) {
    if (signal?.aborted) throw erro;
    falhas.push("rrf_rastreavel_falhou_fallback_controle");
    return recuperarControle(
      consulta,
      embedding,
      continuidade,
      inicio,
      falhas,
      signal,
    );
  }
  const hibridos = ((data ?? []) as Array<TrechoRecuperado & { posicao_textual: number | null; posicao_semantica: number | null; pontuacao_rrf: number }>).map((trecho) => ({
    ...trecho, origem: (trecho.posicao_textual
      ? ["textual_global", ...(trecho.posicao_semantica ? ["vetorial" as const] : [])]
      : ["vetorial"]) as CandidatoRecuperado["origem"],
    posicao_vetorial: trecho.posicao_semantica ?? undefined, posicao_textual: trecho.posicao_textual ?? undefined,
  }));
  const fontes = [...new Set([...continuidade, ...hibridos.map((trecho) => trecho.fonte_id)])].slice(0, 8);
  let porFonte: CandidatoRecuperado[] = [];
  try { porFonte = await buscarTextuaisPorFontes(consulta, fontes, 12, signal); }
  catch (erro) {
    if (signal?.aborted) throw erro;
    falhas.push("busca_textual_por_fonte");
  }
  const candidatos = fundirCandidatos([...hibridos, ...porFonte]).slice(0, 24);
  if (signal) conferirPrazo(signal);
  const ordemReranqueada = signal
    ? await aguardarNoPrazo(
        reranquearIdsExperimental(consulta, candidatos, inicioRequisicao, signal),
        signal,
      )
    : await reranquearIdsExperimental(consulta, candidatos, inicioRequisicao);
  if (ordemReranqueada) {
    const porId = new Map(candidatos.map((candidato) => [candidato.chunk_id, candidato]));
    const ordenados = ordemReranqueada.map((id) => porId.get(id)).filter((candidato): candidato is CandidatoRecuperado => Boolean(candidato));
    candidatos.splice(0, candidatos.length, ...fundirCandidatos([...ordenados, ...candidatos]));
  }
  return { finais: candidatos.slice(0, 8), candidatos, diagnostico: { estrategia: "rrf_rastreavel", duracao_ms: Math.round(performance.now() - inicio), fonte_continuidade_usada: continuidade.length > 0, falhas } };
}
