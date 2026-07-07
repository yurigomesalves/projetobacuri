import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServidor } from "@/lib/server/supabase";
import { dentroDoLimite } from "@/lib/server/limite";
import { enviarFotoCurador, validarFotoCurador } from "@/lib/server/foto-curador";
import type { RespostaErro } from "@/lib/shared/tipos";

export const runtime = "nodejs";

const esquemaCampos = z.object({
  token: z.string().min(1),
  nome: z.string().min(2).max(120),
  senha: z.string().min(8),
  // Apenas http/https: z.url() sozinho aceitaria esquemas perigosos como
  // "javascript:" — e este link é exibido publicamente na transparência (XSS).
  lattes_url: z
    .string()
    .url()
    .refine((u) => /^https?:\/\//i.test(u), "O endereço do Lattes deve começar com http:// ou https://.")
    .optional()
    .or(z.literal("")),
  organizacao: z.string().max(200).optional().or(z.literal("")),
  sobre: z.string().max(2000).optional().or(z.literal("")),
});

function obterIp(requisicao: NextRequest): string {
  const encaminhado = requisicao.headers.get("x-forwarded-for");
  if (encaminhado) {
    return encaminhado.split(",")[0].trim();
  }
  return "desconhecido";
}

function respostaErro(
  codigo: RespostaErro["erro"]["codigo"],
  mensagem: string,
  status: number
): NextResponse<RespostaErro> {
  return NextResponse.json({ erro: { codigo, mensagem } }, { status });
}

/**
 * Conclui o convite: cria a conta no Supabase Auth e o perfil em `curadores`.
 * Rota pública (protegida pelo token de convite, que é secreto e expira).
 */
export async function POST(requisicao: NextRequest): Promise<NextResponse> {
  const ip = obterIp(requisicao);
  if (!dentroDoLimite(ip)) {
    return respostaErro(
      "LIMITE_EXCEDIDO",
      "Muitas requisições em pouco tempo. Aguarde um minuto e tente novamente.",
      429
    );
  }

  let formData: FormData;
  try {
    formData = await requisicao.formData();
  } catch {
    return respostaErro("ENTRADA_INVALIDA", "Corpo da requisição deve ser multipart/form-data.", 400);
  }

  const validado = esquemaCampos.safeParse({
    token: formData.get("token") ?? undefined,
    nome: formData.get("nome") ?? undefined,
    senha: formData.get("senha") ?? undefined,
    lattes_url: formData.get("lattes_url") ?? undefined,
    organizacao: formData.get("organizacao") ?? undefined,
    sobre: formData.get("sobre") ?? undefined,
  });

  if (!validado.success) {
    return respostaErro(
      "ENTRADA_INVALIDA",
      "Dados inválidos: verifique token, nome (2..120), senha (mín. 8) e demais campos.",
      400
    );
  }

  const { token, nome, senha, lattes_url, organizacao, sobre } = validado.data;

  // Foto é opcional; quando presente, validar tipo e tamanho.
  const foto = formData.get("foto");
  let arquivoFoto: File | null = null;
  if (foto instanceof File && foto.size > 0) {
    const erroFoto = validarFotoCurador(foto);
    if (erroFoto) {
      return respostaErro("ENTRADA_INVALIDA", erroFoto, 400);
    }
    arquivoFoto = foto;
  }

  try {
    // 1. Validar o convite (não usado e não expirado).
    const { data: convite, error: erroConvite } = await supabaseServidor
      .from("convites")
      .select("convite_id, email, papel, usado_em, expira_em")
      .eq("token", token)
      .maybeSingle();

    if (erroConvite) {
      throw new Error(`Falha ao buscar convite: ${erroConvite.message}`);
    }

    if (!convite || convite.usado_em || new Date(convite.expira_em) <= new Date()) {
      return respostaErro("ACERVO_SEM_RESULTADO", "Convite inválido, já usado ou expirado.", 404);
    }

    // 2. Re-checagem imediatamente antes de criar o usuário, para reduzir
    // a janela de corrida entre duas submissões simultâneas do mesmo convite.
    const { data: conviteAtual, error: erroConviteAtual } = await supabaseServidor
      .from("convites")
      .select("usado_em")
      .eq("convite_id", convite.convite_id)
      .maybeSingle();

    if (erroConviteAtual) {
      throw new Error(`Falha ao reconferir convite: ${erroConviteAtual.message}`);
    }

    if (!conviteAtual || conviteAtual.usado_em) {
      return respostaErro("ACERVO_SEM_RESULTADO", "Convite inválido, já usado ou expirado.", 404);
    }

    // 3. Criar a conta no Supabase Auth.
    const { data: criado, error: erroCriacao } = await supabaseServidor.auth.admin.createUser({
      email: convite.email,
      password: senha,
      email_confirm: true,
    });

    if (erroCriacao || !criado?.user) {
      console.error("Erro ao criar usuário de curadoria:", erroCriacao);
      return respostaErro("ENTRADA_INVALIDA", "Não foi possível criar a conta. Tente novamente.", 400);
    }

    const usuario = criado.user;

    // 4. Upload da foto, se houver. Falha aqui não impede o cadastro.
    let fotoUrl: string | undefined;
    if (arquivoFoto) {
      fotoUrl = await enviarFotoCurador(usuario.id, arquivoFoto);
    }

    // 5. Criar o perfil em `curadores`.
    const { error: erroPerfil } = await supabaseServidor.from("curadores").insert({
      user_id: usuario.id,
      nome,
      email: convite.email,
      papel: convite.papel,
      foto_url: fotoUrl,
      lattes_url: lattes_url || undefined,
      organizacao: organizacao || undefined,
      sobre: sobre || undefined,
    });

    if (erroPerfil) {
      // Não deixar conta órfã: remove o usuário recém-criado.
      await supabaseServidor.auth.admin.deleteUser(usuario.id);
      throw new Error(`Falha ao criar perfil de curador: ${erroPerfil.message}`);
    }

    // 6. Marcar o convite como usado.
    const { error: erroUso } = await supabaseServidor
      .from("convites")
      .update({ usado_em: new Date().toISOString() })
      .eq("token", token);

    if (erroUso) {
      // O cadastro já foi concluído; registrar o erro mas não falhar a resposta.
      console.error("Erro ao marcar convite como usado:", erroUso);
    }

    return NextResponse.json({ status: "cadastrado" }, { status: 201 });
  } catch (erro) {
    console.error("Erro em POST /api/curadoria/cadastro:", erro);
    return respostaErro(
      "ERRO_INTERNO",
      "Não foi possível concluir o cadastro agora. Tente novamente em alguns instantes.",
      500
    );
  }
}
