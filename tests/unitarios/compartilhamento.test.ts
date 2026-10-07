import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/server/supabase", () => ({ supabaseServidor: {} }));
import { emitirTokenCompartilhamento, verificarTokenCompartilhamento } from "@/lib/server/comunidade";
const id = "40000000-0000-4000-8000-000000000001";
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); });
describe("comprovante de publicação", () => {
  function configurar() { vi.stubEnv("BACURI_COMUNIDADE_ATIVA", "true"); vi.stubEnv("BACURI_CHAVE_COMPARTILHAMENTO", "segredo-exclusivo-".repeat(3)); }
  it("não publica capacidade quando flag false ou chave fraca", () => {
    configurar(); vi.stubEnv("BACURI_COMUNIDADE_ATIVA", "false"); expect(emitirTokenCompartilhamento(id)).toBeUndefined();
    vi.stubEnv("BACURI_COMUNIDADE_ATIVA", "true"); vi.stubEnv("BACURI_CHAVE_COMPARTILHAMENTO", "fraca"); expect(emitirTokenCompartilhamento(id)).toBeUndefined();
  });
  it("vincula interação e expira em sete dias", () => {
    configurar(); vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-06T12:00:00Z"));
    const token = emitirTokenCompartilhamento(id)!;
    expect(verificarTokenCompartilhamento(token, id)).toBe(true);
    expect(verificarTokenCompartilhamento(token, "50000000-0000-4000-8000-000000000001")).toBe(false);
    expect(JSON.parse(Buffer.from(token.split(".")[0], "base64url").toString())).not.toHaveProperty("pergunta");
    vi.setSystemTime(new Date("2026-10-14T12:00:00Z")); expect(verificarTokenCompartilhamento(token, id)).toBe(false);
  });
  it("rejeita adulteração, payload longo e assinatura falsa", () => {
    configurar(); const token = emitirTokenCompartilhamento(id)!;
    expect(verificarTokenCompartilhamento(`${token}A`, id)).toBe(false);
    expect(verificarTokenCompartilhamento("x".repeat(2050), id)).toBe(false);
    expect(verificarTokenCompartilhamento("e30.ZmFsc28", id)).toBe(false);
  });
});
