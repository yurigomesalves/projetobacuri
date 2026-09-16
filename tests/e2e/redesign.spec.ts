import { test, expect } from "playwright/test";
const itens = Array.from({ length: 23 }, (_, n) => ({
  fonte_id: `fonte-${n}`,
  titulo: `Documento ${String(n + 1).padStart(2, "0")}`,
  autor_orgao: "Comissão de teste",
  tipo_fonte: "relatorio_oficial",
  confiabilidade: "alta",
  data_documento: "2014-12-10",
  periodo: "pos_1985",
  url_origem: "https://example.org/documento.pdf",
  nota_contexto: "Nota documental de teste",
}));
test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/api/transparencia/acervo", (r) =>
    r.fulfill({
      json: { itens, total: 23, porTipo: { relatorio_oficial: 23 } },
    }),
  );
});
test("painel real, filtros, paginação, tema e navegação móvel", async ({
  page,
  isMobile,
}) => {
  await page.goto("/acervo");
  await expect(
    page.getByRole("heading", { name: "Acervo documental" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Composição por tipo documental" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Distribuição por década" }),
  ).toBeVisible();
  await expect(page.getByRole("table").locator("tbody tr")).toHaveCount(20);
  await page.getByRole("button", { name: "Usar tema escuro" }).click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "escuro");
  await expect(page.getByRole("search")).toHaveCount(1);
  await expect(page.locator(".bk-topbar").getByRole("search")).toHaveCount(0);
  if (isMobile) {
    await page.getByRole("button", { name: "Abrir menu", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page
      .getByRole("dialog")
      .getByRole("link", { name: "Acervo", exact: true })
      .click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
  } else {
    await page
      .getByRole("button", { name: "Recolher menu", exact: true })
      .click();
    await expect(page.locator(".bk-app")).toHaveClass(/bk-collapsed/);
  }
  await page.getByRole("button", { name: "Próxima", exact: true }).click();
  await expect(page.getByRole("table").locator("tbody tr")).toHaveCount(3);
  await page.getByLabel("Título ou autoria").fill("Documento 07");
  await page.getByRole("button", { name: "Filtrar", exact: true }).click();
  await expect(page.getByRole("table").locator("tbody tr")).toHaveCount(1);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar CSV" }).click();
  expect((await download).suggestedFilename()).toBe("bacuri-acervo.csv");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("rota antiga de visão geral aponta para o acervo unificado", async ({
  page,
}) => {
  await page.goto("/visao-geral");
  await expect(page).toHaveURL(/\/acervo$/);
  await expect(
    page.getByRole("heading", { name: "Acervo documental" }),
  ).toBeVisible();
});
test("erro do catálogo oferece nova tentativa sem indicadores falsos", async ({
  page,
}) => {
  await page.route("**/api/transparencia/acervo", (r) =>
    r.fulfill({ status: 500, json: { erro: {} } }),
  );
  await page.goto("/acervo");
  await expect(
    page.getByRole("alert").filter({
      hasText: "Não foi possível carregar o catálogo.",
    }),
  ).toBeVisible();
  await expect(page.locator(".bk-metrics")).toHaveCount(0);
  await page.unroute("**/api/transparencia/acervo");
  await page.route("**/api/transparencia/acervo", (r) =>
    r.fulfill({
      json: { itens, total: 23, porTipo: { relatorio_oficial: 23 } },
    }),
  );
  await page.getByRole("button", { name: "Tentar novamente" }).click();
  await expect(page.locator(".bk-metrics")).toBeVisible();
});
test("pesquisa mantém citações e feedback", async ({ page }) => {
  await page.route("**/api/chat", (r) =>
    r.fulfill({
      json: {
        interacao_id: "teste-resposta",
        resposta: "Resposta documental de teste [1].",
        citacoes: [
          {
            n: 1,
            fonte_id: "f1",
            titulo: "Documento de teste",
            autor_orgao: "Comissão de teste",
            paginas: "8",
            trecho: "Trecho documental de teste.",
            url_origem: "https://example.org/fonte.pdf",
            tipo_chunk: "corpo",
            tipo_fonte: "relatorio_oficial",
            confiabilidade: "alta",
          },
        ],
      },
    }),
  );
  await page.route("**/api/feedback", (r) =>
    r.fulfill({ status: 201, json: { status: "recebido_para_curadoria" } }),
  );
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Memória para Justiça" }),
  ).toBeVisible();
  await expect(
    page.locator(".bk-home-hero strong", { hasText: "projeto_BACURI" }),
  ).toBeVisible();
  await page
    .getByLabel("Escreva sua pergunta")
    .fill("Como pesquisar os documentos?");
  await page.getByRole("button", { name: "Enviar", exact: true }).click();
  await expect(
    page.getByText("Documento de teste", { exact: true }),
  ).toBeVisible();
  await expect(
    page.locator("strong", { hasText: "projeto_BACURI" }).last(),
  ).toBeVisible();
  await page.getByText("ver trecho", { exact: true }).click();
  await expect(
    page.getByText("Trecho documental de teste.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("group", { name: "Avaliação da resposta" }),
  ).toBeVisible();
});
