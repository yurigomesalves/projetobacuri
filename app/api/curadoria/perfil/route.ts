import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServidor } from "@/lib/server/supabase";
import { autenticarCurador } from "@/lib/server/curadoria-auth";
import { enviarFotoCurador, validarFotoCurador } from "@/lib/server/foto-curador";
import type { CuradorPublico, RespostaErro } from "@/lib/shared/tipos";

export const runtime = "nodejs";

// Edição do próprio perfil pelo curador logado (inclui o admin). Permite
// completar/atualizar nome, foto, Lattes, organização e "Sobre" — os dados
// que aparecem publicamente na página de Transparência.

// lattes_url: vazio (limpar) OU http/https. z.url() sozinho aceitaria esquemas
// perigosos como "javascript:", e este link é exibido publicamente (XSS).
const esquemaLattes = z.union([
  z.literal(""),
  z
    .string()
    .url()
    .refine(
      (u) => /^https?:\/\//i.test(u),
      "O endereço do Lattes deve começar com http:// ou https://."
    ),
]);

const esquemaCampos = z.object({
  nome: z.string().min(2).max(120),
  lattes_url: esquemaLattes,
  organizacao: z.string().max(200),
  sobre: z.string().max(2000),
});

function respostaErro(
  codigo: RespostaErro["erro"]["codigo"],
  mensagem: string,
  status: number
): NextResponse<RespostaErro> {
  return NextResponse.json({ erro: { codigo, mensagem } }, { status });
}

/** Devolve o perfil do próprio curador, para preencher o formulário de edição. */
export async function GET(requisicao: NextRequest): Promise<NextResponse> {
  const curador = await autenticarCurador(requisicao);
  if (!curador) {
    return respostaErro("NAO_AUTORIZADO", "Acesso não autorizado à curadoria.", 401);
  }

  try {
    const { data, error } = await supabaseServidor
      .from("curadores")
      .select("nome, foto_url, lattes_url, organizacao, sobre")
      .eq("user_id", curador.user_id)
      .maybeSingle();

    if (error) {
      throw new Error(`Falha ao buscar perfil: ${error.message}`);
    }

    const perfil: CuradorPublico = {
      nome: data?.nome ?? curador.nome,
      foto_url: data?.foto_url ?? undefined,
      lattes_url: data?.lattes_url ?? undefined,
      organizacao: data?.organizacao ?? undefined,
      sobre: data?.sobre ?? undefined,
    };

    return NextResponse.json(perfil, { status: 200 });
  } catch (erro) {
    console.error("Erro em GET /api/curadoria/perfil:", erro);
    return respostaErro(
      "ERRO_INTERNO",
      "Não foi possível carregar seu perfil agora. Tente novamente em alguns instantes.",
      500
    );
  }
}

/** Atualiza o próprio perfil (multipart, pois pode incluir uma nova foto). */
export async function PATCH(requisicao: NextRequest): Promise<NextResponse> {
  const curador = await autenticarCurador(requisicao);
  if (!curador) {
    return respostaErro("NAO_AUTORIZADO", "Acesso não autorizado à curadoria.", 401);
  }

  let formData: FormData;
  try {
    formData = await requisicao.formData();
  } catch {
    return respostaErro("ENTRADA_INVALIDA", "Corpo da requisição deve ser multipart/form-data.", 400);
  }

  const validado = esquemaCampos.safeParse({
    nome: formData.get("nome") ?? undefined,
    lattes_url: formData.get("lattes_url") ?? "",
    organizacao: formData.get("organizacao") ?? "",
    sobre: formData.get("sobre") ?? "",
  });

  if (!validado.success) {
    return respostaErro(
      "ENTRADA_INVALIDA",
      "Dados inválidos: verifique nome (2..120), Lattes (http/https), organização e Sobre.",
      400
    );
  }

  const { nome, lattes_url, organizacao, sobre } = validado.data;

  // Foto: opcional. "remover_foto" = "1" limpa a foto atual.
  const foto = formData.get("foto");
  const removerFoto = formData.get("remover_foto") === "1";
  let arquivoFoto: File | null = null;
  if (foto instanceof File && foto.size > 0) {
    const erroFoto = validarFotoCurador(foto);
    if (erroFoto) {
      return respostaErro("ENTRADA_INVALIDA", erroFoto, 400);
    }
    arquivoFoto = foto;
  }

  try {
    // Campos de texto: string vazia significa "limpar" (vira null no banco).
    const atualizacao: Record<string, string | null> = {
      nome,
      lattes_url: lattes_url || null,
      organizacao: organizacao || null,
      sobre: sobre || null,
    };

    if (arquivoFoto) {
      const url = await enviarFotoCurador(curador.user_id, arquivoFoto);
      if (url) {
        atualizacao.foto_url = url;
      }
    } else if (removerFoto) {
      atualizacao.foto_url = null;
    }

    const { data, error } = await supabaseServidor
      .from("curadores")
      .update(atualizacao)
      .eq("user_id", curador.user_id)
      .select("nome, foto_url, lattes_url, organizacao, sobre")
      .single();

    if (error || !data) {
      throw new Error(`Falha ao atualizar perfil: ${error?.message}`);
    }

    const perfil: CuradorPublico = {
      nome: data.nome,
      foto_url: data.foto_url ?? undefined,
      lattes_url: data.lattes_url ?? undefined,
      organizacao: data.organizacao ?? undefined,
      sobre: data.sobre ?? undefined,
    };

    return NextResponse.json(perfil, { status: 200 });
  } catch (erro) {
    console.error("Erro em PATCH /api/curadoria/perfil:", erro);
    return respostaErro(
      "ERRO_INTERNO",
      "Não foi possível salvar seu perfil agora. Tente novamente em alguns instantes.",
      500
    );
  }
}
