import { describe, expect, it, vi } from "vitest";
import sharp from "sharp";
vi.mock("@/lib/server/supabase", () => ({ supabaseServidor: {} }));
import { prepararFoto } from "@/lib/server/foto-perfil";

describe("foto de perfil — processamento seguro", () => {
  it("reduz a imagem para 256 px e remove metadados EXIF", async () => {
    const original = await sharp({ create: { width: 700, height: 400, channels: 3, background: "#686864" } }).jpeg().withMetadata().toBuffer();
    expect((await sharp(original).metadata()).exif).toBeDefined();
    const resultado = await prepararFoto(original);
    const dados = await sharp(resultado).metadata();
    expect(dados.format).toBe("webp"); expect(dados.width).toBe(256); expect(dados.height).toBe(256);
    expect(dados.exif).toBeUndefined(); expect(dados.icc).toBeUndefined();
  });
  it("rejeita SVG mesmo quando o nome ou MIME informado simulam uma fotografia", async () => {
    await expect(prepararFoto(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>'))).rejects.toThrow("FORMATO_INVALIDO");
  });
  it("rejeita dados corrompidos", async () => {
    await expect(prepararFoto(Buffer.from("isto não é uma imagem"))).rejects.toThrow();
  });
  it("limita imagens comprimidas com quantidade excessiva de pixels", async () => {
    const grande = await sharp({ create: { width: 4100, height: 4100, channels: 3, background: "white" } }).png().toBuffer();
    await expect(prepararFoto(grande)).rejects.toThrow();
  });
});
