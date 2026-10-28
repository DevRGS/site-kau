import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import sharp from "sharp";
import { isSportsSupplementName } from "../catalog/supplement-rules.mjs";

// Executado manualmente. O build e o site publicado usam somente os arquivos locais.
const research =
  process.env.CATALOG_RESEARCH_DIR || resolve(".cache/catalog-research");
const refresh = process.argv.includes("--refresh");
const append = process.argv.includes("--append");
const expandPerfumes = process.argv.includes("--expand-perfumes");
if (append && expandPerfumes)
  throw new Error("Escolha apenas um modo de importação incremental.");
const perfumeGroups = new Set(["lattafa", "perfumes-importados"]);
const perfumeSourceKeys = new Set([
  "lattafa",
  "lattafa-best",
  "perfume",
  "dior",
  "designer-best",
]);
const targetFor = (group) => (perfumeGroups.has(group) ? 150 : 50);
const extraGroups = new Set(["roupas", "acessorios", "suplementos"]);
const extraSourceKeys = new Set([
  "insider",
  "insider-more",
  "new-era-us",
  "new-era-apparel",
  "chilli-accessories",
  "chilli-accessories-more",
  "muscletech",
  "max-titanium",
  "max-titanium-more",
  "max-titanium-third",
]);
const sources = {
  lattafa: ["https://www.lattafa-usa.com", "/products.json?limit=250"],
  "lattafa-best": [
    "https://www.lattafa-usa.com",
    "/collections/best-sellers/products.json?limit=250",
  ],
  vs: [
    "https://www.perfumeonline.ca",
    "/collections/victoria-secret/products.json?limit=250",
  ],
  "vs-atmos": [
    "https://lojaatmosphera.com",
    "/collections/body-splash/products.json?limit=250",
  ],
  perfume: ["https://www.perfumeonline.ca", "/products.json?limit=250"],
  "designer-best": [
    "https://www.perfumeonline.ca",
    "/collections/featured-products/products.json?limit=250",
  ],
  dior: [
    "https://www.perfumeonline.ca",
    "/collections/christian-dior/products.json?limit=250",
  ],
  "baseus-selling": [
    "https://www.baseus.com",
    "/collections/best-selling-products/products.json?limit=250",
  ],
  "ugreen-best-eu": [
    "https://eu.ugreen.com",
    "/collections/best-sellers/products.json?limit=250",
  ],
  edifier: ["https://edifier-online.com", "/products.json?limit=250"],
  "edifier-best": [
    "https://edifier-online.com",
    "/collections/best-sellers/products.json?limit=250",
  ],
  amazfit: ["https://us.amazfit.com", "/products.json?limit=250"],
  "amazfit-best": [
    "https://us.amazfit.com",
    "/collections/best-sellers/products.json?limit=250",
  ],
  haylou: ["https://haylou.com", "/products.json?limit=250"],
  mibro: ["https://www.mibrofit.com", "/products.json?limit=250"],
  kospet: ["https://kospet.com", "/products.json?limit=250"],
  goodr: ["https://goodr.com", "/products.json?limit=250"],
  "goodr-best": [
    "https://goodr.com",
    "/collections/best-sellers/products.json?limit=250",
  ],
  chilli: [
    "https://loja.chillibeans.com.br",
    "/api/catalog_system/pub/products/search?ft=oculos%20sol&_from=0&_to=49&O=OrderByTopSaleDESC",
  ],
  "chilli-more": [
    "https://loja.chillibeans.com.br",
    "/api/catalog_system/pub/products/search?ft=oculos%20sol&_from=50&_to=99&O=OrderByTopSaleDESC",
  ],
  jansport: [
    "https://www.jansport.com.br",
    "/api/catalog_system/pub/products/search?_from=0&_to=49&O=OrderByTopSaleDESC",
  ],
  "jansport-more": [
    "https://www.jansport.com.br",
    "/api/catalog_system/pub/products/search?_from=50&_to=99&O=OrderByTopSaleDESC",
  ],
  cosrx: ["https://www.cosrx.com", "/products.json?limit=250"],
  sallve: ["https://www.sallve.com.br", "/products.json?limit=250"],
  insider: ["https://www.insiderstore.com.br", "/products.json?limit=250"],
  "insider-more": [
    "https://www.insiderstore.com.br",
    "/products.json?limit=250&page=2",
  ],
  "new-era-us": ["https://www.neweracap.com", "/products.json?limit=250"],
  "new-era-apparel": [
    "https://www.neweracap.com",
    "/collections/apparel/products.json?limit=250",
  ],
  "chilli-accessories": [
    "https://loja.chillibeans.com.br",
    "/api/catalog_system/pub/products/search?ft=acessorios&_from=0&_to=49",
  ],
  "chilli-accessories-more": [
    "https://loja.chillibeans.com.br",
    "/api/catalog_system/pub/products/search?ft=acessorios&_from=50&_to=99",
  ],
  muscletech: ["https://www.muscletech.com", "/products.json?limit=250"],
  "max-titanium": [
    "https://www.maxtitanium.com.br",
    "/api/catalog_system/pub/products/search?_from=0&_to=49",
  ],
  "max-titanium-more": [
    "https://www.maxtitanium.com.br",
    "/api/catalog_system/pub/products/search?_from=50&_to=99",
  ],
  "max-titanium-third": [
    "https://www.maxtitanium.com.br",
    "/api/catalog_system/pub/products/search?_from=100&_to=149",
  ],
};

