import { beforeEach, describe, expect, it, vi } from "vitest";
const estado = vi.hoisted(() => ({ dados: {} as Record<string, unknown[]>, falha: false, hashes: {} as Record<string, string> }));
vi.mock("@/lib/server/supabase", () => ({ supabaseServidor: {
  from: (tabela: string) => ({ select: () => ({ in: async () => ({ data: estado.dados[tabela] || [], error: estado.falha ? { message: "falha" } : null }) }) }),
  rpc: async () => ({ data: estado.hashes, error: null }),
} }));
import { acrescentarQuoruns, resumirQuorum, type PainelQuorum } from "@/lib/server/quorum-comunidade";
beforeEach(() => { estado.dados = {}; estado.falha = false; estado.hashes = { fonte: "atual" }; });
const ids = ["a", "b", "c", "d", "e"];
const voto = (curador_id: string, resultado = "aprovar") => ({ curador_id, resultado });
describe("indicador segue o quórum de governança", () => {
  it("dois concordantes bastam na ausência de divergência", () => {
    expect(resumirQuorum(ids, [voto("a"), voto("b")], "a")).toMatchObject({ necessarios: 2, faltam: 0, recebidos: 2, insuficientes: 0 });
  });
  it("divergência exige maioria absoluta, inclusive pedido de ajuste", () => {
    expect(resumirQuorum(ids, [voto("a"), voto("b"), voto("c", "ajustes")], "a")).toMatchObject({ necessarios: 3, faltam: 1, ajustes: 1 });
  });
  it("um único revisor independente não pode completar o quórum", () => {
    expect(resumirQuorum(["d"], [voto("d")], "a")).toMatchObject({ necessarios: 2, recebidos: 1, insuficientes: 1, impedido: true });
  });
  it("unanimidade não conta voto contrário como aprovação", () => {
    expect(resumirQuorum(ids.slice(0, 3), [voto("a"), voto("b", "recusar")], "a", "unanimidade")).toMatchObject({ necessarios: 3, faltam: 2, contrarios: 1 });
  });
  it("destituição exige dois terços dos demais curadores", () => {
    expect(resumirQuorum(ids, [voto("a"), voto("b")], "a", "destituicao")).toMatchObject({ necessarios: 4, faltam: 2 });
  });
});
function painel(): PainelQuorum { return { curadores: ids.map(user_id => ({ user_id, ativo: true })), itens: [{ proposta_id: "p", versao: { versao_id: "v", ciclo: 2, estado: "recorrida", chunk_ids: [] } }], candidaturas: [], recursos: [], destituicoes: [] }; }
it("desconta autoria, contribuição anterior, revisores anteriores e suspensão", async () => {
  estado.dados = {
    membros_comunidade: [{ user_id: "e", suspenso_em: "ontem", encerrado_em: null }],
    propostas_comunidade: [{ proposta_id: "p", autor_id: "a" }],
    propostas_versoes: [{ proposta_id: "p", comentario_incorporado_id: "comentario-antigo" }],
    comentarios_comunidade: [{ comentario_id: "comentario-antigo", autor_id: "b" }],
    pareceres_comunidade: [{ versao_id: "v", curador_id: "c", ciclo: 1, resultado: "recusar", hashes_fontes: { fonte: "atual" } }, { versao_id: "v", curador_id: "d", ciclo: 2, resultado: "recusar", hashes_fontes: { fonte: "antigo" } }],
  };
  const r = await acrescentarQuoruns(painel(), "c");
  expect(r.itens[0].quorum).toMatchObject({ elegiveis: 1, recebidos: 0, insuficientes: 1, impedido: true });
  (estado.dados.pareceres_comunidade[1] as { hashes_fontes: object }).hashes_fontes = { fonte: "atual" };
  expect((await acrescentarQuoruns(painel(), "d")).itens[0].quorum).toMatchObject({ recebidos: 1, contrarios: 1, faltam: 1, impedido: false });
});
it("recurso de moderação exclui moderador e autor do recurso", async () => {
  const p = painel(); p.itens = []; p.recursos = [{ recurso_id: "r", alvo_tipo: "moderacao", alvo_id: "m" }];
  estado.dados = { moderacoes_comunidade: [{ moderacao_id: "m", curador_id: "a" }], recursos_comunidade: [{ recurso_id: "r", autor_id: "b" }], pareceres_recurso: [{ recurso_id: "r", curador_id: "c", aprova: true }] };
  expect((await acrescentarQuoruns(p, "a")).recursos[0].quorum).toMatchObject({ elegiveis: 3, favoraveis: 1, faltam: 1, impedido: true });
});
it("erro de leitura não apresenta zero votos como se a conferência tivesse funcionado", async () => {
  estado.falha = true; await expect(acrescentarQuoruns(painel(), "a")).rejects.toThrow("quórum");
});
