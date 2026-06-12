// Helpers para montar `Citacao` e `Marcador` (lib/shared/tipos.ts) a partir das
// tabelas de ligação (biografia_fontes, evento_fontes, *_marcadores,
// evento_justica_fontes) e da tabela `fontes`.
//
// Fonte da verdade: docs/contrato-api.md — "Tipos compartilhados" e regra de
// negócio 2/3 da Fase 6.

import type { Citacao, Marcador } from "@/lib/shared/tipos";

// Formato retornado pelo Supabase ao selecionar uma linha de ligação com o
// join `fontes (...)`. O join pode vir como objeto ou array de 1 elemento
// dependendo da versão do client — tratamos os dois casos.
type LinhaFonteJoin = {
  fonte_id: string;
  paginas?: string | null;
  trecho: string;
  secao?: string | null;
  ordem?: number | null;
  fontes:
    | {
        titulo: string;
        autor_orgao: string;
        tipo_fonte: string;
        confiabilidade: string;
        data_documento: string | null;
        url_origem: string;
        nota_contexto: string | null;
      }
    | Array<{
        titulo: string;
        autor_orgao: string;
        tipo_fonte: string;
        confiabilidade: string;
        data_documento: string | null;
        url_origem: string;
        nota_contexto: string | null;
      }>;
};

/**
 * Monta uma `Citacao` a partir de uma linha de ligação (biografia_fontes,
 * evento_fontes ou evento_justica_fontes) já com o join de `fontes`.
 *
 * `n` é informado pelo chamador (ordem 1-based). `tipo_chunk` é sempre
 * "corpo": citações curadas de biografias/eventos vêm do corpo do documento,
 * nunca de notas de rodapé extraídas automaticamente.
 */
export function montarCitacao(linha: LinhaFonteJoin, n: number): Citacao {
  const fonte = Array.isArray(linha.fontes) ? linha.fontes[0] : linha.fontes;

  const citacao: Citacao = {
    n,
    fonte_id: linha.fonte_id,
    titulo: fonte.titulo,
    autor_orgao: fonte.autor_orgao,
    tipo_fonte: fonte.tipo_fonte,
    confiabilidade: fonte.confiabilidade,
    trecho: linha.trecho,
    url_origem: fonte.url_origem,
    tipo_chunk: "corpo",
  };

  if (fonte.data_documento) {
    citacao.data_documento = fonte.data_documento;
  }
  if (linha.paginas) {
    citacao.paginas = linha.paginas;
  }
  if (linha.secao) {
    citacao.secao = linha.secao;
  }
  if (fonte.nota_contexto) {
    citacao.nota_contexto = fonte.nota_contexto;
  }

  return citacao;
}

// Formato de uma linha de *_marcadores com join de fontes.
type LinhaMarcadorJoin = LinhaFonteJoin & { marcador: string };

/**
 * Monta a lista de `Marcador[]` a partir das linhas de `biografia_marcadores`
 * ou `evento_marcadores`. Cada marcador exige sua própria fonte (ADR-001).
 *
 * Convenção adotada (documentar aqui, pois o contrato deixa a critério do
 * arquiteto): o `n` da citação de cada marcador é sempre `0` — marcadores são
 * referências de classificação, não trechos numerados na sequência de
 * `citacoes` do corpo do texto. O frontend exibe a fonte do marcador junto
 * a ele (não pelo índice `[n]`).
 */
export function montarMarcadores(linhas: LinhaMarcadorJoin[]): Marcador[] {
  return linhas.map((linha) => ({
    marcador: linha.marcador,
    fonte: montarCitacao(linha, 0),
  }));
}
