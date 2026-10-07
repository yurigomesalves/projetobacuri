import { supabaseServidor } from "./supabase";

export type Quorum = {
  elegiveis: number; recebidos: number; favoraveis: number; contrarios: number;
  ajustes: number; necessarios: number; faltam: number; insuficientes: number;
  impedido: boolean; aguarda_consentimento?: boolean; aguarda_defesa?: boolean;
};
type Curador = { user_id: string; ativo: boolean };
type Parecer = { versao_id: string; curador_id: string; ciclo: number; resultado: string; hashes_fontes: Record<string, string> };
type Item = { proposta_id: string; versao: { versao_id: string; ciclo: number; estado: string; chunk_ids: string[] }; quorum?: Quorum };
type Candidatura = { candidatura_id: string; consentido_em: string | null; votos: { curador_id: string; aprova: boolean }[] | null };
type Recurso = { recurso_id: string; alvo_tipo: string; alvo_id: string; quorum?: Quorum };
type Destituicao = { destituicao_id: string; alvo_id: string; defesa: string | null; criado_em: string };
export type PainelQuorum = { curadores: Curador[]; itens: Item[]; candidaturas: Candidatura[]; recursos: Recurso[]; destituicoes: Destituicao[] };

export function resumirQuorum(elegiveis: string[], votos: { curador_id: string; resultado: string }[], ator: string, regra: "parecer" | "unanimidade" | "destituicao" = "parecer"): Quorum {
  const validos = votos.filter(v => elegiveis.includes(v.curador_id));
  const favoraveis = validos.filter(v => v.resultado === "aprovar").length;
  const contrarios = validos.filter(v => v.resultado === "recusar").length;
  const ajustes = validos.filter(v => v.resultado === "ajustes").length;
  const divergencia = new Set(validos.map(v => v.resultado)).size > 1;
  const necessarios = regra === "unanimidade" ? elegiveis.length : regra === "destituicao" ? Math.ceil(elegiveis.length * 2 / 3) : divergencia ? Math.max(2, Math.floor(elegiveis.length / 2) + 1) : 2;
  const concordantes = regra === "parecer" ? Math.max(favoraveis, contrarios) : favoraveis;
  return { elegiveis: elegiveis.length, recebidos: validos.length, favoraveis, contrarios, ajustes, necessarios,
    faltam: Math.max(0, necessarios - concordantes), insuficientes: Math.max(0, necessarios - elegiveis.length), impedido: !elegiveis.includes(ator) };
}
const mesmosHashes = (a: Record<string, string>, b: Record<string, string>) => Object.keys(a).length === Object.keys(b).length && Object.entries(a).every(([k, v]) => b[k] === v);
async function linhas<T>(tabela: string, colunas: string, chave: string, ids: string[]): Promise<T[]> {
  if (!ids.length) return [];
  const { data, error } = await supabaseServidor.from(tabela).select(colunas).in(chave, [...new Set(ids)]);
  if (error) throw new Error("Não foi possível conferir o quórum.");
  return (data || []) as unknown as T[];
}

