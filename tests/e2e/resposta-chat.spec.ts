import { expect, test, type Page } from "playwright/test";

async function responder(page: Page, resumo: string, id = "resposta-design") {
  await page.route("**/api/chat", (route) => route.fulfill({
    json: {
      interacao_id: id,
      resumo,
      resposta: "Texto de demonstração com referência documental [1].\n\n" +
        Array(3).fill("Este parágrafo de demonstração permite avaliar uma resposta extensa em telas pequenas. A leitura deve conservar os espaços entre parágrafos, o texto integral e a identificação das fontes, mesmo quando os títulos são longos ou há notas de contexto. O conteúdo serve somente para a validação da interface [1].").join("\n\n") +
        "\n\nOutro parágrafo preservado para conferir a leitura [8].",
      citacoes: Array.from({ length: 8 }, (_, i) => ({
        n: i + 1,
        fonte_id: `fonte-${i + 1}`,
        titulo: `Documento de demonstração ${i + 1} — título integral da fonte`,
        autor_orgao: "Autoria de demonstração",
        data_documento: "2024-01-01",
        paginas: "12–13",
        secao: "Seção documental",
        tipo_chunk: i === 0 ? "nota_rodape" : "corpo",
        nota_contexto: i === 0 ? "Nota contextual de demonstração preservada integralmente." : undefined,
        trecho: `Trecho documental de demonstração da fonte ${i + 1}.`,
        url_origem: "https://example.org/documento",
      })),
    },
  }));
  await page.getByRole("textbox", { name: "Escreva sua pergunta" }).fill("Pergunta de demonstração");
  await page.getByRole("button", { name: "Enviar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Fontes citadas (8)" }).last()).toBeVisible();
}

test.use({ reducedMotion: "reduce" });

for (const largura of [390, 768, 1440]) {
  for (const tema of ["claro", "escuro"]) {
    test(`resposta documentada em ${largura}px e tema ${tema}`, async ({ page }, info) => {
      await page.setViewportSize({ width: largura, height: 900 });
      await page.addInitScript((valor) => localStorage.setItem("bacuri-tema", valor), tema);
      await page.goto("/");
      await responder(page, "Síntese de demonstração claramente separada da explicação citada.");
      await expect(page.getByRole("heading", { name: "Em síntese" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Resposta documentada" })).toBeVisible();
      await expect(page.getByText("Nota contextual de demonstração preservada integralmente.", { exact: false })).toBeVisible();
      await page.screenshot({ path: info.outputPath(`resposta-${largura}-${tema}.png`), fullPage: true });
      const fonte = page.locator("#resposta-design-fonte-1");
      await page.getByRole("link", { name: "[1]", exact: true }).first().click();
      await expect(fonte).toBeFocused();
      const trecho = fonte.locator("summary");
      await trecho.focus();
      await page.keyboard.press("Enter");
      await expect(fonte.locator("blockquote")).toBeVisible();
      await expect(fonte.getByRole("link", { name: "Ver fonte original" })).toHaveAttribute("rel", "noopener noreferrer");
      await expect(page.getByRole("group", { name: "Avaliação da resposta" })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    });
  }
}

test("preserva resposta e fontes quando o resumo está vazio", async ({ page }) => {
  await page.goto("/");
  await responder(page, "");
  await expect(page.getByRole("heading", { name: "Em síntese" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Resposta documentada" })).toBeVisible();
  await expect(page.getByText("Outro parágrafo preservado", { exact: false })).toBeVisible();
});

test("não rotula como documentada uma resposta sem fontes", async ({ page }) => {
  await page.route("**/api/chat", (route) => route.fulfill({ json: {
    interacao_id: "sem-fontes",
    resumo: "",
    resposta: "Não foi encontrada base documental suficiente.",
    citacoes: [],
  } }));
  await page.goto("/");
  await page.getByRole("textbox", { name: "Escreva sua pergunta" }).fill("Pergunta de demonstração");
  await page.getByRole("button", { name: "Enviar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Resposta", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Resposta documentada" })).toHaveCount(0);
});

test("marcadores de duas mensagens apontam para suas próprias fontes", async ({ page }) => {
  await page.goto("/");
  await responder(page, "Síntese da primeira resposta.", "primeira");
  await responder(page, "Síntese da segunda resposta.", "segunda");
  await expect(page.locator('a[href="#primeira-fonte-8"]')).toHaveCount(1);
  await page.locator('a[href="#segunda-fonte-8"]').click();
  await expect(page.locator("#segunda-fonte-8")).toBeFocused();
});
