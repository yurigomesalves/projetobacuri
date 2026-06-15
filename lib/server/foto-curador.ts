import { supabaseServidor } from "@/lib/server/supabase";

// Helpers de foto de perfil do curador, compartilhados pelo cadastro inicial
// (via convite) e pela edição do próprio perfil. Centralizar aqui evita
// duplicar as regras de validação e o caminho de upload no Storage.

export const TIPOS_FOTO_PERMITIDOS = ["image/jpeg", "image/png", "image/webp"] as const;
export const TAMANHO_MAXIMO_FOTO = 2 * 1024 * 1024; // 2 MB

const EXTENSAO_POR_TIPO: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const BUCKET = "fotos-curadores";

/**
 * Valida uma foto enviada. Devolve uma mensagem de erro (pt-BR) ou null se
 * estiver tudo certo. O tipo/tamanho também são reforçados pelo próprio bucket.
 */
export function validarFotoCurador(foto: File): string | null {
  if (!TIPOS_FOTO_PERMITIDOS.includes(foto.type as (typeof TIPOS_FOTO_PERMITIDOS)[number])) {
    return "Foto deve ser JPEG, PNG ou WEBP.";
  }
  if (foto.size > TAMANHO_MAXIMO_FOTO) {
    return "Foto deve ter no máximo 2 MB.";
  }
  return null;
}

/**
 * Envia a foto ao Storage e devolve a URL pública, ou undefined se o upload
 * falhar (o erro é registrado, mas não derruba o fluxo de quem chama).
 */
export async function enviarFotoCurador(userId: string, foto: File): Promise<string | undefined> {
  try {
    const extensao = EXTENSAO_POR_TIPO[foto.type] ?? "jpg";
    const caminho = `${userId}/${Date.now()}.${extensao}`;
    const { error: erroUpload } = await supabaseServidor.storage
      .from(BUCKET)
      .upload(caminho, foto, { contentType: foto.type, upsert: false });

    if (erroUpload) {
      console.error("Erro ao enviar foto do curador:", erroUpload);
      return undefined;
    }

    const { data: publica } = supabaseServidor.storage.from(BUCKET).getPublicUrl(caminho);
    return publica?.publicUrl;
  } catch (erroFoto) {
    console.error("Erro ao processar foto do curador:", erroFoto);
    return undefined;
  }
}
