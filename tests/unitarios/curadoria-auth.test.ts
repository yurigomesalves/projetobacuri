import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { autenticado } from "@/lib/server/curadoria-auth";

function requisicaoCom(authorization?: string): NextRequest {
  const headers = new Headers();
  if (authorization !== undefined) {
    headers.set("authorization", authorization);
  }
  return new NextRequest("http://localhost/api/curadoria/feedbacks", { headers });
}

describe("autenticado", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("falha SEMPRE quando CURADORIA_SENHA não está definida (rota nunca aberta por padrão)", () => {
    vi.stubEnv("CURADORIA_SENHA", "");
    expect(autenticado(requisicaoCom("Bearer qualquer-coisa"))).toBe(false);
  });

  it("falha sem o header Authorization", () => {
    vi.stubEnv("CURADORIA_SENHA", "senha-de-teste");
    expect(autenticado(requisicaoCom())).toBe(false);
  });

  it("falha com formato diferente de 'Bearer <senha>'", () => {
    vi.stubEnv("CURADORIA_SENHA", "senha-de-teste");
    expect(autenticado(requisicaoCom("senha-de-teste"))).toBe(false);
    expect(autenticado(requisicaoCom("Token senha-de-teste"))).toBe(false);
    expect(autenticado(requisicaoCom("Bearer"))).toBe(false);
  });

  it("falha com senha errada", () => {
    vi.stubEnv("CURADORIA_SENHA", "senha-de-teste");
    expect(autenticado(requisicaoCom("Bearer senha-errada"))).toBe(false);
  });

  it("autentica com a senha correta", () => {
    vi.stubEnv("CURADORIA_SENHA", "senha-de-teste");
    expect(autenticado(requisicaoCom("Bearer senha-de-teste"))).toBe(true);
  });
});
