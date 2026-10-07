import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const estado = vi.hoisted(() => ({ membro: null as null | { userId: string; emailConfirmado: boolean; curador: boolean }, rpc: vi.fn(), buscarAlvo: vi.fn(), buscarContexto: vi.fn() }));
vi.mock("@/lib/server/supabase", () => ({ supabaseServidor: { rpc: estado.rpc, from: () => ({ select: () => ({ in: estado.buscarContexto, eq: () => ({ maybeSingle: estado.buscarAlvo }) }) }) } }));
vi.mock("@/lib/server/comunidade", () => ({ comunidadeAtiva: () => process.env.BACURI_COMUNIDADE_ATIVA === "true", autenticarMembro: async () => estado.membro, verificarTokenCompartilhamento: () => false }));
vi.mock("@/lib/server/ouro", () => ({ indexarOuro: vi.fn() }));
vi.mock("@/lib/server/limite", () => ({ dentroDoLimite: () => true }));
vi.mock("@/lib/server/registro-comunidade", () => ({ copiarRegistroPublico: vi.fn() }));
import { copiarRegistroPublico } from "@/lib/server/registro-comunidade";
import { indexarOuro } from "@/lib/server/ouro";
import { GET, POST } from "@/app/api/comunidade/route";
const userId = "10000000-0000-4000-8000-000000000001";
function post(dados: unknown) { return new NextRequest("http://localhost/api/comunidade", { method: "POST", headers: { authorization: "Bearer teste" }, body: JSON.stringify(dados) }); }
beforeEach(() => { vi.stubEnv("BACURI_COMUNIDADE_ATIVA", "true"); estado.membro = { userId, emailConfirmado: true, curador: false }; estado.buscarContexto.mockReset().mockResolvedValue({ data: [], error: null }); estado.buscarAlvo.mockReset().mockResolvedValue({ data: { autor_id: "outra-pessoa" }, error: null }); estado.rpc.mockReset().mockResolvedValue({ data: { ok: true }, error: null }); });
afterEach(() => { vi.unstubAllEnvs(); });
describe("API comunidade — fronteiras de autorização", () => {
  it("mantém operações bloqueadas antes da implantação", async () => { vi.stubEnv("BACURI_COMUNIDADE_ATIVA", "false"); expect((await GET(new NextRequest("http://localhost/api/comunidade?recurso=discussoes"))).status).toBe(503); expect(estado.rpc).not.toHaveBeenCalled(); });
  it("exige sessão confirmada e não aceita ator fornecido pelo cliente", async () => {
    estado.membro!.emailConfirmado = false; expect((await POST(post({ acao: "salvar_perfil", dados: { tag: "@teste", aceita_termos: true } }))).status).toBe(401);
    estado.membro!.emailConfirmado = true; expect((await POST(post({ acao: "salvar_perfil", dados: { tag: "@teste", aceita_termos: true, user_id: "outro" } }))).status).toBe(400); expect(estado.rpc).not.toHaveBeenCalled();
  });
  it("rejeita compartilhamento sem capacidade válida", async () => {
    const r = await POST(post({ acao: "compartilhar", dados: { interacao_id: "40000000-0000-4000-8000-000000000001", token_compartilhamento: "forjado", titulo: "Discussão", motivo: "Verificar as referências.", categoria: "fontes", confirmacao_publicacao: true } })); expect(r.status).toBe(403); expect(estado.rpc).not.toHaveBeenCalled();
  });
  it("não entrega painel privado a membro comum", async () => { expect((await GET(new NextRequest("http://localhost/api/comunidade?recurso=curadoria", { headers: { authorization: "Bearer teste" } }))).status).toBe(403); expect(estado.rpc).not.toHaveBeenCalled(); });
  it("insere ator validado em transação e oculta mensagens internas", async () => {
    const r = await POST(post({ acao: "salvar_perfil", dados: { tag: "@teste", aceita_termos: true } })); expect(r.status).toBe(200); expect(estado.rpc).toHaveBeenCalledWith("comunidade_executar", expect.objectContaining({ p_ator: userId }));
    estado.rpc.mockResolvedValueOnce({ data: null, error: { message: "senha-secreta em falha interna" } }); const e = await GET(new NextRequest("http://localhost/api/comunidade?recurso=discussoes")); expect(await e.text()).not.toContain("senha-secreta");
  });
});

describe("denúncias conferem autoria no servidor", () => {
  const dados = { alvo_tipo: "comentario", alvo_id: "70000000-0000-4000-8000-000000000001", motivo: "Motivo suficiente para conferir esta publicação." };
  it.each(["comentario", "proposta", "discussao", "membro"])("bloqueia auto denúncia de %s", async alvo_tipo => {
    estado.buscarAlvo.mockResolvedValueOnce({ data: { autor_id: userId, user_id: userId }, error: null });
    expect((await POST(post({ acao: "denunciar", dados: { ...dados, alvo_tipo } }))).status).toBe(403);
    expect(estado.rpc).not.toHaveBeenCalled();
  });
  it("aceita alvo de outra pessoa", async () => {
    expect((await POST(post({ acao: "denunciar", dados }))).status).toBe(200);
    expect(estado.rpc).toHaveBeenCalled();
  });
  it("não registra alvo ausente nem autoria indisponível", async () => {
    estado.buscarAlvo.mockResolvedValueOnce({ data: null, error: null });
    expect((await POST(post({ acao: "denunciar", dados }))).status).toBe(404);
    estado.buscarAlvo.mockResolvedValueOnce({ data: null, error: { message: "falha" } });
    expect((await POST(post({ acao: "denunciar", dados }))).status).toBe(503);
    expect(estado.rpc).not.toHaveBeenCalled();
  });
});

