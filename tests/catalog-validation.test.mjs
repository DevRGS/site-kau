import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { validateCatalog } from "../scripts/validate-catalog.mjs";
import { isSportsSupplementName } from "../catalog/supplement-rules.mjs";

const products = JSON.parse(
  await readFile(
    new URL("../public/data/products.json", import.meta.url),
    "utf8",
  ),
);
const publicDirectory = fileURLToPath(new URL("../public/", import.meta.url));

test("catálogo do projeto possui dados válidos e todas as imagens locais", async () => {
  assert.deepEqual(await validateCatalog(products, publicDirectory), []);
});

test("750 referências têm fotografias válidas, distintas e rastreáveis, com perfumaria ampliada", async () => {
  const sources = JSON.parse(
    await readFile(
      new URL("../catalog/image-sources.json", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(products.length, 750);
  for (const product of products.filter(
    (product) => product.category === "roupas",
  ))
    assert.ok(
      !/\bteste?\b|leve\s*\d|pague|compre.*ganhe|desconto\s*progressivo/i.test(
        product.name,
      ),
    );
  for (const product of products)
    assert.ok(
      !/shipinsure|insurance|shipping protection|package protection|extended warranty|gift card/i.test(
        product.name,
      ),
    );
  assert.equal(sources.length, 750);
  assert.equal(new Set(sources.map((source) => source.sha256)).size, 750);
  const groups = [...new Set(sources.map((source) => source.group))];
  assert.equal(groups.length, 11);
  for (const source of sources.filter((source) => source.group === "lattafa"))
    assert.match(source.source_vendor, /^lattafa/i);
  for (const group of groups)
    assert.equal(
      sources.filter((source) => source.group === group).length,
      ["lattafa", "perfumes-importados"].includes(group) ? 150 : 50,
    );
  await Promise.all(
    sources.map(async (source) => {
      assert.ok(
        products.some(
          (product) =>
            product.id === source.id && product.image_url === source.file,
        ),
      );
      assert.ok(
        !/coming.?soon|placeholder|no.?image/i.test(source.source_image_url),
      );
      const buffer = await readFile(
        new URL(`../public${source.file}`, import.meta.url),
      );
      assert.equal(
        createHash("sha256").update(buffer).digest("hex"),
        source.sha256,
      );
      const metadata = await sharp(buffer).metadata();
      assert.equal(metadata.format, "webp");
      assert.equal(metadata.width, 640);
      assert.equal(metadata.height, 720);
    }),
  );
  for (const id of [
    "LAT-YARA-ROSE",
    "LAT-YARA-MOI",
    "VS-BARE-VANILLA",
    "VS-COCONUT-PASSION",
  ])
    assert.ok(products.some((product) => product.id === id));
});

test("perfumes têm mais de 300 opções e são a maior categoria do catálogo", () => {
  const perfumes = products.filter(
    (product) => product.category === "perfumes",
  );
  assert.ok(perfumes.length > 300);
  assert.ok(
    perfumes.every(
      (product) =>
        !/air.?fresh|room.?spray|incense|candle|bakhoor|bukhoor|deodorant/i.test(
          product.name,
        ),
    ),
  );
  for (const category of new Set(products.map((product) => product.category))) {
    if (category !== "perfumes")
      assert.ok(
        perfumes.length >
          products.filter((product) => product.category === category).length,
      );
  }
});

test("suplementos são produtos de nutrição esportiva e incluem whey, creatina e hipercalóricos", () => {
  const supplements = products.filter(
    (product) => product.category === "suplementos",
  );
  assert.equal(supplements.length, 50);
  assert.ok(
    supplements.every((product) => isSportsSupplementName(product.name)),
  );
  assert.ok(supplements.some((product) => /whey/i.test(product.name)));
  assert.ok(supplements.some((product) => /creatin/i.test(product.name)));
  assert.ok(
    supplements.some((product) =>
      /mass|gainer|hipercal[oó]rico/i.test(product.name),
    ),
  );
});

test("medicamentos são recusados ao cadastrar ou importar suplementos", async () => {
  for (const name of [
    "Dipirona 500 mg",
    "Paracetamol",
    "Ibuprofeno",
    "Whey com dipirona",
    "Testosterona",
    "AlphaTest",
    "Peptide 185",
  ]) {
    assert.equal(isSportsSupplementName(name), false);
    const errors = await validateCatalog(
      [{ ...products[0], name, category: "suplementos" }],
      publicDirectory,
    );
    assert.ok(
      errors.some((error) => error.includes("somente nutrição esportiva")),
    );
  }
});

test("referências duplicadas impedem a publicação", async () => {
  const errors = await validateCatalog(
    [products[0], products[0]],
    publicDirectory,
  );
  assert.ok(errors.some((error) => error.includes("referência duplicada")));
});

test("fotos externas, ausentes e com capitalização incorreta são recusadas", async () => {
  for (const image_url of [
    "https://example.com/image.webp",
    "/images/ausente.webp",
    "/images/YARA-ROSE.webp",
  ]) {
    const errors = await validateCatalog(
      [{ ...products[0], image_url }],
      publicDirectory,
    );
    assert.ok(errors.length > 0, image_url);
  }
});

test("formato do arquivo e campos obrigatórios são validados", async () => {
  assert.ok((await validateCatalog({}, publicDirectory)).length > 0);
  const errors = await validateCatalog(
    [
      {
        ...products[0],
        category: "inexistente",
        active: "true",
        created_at: "ontem",
      },
    ],
    publicDirectory,
  );
  assert.equal(errors.length, 3);
});
