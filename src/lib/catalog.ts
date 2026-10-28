import catalogConfig from "../../catalog.config.json";

export type Category =
  | "perfumes"
  | "skincare"
  | "cosmeticos"
  | "eletronicos"
  | "smartwatches"
  | "oculos"
  | "mochilas"
  | "suplementos"
  | "roupas"
  | "acessorios";
export type Product = {
  id: string;
  name: string;
  brand: string;
  category: Category;
  description: string;
  image_url: string;
  featured: boolean;
  active: boolean;
  created_at: string;
};
export type CatalogQuery = {
  search: string;
  category: string;
  brand: string;
  sort: string;
  page: number;
};
export const PAGE_SIZE = 12;
export const isDemo = catalogConfig.demo;
let catalogCache: Promise<Product[]> | undefined;

export function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

async function loadProducts(signal: AbortSignal): Promise<Product[]> {
  signal.throwIfAborted();
  // Compartilha o arquivo entre busca, filtros e links de produto. Cancelar uma
  // consulta não interrompe o carregamento que outra consulta ainda está usando.
  catalogCache ??= fetch("/data/products.json", { cache: "no-cache" })
    .then(async (response) => {
      if (!response.ok) throw new Error("Catálogo indisponível.");
      const products: unknown = await response.json();
      if (!Array.isArray(products)) throw new Error("Catálogo inválido.");
      return products as Product[];
    })
    .catch(() => {
      catalogCache = undefined;
      throw new Error(
        "Não foi possível carregar o catálogo. Tente novamente em instantes.",
      );
    });
  const products = await catalogCache;
  signal.throwIfAborted();
  return products;
}

export async function getProducts(
  query: CatalogQuery,
  signal: AbortSignal,
): Promise<{ products: Product[]; total: number; brands: string[] }> {
  const search = normalize(query.search.trim());
  const categoryProducts = (await loadProducts(signal)).filter(
    (product) =>
      product.active &&
      (query.category === "todos" || product.category === query.category),
  );
  const brands = [
    ...new Set(
      categoryProducts.map((product) => product.brand).filter(Boolean),
    ),
  ].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const products = categoryProducts.filter(
    (product) =>
      (query.brand === "todas" || product.brand === query.brand) &&
      normalize(
        `${product.id} ${product.name} ${product.brand} ${product.description}`,
      ).includes(search),
  );
  products.sort((a, b) =>
    query.sort === "nome"
      ? a.name.localeCompare(b.name, "pt-BR") || a.id.localeCompare(b.id)
      : query.sort === "recentes"
        ? b.created_at.localeCompare(a.created_at) || a.id.localeCompare(b.id)
        : Number(b.featured) - Number(a.featured) ||
          b.created_at.localeCompare(a.created_at) ||
          a.id.localeCompare(b.id),
  );
  return {
    products: products.slice(
      (query.page - 1) * PAGE_SIZE,
      query.page * PAGE_SIZE,
    ),
    total: products.length,
    brands,
  };
}

export function whatsappUrl(product?: Product, quantity = 1) {
  const message = product
    ? `Olá, Kauany! Gostaria de encomendar este item:\n\n*${product.name}*${product.brand ? `\nMarca: ${product.brand}` : ""}\nReferência: ${product.id}\nQuantidade: ${quantity}\n\nVocê pode confirmar o valor, a disponibilidade e o prazo de entrega?\n\nProduto: ${window.location.origin}/?produto=${encodeURIComponent(product.id)}#catalogo`
    : "Olá, Kauany! Gostaria de fazer uma encomenda do Paraguai. Pode me ajudar a encontrar um produto?";
  return `https://wa.me/554188591333?text=${encodeURIComponent(message)}`;
}

export async function getProduct(
  id: string,
  signal: AbortSignal,
): Promise<Product | null> {
  return (
    (await loadProducts(signal)).find(
      (product) => product.id === id && product.active,
    ) ?? null
  );
}
