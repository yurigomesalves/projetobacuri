// Dados de teste compartilhados. Conteúdo factual e sóbrio, coerente com o
// acervo real (Relatório da CNV), sem nomes de vítimas inventados.

export const UUID_INTERACAO = "11111111-1111-4111-8111-111111111111";
export const UUID_FEEDBACK = "22222222-2222-4222-8222-222222222222";
export const UUID_EVENTO = "33333333-3333-4333-8333-333333333333";
export const UUID_BIOGRAFIA = "44444444-4444-4444-8444-444444444444";

// Vetor de embedding falso com a mesma dimensão do modelo real
// (multilingual-e5-small, 384 dimensões).
export const VETOR_FALSO = Array.from({ length: 384 }, () => 0.01);

// Linha retornada pela RPC buscar_chunks (ver TrechoBuscado em
// app/api/chat/route.ts).
export function trechoBuscado(parcial: Record<string, unknown> = {}) {
  return {
    chunk_id: "chunk-001",
    conteudo:
      "O Ato Institucional nº 5, de 13 de dezembro de 1968, suspendeu garantias " +
      "constitucionais e marcou o endurecimento do regime.",
    paginas: "45-46",
    secao: "Capítulo 3",
    tipo_chunk: "corpo",
    similaridade: 0.91,
    fonte_id: "fonte-cnv-v1",
    titulo: "Relatório da Comissão Nacional da Verdade — Volume I",
    autor_orgao: "Comissão Nacional da Verdade",
    tipo_fonte: "relatorio_oficial",
    confiabilidade: "alta",
    data_documento: "2014-12-10",
    url_origem: "https://exemplo.org/cnv/volume1.pdf",
    nota_contexto: null,
    ...parcial,
  };
}

// Linha de tabela de ligação (biografia_fontes, evento_fontes) com join de
// `fontes`, no formato esperado por montarCitacao (lib/server/citacoes.ts).
export function linhaFonteJoin(parcial: Record<string, unknown> = {}) {
  return {
    fonte_id: "fonte-cnv-v1",
    paginas: "120",
    trecho: "Trecho citado verbatim do relatório para fins de teste.",
    secao: "Capítulo 5",
    ordem: 1,
    fontes: {
      titulo: "Relatório da Comissão Nacional da Verdade — Volume I",
      autor_orgao: "Comissão Nacional da Verdade",
      tipo_fonte: "relatorio_oficial",
      confiabilidade: "alta",
      data_documento: "2014-12-10",
      url_origem: "https://exemplo.org/cnv/volume1.pdf",
      nota_contexto: null,
    },
    ...parcial,
  };
}

// Linha de *_marcadores: igual à de fontes, com o campo `marcador`.
export function linhaMarcadorJoin(parcial: Record<string, unknown> = {}) {
  return {
    marcador: "6.2.repressao_a_trabalhadores",
    ...linhaFonteJoin(parcial),
  };
}

// Linha da tabela `biografias` (campos selecionados pelas rotas).
export function linhaBiografia(parcial: Record<string, unknown> = {}) {
  return {
    biografia_id: UUID_BIOGRAFIA,
    slug: "biografia-de-teste",
    nome: "Biografia de Teste",
    tipo: "vitima",
    resumo_1_linha: "Resumo de uma linha para fins de teste.",
    texto_md: "# Biografia\n\nTexto em markdown para fins de teste.",
    municipio: "São Paulo",
    uf: "SP",
    status_curadoria: "publicada",
    ...parcial,
  };
}

// Linha da tabela `eventos_geo` (lista do mapa). Ponto em São Paulo.
export function linhaEventoGeo(parcial: Record<string, unknown> = {}) {
  return {
    evento_id: UUID_EVENTO,
    titulo: "Evento de teste",
    data: "1970-01-01",
    municipio: "São Paulo",
    uf: "SP",
    geometria: { type: "Point", coordinates: [-46.63, -23.55] },
    tipos_crime: ["prisao_ilegal_arbitraria"],
    ...parcial,
  };
}

// Linha completa de `eventos_geo` (detalhe, com colunas do bloco de justiça).
export function linhaEventoGeoCompleta(parcial: Record<string, unknown> = {}) {
  return {
    ...linhaEventoGeo(),
    descricao_md: "Descrição em markdown para fins de teste.",
    status_curadoria: "publicada",
    justica_descricao_crimes_md: "Descrição dos crimes (teste).",
    justica_enquadramento_atual_md: "Enquadramento atual (teste).",
    justica_punicao_ocorrida_md: "Punição ocorrida (teste).",
    justica_nota_metodologica_md: "Nota metodológica (teste).",
    revisado_por_humano: false,
    ...parcial,
  };
}

// Linha da tabela `feedbacks` com join de `interacoes`, como retornada nas
// rotas de transparência e curadoria.
export function linhaFeedback(parcial: Record<string, unknown> = {}) {
  return {
    feedback_id: UUID_FEEDBACK,
    classificacao: "incompleta",
    resposta_alternativa: "Sugestão de resposta alternativa para teste.",
    fontes_sugeridas: "Relatório da CNV, Volume I, capítulo 3.",
    status: "aceito",
    justificativa_decisao: "Justificativa pública da decisão, para teste.",
    criado_em: "2026-06-01T12:00:00Z",
    decidido_em: "2026-06-02T12:00:00Z",
    interacao: {
      interacao_id: UUID_INTERACAO,
      pergunta: "O que foi o AI-5?",
      resposta: "Resposta registrada para fins de teste [1].",
      citacoes: [],
    },
    ...parcial,
  };
}
