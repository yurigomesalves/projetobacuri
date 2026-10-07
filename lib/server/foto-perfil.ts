import sharp from "sharp";
import { supabaseServidor } from "./supabase";

export const BUCKET_FOTOS = "fotos-comunidade";
export const LIMITE_FOTO = 2 * 1024 * 1024;
export const caminhoFoto = (userId: string) => `${userId}/perfil.webp`;

export async function prepararFoto(bytes: Buffer): Promise<Buffer> {
  const imagem = sharp(bytes, { limitInputPixels: 16_000_000, animated: false });
  const dados = await imagem.metadata();
  if (!dados.format || !["jpeg", "png", "webp"].includes(dados.format) || (dados.pages ?? 1) > 1) {
    throw new Error("FORMATO_INVALIDO");
  }
  // Reencodificar remove EXIF (incluindo localização) e outros metadados.
  return imagem.rotate().resize(256, 256, { fit: "cover", position: "attention" }).webp({ quality: 80 }).toBuffer();
}

export async function garantirBucketFotos() {
  const { data, error } = await supabaseServidor.storage.getBucket(BUCKET_FOTOS);
  if (data) {
    if (data.public) throw new Error("BUCKET_DEVE_SER_PRIVADO");
    return;
  }
  if (error && !["404", "400"].includes(String(error.statusCode))) throw error;
  const criado = await supabaseServidor.storage.createBucket(BUCKET_FOTOS, {
    public: false, fileSizeLimit: LIMITE_FOTO, allowedMimeTypes: ["image/webp"],
  });
  if (criado.error) {
    // Duas primeiras publicações podem criar o bucket ao mesmo tempo.
    const existente = await supabaseServidor.storage.getBucket(BUCKET_FOTOS);
    if (!existente.data || existente.data.public) throw criado.error;
  }
}
