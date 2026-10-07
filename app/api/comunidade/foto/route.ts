import { NextRequest, NextResponse } from "next/server";
import { autenticarMembro, comunidadeAtiva } from "@/lib/server/comunidade";
import { supabaseServidor } from "@/lib/server/supabase";
import { BUCKET_FOTOS, caminhoFoto, garantirBucketFotos, LIMITE_FOTO, prepararFoto } from "@/lib/server/foto-perfil";
import { dentroDoLimite } from "@/lib/server/limite";

export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
const falha = (mensagem: string, status: number) => NextResponse.json({ erro: { mensagem } }, { status, headers });

export async function GET(req: NextRequest) {
  if (!comunidadeAtiva()) return falha("Comunidade em preparação.", 503);
  try {
    let userId: string | undefined;
    const tag = req.nextUrl.searchParams.get("tag");
    if (tag) {
      if (!/^@[a-z0-9_]{3,30}$/.test(tag)) return falha("Perfil indisponível.", 404);
      const { data, error } = await supabaseServidor.from("membros_comunidade").select("user_id")
        .eq("tag", tag).is("encerrado_em", null).is("suspenso_em", null).maybeSingle();
      if (error) return falha("Foto temporariamente indisponível.", 503);
      userId = data?.user_id;
    } else {
      const membro = await autenticarMembro(req);
      if (!membro?.emailConfirmado || membro.perfil?.suspenso_em) return falha("Entre com sua conta confirmada.", 401);
      userId = membro.userId;
    }
    if (!userId) return falha("Foto indisponível.", 404);
    const { data, error } = await supabaseServidor.storage.from(BUCKET_FOTOS).download(caminhoFoto(userId));
    if (error || !data) return falha("Foto indisponível.", 404);
    return new NextResponse(await data.arrayBuffer(), { headers: { ...headers, "Content-Type": "image/webp" } });
  } catch { return falha("Foto temporariamente indisponível.", 503); }
}

export async function POST(req: NextRequest) {
  if (!comunidadeAtiva()) return falha("Comunidade em preparação.", 503);
  try {
    const membro = await autenticarMembro(req);
    if (!membro?.emailConfirmado || membro.perfil?.suspenso_em) return falha("Entre com sua conta confirmada.", 403);
    if (!dentroDoLimite(`foto:${membro.userId}`)) return falha("Aguarde um minuto antes de continuar.", 429);
    if (Number(req.headers.get("content-length")) > LIMITE_FOTO + 4096) return falha("Escolha uma imagem de até 2 MB.", 413);
    // Limite também durante a leitura: não confiar apenas no Content-Length.
    const leitor = req.body?.getReader();
    if (!leitor) return falha("Selecione uma imagem.", 400);
    const partes: Uint8Array[] = []; let tamanho = 0;
    while (true) {
      const { done, value } = await leitor.read(); if (done) break;
      tamanho += value.length;
      if (tamanho > LIMITE_FOTO + 4096) { await leitor.cancel(); return falha("Escolha uma imagem de até 2 MB.", 413); }
      partes.push(value);
    }
    const body = Buffer.concat(partes);
    let formulario: FormData;
    try { formulario = await new Response(body, { headers: { "Content-Type": req.headers.get("content-type") || "" } }).formData(); }
    catch { return falha("Selecione uma imagem válida.", 400); }
    const foto = formulario.get("foto");
    if (!(foto instanceof File) || !foto.size || foto.size > LIMITE_FOTO || !["image/jpeg", "image/png", "image/webp"].includes(foto.type)) return falha("Use JPG, PNG ou WebP de até 2 MB.", 400);
    let imagem: Buffer;
    try { imagem = await prepararFoto(Buffer.from(await foto.arrayBuffer())); }
    catch { return falha("Não foi possível ler a imagem. Use JPG, PNG ou WebP sem animação.", 400); }
    await garantirBucketFotos();
    const { error } = await supabaseServidor.storage.from(BUCKET_FOTOS).upload(caminhoFoto(membro.userId), imagem, { contentType: "image/webp", upsert: true, cacheControl: "0" });
    if (error) return falha("Não foi possível salvar a foto. Tente novamente.", 503);
    return NextResponse.json({ salva: true }, { headers });
  } catch { return falha("Não foi possível salvar a foto. Tente novamente.", 503); }
}

export async function DELETE(req: NextRequest) {
  if (!comunidadeAtiva()) return falha("Comunidade em preparação.", 503);
  try {
    const membro = await autenticarMembro(req);
    if (!membro?.emailConfirmado || membro.perfil?.suspenso_em) return falha("Entre com sua conta confirmada.", 403);
    if (!dentroDoLimite(`foto:${membro.userId}`)) return falha("Aguarde um minuto antes de continuar.", 429);
    const { error } = await supabaseServidor.storage.from(BUCKET_FOTOS).remove([caminhoFoto(membro.userId)]);
    if (error) return falha("Não foi possível remover a foto.", 503);
    return NextResponse.json({ removida: true }, { headers });
  } catch { return falha("Não foi possível remover a foto.", 503); }
}
