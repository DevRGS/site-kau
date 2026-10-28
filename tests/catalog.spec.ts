import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import type { Product } from "../src/lib/catalog";
import AxeBuilder from "@axe-core/playwright";

const catalog: Product[] = JSON.parse(
  readFileSync(
    new URL("../public/data/products.json", import.meta.url),
    "utf8",
  ),
);
const active = catalog.filter((product) => product.active);
const firstPageCount = Math.min(12, active.length);

test.beforeEach(async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".product-card")).toHaveCount(firstPageCount);
});

test("catálogo com imagens locais e layout sem rolagem lateral", async ({
  page,
}, testInfo) => {
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Seu desejo.",
  );
  await expect(page.locator(".demo-notice")).toHaveCount(0);
  await expect(page).toHaveTitle(
    "Importados e Encomendas — Seus desejos, por encomenda",
  );
  await expect(page.locator('.nav a[href="#sobre"]')).toHaveText(
    "Sobre a Kauany",
  );
  await expect(page.locator(".catalog-meta")).toContainText(
    `${active.length} produtos`,
  );
  await expect(page.locator(".product-card").first()).toContainText(
    "Perfume Yara Rosé",
  );
  expect(
    await page
      .locator("img")
      .evaluateAll((images) =>
        images.every(
          (image) =>
            new URL((image as HTMLImageElement).src).origin ===
            window.location.origin,
        ),
      ),
  ).toBeTruthy();
  const imageStatus = await page
    .locator(".product-card img")
    .evaluateAll((images) =>
      images.every(
        (image) =>
          (image as HTMLImageElement).complete &&
          (image as HTMLImageElement).naturalWidth > 0,
      ),
    );
  // As imagens usam lazy loading; a verificação final é feita depois de rolar para o catálogo.
  if (!imageStatus) {
    await page.locator(".custom-request").scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        page
          .locator(".product-card img")
          .evaluateAll((images) =>
            images.every(
              (image) =>
                (image as HTMLImageElement).complete &&
                (image as HTMLImageElement).naturalWidth > 0,
            ),
          ),
      )
      .toBeTruthy();
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: `artifacts/home-${testInfo.project.name}.png`,
    fullPage: true,
  });
});