export async function acrescentarQuoruns(painel: PainelQuorum, ator: string) {
  const ativos = painel.curadores.filter(c => c.ativo).map(c => c.user_id);
  const versoesIds = painel.itens.map(p => p.versao.versao_id);
  const propostasIds = painel.itens.map(p => p.proposta_id);
  const recursos = painel.recursos.filter(r => r.alvo_tipo === "moderacao");
  const [membros, propostas, versoes, pareceres, moderacoes, recursosDados, votosRecursos, votosDestituicao, hashes] = await Promise.all([
    linhas<{ user_id: string; suspenso_em: string | null; encerrado_em: string | null }>("membros_comunidade", "user_id,suspenso_em,encerrado_em", "user_id", ativos),
    linhas<{ proposta_id: string; autor_id: string }>("propostas_comunidade", "proposta_id,autor_id", "proposta_id", propostasIds),
    linhas<{ proposta_id: string; comentario_incorporado_id: string | null }>("propostas_versoes", "proposta_id,comentario_incorporado_id", "proposta_id", propostasIds),
    linhas<Parecer>("pareceres_comunidade", "versao_id,curador_id,ciclo,resultado,hashes_fontes", "versao_id", versoesIds),
    linhas<{ moderacao_id: string; curador_id: string }>("moderacoes_comunidade", "moderacao_id,curador_id", "moderacao_id", recursos.map(r => r.alvo_id)),
    linhas<{ recurso_id: string; autor_id: string }>("recursos_comunidade", "recurso_id,autor_id", "recurso_id", recursos.map(r => r.recurso_id)),
    linhas<{ recurso_id: string; curador_id: string; aprova: boolean }>("pareceres_recurso", "recurso_id,curador_id,aprova", "recurso_id", recursos.map(r => r.recurso_id)),
    linhas<{ destituicao_id: string; curador_id: string; aprova: boolean }>("votos_destituicao", "destituicao_id,curador_id,aprova", "destituicao_id", painel.destituicoes.map(d => d.destituicao_id)),
    Promise.all(painel.itens.map(async p => {
      const r = await supabaseServidor.rpc("comunidade_hashes", { p_ids: p.versao.chunk_ids });
      if (r.error || !r.data || typeof r.data !== "object" || Array.isArray(r.data)) throw new Error("Não foi possível conferir as fontes.");
      return [p.versao.versao_id, r.data as Record<string, string>] as const;
    })),
  ]);
  const habilitados = ativos.filter(id => !membros.some(m => m.user_id === id && (m.suspenso_em || m.encerrado_em)));
  const comentarios = await linhas<{ comentario_id: string; autor_id: string }>("comentarios_comunidade", "comentario_id,autor_id", "comentario_id", versoes.flatMap(v => v.comentario_incorporado_id ? [v.comentario_incorporado_id] : []));
  const hashPorVersao = new Map(hashes);
  const itens = painel.itens.map(p => {
    if (!propostas.some(x => x.proposta_id === p.proposta_id)) throw new Error("A proposta mudou durante a leitura.");
    const impedidos = new Set([propostas.find(x => x.proposta_id === p.proposta_id)?.autor_id,
      ...versoes.filter(v => v.proposta_id === p.proposta_id).map(v => comentarios.find(c => c.comentario_id === v.comentario_incorporado_id)?.autor_id),
      ...(p.versao.estado === "recorrida" ? pareceres.filter(pc => pc.versao_id === p.versao.versao_id && pc.ciclo < p.versao.ciclo).map(pc => pc.curador_id) : []),
    ]);
    const elegiveis = habilitados.filter(id => !impedidos.has(id));
    const validos = pareceres.filter(pc => pc.versao_id === p.versao.versao_id && pc.ciclo === p.versao.ciclo && mesmosHashes(pc.hashes_fontes, hashPorVersao.get(pc.versao_id) || {}));
    return { ...p, quorum: resumirQuorum(elegiveis, validos, ator) };
  });
  return { ...painel, itens,
    candidaturas: painel.candidaturas.map(c => ({ ...c, quorum: { ...resumirQuorum(ativos, (c.votos || []).map(v => ({ ...v, resultado: v.aprova ? "aprovar" : "recusar" })), ator, "unanimidade"), aguarda_consentimento: !c.consentido_em } })),
    recursos: painel.recursos.map(r => {
      if (r.alvo_tipo === "decisao") return r;
      const mo = moderacoes.find(m => m.moderacao_id === r.alvo_id);
      const re = recursosDados.find(x => x.recurso_id === r.recurso_id);
      if (!mo || !re) throw new Error("O recurso mudou durante a leitura.");
      const elegiveis = habilitados.filter(id => id !== mo?.curador_id && id !== re?.autor_id);
      return { ...r, quorum: resumirQuorum(elegiveis, votosRecursos.filter(v => v.recurso_id === r.recurso_id).map(v => ({ ...v, resultado: v.aprova ? "aprovar" : "recusar" })), ator) };
    }),
    destituicoes: painel.destituicoes.map(d => ({ ...d, quorum: { ...resumirQuorum(ativos.filter(id => id !== d.alvo_id), votosDestituicao.filter(v => v.destituicao_id === d.destituicao_id).map(v => ({ ...v, resultado: v.aprova ? "aprovar" : "recusar" })), ator, "destituicao"), aguarda_defesa: !d.defesa && Date.now() - Date.parse(d.criado_em) < 7 * 86400000 } })),
  };
}