await mkdir(research, { recursive: true });
const data = {};
await Promise.all(
  Object.entries(sources)
    .filter(([key]) =>
      expandPerfumes
        ? perfumeSourceKeys.has(key)
        : !append || extraSourceKeys.has(key),
    )
    .map(async ([key, [origin, path]]) => {
      const file = resolve(research, `${key}.json`);
      if (!refresh) {
        try {
          data[key] = JSON.parse(await readFile(file, "utf8"));
          return;
        } catch {
          /* Baixar a fonte ausente. */
        }
      }
      const response = await fetch(origin + path, {
        signal: AbortSignal.timeout(30000),
      });
      if (!response.ok)
        throw new Error(`Fonte indisponível: ${key} (${response.status})`);
      data[key] = await response.json();
      await writeFile(file, JSON.stringify(data[key]));
    }),
);

const normalize = (value) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
const clean = (value) =>
  value
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const unique = (list) => {
  const result = new Map();
  for (const product of list)
    if (product.image && !result.has(product.key))
      result.set(product.key, product);
  return [...result.values()];
};
const list = (key) => data[key]?.products || data[key] || [];
const excluded =
  /giveaway|free.?gift|refurbished|renewed|discontinued|rare\s*&|vintage|gift card|^copy\b|test product|shipinsure|insurance|shipping protection|package protection|extended warranty/i;
const usableImage = (image) =>
  image?.src &&
  !/coming.?soon|placeholder|no.?image|default.?product|loading/i.test(
    image.src,
  );

function shop(key, brand, category, filter = () => true) {
  return list(key)
    .filter(
      (p) =>
        p.images?.some(usableImage) &&
        !excluded.test(`${p.title} ${p.product_type}`) &&
        filter(p),
    )
    .map((p) => {
      const title = clean(p.title);
      let mainImage =
        p.images.find(
          (image) =>
            usableImage(image) && image.width >= 180 && image.height >= 180,
        ) || p.images.find(usableImage);
      if (brand === "Insider" && category === "roupas") {
        const photos = p.images.filter(
          (image) =>
            usableImage(image) &&
            !/\/Frame[_-]|kit[_-]|a_unidade|desconto|pague|ganhe|promo/i.test(
              image.src,
            ),
        );
        mainImage =
          photos.find(
            (image) =>
              /\.jpe?g(?:\?|$)/i.test(image.src) &&
              image.width >= 180 &&
              image.height >= 180,
          ) ||
          photos[0] ||
          mainImage;
      }
      return {
        key: `${brand}:${normalize(title)}`,
        id: `${key.replace(/[^a-z0-9]/g, "-").toUpperCase()}-${p.id}`,
        name: title,
        brand,
        category,
        image: mainImage.src,
        source_url: `${sources[key][0]}/products/${p.handle}`,
        source_catalog_url: sources[key].join(""),
        source_title: title,
        source_vendor: p.vendor,
        type: p.product_type || "",
      };
    });
}

