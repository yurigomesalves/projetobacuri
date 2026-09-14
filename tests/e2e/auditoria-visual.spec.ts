import { expect, test } from "playwright/test";

test("registra a página inicial para auditoria visual", async ({ page }, testInfo) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Projeto Bacuri" })).toBeAttached();

  const screenshot = testInfo.outputPath("pagina-inicial.png");
  await page.screenshot({ path: screenshot, fullPage: true });
  await testInfo.attach("página inicial", {
    path: screenshot,
    contentType: "image/png",
  });
});
