import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const estado = vi.hoisted(() => ({ membro: null as null | { userId: string; emailConfirmado: boolean; perfil: { suspenso_em: string | null } | null }, upload: vi.fn(), download: vi.fn(), remove: vi.fn(), preparar: vi.fn(), bucket: vi.fn(), consulta: vi.fn(), limite: true }));
vi.mock("@/lib/server/supabase", () => ({ supabaseServidor: { storage: { from: () => ({ upload: estado.upload, download: estado.download, remove: estado.remove }) }, from: () => ({ select: () => ({ eq: () => ({ is: () => ({ is: () => ({ maybeSingle: estado.consulta }) }) }) }) }) } }));
vi.mock("@/lib/server/comunidade", () => ({ comunidadeAtiva: () => process.env.BACURI_COMUNIDADE_ATIVA === "true", autenticarMembro: async () => estado.membro }));
vi.mock("@/lib/server/foto-perfil", () => ({ BUCKET_FOTOS: "fotos-comunidade", LIMITE_FOTO: 2 * 1024 * 1024, caminhoFoto: (id: string) => `${id}/perfil.webp`, prepararFoto: estado.preparar, garantirBucketFotos: estado.bucket }));
vi.mock("@/lib/server/limite", () => ({ dentroDoLimite: () => estado.limite }));
import { GET, POST, DELETE } from "@/app/api/comunidade/foto/route";
function envio(tipo = "image/png", bytes = "imagem") { const f = new FormData(); f.set("foto", new File([bytes], "foto.png", { type: tipo })); f.set("user_id", "outra-conta"); return new NextRequest("http://localhost/api/comunidade/foto", { method: "POST", body: f }); }
beforeEach(() => { vi.stubEnv("BACURI_COMUNIDADE_ATIVA", "true"); vi.clearAllMocks(); estado.membro = { userId: "titular", emailConfirmado: true, perfil: { suspenso_em: null } }; estado.limite = true; estado.preparar.mockResolvedValue(Buffer.from("webp")); estado.bucket.mockResolvedValue(undefined); estado.upload.mockResolvedValue({ error: null }); estado.remove.mockResolvedValue({ error: null }); estado.download.mockResolvedValue({ data: new Blob(["imagem"]), error: null }); estado.consulta.mockResolvedValue({ data: null, error: null }); });
afterEach(() => vi.unstubAllEnvs());
describe("foto da comunidade — autorização e limites", () => {
  it("bloqueia alterações sem login, confirmação ou durante suspensão", async () => {
    estado.membro = null; expect((await POST(envio())).status).toBe(403);
    estado.membro = { userId: "titular", emailConfirmado: false, perfil: null }; expect((await DELETE(new NextRequest("http://localhost/api/comunidade/foto", { method: "DELETE" }))).status).toBe(403);
    estado.membro.emailConfirmado = true; estado.membro.perfil = { suspenso_em: "hoje" }; expect((await POST(envio())).status).toBe(403); expect(estado.upload).not.toHaveBeenCalled(); expect(estado.remove).not.toHaveBeenCalled();
  });
  it("grava somente no caminho do titular, ignorando identificador enviado", async () => {
    expect((await POST(envio())).status).toBe(200); expect(estado.upload).toHaveBeenCalledWith("titular/perfil.webp", Buffer.from("webp"), expect.objectContaining({ upsert: true }));
  });
  it("permite foto antes de completar o perfil e mantém leitura privada autenticada", async () => {
    estado.membro!.perfil = null; expect((await POST(envio())).status).toBe(200);
    expect((await GET(new NextRequest("http://localhost/api/comunidade/foto"))).status).toBe(200);
    expect(estado.download).toHaveBeenCalledWith("titular/perfil.webp");
  });
  it("não revela fotos de tags ausentes ou contas encerradas", async () => {
    expect((await GET(new NextRequest("http://localhost/api/comunidade/foto?tag=@ausente"))).status).toBe(404); expect(estado.download).not.toHaveBeenCalled();
  });
  it("rejeita formato inválido e falha de decodificação sem enviar ao storage", async () => {
    expect((await POST(envio("image/svg+xml"))).status).toBe(400); estado.preparar.mockRejectedValue(new Error("imagem inválida")); expect((await POST(envio())).status).toBe(400); expect(estado.upload).not.toHaveBeenCalled();
  });
  it("impõe limite durante leitura mesmo sem Content-Length", async () => {
    expect((await POST(envio("image/png", "a".repeat(2 * 1024 * 1024 + 5000)))).status).toBe(413); expect(estado.upload).not.toHaveBeenCalled();
  });
  it("respeita limite de frequência e mantém mensagens internas privadas", async () => {
    estado.limite = false; expect((await POST(envio())).status).toBe(429); estado.limite = true;
    estado.upload.mockResolvedValue({ error: { message: "segredo interno" } }); const r = await POST(envio()); expect(r.status).toBe(503); expect(await r.text()).not.toContain("segredo interno");
  });
  it("remove exclusivamente a imagem do titular", async () => {
    expect((await DELETE(new NextRequest("http://localhost/api/comunidade/foto?user_id=outra-conta", { method: "DELETE" }))).status).toBe(200); expect(estado.remove).toHaveBeenCalledWith(["titular/perfil.webp"]);
  });
});
