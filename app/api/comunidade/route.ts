import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServidor } from "@/lib/server/supabase";
import { autenticarMembro, comunidadeAtiva, verificarTokenCompartilhamento } from "@/lib/server/comunidade";
import { consultaComunidade, esquemasComunidade } from "@/lib/server/comunidade-schemas";
import { dentroDoLimite } from "@/lib/server/limite";
import { indexarOuro } from "@/lib/server/ouro";
import { BUCKET_FOTOS, caminhoFoto } from "@/lib/server/foto-perfil";
import { acrescentarQuoruns } from "@/lib/server/quorum-comunidade";
import { copiarRegistroPublico } from "@/lib/server/registro-comunidade";

export const runtime = "nodejs";
const privado = new Set(["eu", "notificacoes", "curadoria"]);
type AlvoPainel = { alvo_tipo: string; alvo_id: string; discussao_id?: string };
function erro(mensagem: string, status = 400) {
  return NextResponse.json({ erro: { codigo: status === 401 || status === 403 ? "NAO_AUTORIZADO" : status === 429 ? "LIMITE_EXCEDIDO" : status >= 500 ? "ERRO_INTERNO" : "ENTRADA_INVALIDA", mensagem } }, { status, headers: { "Cache-Control": "no-store" } });
}
function erroBanco(error: { message: string; code?: string }) {
  const mensagens: Record<string, [number, string]> = {
    NAO_PERMITIDO: [403, "Esta operação não está disponível para sua conta."],
    LIMITE_EXCEDIDO: [429, "Aguarde um minuto antes de continuar."],
    PERFIL_AUSENTE: [403, "Complete seu perfil para participar."], MEMBRO_SUSPENSO: [403, "Sua participação está suspensa. Você pode apresentar recurso."],
    AUSENTE: [404, "Conteúdo indisponível."], CONFLITO: [409, "Esta versão já mudou ou foi decidida. Atualize a página."],
    CONFLITO_INTERESSE: [403, "Autor ou colaborador da proposta não pode julgá-la."], REVISOR_IMPEDIDO: [403, "Este recurso exige revisores independentes."],
    ULTIMO_CURADOR: [409, "É necessário preservar pelo menos um curador."], SAIA_CURADORIA: [409, "Encerre sua participação na curadoria antes de encerrar a conta."],
    FONTES_OBRIGATORIAS: [400, "Indique fontes. A aprovação como resposta de referência exige trechos conferidos do acervo."], FONTE_INVALIDA: [400, "Um dos trechos não está disponível no acervo."],
    FONTES_ALTERADAS: [409, "As fontes mudaram. Uma nova proposta precisa ser conferida."], AGUARDE_DEFESA: [409, "Aguarde a defesa ou o prazo de sete dias."],
    USE_DESTITUICAO: [409, "Afastamento de curador exige o procedimento colegiado."],
    REGISTRO_SEM_ALTERACAO: [409, "Publique a revisão do registro no acervo antes de registrar a conclusão."],
  };
  const entrada = mensagens[error.message];
  if (entrada) return erro(entrada[1], entrada[0]);
  if (error.code === "23505") return erro("Esse identificador já está em uso.", 409);
  if (error.code === "23514" || error.code === "22P02") return erro("Confira os dados e os limites dos campos.");
  return erro("Não foi possível concluir a operação. Tente novamente.", 503);
}
export async function GET(req: NextRequest) {
  if (!comunidadeAtiva()) return erro("A comunidade está em preparação. A pesquisa documental continua disponível.", 503);
  const entrada = consultaComunidade.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!entrada.success) return erro("Consulta inválida.");
  try {
    const membro = req.headers.has("authorization") ? await autenticarMembro(req) : null;
    if (req.headers.has("authorization") && !membro) return erro("Entre novamente para continuar.", 401);
    if (privado.has(entrada.data.recurso) && !membro?.emailConfirmado) return erro("Entre com e-mail confirmado.", 401);
    if (entrada.data.recurso === "curadoria" && !membro?.curador) return erro("Área restrita à curadoria.", 403);
    const { data: consulta, error } = await supabaseServidor.rpc("comunidade_consultar", { p_recurso: entrada.data.recurso, p_dados: entrada.data, p_ator: membro?.userId ?? null });
    if (error) return erroBanco(error);
    let data = consulta;
    if (entrada.data.recurso === "notificacoes") {
      const ids = [...new Set<string>((data.itens || []).map((n: { dados: { discussao_id: string } }) => n.dados.discussao_id))];
      if (ids.length) {
        const titulos = await supabaseServidor.from("discussoes_comunidade").select("discussao_id,titulo").in("discussao_id", ids);
        if (titulos.error) return erro("Não foi possível carregar as notificações.", 503);
        const porId = new Map((titulos.data || []).map(d => [d.discussao_id, d.titulo]));
        data = { ...data, itens: data.itens.map((n: { dados: { discussao_id: string } }) => ({ ...n, titulo_discussao: porId.get(n.dados.discussao_id) })) };
      }
    }
    if (entrada.data.recurso === "curadoria") {
      data = await acrescentarQuoruns({ ...data, curadores: data.curadores || [], itens: data.itens || [], candidaturas: data.candidaturas || [], recursos: data.recursos || [], destituicoes: data.destituicoes || [] }, membro!.userId);
      const alvos: AlvoPainel[] = [...(data.denuncias || []), ...(data.moderacoes || [])];
      const destinos = new Map<string, string>();
      await Promise.all([
        ["comentario", "comentarios_comunidade", "comentario_id"],
        ["proposta", "propostas_comunidade", "proposta_id"],
      ].map(async ([tipo, tabela, chave]) => {
        const ids = [...new Set(alvos.filter(a => a.alvo_tipo === tipo).map(a => a.alvo_id))];
        if (!ids.length) return;
        const resultado = await supabaseServidor.from(tabela).select(`${chave},discussao_id`).in(chave, ids);
        if (resultado.error) throw new Error("Contexto da moderação indisponível.");
        for (const item of (resultado.data || []) as unknown as Record<string, string>[]) destinos.set(`${tipo}:${item[chave]}`, item.discussao_id);
      }));
      const contextualizar = (alvo: AlvoPainel) => ({ ...alvo, discussao_id: alvo.alvo_tipo === "discussao" ? alvo.alvo_id : destinos.get(`${alvo.alvo_tipo}:${alvo.alvo_id}`) });
      return NextResponse.json({ ...data, denuncias: (data.denuncias || []).map(contextualizar), moderacoes: (data.moderacoes || []).map(contextualizar) }, { headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch { return erro("Comunidade temporariamente indisponível.", 503); }
}
export async function POST(req: NextRequest) {
  if (!comunidadeAtiva()) return erro("A comunidade está em preparação.", 503);
  if (Number(req.headers.get("content-length")) > 64000) return erro("Conteúdo acima do limite.", 413);
  try {
    const membro = await autenticarMembro(req);
    if (!membro?.emailConfirmado) return erro("Entre com e-mail confirmado para participar.", 401);
    if (!dentroDoLimite(`comunidade:${membro.userId}`)) return erro("Aguarde um minuto antes de continuar.", 429);
    const texto = await req.text(); if (texto.length > 64000) return erro("Conteúdo acima do limite.", 413);
    const base = z.object({ acao: z.string(), dados: z.unknown() }).strict().safeParse(JSON.parse(texto));
    if (!base.success) return erro("Comando inválido.");
    const schema = Object.prototype.hasOwnProperty.call(esquemasComunidade, base.data.acao) ? esquemasComunidade[base.data.acao] : null;
    const entrada = schema?.safeParse(base.data.dados);
    if (!entrada?.success) return erro("Confira os campos obrigatórios e seus limites.");
    const dados = entrada.data as Record<string, unknown>;
    if (base.data.acao === "compartilhar_registro" || base.data.acao === "concluir_editorial") {
      let origem = String(dados.origem), identificador = String(dados.registro_id);
      if (base.data.acao === "concluir_editorial") {
        if (!membro.curador) return erro("Área restrita à curadoria.", 403);
        const contexto = await supabaseServidor.rpc("comunidade_registro_editorial", { p_decisao: dados.decisao_id, p_ator: membro.userId });
        if (contexto.error) return erroBanco(contexto.error);
        origem = contexto.data.origem; identificador = contexto.data.registro_id;
      }
      const registro = await copiarRegistroPublico(origem, identificador);
      if (!registro) return erro("Registro publicado não encontrado no acervo.", 404);
      dados.registro_original = registro;
    }
    if (base.data.acao === "denunciar") {
      const alvos: Record<string, [string, string, string]> = {
        discussao: ["discussoes_comunidade", "discussao_id", "autor_id"],
        comentario: ["comentarios_comunidade", "comentario_id", "autor_id"],
        proposta: ["propostas_comunidade", "proposta_id", "autor_id"],
        membro: ["membros_comunidade", "user_id", "user_id"],
      };
      const [tabela, chave, colunaAutor] = alvos[String(dados.alvo_tipo)];
      const { data: alvo, error: falha } = await supabaseServidor.from(tabela).select(colunaAutor).eq(chave, String(dados.alvo_id)).maybeSingle();
      if (falha) return erro("Não foi possível conferir a autoria. Tente novamente.", 503);
      if (!alvo) return erro("Conteúdo indisponível.", 404);
      if ((alvo as unknown as Record<string, string>)[colunaAutor] === membro.userId) return erro("Você não pode denunciar seu próprio conteúdo ou perfil.", 403);
    }
    if (base.data.acao === "indexar_ouro") {
      if (!membro.curador) return erro("Área restrita à curadoria.", 403);
      await indexarOuro(String(dados.versao_id));
      return NextResponse.json({ resultado: { ok: true } });
    }
    if (base.data.acao === "compartilhar" && !verificarTokenCompartilhamento(String(dados.token_compartilhamento), String(dados.interacao_id))) return erro("O comprovante desta resposta expirou ou é inválido. Faça uma nova consulta.", 403);
    const { data, error } = await supabaseServidor.rpc("comunidade_executar", { p_acao: base.data.acao, p_dados: dados, p_ator: membro.userId });
    if (error) return erroBanco(error);
    let indexacaoPendente = false;
    if (base.data.acao === "parecer" && data?.resultado === "aprovada" && !data?.estado_editorial) {
      try { await indexarOuro(String(dados.versao_id)); } catch { indexacaoPendente = true; }
    }
    if (base.data.acao === "encerrar_conta") {
      const removida = await supabaseServidor.auth.admin.deleteUser(membro.userId, true);
      if (removida.error) return erro("Perfil encerrado. A remoção das credenciais precisa ser concluída pela administração.", 503);
      // O perfil encerrado já impede qualquer leitura pública da foto.
      // A remoção física não deve impedir o encerramento caso o storage esteja fora do ar.
      try {
        const bucket = await supabaseServidor.storage.getBucket(BUCKET_FOTOS);
        if (bucket.data) {
          const foto = await supabaseServidor.storage.from(BUCKET_FOTOS).remove([caminhoFoto(membro.userId)]);
          if (foto.error) console.error("Limpeza de foto de conta encerrada pendente.");
        }
      } catch { console.error("Limpeza de foto de conta encerrada pendente."); }
    }
    return NextResponse.json({ resultado: data, indexacao_pendente: indexacaoPendente }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return erro(error instanceof SyntaxError ? "JSON inválido." : "Não foi possível concluir a operação.", error instanceof SyntaxError ? 400 : 503);
  }
}
