import { expect, test } from "playwright/test";

const eventos = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-46.63, -23.55] },
      properties: {
        evento_id: "evento-teste",
        titulo: "Registro cartográfico de teste",
        tipos_crime: ["tortura"],
      },
    },
  ],
};

test("Territórios mantém cartografia e origens no controle unificado", async ({
  page,
}) => {
  let requisicoesCidades = 0;
  let requisicoesTerritorios = 0;

  await page.route("**/api/eventos-geo", (rota) =>
    rota.fulfill({ json: eventos }),
  );
  await page.route("**/api/naturalidades", (rota) => {
    requisicoesCidades += 1;
    return rota.fulfill({ json: { type: "FeatureCollection", features: [] } });
  });
  await page.route("**/api/territorios-origem", (rota) => {
    requisicoesTerritorios += 1;
    return rota.fulfill({ json: { type: "FeatureCollection", features: [] } });
  });

  await page.goto("/mapa");

  await expect(
    page.getByRole("heading", { name: "Territórios da memória" }),
  ).toBeVisible();
  await expect(page.locator(".leaflet-container")).toBeVisible();
  const controles = page.getByRole("group", {
    name: "Escolha as camadas exibidas",
  });
  await expect(controles.getByRole("checkbox")).toHaveCount(3);

  await page
    .getByRole("checkbox", { name: /Cidades e territórios de origem/ })
    .check();

  await expect.poll(() => requisicoesCidades).toBe(1);
  await expect.poll(() => requisicoesTerritorios).toBe(1);
  await expect(page.getByText("3/3", { exact: true })).toHaveText("3/3");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
