// Catálogo comercial de nutrição esportiva, restrito ao escopo pedido pela dona.
const allowed =
  /\bwhey\b|\bisowhey\b|\bcreatin(?:a|e)\b|\bhipercaloric[oa]s?\b|\bmass[ -]?(?:tech|gainer|titanium)\b|\bsuper[ -]?gainers?\b|\balbumina\b|\bmaltodextrina\b|\bdextrose\b|\bnitro[ -]?tech\b|\bcell[ -]?tech\b/;
const excluded =
  /dipirona|paracetamol|ibuprofeno|dorflex|novalgina|aspirina|amoxicilina|omeprazol|sildenafila|tadalafila|medicamento|analgesic|antibiotic|hormon|testosteron|anabol|peptid|alphatest|hydroxycut|termogenic|multivitamin|capsul|\bcaps\b/;

export function isSportsSupplementName(name) {
  if (typeof name !== "string") return false;
  const normalized = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return allowed.test(normalized) && !excluded.test(normalized);
}
