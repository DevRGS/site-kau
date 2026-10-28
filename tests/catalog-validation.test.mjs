import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { validateCatalog } from "../scripts/validate-catalog.mjs";

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

test("400 referências têm fotografias válidas, distintas e rastreáveis, com 50 por seleção", async () => {
  const sources = JSON.parse(
    await readFile(
      new URL("../catalog/image-sources.json", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(products.length, 400);
  for (const product of products) assert.ok(!/shipinsure|insurance|shipping protection|package protection|extended warranty|gift card/i.test(product.name));
  assert.equal(sources.length, 400);
  assert.equal(new Set(sources.map((source) => source.sha256)).size, 400);
  const groups = [...new Set(sources.map((source) => source.group))];
  assert.equal(groups.length, 8);
  for (const source of sources.filter(source => source.group === 'lattafa')) assert.match(source.source_vendor, /^lattafa/i);
  for (const group of groups)
    assert.equal(sources.filter((source) => source.group === group).length, 50);
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
