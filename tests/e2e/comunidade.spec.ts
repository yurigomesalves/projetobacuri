import { expect, test, type Page } from "playwright/test";

const id = "40000000-0000-4000-8000-000000000001";
const user = { id: "10000000-0000-4000-8000-000000000005", aud: "authenticated", role: "authenticated", email: "teste@example.test", email_confirmed_at: "2026-01-01T00:00:00Z", app_metadata: { provider: "email", providers: ["email"] }, user_metadata: {}, identities: [], created_at: "2026-01-01T00:00:00Z" };
const fonte = { chunk_id: "30000000-0000-4000-8000-000000000001", fonte_id: "20000000-0000-4000-8000-000000000001", titulo: "Documento de demonstração", autor_orgao: "Arquivo de teste", paginas: "10", trecho: "Trecho documental de demonstração.", url_origem: "https://example.test/documento" };
const citacao = { ...fonte, n: 1, tipo_chunk: "corpo" };
const perfil = { user_id: user.id, tag: "@participante", nome_publico: "Pessoa de teste", bio: "Biografia de demonstração", nivel: "participante", pontos: 2, suspenso: false };
const versao = { versao_id: "50000000-0000-4000-8000-000000000001", numero: 1, texto: "Uma resposta alternativa documentada [1].", justificativa: "A fonte permite ampliar a resposta.", fontes_sugeridas: "", chunk_ids: [fonte.chunk_id], fontes: [fonte], estado: "aberta", ciclo: 1, apoios: 1, ajustes: 0, sem_fundamento: 0, avaliacoes: [], pareceres: [], decisoes: [], minha_avaliacao: null };
const proposta = { proposta_id: "60000000-0000-4000-8000-000000000001", autor: "@autor", autor_id: "10000000-0000-4000-8000-000000000001", estado: "aberta", versao_atual: 1, versoes: [versao] };
const discussao = { discussao_id: id, titulo: "Conferir a resposta documental", motivo: "A resposta merece conferência de suas fontes.", categoria: "fontes", autor: "@autor", autor_id: proposta.autor_id, criado_em: "2026-01-01T00:00:00Z", pergunta: "Pergunta de demonstração", resumo: "Síntese de demonstração", resposta: "Resposta original com referência [1].", citacoes: [citacao], acompanhando: false, comentarios: [{ comentario_id: "70000000-0000-4000-8000-000000000001", autor: "@autor", autor_id: proposta.autor_id, pai_id: null, texto: "Sugestão para ampliar a discussão.", criado_em: "2026-01-01T00:00:00Z", revisoes: [{ versao: 1, texto: "Sugestão para ampliar a discussão." }] }], total_comentarios: 1, propostas: [proposta], total_propostas: 1, organizacao: [] };

