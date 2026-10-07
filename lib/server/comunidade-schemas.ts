import { z } from "zod";
const uuid = z.string().uuid();
const motivo = z.string().trim().min(10).max(3000);
const alvo = z.enum(["discussao", "comentario", "proposta", "membro"]);
const proposta = {
  texto: z.string().trim().min(10).max(12000), justificativa: motivo,
  chunk_ids: z.array(uuid).max(8).default([]), fontes_sugeridas: z.string().max(4000).default(""),
  comentario_incorporado_id: uuid.optional(),
};
export const esquemasComunidade: Record<string, z.ZodType> = {
  compartilhar_registro: z.object({ origem: z.enum(["biografia", "evento"]), registro_id: z.string().trim().min(1).max(200), titulo: z.string().trim().min(5).max(180), motivo, categoria: z.enum(["erro_factual", "omissao", "fontes", "interpretacao", "clareza"]), confirmacao_publicacao: z.literal(true) }).strict().refine(d => d.origem === "biografia" ? /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(d.registro_id) : uuid.safeParse(d.registro_id).success),
  concluir_editorial: z.object({ decisao_id: uuid, justificativa: motivo }).strict(),
  salvar_perfil: z.object({ tag: z.string().trim().toLowerCase().regex(/^@[a-z0-9_]{3,30}$/), nome_publico: z.string().max(120).optional(), bio: z.string().max(500).optional(), aceita_termos: z.literal(true) }).strict(),
  encerrar_conta: z.object({ confirmacao: z.literal("ENCERRAR") }).strict(),
  compartilhar: z.object({ interacao_id: uuid, token_compartilhamento: z.string().max(2048), titulo: z.string().trim().min(5).max(180), motivo, categoria: z.enum(["erro_factual", "omissao", "fontes", "interpretacao", "clareza"]), confirmacao_publicacao: z.literal(true) }).strict(),
  comentar: z.object({ discussao_id: uuid, texto: z.string().trim().min(1).max(4000), pai_id: uuid.optional() }).strict(),
  editar_comentario: z.object({ comentario_id: uuid, texto: z.string().trim().min(1).max(4000) }).strict(),
  reconhecer_comentario: z.object({ comentario_id: uuid }).strict(),
  propor: z.object({ discussao_id: uuid, proposta_origem_id: uuid.optional(), ...proposta }).strict(),
  revisar_proposta: z.object({ proposta_id: uuid, ...proposta }).strict(),
  avaliar: z.object({ versao_id: uuid, tipo: z.enum(["apoio", "ajustes", "sem_fundamento"]).optional(), justificativa: z.string().trim().min(3).max(2000).optional(), remover: z.boolean().optional() }).strict().refine(d => d.remover || (d.tipo && (d.tipo === "apoio" || d.justificativa))),
  acompanhar: z.object({ discussao_id: uuid, remover: z.boolean().optional() }).strict(),
  ler_notificacoes: z.object({}).strict(),
  denunciar: z.object({ alvo_tipo: alvo, alvo_id: uuid, motivo: z.string().trim().min(10).max(2000) }).strict(),
  moderar: z.object({ alvo_tipo: alvo, alvo_id: uuid, acao: z.enum(["ocultar", "restaurar", "suspender_membro", "restaurar_membro", "invalidar_pontos"]), justificativa: z.string().trim().min(10).max(2000) }).strict(),
  recorrer: z.object({ alvo_tipo: z.enum(["decisao", "moderacao"]), alvo_id: uuid, motivo }).strict(),
  parecer_recurso: z.object({ recurso_id: uuid, aprova: z.boolean(), justificativa: motivo }).strict(),
  parecer: z.object({ versao_id: uuid, resultado: z.enum(["aprovar", "recusar", "ajustes"]), justificativa: motivo, sintese: z.string().trim().min(10).max(1200) }).strict(),
  encaminhar: z.object({ versao_id: uuid, justificativa: motivo }).strict(),
  candidatar: z.object({ candidato_id: uuid }).strict(),
  consentir_candidatura: z.object({ candidatura_id: uuid }).strict(),
  votar_candidatura: z.object({ candidatura_id: uuid, aprova: z.boolean() }).strict(),
  sair_curadoria: z.object({ confirmacao: z.literal("SAIR") }).strict(),
  propor_destituicao: z.object({ alvo_id: uuid, justificativa: motivo }).strict(),
  defender_destituicao: z.object({ destituicao_id: uuid, defesa: motivo }).strict(),
  votar_destituicao: z.object({ destituicao_id: uuid, aprova: z.boolean() }).strict(),
  suspender_ouro: z.object({ ouro_id: uuid, justificativa: motivo }).strict(),
  indexar_ouro: z.object({ versao_id: uuid }).strict(),
  revisar_ouro: z.object({ ouro_id: uuid, resultado: z.enum(["reativar", "revogar"]), justificativa: motivo }).strict(),
  organizar: z.object({ alvo_id: uuid, tipo: z.enum(["etiquetar", "relacionar"]), dados: z.object({ etiqueta: z.string().trim().min(1).max(50).optional(), discussao_id: uuid.optional() }).strict() }).strict().refine(d => d.tipo === "etiquetar" ? !!d.dados.etiqueta && !d.dados.discussao_id : !!d.dados.discussao_id && !d.dados.etiqueta && d.alvo_id !== d.dados.discussao_id),
};
export const consultaComunidade = z.object({
  recurso: z.enum(["discussoes", "discussao", "perfil", "eu", "notificacoes", "curadoria", "transparencia", "ouro", "fontes"]),
  id: uuid.optional(), versao_id: uuid.optional(), tag: z.string().regex(/^@[a-z0-9_]{3,30}$/).optional(),
  q: z.string().max(150).optional(), categoria: z.enum(["erro_factual", "omissao", "fontes", "interpretacao", "clareza"]).optional(),
  ordem: z.enum(["recentes", "avaliadas", "sem_resposta"]).optional(), pagina: z.coerce.number().int().min(1).max(10000).default(1),
}).strict().refine(d => (d.recurso !== "discussao" || d.id) && (d.recurso !== "perfil" || d.tag));
