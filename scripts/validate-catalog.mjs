import { readFile, readdir, realpath, stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { isSportsSupplementName } from "../catalog/supplement-rules.mjs";

const categories = new Set([
  "perfumes",
  "skincare",
  "cosmeticos",
  "eletronicos",
  "smartwatches",
  "oculos",
  "mochilas",
  "suplementos",
  "roupas",
  "acessorios",
]);
const imageExtensions = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".avif",
  ".gif",
  ".svg",
]);

export async function validateCatalog(
  products,
  publicDirectory = resolve("public"),
) {
  if (!Array.isArray(products))
    return ["O catálogo deve ser uma lista JSON de produtos."];
  const errors = [];
  const ids = new Set();
  const directoryContents = new Map();
  const imageRoot = await realpath(resolve(publicDirectory, "images"));
  for (const [index, product] of products.entries()) {
    const label = `Produto ${index + 1}${product?.id ? ` (${product.id})` : ""}`;
    if (!product || typeof product !== "object" || Array.isArray(product)) {
      errors.push(`${label}: deve ser um objeto.`);
      continue;
    }
    if (
      typeof product.id !== "string" ||
      !/^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(product.id)
    ) {
      errors.push(
        `${label}: id deve ter de 1 a 100 letras sem acentos, números, hífens ou sublinhados.`,
      );
    } else if (ids.has(product.id)) {
      errors.push(`${label}: referência duplicada.`);
    } else {
      ids.add(product.id);
    }
    if (
      typeof product.name !== "string" ||
      !product.name.trim() ||
      product.name.length > 180
    ) {
      errors.push(`${label}: name deve ter de 1 a 180 caracteres.`);
    }
    for (const field of ["brand", "description"]) {
      if (typeof product[field] !== "string")
        errors.push(`${label}: ${field} deve ser um texto.`);
    }
    if (!categories.has(product.category))
      errors.push(`${label}: categoria inválida.`);
    if (
      product.category === "suplementos" &&
      !isSportsSupplementName(product.name)
    ) {
      errors.push(
        `${label}: a categoria suplementos aceita somente nutrição esportiva, como whey, creatina e hipercalóricos; medicamentos não são aceitos.`,
      );
    }
    for (const field of ["featured", "active"]) {
      if (typeof product[field] !== "boolean")
        errors.push(`${label}: ${field} deve ser true ou false.`);
    }
    if (
      typeof product.created_at !== "string" ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(
        product.created_at,
      ) ||
      !Number.isFinite(Date.parse(product.created_at))
    ) {
      errors.push(
        `${label}: created_at deve ser uma data UTC, como 2026-10-28T12:00:00Z.`,
      );
    }
    if (
      typeof product.image_url !== "string" ||
      !product.image_url.startsWith("/images/") ||
      /[\\?#%]/.test(product.image_url) ||
      product.image_url.split("/").includes("..") ||
      !imageExtensions.has(extname(product.image_url).toLowerCase())
    ) {
      errors.push(
        `${label}: image_url deve apontar para uma foto local, como /images/meu-produto.webp.`,
      );
      continue;
    }
    try {
      let directory = publicDirectory;
      for (const part of product.image_url.slice(1).split("/")) {
        if (!directoryContents.has(directory))
          directoryContents.set(directory, await readdir(directory));
        if (!directoryContents.get(directory).includes(part))
          throw new Error("Nome do arquivo divergente.");
        directory = resolve(directory, part);
      }
      const imagePath = await realpath(
        resolve(publicDirectory, product.image_url.slice(1)),
      );
      if (
        !imagePath.startsWith(imageRoot + sep) ||
        !(await stat(imagePath)).isFile()
      ) {
        errors.push(
          `${label}: a foto deve ser um arquivo dentro de public/images.`,
        );
      }
    } catch {
      errors.push(
        `${label}: foto não encontrada em public${product.image_url}. Verifique também maiúsculas e minúsculas.`,
      );
    }
  }
  return errors;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const products = JSON.parse(
      await readFile("public/data/products.json", "utf8"),
    );
    const config = JSON.parse(await readFile("catalog.config.json", "utf8"));
    const errors = await validateCatalog(products);
    if (typeof config.demo !== "boolean")
      errors.push("catalog.config.json: demo deve ser true ou false.");
    if (errors.length) {
      console.error(`Catálogo inválido:\n- ${errors.join("\n- ")}`);
      process.exitCode = 1;
    } else {
      console.log(
        `Catálogo validado: ${products.length} produtos e todas as fotos locais encontradas.`,
      );
    }
  } catch (error) {
    console.error(`Não foi possível validar o catálogo: ${error.message}`);
    process.exitCode = 1;
  }
}
