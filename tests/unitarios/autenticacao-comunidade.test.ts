import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const estado = vi.hoisted(() => ({ usuario: vi.fn(), perfil: vi.fn(), curador: vi.fn() }));
vi.mock("@/lib/server/supabase", () => ({ supabaseServidor: {
  auth: { getUser: estado.usuario },
  from: (tabela: string) => { const fim = tabela === "membros_comunidade" ? estado.perfil : estado.curador; const cadeia = { select: () => cadeia, eq: () => cadeia, maybeSingle: fim }; return cadeia; },
} }));
import { autenticarMembro } from "@/lib/server/comunidade";
const req = () => new NextRequest("http://localhost/api/comunidade/foto", { headers: { authorization: "Bearer teste" } });
beforeEach(() => { vi.clearAllMocks(); estado.usuario.mockResolvedValue({ data: { user: { id: "titular", email_confirmed_at: "hoje" } }, error: null }); estado.perfil.mockResolvedValue({ data: null, error: null }); estado.curador.mockResolvedValue({ data: null, error: null }); });
describe("autenticação da comunidade", () => {
  it("permite conta confirmada sem perfil durante sua construção", async () => {
    expect(await autenticarMembro(req())).toMatchObject({ userId: "titular", emailConfirmado: true, perfil: null, curador: false });
  });
  it("bloqueia quando não consegue conferir suspensão e encerramento", async () => {
    estado.perfil.mockResolvedValue({ data: null, error: { message: "indisponível" } }); expect(await autenticarMembro(req())).toBeNull();
  });
  it("bloqueia quando não consegue conferir a função editorial", async () => {
    estado.curador.mockResolvedValue({ data: null, error: { message: "indisponível" } }); expect(await autenticarMembro(req())).toBeNull();
  });
  it("mantém conta encerrada impedida mesmo com token anterior", async () => {
    estado.perfil.mockResolvedValue({ data: { encerrado_em: "hoje" }, error: null }); expect(await autenticarMembro(req())).toBeNull();
  });
});