it("localiza comentários denunciados somente no painel autenticado de curadores", async () => {
  estado.membro!.curador = true;
  const alvo_id = "70000000-0000-4000-8000-000000000001", discussao_id = "40000000-0000-4000-8000-000000000001";
  estado.rpc.mockResolvedValueOnce({ data: { denuncias: [{ alvo_tipo: "comentario", alvo_id }], moderacoes: [] }, error: null });
  estado.buscarContexto.mockResolvedValueOnce({ data: [{ comentario_id: alvo_id, discussao_id }], error: null });
  const r = await GET(new NextRequest("http://localhost/api/comunidade?recurso=curadoria", { headers: { authorization: "Bearer teste" } }));
  expect(r.status).toBe(200); expect((await r.json()).denuncias[0].discussao_id).toBe(discussao_id);
});

it("notificações antigas conservam paginação e ganham título da discussão", async () => {
  const discussao_id = "40000000-0000-4000-8000-000000000001";
  estado.rpc.mockResolvedValueOnce({ data: { itens: [{ notificacao_id: "n-antiga", dados: { discussao_id }, lida_em: null }], total: 28, pagina: 2 }, error: null });
  estado.buscarContexto.mockResolvedValueOnce({ data: [{ discussao_id, titulo: "Discussão conhecida" }], error: null });
  const r = await GET(new NextRequest("http://localhost/api/comunidade?recurso=notificacoes&pagina=2", { headers: { authorization: "Bearer teste" } }));
  expect(r.status).toBe(200); expect(await r.json()).toMatchObject({ total: 28, pagina: 2, itens: [{ titulo_discussao: "Discussão conhecida" }] });
  expect(estado.rpc).toHaveBeenCalledWith("comunidade_consultar", expect.objectContaining({ p_ator: userId, p_dados: expect.objectContaining({ pagina: 2 }) }));
});


describe("registros públicos e conclusão editorial", () => {
  const dados = { origem: "biografia", registro_id: "pessoa-teste", titulo: "Revisar biografia", motivo: "Conferir as fontes da biografia.", categoria: "fontes", confirmacao_publicacao: true };
  it("envia à transação somente cópia obtida pelo servidor", async () => {
    const copia = { slug: "pessoa-teste", fontes: [{ titulo: "Fonte do servidor", paginas: "4" }] };
    vi.mocked(copiarRegistroPublico).mockResolvedValueOnce(copia as never);
    expect((await POST(post({ acao: "compartilhar_registro", dados }))).status).toBe(200);
    expect(estado.rpc).toHaveBeenCalledWith("comunidade_executar", expect.objectContaining({ p_dados: { ...dados, registro_original: copia } }));
  });
  it("rejeita cópia, link ou autor enviados pelo navegador", async () => {
    for (const extra of [{ registro_original: {} }, { origem_link: "https://forjado.test" }, { autor_id: userId }]) {
      expect((await POST(post({ acao: "compartilhar_registro", dados: { ...dados, ...extra } }))).status).toBe(400);
    }
    expect(estado.rpc).not.toHaveBeenCalled();
  });
  it("exige conta confirmada e registro publicado", async () => {
    estado.membro = null; expect((await POST(post({ acao: "compartilhar_registro", dados }))).status).toBe(401);
    estado.membro = { userId, emailConfirmado: true, curador: false };
    vi.mocked(copiarRegistroPublico).mockResolvedValueOnce(null);
    expect((await POST(post({ acao: "compartilhar_registro", dados }))).status).toBe(404);
    expect(estado.rpc).not.toHaveBeenCalled();
  });
  it("aprovação editorial não chama indexação ouro", async () => {
    vi.mocked(indexarOuro).mockClear();
    estado.rpc.mockResolvedValueOnce({ data: { resultado: "aprovada", estado_editorial: "pendente" }, error: null });
    expect((await POST(post({ acao: "parecer", dados: { versao_id: userId, resultado: "aprovar", justificativa: "Fontes conferidas nesta versão.", sintese: "Revisão do registro encaminhada." } }))).status).toBe(200);
    expect(indexarOuro).not.toHaveBeenCalled();
  });
  it("conclusão exige curador e usa a identidade fornecida pelo banco", async () => {
    const conclusao = { decisao_id: userId, justificativa: "Revisão publicada no fluxo editorial." };
    expect((await POST(post({ acao: "concluir_editorial", dados: conclusao }))).status).toBe(403);
    estado.membro!.curador = true;
    estado.rpc.mockResolvedValueOnce({ data: { origem: "biografia", registro_id: "pessoa-teste" }, error: null });
    vi.mocked(copiarRegistroPublico).mockResolvedValueOnce({ slug: "pessoa-teste", texto_md: "Revisado" } as never);
    expect((await POST(post({ acao: "concluir_editorial", dados: conclusao }))).status).toBe(200);
    expect(copiarRegistroPublico).toHaveBeenLastCalledWith("biografia", "pessoa-teste");
  });
});