async function ambiente(page: Page, curador = false, proprio = false) {
  const comandos: { acao: string; dados: Record<string, unknown> }[] = [];
  const sessao = { access_token: `${Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")}.${Buffer.from(JSON.stringify({ sub: user.id, exp: 2000000000, role: "authenticated" })).toString("base64url")}.teste`, token_type: "bearer", expires_in: 3600, refresh_token: "teste-refresh", user };
  await page.route("**/auth/v1/**", r => r.fulfill({ json: r.request().url().includes("/token") ? sessao : user }));
  await page.route("**/api/transparencia**", r => r.fulfill({ json: { itens: [], total: 0 } }));
  await page.route("**/api/comunidade**", async r => {
    if (r.request().method() === "POST") {
      const comando = r.request().postDataJSON(); comandos.push(comando);
      await r.fulfill({ json: { resultado: comando.acao === "compartilhar" ? { discussao_id: id } : { ok: true } } }); return;
    }
    const recurso = new URL(r.request().url()).searchParams.get("recurso");
    const respostas: Record<string, unknown> = {
      discussoes: { itens: [{ ...discussao, comentarios: 1, propostas: 1 }], total: 1 }, discussao: proprio ? { ...discussao, autor_id: user.id, comentarios: discussao.comentarios.map(c => ({ ...c, autor_id: user.id })), propostas: [{ ...proposta, autor_id: user.id }] } : discussao,
      eu: { user_id: user.id, perfil, curador, extrato: [{ tipo: "comentario_reconhecido", pontos: 2, criado_em: "2026-01-01T00:00:00Z" }], candidaturas: [{ candidatura_id: "80000000-0000-4000-8000-000000000001", estado: "pendente", consentido_em: null }], moderacoes: [] },
      notificacoes: { itens: [{ notificacao_id: "n1", tipo: "decisao", dados: { discussao_id: id }, criada_em: "2026-01-01T00:00:00Z", lida_em: null }] }, fontes: { itens: [fonte], total: 1 },
      ouro: { itens: [{ ouro_id: "90000000-0000-4000-8000-000000000001", versao_id: versao.versao_id, titulo: discussao.titulo, texto: versao.texto, autor: "@autor", discussao_id: id, estado: "ativa", fontes_validas: true, fontes: [fonte] }], total: 1 },
      transparencia: { itens: [{ decisao_id: "d1", discussao_id: id, versao_id: versao.versao_id, resultado: "aprovada", sintese: "Fontes e contexto conferidos nesta versão.", criada_em: "2026-01-01T00:00:00Z", ciclo: 1, pareceristas: ["@curador1", "@curador2"], fontes: [fonte] }], total: 1, eventos: [], revisoes_ouro: [] },
      curadoria: { itens: [{ proposta_id: proposta.proposta_id, discussao_id: id, titulo: discussao.titulo, autor: "@autor", impedido: false, versao: { ...versao, estado: "encaminhada" } }], curadores: [{ user_id: user.id, nome: "Pessoa de teste", ativo: true }], candidaturas: [], destituicoes: [], denuncias: [], moderacoes: [], recursos: [] },
    };
    await r.fulfill({ json: respostas[recurso || ""] || perfil });
  });
  return comandos;
}
async function entrar(page: Page) {
  await page.goto("/conta");
  await page.getByLabel("E-mail", { exact: true }).fill(user.email);
  await page.getByLabel("Senha", { exact: true }).fill("senha-de-teste");
  await page.getByRole("button", { name: "Entrar", exact: true }).last().click();
  await expect(page.getByRole("button", { name: "Sair da conta" })).toBeVisible();
}