function vtex(key, brand, category, filter, variants = false) {
  return list(key)
    .filter(filter)
    .flatMap((p) =>
      p.items
        .slice(0, variants ? undefined : 1)
        .filter((item) => item.images?.length)
        .map((item) => ({
          key: `${brand}:${p.productId}${variants ? ":" + item.itemId : ""}`,
          id: `${brand === "JanSport" ? "JSP" : brand === "Chilli Beans" ? "CHILLI" : brand.toUpperCase().replace(/[^A-Z0-9]+/g, "-")}-${p.productId}${variants ? "-" + item.itemId : ""}`,
          name:
            category === "suplementos"
              ? clean(p.productName).split(/\s+[—–]\s+/)[0] +
                (item.name &&
                !normalize(p.productName).includes(normalize(item.name))
                  ? ` — ${clean(item.name)}`
                  : "")
              : clean(item.nameComplete || p.productName),
          brand,
          category,
          image: item.images[0].imageUrl,
          source_url: p.link || `${sources[key][0]}/${p.linkText}/p`,
          source_catalog_url: sources[key].join(""),
          source_title: p.productName,
          source_vendor: p.brand,
        })),
    );
}

function roundRobin(...lists) {
  const result = [];
  for (
    let index = 0;
    index < Math.max(...lists.map((list) => list.length));
    index++
  ) {
    for (const list of lists) if (list[index]) result.push(list[index]);
  }
  return unique(result);
}

const lattafa = unique([
  ...shop("lattafa-best", "Lattafa", "perfumes", (p) =>
    /^lattafa/i.test(p.vendor),
  ),
  ...shop("lattafa", "Lattafa", "perfumes", (p) => /^lattafa/i.test(p.vendor)),
]).filter(
  (p) =>
    !/gift.?set|collection|sample|discovery|air.?fresh|room.?spray|incense|candle|bakhoor|bukhoor|deodorant/i.test(
      p.name,
    ),
);
const perfumePriority = [
  "Yara",
  "Khamrah",
  "Asad",
  "Eclaire",
  "Angham",
  "Yara Moi",
];
lattafa.sort((a, b) => {
  const rank = (p) => {
    const index = perfumePriority.findIndex(
      (name) => normalize(p.name) === normalize(name),
    );
    return index < 0 ? 99 : index;
  };
  return rank(a) - rank(b);
});
for (const product of lattafa) {
  if (normalize(product.name) === "yara") {
    product.id = "LAT-YARA-ROSE";
    product.name = "Perfume Yara Rosé";
  }
  if (normalize(product.name) === "yara moi") {
    product.id = "LAT-YARA-MOI";
    product.name = "Perfume Yara Moi";
  }
}

