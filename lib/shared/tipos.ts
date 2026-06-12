/// <reference types="geojson" />

// Tipos compartilhados entre backend e frontend.
// Fonte da verdade: docs/contrato-api.md — qualquer alteração aqui deve
// primeiro ser refletida no contrato.

export type Mensagem = {
  papel: "usuario" | "assistente";
  conteudo: string;
};

export type Citacao = {
  n: number;
  fonte_id: string;
  titulo: string;
  autor_orgao: string;
  tipo_fonte: string;
  confiabilidade: string;
  data_documento?: string;
  paginas?: string;
  secao?: string;
  trecho: string;
  url_origem: string;
  nota_contexto?: string;
  tipo_chunk: "corpo" | "nota_rodape";
};

export type Marcador = {
  marcador: string;
  fonte: Citacao;
};

export type BiografiaResumo = {
  slug: string;
  nome: string;
  tipo: "vitima" | "organizacao" | "perpetrador" | "local";
  resumo_1_linha: string;
  municipio?: string;
  uf?: string;
};

export type Biografia = BiografiaResumo & {
  texto_md: string;
  marcadores: Marcador[];
  fontes: Citacao[];
  eventos: string[];
  status_curadoria: string;
};

export type EventoGeo = {
  evento_id: string;
  titulo: string;
  data: string;
  municipio: string;
  uf: string;
  geometria: GeoJSON.Point | GeoJSON.Polygon | GeoJSON.MultiPolygon;
  descricao_md: string;
  vitimas: string[];
  tipos_crime: string[];
  marcadores: Marcador[];
  fontes: Citacao[];
  // Omitido até revisado_por_humano = true (salvaguarda do módulo crimes e
  // justiça — contrato v1.2; o bloco completo chega na Fase 7).
  justica?: BlocoJustica;
};

export type BlocoJustica = {
  descricao_crimes_md: string;
  enquadramento_atual_md: string;
  punicao_ocorrida_md: string;
  nota_metodologica_md: string;
  fontes: Citacao[];
  revisado_por_humano: boolean;
};

// --- Formato de erro (todas as rotas) ---

export type CodigoErro =
  | "ENTRADA_INVALIDA"
  | "ACERVO_SEM_RESULTADO"
  | "LIMITE_EXCEDIDO"
  | "ERRO_INTERNO"
  | "NAO_AUTORIZADO";

export type RespostaErro = {
  erro: {
    codigo: CodigoErro;
    mensagem: string;
  };
};

// --- POST /api/chat ---

export type RequisicaoChat = {
  mensagem: string;
  historico?: Mensagem[];
};

export type RespostaChat = {
  resposta: string;
  citacoes: Citacao[];
  sugestoes_pesquisa: string[];
  interacao_id: string;
};

// --- POST /api/feedback ---

export type RequisicaoFeedback = {
  interacao_id: string;
  classificacao: "util" | "incompleta" | "incorreta";
  resposta_alternativa?: string;
  fontes_sugeridas?: string;
};

export type RespostaFeedback = {
  status: "recebido_para_curadoria";
};

// --- Fase 4: curadoria e transparência ---

export type FeedbackCuradoria = {
  feedback_id: string;
  classificacao: "util" | "incompleta" | "incorreta";
  resposta_alternativa?: string;
  fontes_sugeridas?: string;
  status: "pendente" | "aceito" | "recusado";
  justificativa_decisao?: string;
  criado_em: string;
  decidido_em?: string;
  interacao: {
    interacao_id: string;
    pergunta: string;
    resposta: string;
    citacoes: Citacao[];
  };
};

export type ItemTransparencia = {
  feedback_id: string;
  pergunta: string;
  classificacao: "util" | "incompleta" | "incorreta";
  resposta_alternativa?: string;
  fontes_sugeridas?: string;
  status: "aceito" | "recusado";
  justificativa_decisao: string;
  criado_em: string;
  decidido_em: string;
};