test("compartilha somente após prévia, login e nova confirmação", async ({ page }, info) => {
  const comandos = await ambiente(page);
  await page.route("**/api/chat", r => r.fulfill({ json: { interacao_id: id, token_compartilhamento: "recibo-de-teste", resumo: discussao.resumo, resposta: discussao.resposta, citacoes: [citacao] } }));
  await page.goto("/");
  await page.getByRole("textbox", { name: "Escreva sua pergunta" }).fill(discussao.pergunta);
  await page.getByRole("button", { name: "Enviar", exact: true }).click();
  await page.getByRole("button", { name: "Discutir esta resposta" }).click();
  await expect(page.getByText("Prévia da publicação")).toBeVisible();
  await page.getByLabel("Título", { exact: true }).fill(discussao.titulo);
  await page.getByLabel("Motivo da discussão").fill(discussao.motivo);
  await expect(page.getByRole("button", { name: "Confirmar publicação" })).toBeDisabled();
  await page.getByRole("link", { name: "Entrar ou criar conta" }).click();
  await page.getByLabel("E-mail", { exact: true }).fill(user.email); await page.getByLabel("Senha", { exact: true }).fill("senha-de-teste"); await page.getByRole("button", { name: "Entrar", exact: true }).last().click();
  await expect(page).toHaveURL(/\/comunidade\/compartilhar$/);
  expect(comandos).toHaveLength(0);
  await expect(page.getByRole("button", { name: "Confirmar publicação" })).toBeDisabled();
  await expect(page.getByText(fonte.titulo).last()).toBeVisible();
  await page.getByRole("checkbox", { name: /Confirmo a publicação/ }).check();
  await page.getByRole("button", { name: "Confirmar publicação" }).click();
  await expect(page).toHaveURL(new RegExp(`/comunidade/${id}$`));
  expect(comandos[0]).toEqual({ acao: "compartilhar", dados: { interacao_id: id, token_compartilhamento: "recibo-de-teste", titulo: discussao.titulo, motivo: discussao.motivo, categoria: "omissao", confirmacao_publicacao: true } });
  await expect(page.getByRole("heading", { name: "Pergunta e resposta originais" })).toBeVisible();
  await page.screenshot({ path: info.outputPath("discussao.png"), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("avalia com justificativa humana e propõe com trecho selecionado", async ({ page }) => {
  const comandos = await ambiente(page); await entrar(page); await page.goto(`/comunidade/${id}`);
  await page.getByLabel("Sua avaliação").selectOption("ajustes");
  await page.getByLabel("Justifique com base nas fontes").fill("É necessário explicar o contexto documental.");
  await page.getByRole("button", { name: "Registrar avaliação" }).click();
  await expect.poll(() => comandos.some(c => c.acao === "avaliar")).toBe(true);
  expect(comandos.find(c => c.acao === "avaliar")?.dados.justificativa).toBe("É necessário explicar o contexto documental.");
  await page.getByText("Propor uma resposta mais adequada", { exact: true }).click();
  const editor = page.locator("details").filter({ has: page.locator('summary:text-is("Propor uma resposta mais adequada")') });
  await editor.getByLabel("Resposta alternativa completa").fill("Texto ampliado com base na fonte [1].");
  await editor.getByLabel("Justificativa da mudança").fill("A mudança esclarece o contexto da fonte.");
  await editor.getByLabel("Buscar documento ou conteúdo").fill("Documento"); await editor.getByRole("button", { name: "Buscar trechos" }).click();
  await editor.getByRole("checkbox").check(); await editor.getByRole("button", { name: "Publicar proposta" }).click();
  await expect.poll(() => comandos.some(c => c.acao === "propor")).toBe(true);
  expect(comandos.find(c => c.acao === "propor")?.dados.chunk_ids).toEqual([fonte.chunk_id]);
});

test("conta mostra perfil, consentimento, extrato e notificações", async ({ page }) => {
  const comandos = await ambiente(page); await entrar(page);
  await expect(page.getByLabel("Nome público (opcional)")).toHaveValue(perfil.nome_publico);
  await page.getByRole("button", { name: "Aceitar indicação à curadoria" }).click();
  await expect.poll(() => comandos.some(c => c.acao === "consentir_candidatura")).toBe(true);
  await expect(page.getByRole("heading", { name: "Extrato de participação" })).toBeVisible();
  await page.getByRole("button", { name: "Marcar notificações como lidas" }).click();
  await expect.poll(() => comandos.some(c => c.acao === "ler_notificacoes")).toBe(true);
});

test("curador confere fontes e envia parecer sem justificativa automática", async ({ page }) => {
  const comandos = await ambiente(page, true); await entrar(page); await page.goto("/comunidade/curadoria");
  await expect(page.getByRole("heading", { name: "Propostas para análise" })).toBeVisible();
  await expect(page.getByText(fonte.titulo, { exact: false }).first()).toBeVisible();
  await page.getByText("Emitir parecer", { exact: true }).first().click();
  await page.getByRole("combobox", { name: "Resultado", exact: true }).selectOption("aprovar");
  await expect(page.getByLabel("Justificativa do parecer", { exact: true })).toHaveValue("");
  await page.getByLabel("Justificativa do parecer", { exact: true }).fill("Os trechos e o contexto foram conferidos.");
  await page.getByLabel("Síntese pública da decisão").fill("Esta versão está fundamentada nas fontes conferidas.");
  await page.getByRole("button", { name: "Registrar parecer", exact: true }).click();
  await expect.poll(() => comandos.some(c => c.acao === "parecer")).toBe(true);
  expect(comandos.find(c => c.acao === "parecer")?.dados.resultado).toBe("aprovar");
  await page.goto("/transparencia");
  await expect(page.getByText("Fontes e contexto conferidos nesta versão.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Ver versão decidida, fontes vinculadas e pareceres" })).toBeVisible();
});

test("cadastro permanece desabilitado quando a comunidade não está ativada", async ({ page }) => {
  await page.route("**/api/comunidade**", r => r.fulfill({ status: 503, json: { erro: { mensagem: "A comunidade está em preparação." } } }));
  await page.goto("/conta"); await expect(page.getByRole("button", { name: "Criar conta", exact: true })).toBeDisabled();
  await expect(page.getByText("O cadastro público está em preparação.", { exact: false })).toBeVisible();
});

test("prévia fica em diálogo limitado à tela e respeita a sessão", async ({ page }, info) => {
  await ambiente(page); await entrar(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const respostaLonga = ("Resposta documental para conferir antes da publicação. ").repeat(80);
  await page.route("**/api/chat", r => r.fulfill({ json: { interacao_id: id, token_compartilhamento: "recibo-de-teste", resposta: respostaLonga, citacoes: [] } }));
  await page.goto("/");
  await page.getByRole("textbox", { name: "Escreva sua pergunta" }).fill(discussao.pergunta);
  await page.getByRole("button", { name: "Enviar", exact: true }).click();
  await expect(page.getByRole("button", { name: "Discutir esta resposta" })).toBeVisible();
  const alturaAntes = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.getByRole("button", { name: "Discutir esta resposta" }).click();
  const janela = page.getByRole("dialog", { name: "Prévia da publicação" });
  await expect(janela).toBeVisible();
  await expect(janela.getByRole("link", { name: "Entrar ou criar conta" })).toHaveCount(0);
  const limites = await janela.boundingBox();
  expect(limites!.y).toBeGreaterThanOrEqual(0);
  expect(limites!.y + limites!.height).toBeLessThanOrEqual(await page.evaluate(() => innerHeight));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(alturaAntes + 2);
  expect(await janela.locator("form").evaluate(el => getComputedStyle(el).position)).toBe("static");
  expect(await janela.locator(".bk-share-preview").evaluate(el => el.scrollHeight > el.clientHeight)).toBe(true);
  await page.screenshot({ path: info.outputPath("previa-dialogo.png") });
  await page.keyboard.press("Escape"); await expect(janela).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Discutir esta resposta" })).toBeFocused();
});

test("menu do perfil substitui curadoria no topo e fecha por Escape", async ({ page }) => {
  await ambiente(page); await entrar(page);
  const topo = page.locator(".bk-topbar");
  await expect(topo.getByRole("link", { name: /Curadoria/ })).toHaveCount(0);
  const botao = topo.getByRole("button", { name: "Menu da conta: @participante" });
  await botao.click();
  const menu = topo.locator(".bc-account-dropdown");
  await expect(menu.getByRole("link", { name: /Meu perfil/ })).toBeVisible();
  await expect(menu.getByRole("link", { name: /Curadoria/ })).toHaveCount(0);
  await expect(menu.getByRole("link")).toHaveCount(2);
  await expect(menu.getByRole("link", { name: "Meu perfil", exact: true })).toHaveAttribute("href", "/conta");
  await expect(menu.getByRole("img", { name: "Há notificações não lidas" })).toBeVisible();
  await expect(page.locator(".bc-nav").getByRole("link", { name: "Curadoria", exact: true })).toHaveCount(0);
  await expect(menu).not.toContainText(user.email);
  await page.keyboard.press("Escape"); await expect(menu).toHaveCount(0); await expect(botao).toBeFocused();
  await botao.click(); await menu.getByRole("link", { name: /Minha comunidade/ }).click();
  await expect(page).toHaveURL(/\/comunidade$/); await expect(menu).toHaveCount(0);
});

test("menu mostra painel apenas para curador e permite sair", async ({ page }) => {
  await ambiente(page, true); await entrar(page);
  const topo = page.locator(".bk-topbar"); await topo.getByRole("button", { name: "Menu da conta: @participante" }).click();
  const menu = topo.locator(".bc-account-dropdown");
  await expect(menu.getByRole("link", { name: /Curadoria/ })).toBeVisible();
  await menu.getByRole("button", { name: "Sair da Conta", exact: true }).click();
  await expect(topo.getByRole("link", { name: "Entrar no BACURI" })).toBeVisible(); await expect(menu).toHaveCount(0);
});

test("comentários mostram ações secundárias somente sob demanda", async ({ page }) => {
  await ambiente(page); await entrar(page); await page.goto(`/comunidade/${id}`);
  const comentario = page.locator(".bc-comment").first();
  await expect(comentario.getByText("Sugestão para ampliar a discussão.", { exact: true })).toBeVisible();
  await expect(comentario.getByRole("button", { name: "Denunciar comentário", exact: true })).not.toBeVisible();
  await comentario.getByRole("button", { name: "Responder", exact: true }).click();
  await expect(comentario.getByLabel("Sua resposta")).toBeVisible();
  await comentario.getByRole("button", { name: "Fechar", exact: true }).click();
  await comentario.locator(".bc-comment-menu > summary").click();
  await comentario.getByRole("button", { name: "Histórico do comentário", exact: true }).click();
  await expect(comentario.getByText("Versão 1", { exact: true })).toBeVisible();
  await expect(comentario.getByLabel("Sua resposta")).toHaveCount(0);
  const opcoes = comentario.locator(".bc-comment-menu");
  await opcoes.locator("summary").click(); await page.keyboard.press("Escape");
  await expect(opcoes).not.toHaveAttribute("open"); await expect(opcoes.locator("summary")).toBeFocused();
  await opcoes.locator("summary").click(); await page.getByRole("heading", { name: "Comentários (1)", exact: true }).click();
  await expect(opcoes).not.toHaveAttribute("open");
});

for (const proprio of [true, false]) test(`menu da proposta respeita autoria: ${proprio ? "própria" : "outra pessoa"}`, async ({ page }) => {
  await ambiente(page, false, proprio); await entrar(page); await page.goto(`/comunidade/${id}`);
  const card = page.locator(".bc-proposal").first();
  await expect(card.getByRole("button", { name: "Denunciar proposta", exact: true })).not.toBeVisible();
  await card.locator(".bc-comment-menu > summary").click();
  if (proprio) {
    await expect(card.getByRole("button", { name: "Denunciar proposta", exact: true })).toHaveCount(0);
    await card.getByRole("button", { name: "Revisar minha proposta", exact: true }).click();
    await expect(card.getByLabel("Resposta alternativa completa")).toHaveValue(versao.texto);
    const comentario = page.locator(".bc-comment").first(); await comentario.locator(".bc-comment-menu > summary").click();
    await expect(comentario.getByRole("button", { name: "Denunciar comentário", exact: true })).toHaveCount(0);
    await expect(page.getByText("Denunciar discussão", { exact: true })).toHaveCount(0);
  } else {
    await expect(card.getByRole("button", { name: "Revisar minha proposta", exact: true })).toHaveCount(0);
    await card.getByRole("button", { name: "Denunciar proposta", exact: true }).click();
    await expect(card.getByLabel("Motivo da denúncia")).toBeVisible();
  }
});

test("notificações antigas preservam rascunho do perfil e identificam a discussão", async ({ page }) => {
  await ambiente(page);
  const itens = Array.from({ length: 25 }, (_, i) => ({ notificacao_id: `aviso-${i}`, tipo: "comentario", dados: { discussao_id: id }, titulo_discussao: `Discussão do aviso ${i + 1}`, criada_em: "2026-01-01T00:00:00Z", lida_em: i === 0 ? null : "2026-01-02T00:00:00Z" }));
  await page.route("**/api/comunidade?**", async r => {
    const url = new URL(r.request().url());
    if (url.searchParams.get("recurso") !== "notificacoes") return r.fallback();
    const pagina = Number(url.searchParams.get("pagina") || 1);
    await r.fulfill({ json: { itens: itens.slice((pagina - 1) * 20, pagina * 20), total: itens.length, pagina } });
  });
  await entrar(page);
  await page.getByLabel("Biografia (opcional)").fill("Rascunho ainda não salvo.");
  const avisos = page.locator(".bc-notification-card");
  await expect(avisos.getByText("Página 1 de 2", { exact: true })).toBeVisible();
  await avisos.getByRole("button", { name: "Mais antigas", exact: true }).click();
  await expect(avisos.getByText("Página 2 de 2", { exact: true })).toBeVisible();
  await expect(avisos.locator("li")).toHaveCount(5);
  await expect(avisos.getByText("Discussão do aviso 21", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Biografia (opcional)")).toHaveValue("Rascunho ainda não salvo.");
  await avisos.getByLabel("Filtrar notificações", { exact: true }).selectOption("nao_lidas");
  await expect(avisos.getByText("Nenhuma notificação não lida nesta página.", { exact: true })).toBeVisible();
  await avisos.getByRole("button", { name: "Mais recentes", exact: true }).click();
  await expect(avisos.locator("li")).toHaveCount(1);
});

test("quórum insuficiente aparece antes de tentar enviar parecer", async ({ page }) => {
  await ambiente(page, true);
  await page.route("**/api/comunidade?**", async r => {
    if (new URL(r.request().url()).searchParams.get("recurso") !== "curadoria") return r.fallback();
    await r.fulfill({ json: { itens: [{ proposta_id: proposta.proposta_id, discussao_id: id, titulo: discussao.titulo, autor: "@autor", impedido: false, versao, quorum: { elegiveis: 1, recebidos: 0, favoraveis: 0, contrarios: 0, ajustes: 0, necessarios: 2, faltam: 2, insuficientes: 1, impedido: false } }], curadores: [], candidaturas: [], destituicoes: [], denuncias: [], moderacoes: [], recursos: [] } });
  });
  await entrar(page); await page.goto("/comunidade/curadoria");
  await expect(page.getByText("0 de 2 pareceres concordantes", { exact: true })).toBeVisible();
  await expect(page.getByText("Falta 1 curador elegível para formar o quórum.", { exact: true })).toBeVisible();
  await expect(page.getByRole("progressbar")).toHaveAttribute("max", "2");
  await expect(page.getByLabel("Justificativa do parecer")).not.toBeVisible();
});
test("menu preserva curadoria legada com comunidade desativada", async ({ page }) => {
  await ambiente(page, true);
  await entrar(page);
  await page.route("**/api/comunidade**", r => r.fulfill({ status: 503, json: { erro: { mensagem: "A comunidade está em preparação." } } }));
  await page.route("**/api/curadoria/eu", r => r.fulfill({ json: { nome: "Curador de teste" } }));
  await page.evaluate(() => window.dispatchEvent(new Event("bacuri-perfil-atualizado")));
  await expect(page.locator(".bk-topbar").getByRole("button", { name: "Menu da conta", exact: true })).toBeVisible();
  await page.locator(".bk-topbar").getByRole("button", { name: "Menu da conta" }).click();
  await expect(page.getByRole("link", { name: "Curadoria", exact: true })).toHaveAttribute("href", "/curadoria");
});

for (const origem of ["biografia", "evento"] as const) test(`publica ${origem} após login com rascunho e fontes preservados`, async ({ page }) => {
  const comandos = await ambiente(page);
  const registroId = "a0000000-0000-4000-8000-000000000001";
  const conteudo = origem === "biografia"
    ? { slug: "pessoa-teste", nome: "Pessoa de teste", tipo: "vitima", resumo_1_linha: "Resumo de teste", texto_md: "Texto público preservado.", fontes: [citacao], marcadores: [], eventos: [], organizacoes: [] }
    : { evento_id: registroId, titulo: "Evento de teste", data: "1970-01-01", municipio: "Cidade", uf: "SP", geometria: { type: "Point", coordinates: [-46, -23] }, descricao_md: "Texto público preservado.", fontes: [citacao], marcadores: [], vitimas: [], tipos_crime: ["tortura"] };
  await page.route("**/api/biografias/pessoa-teste", r => r.fulfill({ json: conteudo }));
  await page.route(`**/api/eventos-geo/${registroId}`, r => r.fulfill({ json: conteudo }));
  await page.route("**/api/eventos-geo", r => r.fulfill({ json: { type: "FeatureCollection", features: [] } }));
  await page.route("**/api/comunidade**", async r => {
    if (r.request().method() === "POST") {
      const comando = r.request().postDataJSON(); comandos.push(comando);
      return r.fulfill({ json: { resultado: { discussao_id: id } } });
    }
    if (new URL(r.request().url()).searchParams.get("recurso") === "discussao") return r.fulfill({ json: { ...discussao, origem, origem_link: origem === "biografia" ? "/biografias/pessoa-teste" : `/mapa?evento=${registroId}`, registro_original: conteudo } });
    return r.fallback();
  });
  await page.goto(origem === "biografia" ? "/biografias/pessoa-teste" : `/mapa?evento=${registroId}`);
  await page.getByRole("button", { name: "Discutir na comunidade" }).click();
  const janela = page.getByRole("dialog", { name: "Prévia da publicação" });
  await expect(janela.getByText("Documento de demonstração", { exact: true })).toBeVisible();
  await janela.getByLabel("Título", { exact: true }).fill("Conferir o registro publicado");
  await janela.getByLabel("Motivo da discussão").fill("As fontes do registro precisam de conferência.");
  await janela.getByLabel("Categoria", { exact: true }).selectOption("fontes");
  await janela.getByRole("link", { name: "Entrar ou criar conta" }).click();
  await page.getByLabel("E-mail", { exact: true }).fill(user.email);
  await page.getByLabel("Senha", { exact: true }).fill("senha-de-teste");
  await page.getByRole("button", { name: "Entrar", exact: true }).last().click();
  await expect(page).toHaveURL(/\/comunidade\/compartilhar$/);
  await expect(janela.getByLabel("Título", { exact: true })).toHaveValue("Conferir o registro publicado");
  await expect(janela.getByLabel("Categoria", { exact: true })).toHaveValue("fontes");
  expect(comandos).toHaveLength(0);
  await janela.getByRole("checkbox").check();
  await janela.getByRole("button", { name: "Confirmar publicação" }).click();
  await expect(page).toHaveURL(new RegExp(`/comunidade/${id}$`));
  expect(comandos[0]).toMatchObject({ acao: "compartilhar_registro", dados: { origem, registro_id: origem === "biografia" ? "pessoa-teste" : registroId, confirmacao_publicacao: true } });
  expect(comandos[0].dados).not.toHaveProperty("registro_original");
  await expect(page.getByRole("heading", { name: origem === "biografia" ? "Biografia original" : "Registro original" })).toBeVisible();
  await expect(page.getByText("Texto público preservado.", { exact: true })).toBeVisible();
});

for (const tema of ["claro", "escuro"]) test(`discussão compacta e denúncia por teclado no tema ${tema}`, async ({ page }, info) => {
  const comandos = await ambiente(page);
  await page.addInitScript(valor => localStorage.setItem("bacuri-tema", valor), tema);
  await entrar(page); await page.goto(`/comunidade/${id}`);
  const menu = page.getByLabel("Opções da discussão", { exact: true });
  await menu.focus(); await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Denunciar discussão", exact: true })).toBeVisible();
  await page.keyboard.press("Escape"); await expect(menu).toBeFocused();
  await menu.press("Enter"); await page.getByRole("button", { name: "Denunciar discussão", exact: true }).click();
  await page.getByLabel("Motivo da denúncia").fill("Motivo de denúncia para conferência da curadoria.");
  await page.locator(".bc-comment-panel").getByRole("button", { name: "Enviar", exact: true }).click();
  await expect.poll(() => comandos.some(c => c.acao === "denunciar" && c.dados.alvo_tipo === "discussao")).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath(`discussao-${tema}.png`), fullPage: true });
});

test("menu diferencia abrir e fechar e recupera foco", async ({ page }, info) => {
  await ambiente(page); await page.goto("/comunidade");
  if (info.project.name === "celular") {
    const abrir = page.getByRole("button", { name: "Abrir menu", exact: true });
    await abrir.click();
    const fechar = page.getByRole("button", { name: "Fechar menu", exact: true });
    expect(await abrir.locator("path").getAttribute("d")).not.toBe(await fechar.locator("path").getAttribute("d"));
    await fechar.click(); await expect(abrir).toBeFocused();
  } else {
    const recolher = page.getByRole("button", { name: "Recolher menu", exact: true });
    const path = await recolher.locator("path").getAttribute("d");
    await recolher.click(); const expandir = page.getByRole("button", { name: "Expandir menu", exact: true });
    expect(await expandir.locator("path").getAttribute("d")).not.toBe(path);
    await expandir.press("Enter"); await expect(recolher).toHaveAttribute("aria-expanded", "true");
  }
});

for (const tema of ["claro", "escuro"]) test(`sugestões do chat formam lista vertical no tema ${tema}`, async ({ page }, info) => {
  await ambiente(page); await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(valor => localStorage.setItem("bacuri-tema", valor), tema);
  await page.route("**/api/chat", r => r.fulfill({ json: { interacao_id: id, resposta: "Resposta demonstrativa com fonte [1].", citacoes: [citacao], sugestoes_pesquisa: ["Consultar o documento citado e sua nota de contexto.", "Comparar os trechos e as páginas indicadas.", "Examinar a proveniência das fontes mencionadas."] } }));
  await page.goto("/"); await page.getByRole("textbox", { name: "Escreva sua pergunta" }).fill("Pergunta de demonstração"); await page.getByRole("button", { name: "Enviar", exact: true }).click();
  const lista = page.locator(".bk-research-suggestions"); await expect(lista.locator("li")).toHaveCount(3);
  const caixas = await lista.locator("li").evaluateAll(items => items.map(el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, bottom: r.bottom }; }));
  for (let i = 1; i < caixas.length; i++) { expect(caixas[i].x).toBe(caixas[0].x); expect(caixas[i].y).toBeGreaterThanOrEqual(caixas[i-1].bottom); }
  await page.screenshot({ path: info.outputPath(`sugestoes-${tema}.png`), fullPage: true });
});

test("decisão editorial aparece pendente e curadoria registra conclusão", async ({ page }) => {
  const comandos = await ambiente(page, true);
  await page.route("**/api/comunidade?**", async r => {
    const recurso = new URL(r.request().url()).searchParams.get("recurso");
    if (recurso === "discussao") return r.fulfill({ json: { ...discussao, propostas: [{ ...proposta, versoes: [{ ...versao, estado: "decidida", decisoes: [{ decisao_id: id, resultado: "aprovada", estado_editorial: "pendente", sintese: "Atualização do registro encaminhada.", ciclo: 1, criada_em: "2026-01-01" }] }] }] } });
    if (recurso === "curadoria") return r.fulfill({ json: { itens: [], editoriais: [{ decisao_id: id, discussao_id: id, versao_id: versao.versao_id, titulo: "Revisão aprovada", origem_link: "/biografias/pessoa-teste", impedido: false }], curadores: [], candidaturas: [], destituicoes: [], denuncias: [], moderacoes: [], recursos: [] } });
    return r.fallback();
  });
  await entrar(page); await page.goto(`/comunidade/${id}`);
  await expect(page.getByText("Atualização editorial pendente", { exact: true })).toBeVisible();
  await page.goto("/comunidade/curadoria");
  await page.getByLabel("Justificativa da conclusão editorial").fill("Registro revisado e publicado pelo fluxo editorial do acervo.");
  await page.getByRole("button", { name: "Registrar conclusão editorial", exact: true }).click();
  await expect.poll(() => comandos.some(c => c.acao === "concluir_editorial")).toBe(true);
});