const vs = unique(
  [
    ...shop("vs-atmos", "Victoria’s Secret", "perfumes", (p) =>
      /victoria/i.test(p.title),
    ),
    ...shop("vs", "Victoria’s Secret", "perfumes"),
  ].map((p) => {
    p.name = p.name
      .replace(/\s*\|\s*original/gi, "")
      .replace(/\borigina[l|is]+\b/gi, "")
      .trim();
    p.key = `VS:${normalize(p.name)
      .replace(
        /victoria[’']?s? secret|\bvs\b|body splash|\b\d+\s*ml\b|[|']/g,
        "",
      )
      .replace(/\s+/g, " ")
      .trim()}`;
    if (/hidratante|esfoliante/i.test(p.name)) p.category = "cosmeticos";
    if (/bare vanilla/i.test(p.name) && /body splash/i.test(p.name)) {
      p.id = "VS-BARE-VANILLA";
      p.name = "Body Splash Bare Vanilla";
    }
    if (/coconut passion/i.test(p.name) && /body splash/i.test(p.name)) {
      p.id = "VS-COCONUT-PASSION";
      p.name = "Body Splash Coconut Passion";
    }
    return p;
  }),
);
vs.sort(
  (a, b) =>
    Number(b.id === "VS-BARE-VANILLA") - Number(a.id === "VS-BARE-VANILLA") ||
    Number(b.id === "VS-COCONUT-PASSION") -
      Number(a.id === "VS-COCONUT-PASSION"),
);

const designerBrands =
  /^(Kilian|Guerlain|Bvlgari|Narciso Rodriguez|Nina Ricci|Marc Jacobs|Escada|Dolce Gabbana|Ariana Grande|Carolina Herrera|Burberry|Issey Miyake|Lacoste|Mont Blanc|Jean Paul Gaultier|Jimmy Choo|Paco Rabanne|Prada|Lancome|Giorgio Armani|Hermes|Givenchy|Tom Ford|Yves Saint Laurent|Valentino|Thierry Mugler|Ralph Lauren|Hugo Boss|Creed|Moschino|Versace|Gucci|Calvin Klein|Kenzo|Azzaro|Mancera|Montale|Boucheron|Armaf|Chloe|Cartier|Cacharel|Lalique|Nautica|Bentley)$/i;
const designerFrom = (key) =>
  shop(key, "", "perfumes", (p) => designerBrands.test(p.vendor)).map((p) => ({
    ...p,
    brand: p.source_vendor,
    key: `${p.source_vendor}:${normalize(p.name)}`,
  }));
const designer = roundRobin(
  shop("dior", "Dior", "perfumes").slice(0, 15),
  designerFrom("perfume"),
  designerFrom("designer-best"),
);

