import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { criarPostgresComunidade, popularBaseComunidade, idsComunidade as ids } from "../apoio/postgres-comunidade";

describe("comunidade — migrações em PostgreSQL isolado", () => {
  let db: PGlite;
  async function agir(acao: string, dados: Record<string, unknown>, ator: string = ids.autor) {
    const r = await db.query<{ resultado: Record<string, string> }>("select comunidade_executar($1,$2::jsonb,$3::uuid) resultado", [acao, JSON.stringify(dados), ator]);
    return r.rows[0].resultado;
  }
  async function consulta(recurso: string, dados: Record<string, unknown> = {}, ator: string | null = null) {
    const r = await db.query<{ resultado: Record<string, unknown> }>("select comunidade_consultar($1,$2::jsonb,$3::uuid) resultado", [recurso, JSON.stringify(dados), ator]);
    return r.rows[0].resultado;
  }
  async function discussao() {
    return (await agir("compartilhar", { interacao_id: ids.interacao, titulo: "Título da discussão", motivo: "Verificar a fundamentação da resposta.", categoria: "fontes" })).discussao_id;
  }
  async function proposta(di: string, extras: Record<string, unknown> = {}, encaminhar = true) {
    const p = await agir("propor", { discussao_id: di, texto: "Uma resposta alternativa documentada [1].", justificativa: "A fonte permite melhorar esta resposta.", chunk_ids: [ids.chunk], ...extras });
    if (encaminhar) await agir("encaminhar", { versao_id: p.versao_id, justificativa: "Encaminhamento excepcional justificado nesta fixture." }, ids.curador1);
    return p;
  }
  async function parecer(versao: string, ator: string, resultado = "aprovar") {
    return agir("parecer", { versao_id: versao, resultado, justificativa: "Fonte e atribuição conferidas nesta versão.", sintese: "Proposta julgada com base nos trechos documentais conferidos." }, ator);
  }
  beforeAll(async () => {
    db = await criarPostgresComunidade(); await popularBaseComunidade(db);
    for (const [tag, user] of Object.entries(ids).slice(0, 6)) await agir("salvar_perfil", { tag: `@${tag}`, aceita_termos: true }, user);
    await db.exec("update membros_comunidade set criado_em=now()-interval '100 days'");
  }, 60_000);
  afterAll(async () => { await db?.close(); });
  // Savepoints permitem testar erros esperados sem abortar a transação externa.
  beforeEach(async () => { await db.exec("begin"); });
  afterEach(async () => { await db.exec("rollback"); });
  async function recusa(acao: string, dados: Record<string, unknown>, ator = ids.autor, erro = "NAO_PERMITIDO") {
    await db.exec("savepoint erro_esperado");
    await expect(agir(acao, dados, ator)).rejects.toThrow(erro);
    await db.exec("rollback to savepoint erro_esperado");
  }

  async function registro(origem = "biografia") {
    const registroId = "a0000000-0000-4000-8000-000000000001";
    if (origem === "biografia") await db.query("insert into biografias(biografia_id,slug,nome,tipo,resumo_1_linha,texto_md,status_curadoria) values ($1,'pessoa-teste','Pessoa de teste','vitima','Resumo público','Texto público','publicada')", [registroId]);
    else await db.query("insert into eventos_geo(evento_id,titulo,data,municipio,uf,geometria,descricao_md,tipo_evento,tipos_crime,status_curadoria) values ($1,'Evento de teste','1970-01-01','Cidade','SP','{}','Descrição pública','caso_individual',array['tortura'],'publicada')", [registroId]);
    const copia = { ...(origem === "biografia" ? { slug: "pessoa-teste", texto_md: "Texto público" } : { evento_id: registroId, descricao_md: "Descrição pública" }), fontes: [{ titulo: "Fonte preservada", paginas: "10", trecho: "Trecho preservado" }] };
    const dados = { origem, registro_id: origem === "biografia" ? "pessoa-teste" : registroId, titulo: "Conferir registro público", motivo: "Conferir fontes do registro público.", categoria: "fontes", confirmacao_publicacao: true, registro_original: copia };
    return { dados, copia, registroId, di: (await agir("compartilhar_registro", dados)).discussao_id };
  }
  it.each(["biografia", "evento"])("preserva origem, cópia e fontes de %s; aprovação aguarda editorial sem ouro", async origem => {
    const { di, dados, copia } = await registro(origem);
    expect((await agir("compartilhar_registro", dados)).discussao_id).toBe(di);
    expect(await consulta("discussao", { id: di })).toMatchObject({ origem, registro_original: copia });
    const p = await proposta(di);
    await recusa("avaliar", { versao_id: p.versao_id, tipo: "apoio" });
    await parecer(p.versao_id, ids.curador1);
    expect(await parecer(p.versao_id, ids.curador2)).toMatchObject({ resultado: "aprovada", estado_editorial: "pendente" });
    expect((await db.query("select * from respostas_ouro")).rows).toHaveLength(0);
    expect((await consulta("curadoria", {}, ids.curador1)).editoriais).toHaveLength(1);
    const dc = (await db.query<{ decisao_id: string }>("select decisao_id from decisoes_comunidade")).rows[0];
    await recusa("concluir_editorial", { decisao_id: dc.decisao_id, justificativa: "Conferida a publicação editorial.", registro_original: copia }, ids.membro);
    await recusa("concluir_editorial", { decisao_id: dc.decisao_id, justificativa: "Conferida a publicação editorial.", registro_original: copia }, ids.curador1, "REGISTRO_SEM_ALTERACAO");
    const atualizada = { ...copia, fontes: [...copia.fontes, { titulo: "Fonte adicionada", paginas: "11", trecho: "Referência nova" }] };
    expect(await agir("concluir_editorial", { decisao_id: dc.decisao_id, justificativa: "Publicação editorial concluída e conferida.", registro_original: atualizada }, ids.curador1)).toMatchObject({ estado_editorial: "concluida" });
    const historico = await consulta("transparencia");
    expect(historico.itens).toEqual(expect.arrayContaining([expect.objectContaining({ estado_editorial: "concluida", registro_atualizado: atualizada, concluida_por: "@curador1" })]));
    expect((await consulta("discussao", { id: di })).registro_original).toEqual(copia);
    await recusa("concluir_editorial", { decisao_id: dc.decisao_id, justificativa: "Tentativa de substituir conclusão.", registro_original: atualizada }, ids.curador1, "CONFLITO");
    await db.exec("savepoint ouro_invalido");
    await expect(db.query("insert into respostas_ouro(versao_id,titulo,texto,chunk_ids) values ($1,'Registro aprovado','Texto',array[$2::uuid])", [p.versao_id, ids.chunk])).rejects.toThrow("NAO_PERMITIDO");
    await db.exec("rollback to savepoint ouro_invalido");
  });
  it("suspende atualização pendente quando há recurso e impede conclusão", async () => {
    const { di, copia } = await registro(); const p = await proposta(di);
    await parecer(p.versao_id, ids.curador1); await parecer(p.versao_id, ids.curador2);
    const dc = (await db.query<{ decisao_id: string }>("select decisao_id from decisoes_comunidade")).rows[0];
    await agir("recorrer", { alvo_tipo: "decisao", alvo_id: dc.decisao_id, motivo: "Novas evidências exigem revisar a decisão." }, ids.membro);
    expect((await consulta("curadoria", {}, ids.curador1)).editoriais).toEqual([]);
    await recusa("concluir_editorial", { decisao_id: dc.decisao_id, justificativa: "Não deve concluir durante recurso.", registro_original: { ...copia, texto_md: "Alterado" } }, ids.curador1, "CONFLITO");
  });
  it("não compartilha rascunho nem republica discussão ocultada", async () => {
    const { di, dados } = await registro();
    await agir("moderar", { alvo_tipo: "discussao", alvo_id: di, acao: "ocultar", justificativa: "Ocultação demonstrativa fundamentada." }, ids.curador1);
    await recusa("compartilhar_registro", dados, ids.membro, "AUSENTE");
    await db.exec("update biografias set status_curadoria='rascunho'");
    await recusa("compartilhar_registro", dados, ids.membro, "AUSENTE");
  });

  it("mantém interações privadas com RLS", async () => {
    const { rows } = await db.query<{ relrowsecurity: boolean }>(
      "select relrowsecurity from pg_class where oid='public.interacoes'::regclass",
    );
    expect(rows[0].relrowsecurity).toBe(true);
  });

  it("proíbe chamadas diretas às RPCs por anon e authenticated", async () => {
    const { rows } = await db.query<{ pode: boolean }>("select has_function_privilege('anon','comunidade_executar(text,jsonb,uuid)','execute') or has_function_privilege('authenticated','comunidade_consultar(text,jsonb,uuid)','execute') pode");
    expect(rows[0].pode).toBe(false);
  });
  it("consulta todas as projeções sem expor e-mail nem tabelas privadas", async () => {
    for (const recurso of ["discussoes", "fontes", "ouro", "transparencia"]) {
      const resultado = await consulta(recurso, { q: "Fonte" }); expect(resultado.itens).toBeInstanceOf(Array); expect(JSON.stringify(resultado)).not.toContain("@example.test");
    }
    for (const recurso of ["eu", "curadoria", "notificacoes"]) expect(JSON.stringify(await consulta(recurso, {}, ids.curador1))).not.toContain("@example.test");
  });
  it("compartilha cópia documental uma vez e não expõe interações privadas", async () => {
    const id = await discussao(); expect(await discussao()).toBe(id);
    const d = await consulta("discussao", { id }); expect(d.resposta).toContain("Resposta de teste");
    expect(d).not.toHaveProperty("interacao_id");
    const perfil = await consulta("perfil", { tag: "@autor" }); expect(perfil).not.toHaveProperty("email");
  });
  it("preserva versões de comentários e rejeita edição por terceiro", async () => {
    const di = await discussao(); const c = await agir("comentar", { discussao_id: di, texto: "Versão inicial" });
    await recusa("editar_comentario", { comentario_id: c.comentario_id, texto: "Alteração indevida" }, ids.membro);
    await agir("editar_comentario", { comentario_id: c.comentario_id, texto: "Versão corrigida" });
    const { rows } = await db.query<Record<string, unknown>>("select texto from comentarios_revisoes order by versao");
    expect(rows.map(x => x.texto)).toEqual(["Versão inicial", "Versão corrigida"]);
  });
  it("rejeita autovoto e preserva avaliações na versão antiga", async () => {
    const p = await proposta(await discussao());
    await recusa("avaliar", { versao_id: p.versao_id, tipo: "apoio" });
    await agir("avaliar", { versao_id: p.versao_id, tipo: "apoio" }, ids.membro);
    await agir("avaliar", { versao_id: p.versao_id, tipo: "ajustes", justificativa: "Detalhar o trecho." }, ids.membro);
    const nova = await agir("revisar_proposta", { proposta_id: p.proposta_id, texto: "Nova resposta documentada.", justificativa: "Texto ampliado com documentação.", chunk_ids: [ids.chunk] });
    expect(nova.versao_id).not.toBe(p.versao_id);
    const { rows } = await db.query<Record<string, unknown>>("select versao_id,tipo from avaliacoes_proposta"); expect(rows).toHaveLength(1); expect(rows[0].versao_id).toBe(p.versao_id);
    await recusa("avaliar", { versao_id: p.versao_id, tipo: "apoio" }, ids.candidato, "AUSENTE");
  });
  it("permite fontes novas, mas impede ouro sem fonte do acervo", async () => {
    const p = await proposta(await discussao(), { chunk_ids: [], fontes_sugeridas: "Pesquisa disponível em https://example.test/nova" });
    await recusa("parecer", { versao_id: p.versao_id, resultado: "aprovar", justificativa: "Conferir a fonte nova.", sintese: "Esta fonte ainda não foi incorporada." }, ids.curador1, "FONTES_OBRIGATORIAS");
  });
  it("exige dois pareceres, impede autor e congela veredito", async () => {
    const p = await proposta(await discussao());
    await db.query<Record<string, unknown>>("insert into curadores(user_id,nome,email) values ($1,'Autor','autor@example.test')", [ids.autor]);
    await recusa("parecer", { versao_id: p.versao_id, resultado: "aprovar", justificativa: "Sou autor da proposta.", sintese: "Esta revisão seria uma revisão própria." }, ids.autor, "CONFLITO_INTERESSE");
    expect((await parecer(p.versao_id, ids.curador1)).resultado).toBe("pendente");
    expect((await parecer(p.versao_id, ids.curador2)).resultado).toBe("aprovada");
    await recusa("parecer", { versao_id: p.versao_id, resultado: "recusar", justificativa: "Tentar sobrescrever decisão.", sintese: "Decisão não pode ser sobrescrita." }, ids.curador3, "CONFLITO");
    const r = await db.query<Record<string, unknown>>("select pontos from membros_comunidade where user_id=$1", [ids.autor]); expect(r.rows[0].pontos).toBe(30);
  });
  it("aplica maioria absoluta após divergência e não simplesmente dois apoios", async () => {
    const p = await proposta(await discussao());
    await db.query<Record<string, unknown>>("insert into curadores(user_id,nome,email) values ($1,'Membro','membro@example.test'),($2,'Candidato','candidato@example.test')", [ids.membro, ids.candidato]);
    await parecer(p.versao_id, ids.curador1, "recusar"); await parecer(p.versao_id, ids.curador2);
    expect((await parecer(p.versao_id, ids.curador3)).resultado).toBe("pendente");
    expect((await parecer(p.versao_id, ids.membro)).resultado).toBe("aprovada");
  });
  it("reconhece comentário útil uma vez e limita pontos comunitários", async () => {
    const co = await agir("comentar", { discussao_id: await discussao(), texto: "Uma sugestão construtiva de revisão." });
    for (const ator of [ids.curador1, ids.curador2, ids.curador3]) await agir("reconhecer_comentario", { comentario_id: co.comentario_id }, ator);
    await agir("reconhecer_comentario", { comentario_id: co.comentario_id }, ids.curador1);
    const r = await db.query<Record<string, unknown>>("select pontos from membros_comunidade where user_id=$1", [ids.autor]); expect(r.rows[0].pontos).toBe(2);
  });
  it("entrada na curadoria exige anuência e unanimidade expressa", async () => {
    const c = await agir("candidatar", { candidato_id: ids.candidato }, ids.curador1);
    for (const ator of [ids.curador1, ids.curador2, ids.curador3]) await agir("votar_candidatura", { candidatura_id: c.candidatura_id, aprova: true }, ator);
    expect((await db.query<Record<string, unknown>>("select * from curadores where user_id=$1", [ids.candidato])).rows).toHaveLength(0);
    await agir("consentir_candidatura", { candidatura_id: c.candidatura_id }, ids.candidato);
    expect((await db.query<Record<string, unknown>>("select ativo from curadores where user_id=$1", [ids.candidato])).rows[0].ativo).toBe(true);
  });
  it("saída de curador preserva pareceres e exclui papel operacional", async () => {
    const p = await proposta(await discussao()); await parecer(p.versao_id, ids.curador1);
    await agir("sair_curadoria", {}, ids.curador1);
    expect((await db.query<Record<string, unknown>>("select comunidade_e_curador($1::uuid) ativo", [ids.curador1])).rows[0].ativo).toBe(false);
    expect((await db.query<Record<string, unknown>>("select * from pareceres_comunidade")).rows).toHaveLength(1);
  });
  it("ocultação cobre detalhe, histórico, ouro, transparência e notificações", async () => {
    const di = await discussao(); const p = await proposta(di); await parecer(p.versao_id, ids.curador1); await parecer(p.versao_id, ids.curador2);
    await agir("moderar", { alvo_tipo: "discussao", alvo_id: di, acao: "ocultar", justificativa: "Exposição indevida precisa de revisão." }, ids.curador3);
    expect((await consulta("ouro")).itens).toEqual([]); expect((await consulta("transparencia")).itens).toEqual([]);
    expect((await consulta("notificacoes", {}, ids.autor)).itens).toEqual([]);
    await db.exec("savepoint oculto"); await expect(consulta("discussao", { id: di })).rejects.toThrow("AUSENTE"); await db.exec("rollback to savepoint oculto");
  });
  it("revisão ouro exige dois pareceres e fonte inalterada", async () => {
    const p = await proposta(await discussao()); await parecer(p.versao_id, ids.curador1); await parecer(p.versao_id, ids.curador2);
    const ouro = (await db.query<{ ouro_id: string }>("select ouro_id from respostas_ouro")).rows[0].ouro_id;
    await agir("suspender_ouro", { ouro_id: ouro, justificativa: "Nova evidência pede revisão editorial." }, ids.curador3);
    await agir("revisar_ouro", { ouro_id: ouro, resultado: "reativar", justificativa: "A documentação permanece íntegra." }, ids.curador1);
    expect((await db.query<Record<string, unknown>>("select estado from respostas_ouro")).rows[0].estado).toBe("suspensa");
    await agir("revisar_ouro", { ouro_id: ouro, resultado: "reativar", justificativa: "A documentação permanece íntegra." }, ids.curador2);
    expect((await db.query<Record<string, unknown>>("select estado from respostas_ouro")).rows[0].estado).toBe("ativa");
  });
  it("recupera apenas ouro ativo com hash de fontes íntegro", async () => {
    const p = await proposta(await discussao()); await parecer(p.versao_id, ids.curador1); await parecer(p.versao_id, ids.curador2);
    const vetor = JSON.stringify(Array.from({ length: 384 }, (_, i) => i === 0 ? 1 : 0));
    await db.query<Record<string, unknown>>("update respostas_ouro set embedding=$1::vector", [vetor]);
    const busca = () => db.query<Record<string, unknown>>("select * from buscar_ouro_ativo($1::vector,0.90,2)", [vetor]);
    expect((await busca()).rows).toHaveLength(1);
    await db.query<Record<string, unknown>>("update chunks set conteudo='Trecho mudou após aprovação' where chunk_id=$1", [ids.chunk]);
    expect((await busca()).rows).toHaveLength(0);
    const ouro = (await db.query<{ ouro_id: string }>("select ouro_id from respostas_ouro")).rows[0].ouro_id;
    await agir("suspender_ouro", { ouro_id: ouro, justificativa: "Fonte mudou após aprovação editorial." }, ids.curador1);
    await recusa("revisar_ouro", { ouro_id: ouro, resultado: "reativar", justificativa: "Tentar reativar apesar da mudança." }, ids.curador2, "FONTES_ALTERADAS");
  });
  it("recurso preserva decisão e exige revisores independentes", async () => {
    const p = await proposta(await discussao()); await parecer(p.versao_id, ids.curador1); await parecer(p.versao_id, ids.curador2);
    const dc = (await db.query<{ decisao_id: string }>("select decisao_id from decisoes_comunidade")).rows[0].decisao_id;
    await agir("recorrer", { alvo_tipo: "decisao", alvo_id: dc, motivo: "Nova evidência permite outra avaliação." }, ids.membro);
    await recusa("encaminhar", { versao_id: p.versao_id, justificativa: "Tentar retirar o impedimento da rodada anterior." }, ids.curador1, "CONFLITO");
    await recusa("parecer", { versao_id: p.versao_id, resultado: "recusar", justificativa: "Tentar julgar o próprio veredito.", sintese: "Este parecer não é independente." }, ids.curador1, "REVISOR_IMPEDIDO");
    expect((await db.query<Record<string, unknown>>("select * from decisoes_comunidade")).rows).toHaveLength(1);
    expect((await db.query<Record<string, unknown>>("select estado from respostas_ouro")).rows[0].estado).toBe("suspensa");
  });
  it("nega pontuação por incorporação de comentário de outro tópico", async () => {
    const di = await discussao(); const p = await proposta(di);
    await db.query<Record<string, unknown>>("insert into interacoes(interacao_id,pergunta,resposta,citacoes) values ('40000000-0000-4000-8000-000000000002','Outra pergunta','Outra resposta','[]')");
    const outro = await agir("compartilhar", { interacao_id: "40000000-0000-4000-8000-000000000002", titulo: "Outra discussão", motivo: "Outro tópico documental independente.", categoria: "fontes" });
    const c = await agir("comentar", { discussao_id: outro.discussao_id, texto: "Comentário de outro tópico." }, ids.membro);
    await recusa("revisar_proposta", { proposta_id: p.proposta_id, texto: "Versão que tenta pontuar indevidamente.", justificativa: "Incorporação forjada de outro tópico.", chunk_ids: [ids.chunk], comentario_incorporado_id: c.comentario_id }, ids.autor, "AUSENTE");
  });
  it("níveis usam tempo e dias de participação além dos pontos", async () => {
    await db.query<Record<string, unknown>>("update membros_comunidade set pontos=300 where user_id=$1", [ids.autor]);
    await consulta("eu", {}, ids.autor); expect((await consulta("eu", {}, ids.autor)).perfil).toMatchObject({ nivel: "participante" });
    await db.query<Record<string, unknown>>("insert into atividade_comunidade select $1::uuid,current_date-n from generate_series(1,20) n", [ids.autor]);
    expect((await consulta("eu", {}, ids.autor)).perfil).toMatchObject({ nivel: "referencia" });
  });
  it("reputação fraudulenta é revertida e o nível recalculado", async () => {
    const co = await agir("comentar", { discussao_id: await discussao(), texto: "Sugestão reconhecida de revisão." });
    for (const ator of [ids.curador1, ids.curador2, ids.curador3]) await agir("reconhecer_comentario", { comentario_id: co.comentario_id }, ator);
    await agir("moderar", { alvo_tipo: "comentario", alvo_id: co.comentario_id, acao: "invalidar_pontos", justificativa: "Reconhecimentos fraudulentos conferidos." }, ids.curador1);
    expect((await consulta("eu", {}, ids.autor)).perfil).toMatchObject({ pontos: 0, nivel: "participante" });
  });
  it("encerramento preserva conteúdo com atribuição desativada e impede atividade", async () => {
    const di = await discussao(); await agir("encerrar_conta", {});
    expect((await consulta("discussao", { id: di })).autor).toBe("@conta_desativada");
    await recusa("comentar", { discussao_id: di, texto: "Já encerrei minha conta." });
  });
  it("não junta pareceres sobre fontes modificadas entre as revisões", async () => {
    const p = await proposta(await discussao()); await parecer(p.versao_id, ids.curador1);
    await db.query("update chunks set conteudo='Outro trecho documental.' where chunk_id=$1", [ids.chunk]);
    expect((await parecer(p.versao_id, ids.curador2)).resultado).toBe("pendente");
    expect((await parecer(p.versao_id, ids.curador1)).resultado).toBe("aprovada");
  });
  it("mantém a ordem das referências escolhidas pelo autor", async () => {
    const outro = "30000000-0000-4000-8000-000000000002";
    await db.query("insert into chunks(chunk_id,fonte_id,conteudo,paginas,ordem,embedding) select $1,fonte_id,'Segundo trecho','11',2,embedding from chunks where chunk_id=$2", [outro, ids.chunk]);
    const p = await proposta(await discussao(), { chunk_ids: [outro, ids.chunk, outro] });
    const v = await db.query<{ chunk_ids: string[] }>("select chunk_ids from propostas_versoes where versao_id=$1", [p.versao_id]);
    expect(v.rows[0].chunk_ids).toEqual([outro, ids.chunk]);
  });
  it("encaminhamento automático exige idade e diversidade de avaliações", async () => {
    const p = await proposta(await discussao(), {}, false);
    for (const ator of [ids.curador1, ids.curador2, ids.curador3, ids.membro, ids.candidato]) await agir("avaliar", { versao_id: p.versao_id, tipo: "apoio" }, ator);
    const estado = async () => (await db.query<{ estado: string }>("select estado from propostas_versoes where versao_id=$1", [p.versao_id])).rows[0].estado;
    expect(await estado()).toBe("aberta");
    await db.query("update propostas_versoes set criada_em=now()-interval '73 hours' where versao_id=$1", [p.versao_id]);
    await consulta("curadoria", {}, ids.curador1); expect(await estado()).toBe("encaminhada");
  });
  it("impede parecer antes de encaminhamento e exige nova versão após ajustes", async () => {
    const p = await proposta(await discussao(), {}, false);
    const dados = { versao_id: p.versao_id, resultado: "aprovar", justificativa: "Fonte conferida antes do encaminhamento.", sintese: "Esta decisão não deve ser registrada." };
    await recusa("parecer", dados, ids.curador1, "CONFLITO");
    await agir("encaminhar", { versao_id: p.versao_id, justificativa: "Encaminhamento excepcional fundamentado." }, ids.curador1);
    await parecer(p.versao_id, ids.curador1, "ajustes");
    await db.query("update propostas_versoes set criada_em=now()-interval '73 hours' where versao_id=$1", [p.versao_id]);
    for (const ator of [ids.curador1, ids.curador2, ids.curador3, ids.membro, ids.candidato]) await agir("avaliar", { versao_id: p.versao_id, tipo: "apoio" }, ator);
    await consulta("curadoria", {}, ids.curador2);
    expect((await db.query<{estado:string}>("select estado from propostas_versoes where versao_id=$1", [p.versao_id])).rows[0].estado).toBe("aberta");
    await recusa("encaminhar", { versao_id: p.versao_id, justificativa: "Tentar reenviar o mesmo texto sem revisão." }, ids.curador2, "CONFLITO");
    await recusa("parecer", dados, ids.curador2, "CONFLITO");
    const nova = await agir("revisar_proposta", { proposta_id: p.proposta_id, texto: "Nova versão após os ajustes solicitados.", justificativa: "A proposta incorporou a revisão editorial.", chunk_ids: [ids.chunk] });
    await agir("encaminhar", { versao_id: nova.versao_id, justificativa: "Nova versão pode seguir para análise." }, ids.curador1);
    expect((await parecer(nova.versao_id, ids.curador2)).resultado).toBe("pendente");
  });
  it("destituição aguarda defesa e exige dois terços dos demais", async () => {
    const d = await agir("propor_destituicao", { alvo_id: ids.curador3, justificativa: "Procedimento de revisão da composição." }, ids.curador1);
    await recusa("votar_destituicao", { destituicao_id: d.destituicao_id, aprova: true }, ids.curador1, "AGUARDE_DEFESA");
    await agir("defender_destituicao", { destituicao_id: d.destituicao_id, defesa: "Apresento minha defesa documentada." }, ids.curador3);
    await agir("votar_destituicao", { destituicao_id: d.destituicao_id, aprova: true }, ids.curador1);
    expect((await db.query<{ ativo: boolean }>("select ativo from curadores where user_id=$1", [ids.curador3])).rows[0].ativo).toBe(true);
    await agir("votar_destituicao", { destituicao_id: d.destituicao_id, aprova: true }, ids.curador2);
    expect((await db.query<{ ativo: boolean }>("select ativo from curadores where user_id=$1", [ids.curador3])).rows[0].ativo).toBe(false);
  });
  it("recurso de moderação restaura conteúdo sem reabrir decisão editorial", async () => {
    const p = await proposta(await discussao()); await parecer(p.versao_id, ids.curador1); await parecer(p.versao_id, ids.curador2);
    const m = await agir("moderar", { alvo_tipo: "proposta", alvo_id: p.proposta_id, acao: "ocultar", justificativa: "Verificar denúncia sobre este conteúdo." }, ids.curador1);
    const r = await agir("recorrer", { alvo_tipo: "moderacao", alvo_id: m.moderacao_id, motivo: "A denúncia não corresponde ao conteúdo." });
    await recusa("parecer_recurso", { recurso_id: r.recurso_id, aprova: true, justificativa: "Tentar julgar a própria moderação." }, ids.curador1, "REVISOR_IMPEDIDO");
    for (const ator of [ids.curador2, ids.curador3]) await agir("parecer_recurso", { recurso_id: r.recurso_id, aprova: true, justificativa: "A denúncia foi examinada e não procede." }, ator);
    expect((await db.query<{ estado: string }>("select estado from propostas_comunidade where proposta_id=$1", [p.proposta_id])).rows[0].estado).toBe("decidida");
    await recusa("avaliar", { versao_id: p.versao_id, tipo: "apoio" }, ids.membro, "CONFLITO");
  });
  it("recurso pode restituir pontos invalidados uma única vez", async () => {
    const c = await agir("comentar", { discussao_id: await discussao(), texto: "Contribuição fundamentada de teste." });
    for (const ator of [ids.curador1, ids.curador2, ids.curador3]) await agir("reconhecer_comentario", { comentario_id: c.comentario_id }, ator);
    const m = await agir("moderar", { alvo_tipo: "comentario", alvo_id: c.comentario_id, acao: "invalidar_pontos", justificativa: "Reconhecimento precisa de conferência." }, ids.curador1);
    const r = await agir("recorrer", { alvo_tipo: "moderacao", alvo_id: m.moderacao_id, motivo: "As contribuições foram legítimas." });
    for (const ator of [ids.curador2, ids.curador3]) await agir("parecer_recurso", { recurso_id: r.recurso_id, aprova: true, justificativa: "Os reconhecimentos são legítimos." }, ator);
    expect((await consulta("eu", {}, ids.autor)).perfil).toMatchObject({ pontos: 2 });
  });
  it("limite compartilhado resiste a múltiplas chamadas da mesma conta", async () => {
    const di = await discussao();
    for (let n = 0; n < 29; n++) await agir("acompanhar", { discussao_id: di });
    await recusa("acompanhar", { discussao_id: di }, ids.autor, "LIMITE_EXCEDIDO");
    await agir("acompanhar", { discussao_id: di }, ids.membro);
  });
  it("links de decisão encontram sua proposta sem depender da primeira página", async () => {
    const di = await discussao(); const p = await proposta(di); const outra = await proposta(di, { texto: "Outra proposta documental independente." });
    const d = await consulta("discussao", { id: di, versao_id: outra.versao_id });
    expect(d.total_propostas).toBe(1); expect(d.propostas).toHaveLength(1);
    expect((d.propostas as { proposta_id: string }[])[0].proposta_id).toBe(outra.proposta_id);
    await parecer(p.versao_id, ids.curador1); await parecer(p.versao_id, ids.curador2);
    expect((await consulta("ouro", { id: "90000000-0000-4000-8000-000000000001" })).itens).toEqual([]);
  });
});