test("seleções editoriais abrem o catálogo na categoria escolhida", async ({
  page,
}) => {
  for (const [selector, category] of [
    [".discovery-perfumes", "perfumes"],
    [".discovery-beauty", "skincare"],
    [".discovery-tech", "eletronicos"],
  ]) {
    await page.locator(selector).click();
    const expected = active.filter(
      (product) => product.category === category,
    ).length;
    await expect(page.locator(".catalog-meta")).toContainText(
      `${expected} produtos`,
    );
    await expect(page.locator(".product-card")).toHaveCount(
      Math.min(12, expected),
    );
    await expect(page).toHaveURL(/#catalogo$/);
  }
});

test("contraste e controles passam na verificação automática de acessibilidade", async ({
  page,
}) => {
  await page.evaluate(() => document.fonts.ready);
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});

test("paginação e filtros reutilizam o JSON local e ocultam produtos inativos", async ({
  page,
}) => {
  const source = await (await page.request.get("/data/products.json")).json();
  const products = Array.from({ length: 13 }, (_, index) => ({
    ...source[0],
    id: `PROD-${String(index).padStart(2, "0")}`,
    name: `Produto ${index}`,
  }));
  products.push({
    ...source[0],
    id: "OCULTO",
    name: "Produto oculto",
    active: false,
  });
  let requests = 0;
  await page.route("**/data/products.json", async (route) => {
    requests++;
    await route.fulfill({ status: 200, json: products });
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".product-card")).toHaveCount(12);
  await expect(page.locator(".catalog-meta")).toContainText("13 produtos");
  await page.getByRole("button", { name: "Próxima página" }).click();
  await expect(page.locator(".product-card")).toHaveCount(1);
  await expect(page.locator(".pagination")).toContainText("Página 2 de 2");
  await page.getByRole("button", { name: "Perfumes", exact: true }).click();
  await expect(page.locator(".product-card")).toHaveCount(12);
  await expect(page.locator(".pagination")).toContainText("Página 1 de 2");
  await page
    .getByRole("searchbox", { name: "Buscar produtos" })
    .fill("Produto oculto");
  await expect(page.locator(".product-card")).toHaveCount(0);
  expect(requests).toBe(1);
});

test("falha no arquivo local permite tentar novamente", async ({ page }) => {
  const products = await (await page.request.get("/data/products.json")).json();
  let failing = true;
  await page.route("**/data/products.json", async (route) => {
    if (failing) await route.fulfill({ status: 503, body: "" });
    else await route.fulfill({ status: 200, json: products });
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("alert")).toContainText(
    "Não foi possível carregar o catálogo",
  );
  await expect(page.locator(".product-card")).toHaveCount(0);
  failing = false;
  await page.getByRole("button", { name: "Recarregar catálogo" }).click();
  await expect(page.locator(".product-card")).toHaveCount(firstPageCount);
});

test("referência inexistente em link compartilhado mostra aviso", async ({
  page,
}) => {
  await page.goto("/?produto=REMOVIDO#catalogo", {
    waitUntil: "domcontentloaded",
  });
  await expect(page.locator(".link-notice")).toContainText(
    "Este produto não está mais no catálogo",
  );
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("busca sem acentos, filtro de categoria e restauração", async ({
  page,
}) => {
  await page.getByRole("searchbox", { name: "Buscar produtos" }).fill("oculos");
  await expect(page.locator(".catalog-meta")).toContainText("50 produtos");
  await expect(page.locator(".product-card")).toHaveCount(12);
  await page.getByRole("button", { name: "Limpar busca" }).click();
  await expect(page.locator(".catalog-meta")).toContainText(
    `${active.length} produtos`,
  );
  await page.getByRole("button", { name: "Perfumes", exact: true }).click();
  await expect(page.locator(".catalog-meta")).toContainText(
    `${active.filter((product) => product.category === "perfumes").length} produtos`,
  );
  await page.getByLabel("Filtrar por marca").selectOption("Victoria’s Secret");
  await expect(page.locator(".catalog-meta")).toContainText(
    `${active.filter((product) => product.category === "perfumes" && product.brand === "Victoria’s Secret").length} produtos`,
  );
  for (const brand of await page
    .locator(".product-card .product-brand")
    .allTextContents())
    expect(brand).toBe("Victoria’s Secret");
  for (const category of ["Suplementos", "Roupas", "Acessórios"]) {
    await page.getByRole("button", { name: category, exact: true }).click();
    await expect(page.locator(".catalog-meta")).toContainText("50 produtos");
    await expect(page.locator(".product-card")).toHaveCount(12);
  }
  await page
    .getByRole("searchbox", { name: "Buscar produtos" })
    .fill("PRODUTO_INEXISTENTE_99999");
  await expect(
    page.getByRole("heading", { name: "Seu desejo pode ir além do catálogo." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Limpar filtros" }).click();
  await expect(page.locator(".catalog-meta")).toContainText(
    `${active.length} produtos`,
  );
  await expect(page.getByLabel("Filtrar por marca")).toHaveValue("todas");
});

test("pedido inclui número informado, referência, quantidade e link", async ({
  page,
}) => {
  await page
    .getByRole("button", {
      name: "Ver detalhes de Perfume Yara Rosé",
      exact: true,
    })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await page.getByRole("button", { name: "Aumentar quantidade" }).click();
  const href = await dialog
    .getByRole("link", { name: "Pedir pelo WhatsApp" })
    .getAttribute("href");
  const url = new URL(href!);
  expect(url.pathname).toBe("/554188591333");
  expect(url.searchParams.get("text")).toContain("Perfume Yara Rosé");
  expect(url.searchParams.get("text")).toContain("Olá, Kauany!");
  expect(url.searchParams.get("text")).toContain("Referência: LAT-YARA-ROSE");
  expect(url.searchParams.get("text")).toContain("Quantidade: 2");
  expect(url.searchParams.get("text")).toContain(
    "?produto=LAT-YARA-ROSE#catalogo",
  );
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(page).not.toHaveURL(/[?&]produto=/);
});

test("link compartilhado abre produto e ordenação alfabética funciona", async ({
  page,
}) => {
  await page.goto("/?produto=LAT-YARA-MOI#catalogo", {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog")).toContainText("Perfume Yara Moi");
  await page.getByRole("button", { name: "Fechar detalhes" }).click();
  await page.getByLabel("Ordenar produtos").selectOption("nome");
  await expect(page.locator(".product-card").first()).toContainText(
    [...active].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))[0].name,
  );
});

test("navegação e perguntas frequentes acessíveis", async ({
  page,
}, testInfo) => {
  if (testInfo.project.name === "mobile") {
    await page.getByRole("button", { name: "Abrir menu" }).click();
    await expect(
      page.getByRole("navigation", { name: "Navegação principal" }),
    ).toBeVisible();
  }
  await page
    .getByRole("navigation", { name: "Navegação principal" })
    .getByRole("link", { name: "Como funciona" })
    .click();
  await expect(page).toHaveURL(/#como-funciona/);
  await page
    .getByText("Como descubro o valor de um produto?", { exact: true })
    .click();
  await expect(page.locator("details[open]")).toContainText(
    "nome e a referência do item",
  );
});