const technology = roundRobin(
  shop(
    "baseus-selling",
    "Baseus",
    "eletronicos",
    (p) => !/bundle|case|spare/i.test(p.title),
  ),
  shop(
    "ugreen-best-eu",
    "UGREEN",
    "eletronicos",
    (p) => !/NAS|enclosure|bundle/i.test(p.title),
  ),
  unique([
    ...shop("edifier-best", "Edifier", "eletronicos"),
    ...shop("edifier", "Edifier", "eletronicos", (p) =>
      /earbud|headphone|speaker|monitor/i.test(p.title),
    ),
  ]),
);
const watches = roundRobin(
  unique([
    ...shop("amazfit-best", "Amazfit", "smartwatches", (p) =>
      /smartwatch/i.test(p.product_type),
    ),
    ...shop("amazfit", "Amazfit", "smartwatches", (p) =>
      /smartwatch/i.test(p.product_type),
    ),
  ]).filter((p) => !/strap|earbud|helio|ring/i.test(p.name)),
  shop("haylou", "Haylou", "smartwatches", (p) =>
    /smart watch/i.test(p.product_type),
  ),
  shop("mibro", "Mibro", "smartwatches", (p) =>
    /smart watch/i.test(p.product_type),
  ),
  shop(
    "kospet",
    "Kospet",
    "smartwatches",
    (p) =>
      /smartwatch/i.test(`${p.title} ${p.product_type}`) &&
      !/strap|band|accessor|protect|charger|gift/i.test(p.title),
  ),
);
const glasses = roundRobin(
  unique([
    ...vtex("chilli", "Chilli Beans", "oculos", (p) =>
      /óculos de sol/i.test(p.productName),
    ),
    ...vtex("chilli-more", "Chilli Beans", "oculos", (p) =>
      /óculos de sol/i.test(p.productName),
    ),
  ]),
  unique([
    ...shop("goodr-best", "goodr", "oculos"),
    ...shop("goodr", "goodr", "oculos", (p) =>
      /OG|BFG|MACH|CIRCLE|WRAP|VRG|LFG|BUG|ASTRO|POP|GOLF|RUN|SPORT/i.test(
        p.product_type,
      ),
    ),
  ]).filter((p) => !/gift|case|accessor|bundle/i.test(p.name)),
);
const backpacks = unique([
  ...vtex("jansport", "JanSport", "mochilas", (p) =>
    /mochila|backpack/i.test(p.productName),
  ),
  ...vtex("jansport-more", "JanSport", "mochilas", (p) =>
    /mochila|backpack/i.test(p.productName),
  ),
]);
const beauty = roundRobin(
  shop(
    "cosrx",
    "COSRX",
    "skincare",
    (p) =>
      !/FREE|HIDDEN/i.test(p.product_type) &&
      !/free gift|bundle|set\b|routine|kit\b|^\[/i.test(p.title),
  ),
  shop(
    "sallve",
    "Sallve",
    "cosmeticos",
    (p) =>
      !/kit|dupla|trio|rotina|necessaire|combo|presente|teste|amostra|quarteto/i.test(
        p.title,
      ),
  ),
);

const clothingFilter = (p) =>
  !/kit|combo|pack|excluir|brinde|gift|100% off|\bteste?\b|leve\s*\d|pague|compre.*ganhe|desconto\s*progressivo|--\s*$/i.test(
    `${p.title} ${p.product_type}`,
  ) &&
  /t-shirt|tee\b|camiseta|camisa|cal[cç]a|short|bermuda|legging|regata|top\b|vestido|jacket|moletom|hoodie|crewneck|sweat|polo|pants|skirt|saia|jaqueta|body|bodysuit/i.test(
    `${p.title} ${p.product_type}`,
  );
const clothes = roundRobin(
  shop("new-era-apparel", "New Era", "roupas", (p) =>
    /APPAREL/i.test(p.product_type),
  ),
  unique([
    ...shop("insider", "Insider", "roupas", clothingFilter),
    ...shop("insider-more", "Insider", "roupas", clothingFilter),
  ]),
);
const accessoryFilter = (p) =>
  /berloque|colar|pulseira|anel\b|brinco|corrente|chaveiro|carteira|cinto|bon[eé]|bolsa|len[cç]o|flanela|case\b|estojo/i.test(
    p.productName,
  ) && !/[oó]culos|arma[cç][aã]o|rel[oó]gio|limpa lentes/i.test(p.productName);
const accessories = roundRobin(
  shop("new-era-us", "New Era", "acessorios", (p) =>
    /HEADWEAR/i.test(p.product_type),
  ),
  unique([
    ...vtex(
      "chilli-accessories",
      "Chilli Beans",
      "acessorios",
      accessoryFilter,
    ),
    ...vtex(
      "chilli-accessories-more",
      "Chilli Beans",
      "acessorios",
      accessoryFilter,
    ),
  ]),
);
const supplementFilter = (p) =>
  isSportsSupplementName(p.productName) &&
  !/kit|combo|display|brinde|sach[eê]|bar\b|barra/i.test(p.productName);
const supplementBase = unique(
  ["max-titanium", "max-titanium-more", "max-titanium-third"].flatMap((key) =>
    vtex(key, "Max Titanium", "suplementos", supplementFilter),
  ),
);
const supplementVariants = unique(
  ["max-titanium", "max-titanium-more", "max-titanium-third"].flatMap((key) =>
    vtex(key, "Max Titanium", "suplementos", supplementFilter, true),
  ),
);
const supplements = unique([
  ...roundRobin(
    shop("muscletech", "MuscleTech", "suplementos", (p) =>
      isSportsSupplementName(p.title),
    ),
    supplementBase,
  ),
  ...supplementVariants,
]);

const allGroups = {
  lattafa,
  "victorias-secret": vs,
  "perfumes-importados": designer,
  tecnologia: technology,
  smartwatches: watches,
  oculos: glasses,
  mochilas: backpacks,
  beleza: beauty,
  roupas: clothes,
  acessorios: accessories,
  suplementos: supplements,
};
const groups = expandPerfumes
  ? Object.fromEntries(
      Object.entries(allGroups).filter(([group]) => perfumeGroups.has(group)),
    )
  : append
    ? Object.fromEntries(
        Object.entries(allGroups).filter(([group]) => extraGroups.has(group)),
      )
    : allGroups;
console.log(
  "Candidatos:",
  Object.fromEntries(
    Object.entries(groups).map(([key, value]) => [key, value.length]),
  ),
);
if (
  Object.entries(groups).some(
    ([group, candidates]) => candidates.length < targetFor(group),
  )
)
  throw new Error(
    "Uma seleção não possui candidatos suficientes para a meta. Revise as fontes antes de importar.",
  );

const descriptions = {
  perfumes:
    "Perfumaria por encomenda. Consulte a apresentação, o valor e a disponibilidade com a Kauany.",
  cosmeticos:
    "Beleza e cuidados pessoais por encomenda. Confirme a versão e o tamanho com a Kauany.",
  skincare:
    "Cuidados com a pele por encomenda. Consulte a apresentação e a disponibilidade com a Kauany.",
  eletronicos:
    "Tecnologia por encomenda. Confirme a versão, a compatibilidade e as condições com a Kauany.",
  smartwatches:
    "Smartwatch por encomenda. Consulte cor, tamanho, compatibilidade e disponibilidade com a Kauany.",
  oculos:
    "Óculos de sol por encomenda. Confirme a referência, a cor e o tamanho com a Kauany.",
  mochilas:
    "Mochila por encomenda. Consulte a cor, a referência e a disponibilidade com a Kauany.",
  roupas:
    "Roupa por encomenda. Confirme o modelo, a cor e o tamanho com a Kauany.",
  acessorios:
    "Acessório por encomenda. Consulte o modelo, a referência e a disponibilidade com a Kauany.",
  suplementos:
    "Nutrição esportiva por encomenda. Confirme sabor, peso da embalagem e disponibilidade com a Kauany.",
};

const successful = Object.fromEntries(
  Object.keys(groups).map((group) => [group, []]),
);
let previousSources = new Map();
let previousProducts = [];
let previousSourceRecords = [];
try {
  previousProducts = JSON.parse(
    await readFile("public/data/products.json", "utf8"),
  );
  previousSourceRecords = JSON.parse(
    await readFile("catalog/image-sources.json", "utf8"),
  );
  previousSources = new Map(
    previousSourceRecords.map((source) => [source.id, source.source_image_url]),
  );
} catch {
  /* Primeira importação. */
}
if (
  expandPerfumes &&
  (!previousProducts.length || !previousSourceRecords.length)
)
  throw new Error(
    "A expansão precisa de um catálogo existente com registro das imagens.",
  );
const retainedSources = expandPerfumes
  ? previousSourceRecords
  : append
    ? previousSourceRecords.filter((source) => !extraGroups.has(source.group))
    : [];
const replacedIds = new Set(
  previousSourceRecords
    .filter((source) => extraGroups.has(source.group))
    .map((source) => source.id),
);
const retainedProducts = expandPerfumes
  ? previousProducts
  : append
    ? previousProducts.filter((product) => !replacedIds.has(product.id))
    : [];
const hashes = new Set(retainedSources.map((source) => source.sha256));
const seenImages = new Set(
  retainedSources.map((source) => source.source_image_url.split("?")[0]),
);
const existingIds = new Set(retainedProducts.map((product) => product.id));
const existingSourceUrls = new Set(
  retainedSources.map((source) => source.source_url.replace(/\/$/, "")),
);
const productKey = (brand, name) =>
  `${normalize(brand)}:${normalize(name)
    .replace(/^perfume\s+/, "")
    .replace(/\s+/g, " ")
    .trim()}`;
const existingProductKeys = new Set(
  retainedProducts.map((product) => productKey(product.brand, product.name)),
);
const existingCountFor = (group) =>
  expandPerfumes
    ? retainedSources.filter((source) => source.group === group).length
    : 0;
const neededFor = (group) =>
  Math.max(0, targetFor(group) - existingCountFor(group));
const failures = [];
sharp.concurrency(1);
async function download(candidate, group) {
  if (
    existingIds.has(candidate.id) ||
    existingSourceUrls.has(candidate.source_url.replace(/\/$/, "")) ||
    existingProductKeys.has(productKey(candidate.brand, candidate.name))
  )
    return false;
  const imageKey = candidate.image.split("?")[0];
  if (seenImages.has(imageKey)) return false;
  const destination = `public/images/catalogo/${group}/${candidate.id.toLowerCase()}.webp`;
  await mkdir(dirname(destination), { recursive: true });
  let buffer;
  try {
    if (!refresh && previousSources.get(candidate.id) === candidate.image) {
      try {
        buffer = await readFile(destination);
      } catch {
        /* Baixar imagem ausente. */
      }
    }
    if (!buffer) {
      const imageUrl = new URL(
        candidate.image.startsWith("//")
          ? `https:${candidate.image}`
          : candidate.image,
      );
      if (imageUrl.hostname.includes("shopify"))
        imageUrl.searchParams.set("width", "720");
      if (imageUrl.hostname.includes("vteximg"))
        imageUrl.pathname = imageUrl.pathname.replace(
          /\/ids\/(\d+)\//,
          "/ids/$1-720-720/",
        );
      const response = await fetch(imageUrl, {
        signal: AbortSignal.timeout(30000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const original = Buffer.from(await response.arrayBuffer());
      const metadata = await sharp(original, {
        limitInputPixels: 40000000,
      }).metadata();
      if (
        !metadata.width ||
        metadata.width < 180 ||
        !metadata.height ||
        metadata.height < 180
      )
        throw new Error("Imagem pequena ou inválida");
      buffer = await sharp(original)
        .rotate()
        .resize(640, 720, { fit: "contain", background: "#faf8f4" })
        .webp({ quality: 82 })
        .toBuffer();
      await writeFile(destination, buffer);
    }
    const hash = createHash("sha256").update(buffer).digest("hex");
    if (hashes.has(hash)) return false;
    hashes.add(hash);
    seenImages.add(imageKey);
    let name = candidate.name;
    if (candidate.category === "smartwatches" && !/smartwatch/i.test(name))
      name = `Smartwatch ${name.toLowerCase().includes(candidate.brand.toLowerCase()) ? "" : candidate.brand + " "}${name}`;
    if (candidate.brand === "goodr") name = `Óculos goodr — ${name}`;
    if (candidate.brand === "Lattafa" && !/^perfume/i.test(name))
      name = `Perfume ${name}`;
    let description = descriptions[candidate.category];
    if (candidate.category === "eletronicos") {
      if (/earbud|headphone|earphone/i.test(name))
        description =
          "Fone de ouvido por encomenda. Consulte versão, compatibilidade e disponibilidade com a Kauany.";
      else if (/speaker|studio monitor/i.test(name))
        description =
          "Caixa de som por encomenda. Confirme a versão e as condições com a Kauany.";
      else if (/power bank/i.test(name))
        description =
          "Bateria portátil (power bank) por encomenda. Confirme versão e compatibilidade com a Kauany.";
      else if (/charger|charging station/i.test(name))
        description =
          "Carregador por encomenda. Confirme a versão, os conectores e a compatibilidade com a Kauany.";
      else if (/cable/i.test(name))
        description =
          "Cabo por encomenda. Consulte comprimento, conectores e compatibilidade com a Kauany.";
    }
    const product = {
      id: candidate.id,
      name: name.slice(0, 180),
      brand: candidate.brand,
      category: candidate.category,
      description,
      image_url: `/${destination.replace(/^public\//, "")}`,
      featured: !append && !expandPerfumes && successful[group].length < 2,
      active: true,
      created_at: "2026-10-28T12:00:00Z",
    };
    existingIds.add(product.id);
    existingSourceUrls.add(candidate.source_url.replace(/\/$/, ""));
    existingProductKeys.add(productKey(product.brand, product.name));
    successful[group].push({
      product,
      source: {
        id: product.id,
        name: product.name,
        source_title: candidate.source_title,
        source_vendor: candidate.source_vendor,
        group,
        source_url: candidate.source_url,
        source_image_url: candidate.image,
        source_catalog_url: candidate.source_catalog_url,
        file: product.image_url,
        sha256: hash,
        downloaded_at: new Date().toISOString(),
      },
    });
    return true;
  } catch (error) {
    failures.push({
      id: candidate.id,
      group,
      error: error.message,
      source_image_url: candidate.image,
    });
    return false;
  }
}

// Quatro seleções em paralelo, até quatro downloads simultâneos, sem reconsultar no deploy.
const queue = Object.entries(groups);
async function worker() {
  while (queue.length) {
    const [group, candidates] = queue.shift();
    for (const candidate of candidates) {
      if (successful[group].length >= neededFor(group)) break;
      await download(candidate, group);
      if (successful[group].length && successful[group].length % 10 === 0)
        console.log(
          `${group}: ${existingCountFor(group) + successful[group].length}/${targetFor(group)}`,
        );
    }
    console.log(
      `CONCLUÍDO ${group}: ${existingCountFor(group) + successful[group].length} imagens (${successful[group].length} novas)`,
    );
  }
}
await Promise.all(Array.from({ length: 4 }, worker));
await mkdir("catalog", { recursive: true });
await writeFile(
  resolve(research, "download-failures.json"),
  JSON.stringify(failures, null, 2),
);
const counts = Object.fromEntries(
  Object.entries(successful).map(([key, value]) => [
    key,
    value.length + existingCountFor(key),
  ]),
);
await writeFile(
  resolve(research, "download-summary.json"),
  JSON.stringify(counts, null, 2),
);
if (Object.entries(counts).some(([group, count]) => count < targetFor(group)))
  throw new Error(
    `Seleções incompletas: ${JSON.stringify(counts)}. O catálogo anterior foi preservado.`,
  );
const items = roundRobin(
  ...Object.values(successful).map((group) =>
    group.map((entry) => ({
      ...entry,
      key: entry.product.id,
      image: entry.product.image_url,
    })),
  ),
);
const importedProducts = items.map(({ product }, index) => ({
  ...product,
  created_at: new Date(Date.UTC(2026, 9, 28, 12) - index * 1000).toISOString(),
}));
const products = [...retainedProducts, ...importedProducts];
if (previousProducts.length) {
  const backupDirectory = resolve(research, "catalog-backup-" + Date.now());
  await mkdir(backupDirectory, { recursive: true });
  await writeFile(
    resolve(backupDirectory, "products.json"),
    JSON.stringify(previousProducts, null, 2),
  );
  await writeFile(
    resolve(backupDirectory, "image-sources.json"),
    JSON.stringify(previousSourceRecords, null, 2),
  );
}
await writeFile(
  "public/data/products.json",
  JSON.stringify(products, null, 2) + "\n",
);
await writeFile(
  "catalog/image-sources.json",
  JSON.stringify(
    [...retainedSources, ...items.map((entry) => entry.source)],
    null,
    2,
  ) + "\n",
);
await writeFile(
  "catalog.config.json",
  JSON.stringify({ demo: false }, null, 2) + "\n",
);
console.log(
  JSON.stringify(
    { products: products.length, groups: counts, failures: failures.length },
    null,
    2,
  ),
);
