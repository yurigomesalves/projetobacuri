import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// Mock do cliente Supabase do servidor: simula auth.getUser e a tabela
// `curadores`, sem depender de rede.
const getUserMock = vi.fn();
const maybeSingleMock = vi.fn();

vi.mock("@/lib/server/supabase", () => ({
  supabaseServidor: {
    auth: {
      getUser: (...args: unknown[]) => getUserMock(...args),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: (...args: unknown[]) => maybeSingleMock(...args),
        }),
      }),
    }),
  },
}));

const { autenticarCurador, exigirAdmin } = await import("@/lib/server/curadoria-auth");

function requisicaoCom(authorization?: string): NextRequest {
  const headers = new Headers();
  if (authorization !== undefined) {
    headers.set("authorization", authorization);
  }
  return new NextRequest("http://localhost/api/curadoria/feedbacks", { headers });
}

describe("autenticarCurador", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("falha sem o header Authorization", async () => {
    expect(await autenticarCurador(requisicaoCom())).toBeNull();
    expect(getUserMock).not.toHaveBeenCalled();
  });

  it("falha com formato diferente de 'Bearer <token>'", async () => {
    expect(await autenticarCurador(requisicaoCom("token-sem-bearer"))).toBeNull();
    expect(await autenticarCurador(requisicaoCom("Token abc"))).toBeNull();
    expect(await autenticarCurador(requisicaoCom("Bearer"))).toBeNull();
    expect(getUserMock).not.toHaveBeenCalled();
  });

  it("falha quando o token é inválido no Supabase Auth", async () => {
    getUserMock.mockResolvedValue({ data: { user: null }, error: { message: "inválido" } });
    expect(await autenticarCurador(requisicaoCom("Bearer token-invalido"))).toBeNull();
  });

  it("falha quando o usuário não tem perfil em `curadores`", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    maybeSingleMock.mockResolvedValue({ data: null, error: null });
    expect(await autenticarCurador(requisicaoCom("Bearer token-valido"))).toBeNull();
  });

  it("retorna o curador quando token e perfil são válidos", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    maybeSingleMock.mockResolvedValue({
      data: { user_id: "user-1", nome: "Curadora Exemplo", email: "curadora@example.org", papel: "curador" },
      error: null,
    });

    const curador = await autenticarCurador(requisicaoCom("Bearer token-valido"));
    expect(curador).toEqual({
      user_id: "user-1",
      nome: "Curadora Exemplo",
      email: "curadora@example.org",
      papel: "curador",
    });
  });
});

describe("exigirAdmin", () => {
  it("é true só para papel 'admin'", () => {
    expect(exigirAdmin({ user_id: "1", nome: "A", email: "a@x.org", papel: "admin" })).toBe(true);
    expect(exigirAdmin({ user_id: "1", nome: "A", email: "a@x.org", papel: "curador" })).toBe(false);
    expect(exigirAdmin(null)).toBe(false);
  });
});
