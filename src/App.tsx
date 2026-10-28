import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Backpack,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  FlaskConical,
  Glasses,
  Headphones,
  Leaf,
  MapPin,
  Menu,
  MessageCircle,
  Minus,
  Package,
  Dumbbell,
  Plus,
  Search,
  ShieldCheck,
  Shirt,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  SprayCan,
  Truck,
  Watch,
  X,
} from "lucide-react";
import {
  getProduct,
  getProducts,
  isDemo,
  PAGE_SIZE,
  whatsappUrl,
  type Product,
} from "./lib/catalog";

const categories = [
  { id: "todos", label: "Todos", icon: Sparkles },
  { id: "perfumes", label: "Perfumes", icon: SprayCan },
  { id: "skincare", label: "Skincare", icon: Leaf },
  { id: "cosmeticos", label: "Cosméticos", icon: FlaskConical },
  { id: "eletronicos", label: "Eletrônicos", icon: Headphones },
  { id: "smartwatches", label: "Smartwatches", icon: Watch },
  { id: "oculos", label: "Óculos", icon: Glasses },
  { id: "mochilas", label: "Mochilas", icon: Backpack },
  { id: "suplementos", label: "Suplementos", icon: Dumbbell },
  { id: "roupas", label: "Roupas", icon: Shirt },
  { id: "acessorios", label: "Acessórios", icon: Glasses },
];

function WhatsAppLink({
  children,
  className = "",
  product,
  quantity = 1,
  ariaLabel,
}: {
  children: React.ReactNode;
  className?: string;
  product?: Product;
  quantity?: number;
  ariaLabel?: string;
}) {
  return (
    <a
      className={className}
      href={whatsappUrl(product, quantity)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ariaLabel}
    >
      {children}
    </a>
  );
}

function ProductImage({
  product,
  className = "",
}: {
  product: Product;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  return failed || !product.image_url ? (
    <div className={`image-fallback ${className}`}>
      <ShoppingBag size={48} strokeWidth={1} />
      <span>{product.name}</span>
    </div>
  ) : (
    <img
      className={className}
      src={product.image_url}
      alt={product.name}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

function ProductDialog({
  product,
  onClose,
}: {
  product: Product;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [quantity, setQuantity] = useState(1);
  useEffect(() => {
    dialogRef.current?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);
  return (
    <dialog
      ref={dialogRef}
      className="product-dialog"
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      aria-labelledby="product-title"
    >
      <button
        className="dialog-close icon-button"
        onClick={onClose}
        aria-label="Fechar detalhes"
      >
        <X size={21} />
      </button>
      <div className="dialog-layout">
        <div className="dialog-image">
          <ProductImage product={product} />
        </div>
        <div className="dialog-content">
          <span className="eyebrow">
            {
              categories.find((category) => category.id === product.category)
                ?.label
            }
          </span>
          <p className="product-brand">
            {product.brand || "Seleção de importados"}
          </p>
          <h2 id="product-title">{product.name}</h2>
          <p>{product.description}</p>
          <div className="availability">
            <span /> Disponível para consulta por encomenda
          </div>
          <div className="dialog-price">
            <strong>Valor sob consulta</strong>
            <span>Confirmado com você antes da encomenda.</span>
          </div>
          <div className="quantity-row">
            <span>Quantidade</span>
            <div className="quantity">
              <button
                disabled={quantity === 1}
                onClick={() => setQuantity((value) => value - 1)}
                aria-label="Diminuir quantidade"
              >
                <Minus size={16} />
              </button>
              <output aria-live="polite">{quantity}</output>
              <button
                disabled={quantity === 99}
                onClick={() => setQuantity((value) => value + 1)}
                aria-label="Aumentar quantidade"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
          <WhatsAppLink
            className="button button-green"
            product={product}
            quantity={quantity}
          >
            <MessageCircle size={18} /> Pedir pelo WhatsApp{" "}
            <ArrowRight size={17} />
          </WhatsAppLink>
          <p className="dialog-note">
            <ShieldCheck size={16} /> O envio abre uma conversa. Sua encomenda
            só é confirmada após combinar os detalhes com a Kauany.
          </p>
        </div>
      </div>
    </dialog>
  );
}

export default function App() {
  const [mobileMenu, setMobileMenu] = useState(false);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState({
    search: "",
    category: "todos",
    brand: "todas",
    sort: "destaques",
    page: 1,
  });
  const [result, setResult] = useState<{
    products: Product[];
    total: number;
    brands: string[];
    categoryCounts: Record<string, number>;
  }>({
    products: [],
    total: 0,
    brands: [],
    categoryCounts: {},
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [selected, setSelected] = useState<Product | null>(null);
  const [linkNotice, setLinkNotice] = useState("");
  const catalogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const timeout = setTimeout(
      () =>
        setQuery((current) =>
          current.search === search.trim()
            ? current
            : { ...current, search: search.trim(), page: 1 },
        ),
      250,
    );
    return () => clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    getProducts(query, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setResult(data);
      })
      .catch((reason: Error) => {
        if (!controller.signal.aborted)
          setError(
            reason instanceof TypeError
              ? "Não foi possível conectar ao catálogo. Verifique sua conexão e tente novamente."
              : reason.message || "Não foi possível carregar o catálogo.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [query, retry]);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("produto");
    if (!id) return;
    const controller = new AbortController();
    getProduct(id, controller.signal)
      .then((product) => {
        if (!controller.signal.aborted) {
          if (product) setSelected(product);
          else
            setLinkNotice(
              "Este produto não está mais no catálogo. Fale com a Kauany para consultar uma alternativa.",
            );
        }
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setLinkNotice(
            "Não foi possível abrir este produto. Você pode procurá-lo no catálogo ou falar com a Kauany.",
          );
      });
    return () => controller.abort();
  }, []);

  function openProduct(product: Product) {
    setSelected(product);
    const url = new URL(window.location.href);
    url.searchParams.set("produto", product.id);
    window.history.replaceState(null, "", url);
  }
  function closeProduct() {
    setSelected(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("produto");
    window.history.replaceState(null, "", url);
  }
  function clearFilters() {
    setSearch("");
    setQuery({
      search: "",
      category: "todos",
      brand: "todas",
      sort: "destaques",
      page: 1,
    });
  }
  const pages = Math.ceil(result.total / PAGE_SIZE);
  function discoverCategory(category: string) {
    setSearch("");
    setQuery({
      search: "",
      category,
      brand: "todas",
      sort: "destaques",
      page: 1,
    });
  }

  return (
    <>
      <a href="#catalogo" className="skip-link">
        Pular para o catálogo
      </a>
      <div className="announcement">
        <span>Se está na sua lista, vamos atrás.</span>
        <span className="announcement-location">
          <MapPin size={12} /> Curitiba e região
        </span>
      </div>
      <header className="header">
        <div className="container header-inner">
          <a
            className="brand"
            href="#inicio"
            aria-label="Importados & encomendas, início"
          >
            <span className="brand-name">
              importados<span className="brand-spark">✳</span>
            </span>
            <span className="brand-subtitle">& encomendas</span>
          </a>
          <nav
            className={mobileMenu ? "nav open" : "nav"}
            aria-label="Navegação principal"
          >
            <a href="#catalogo" onClick={() => setMobileMenu(false)}>
              Catálogo
            </a>
            <a href="#como-funciona" onClick={() => setMobileMenu(false)}>
              Como funciona
            </a>
            <a href="#sobre" onClick={() => setMobileMenu(false)}>
              Sobre a Kauany
            </a>
          </nav>
          <WhatsAppLink
            className="header-contact"
            ariaLabel="Fale com a Kauany pelo WhatsApp"
          >
            <MessageCircle size={17} />
            <span>Fale com a Kauany</span>
            <ArrowRight size={15} />
          </WhatsAppLink>
          <button
            className="mobile-menu icon-button"
            onClick={() => setMobileMenu((value) => !value)}
            aria-expanded={mobileMenu}
            aria-label={mobileMenu ? "Fechar menu" : "Abrir menu"}
          >
            {mobileMenu ? <X /> : <Menu />}
          </button>
        </div>
      </header>

      <main>
        <section className="hero" id="inicio">
          <div className="container hero-inner">
            <div className="hero-copy">
              <div className="eyebrow">
                <span className="status-dot" /> CURADORIA DE IMPORTADOS, POR
                KAUANY
              </div>
              <h1>
                <span>Seu desejo.</span>
                <span>Minha próxima</span>
                <em>parada.</em>
              </h1>
              <p>
                Dos perfumes que você salva aos achadinhos que ainda vai
                descobrir. Eu busco no Paraguai e combino cada detalhe com você.
              </p>
              <div className="hero-actions">
                <a className="button button-wine" href="#catalogo">
                  Encontrar meu favorito <ArrowRight size={19} />
                </a>
                <a className="text-link" href="#como-funciona">
                  Como eu encomendo? <ArrowDown size={16} />
                </a>
              </div>
              <div className="hero-note">
                <span className="note-icon">
                  <MessageCircle size={20} strokeWidth={1.5} />
                </span>
                <span>
                  Cada detalhe combinado pelo WhatsApp.
                  <br />
                  <strong>Seu pedido começa com uma boa conversa.</strong>
                </span>
              </div>
            </div>
            <div className="hero-visual">
              <div className="hero-orbit" aria-hidden="true" />
              <div className="hero-podium podium-one" aria-hidden="true" />
              <div className="hero-podium podium-two" aria-hidden="true" />
              <img
                className="hero-bottle bottle-yara"
                src="/images/catalogo/lattafa/lat-yara-rose.webp"
                alt="Perfume Lattafa Yara Rosé"
                fetchPriority="high"
              />
              <img
                className="hero-bottle bottle-khamrah"
                src="/images/catalogo/lattafa/lattafa-9055157158111.webp"
                alt="Perfume Lattafa Khamrah"
                fetchPriority="high"
              />
              <span className="hero-handwritten">
                um novo favorito
                <br />
                te espera aqui.
              </span>
              <div className="hero-ticket">
                <span>
                  ORIGEM
                  <br />
                  <strong>PARAGUAI</strong>
                </span>
                <ArrowRight size={33} strokeWidth={1.2} />
                <span>
                  DESTINO
                  <br />
                  <strong>VOCÊ</strong>
                </span>
                <span className="ticket-stub">
                  FEITO DE
                  <br />
                  BOAS ESCOLHAS
                </span>
              </div>
              <span className="hero-caption">
                <Sparkles size={15} /> PERFUMARIA & BONS ACHADOS
              </span>
            </div>
          </div>
        </section>

        <div className="benefits">
          <div className="container benefits-inner">
            <span>
              <ShoppingBag size={18} /> Produtos por encomenda
            </span>
            <i />
            <span>
              <MessageCircle size={18} /> Atendimento pelo WhatsApp
            </span>
            <i />
            <span>
              <Truck size={19} /> Curitiba e região
            </span>
            <i />
            <span>
              <ShieldCheck size={18} /> Cada detalhe combinado com você
            </span>
          </div>
        </div>

        <section
          className="discovery-section container"
          aria-label="Seleções para explorar"
        >
          <div className="discovery-intro">
            <span className="eyebrow">COMECE POR UMA BOA DESCOBERTA</span>
            <p>
              O seu tipo de <em>favorito.</em>
            </p>
          </div>
          <div className="discovery-grid">
            <a
              href="#catalogo"
              className="discovery-card discovery-perfumes"
              onClick={() => discoverCategory("perfumes")}
            >
              <span className="discovery-kicker">01 / A NOSSA OBSESSÃO</span>
              <h2>
                Deixe a sua
                <br />
                <em>marca no ar.</em>
              </h2>
              <p>
                Lattafa, Victoria’s Secret e os perfumes que você quer conhecer
                de perto.
              </p>
              <img
                src="/images/catalogo/lattafa/lattafa-best-9055154962655.webp"
                alt="Perfume Lattafa Eclaire"
                loading="lazy"
              />
              <span className="discovery-link">
                Explorar {result.categoryCounts.perfumes || ""} perfumes{" "}
                <ArrowRight size={19} />
              </span>
              <span className="discovery-flower" aria-hidden="true">
                ✳
              </span>
            </a>
            <a
              href="#catalogo"
              className="discovery-card discovery-beauty"
              onClick={() => discoverCategory("skincare")}
            >
              <span className="discovery-kicker">02 / CUIDE DE VOCÊ</span>
              <h2>
                Seu ritual,
                <br />
                <em>seu momento.</em>
              </h2>
              <img
                className="discovery-product"
                src="/images/catalogo/beleza/cosrx-9073669570776.webp"
                alt="Sérum COSRX The 6 Peptide Skin Booster"
                loading="lazy"
              />
              <span className="discovery-link">
                Beleza & skincare <ArrowRight size={19} />
              </span>
            </a>
            <a
              href="#catalogo"
              className="discovery-card discovery-tech"
              onClick={() => discoverCategory("eletronicos")}
            >
              <span className="discovery-kicker">03 / DÊ UM UPGRADE</span>
              <h2>
                Achados para
                <br />
                <em>a sua rotina.</em>
              </h2>
              <img
                className="discovery-product"
                src="/images/catalogo/tecnologia/edifier-best-763638055002.webp"
                alt="Fone de ouvido Edifier W360NB"
                loading="lazy"
              />
              <span className="discovery-link">
                Tecnologia & mais <ArrowRight size={19} />
              </span>
            </a>
          </div>
        </section>

        <section
          className="catalog-section container"
          id="catalogo"
          ref={catalogRef}
        >
          <div className="section-heading">
            <div>
              <span className="eyebrow">
                A SUA PRÓXIMA DESCOBERTA ESTÁ AQUI
              </span>
              <h2>
                Explore sem <em>fronteiras.</em>
              </h2>
            </div>
            <p>
              Seu gosto, suas escolhas.
              <br />
              Eu cuido de encontrar o caminho.
            </p>
          </div>
          <div
            className="categories"
            role="group"
            aria-label="Filtrar por categoria"
          >
            {categories.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                className={
                  query.category === id ? "category active" : "category"
                }
                aria-pressed={query.category === id}
                onClick={() =>
                  setQuery((current) => ({
                    ...current,
                    category: id,
                    brand: "todas",
                    page: 1,
                  }))
                }
              >
                <Icon size={18} strokeWidth={1.5} />
                {label}
              </button>
            ))}
          </div>
          <div className="catalog-toolbar">
            <div className="search-field">
              <Search size={19} strokeWidth={1.6} />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar um produto…"
                aria-label="Buscar produtos"
              />
              {search && (
                <button
                  className="icon-button"
                  aria-label="Limpar busca"
                  onClick={() => setSearch("")}
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <div className="brand-field">
              <label className="sr-only" htmlFor="brand">
                Filtrar por marca
              </label>
              <select
                id="brand"
                value={query.brand}
                onChange={(event) =>
                  setQuery((current) => ({
                    ...current,
                    brand: event.target.value,
                    page: 1,
                  }))
                }
              >
                <option value="todas">Todas as marcas</option>
                {result.brands.map((brand) => (
                  <option key={brand} value={brand}>
                    {brand}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} />
            </div>
            <div className="sort-field">
              <SlidersHorizontal size={16} />
              <label className="sr-only" htmlFor="sort">
                Ordenar produtos
              </label>
              <select
                id="sort"
                value={query.sort}
                onChange={(event) =>
                  setQuery((current) => ({
                    ...current,
                    sort: event.target.value,
                    page: 1,
                  }))
                }
              >
                <option value="destaques">Em destaque</option>
                <option value="recentes">Mais recentes</option>
                <option value="nome">Nome: A a Z</option>
              </select>
              <ChevronDown size={14} />
            </div>
          </div>
          <div className="catalog-meta">
            <span aria-live="polite">
              {loading
                ? "Buscando seus favoritos…"
                : error
                  ? "Catálogo indisponível no momento"
                  : `${result.total} ${result.total === 1 ? "produto para descobrir" : "produtos para descobrir"}`}
            </span>
            <span>
              <span className="status-dot" /> Valores e disponibilidade sob
              consulta
            </span>
          </div>
          {isDemo && (
            <p className="demo-notice">
              <CircleHelp size={15} />
              <span>
                Catálogo de demonstração. Os itens são exemplos; consulte a
                Kauany sobre a disponibilidade.
              </span>
            </p>
          )}
          {linkNotice && (
            <div className="link-notice" role="status">
              {linkNotice}
              <button
                className="icon-button"
                onClick={() => setLinkNotice("")}
                aria-label="Fechar aviso"
              >
                <X size={16} />
              </button>
            </div>
          )}
          {loading ? (
            <div
              className="product-grid"
              aria-label="Carregando produtos"
              aria-busy="true"
            >
              {Array.from({ length: 4 }, (_, index) => (
                <div className="skeleton-card" key={index}>
                  <div />
                  <span />
                  <span />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="empty-state" role="alert">
              <Package size={36} strokeWidth={1} />
              <h3>Vamos tentar mais uma vez?</h3>
              <p>{error}</p>
              <button
                className="button button-wine"
                onClick={() => setRetry((value) => value + 1)}
              >
                Recarregar catálogo <ArrowRight size={16} />
              </button>
              <WhatsAppLink className="text-link">
                Falar com a Kauany
              </WhatsAppLink>
            </div>
          ) : result.products.length === 0 ? (
            <div className="empty-state">
              <Search size={36} strokeWidth={1} />
              <h3>Seu desejo pode ir além do catálogo.</h3>
              <p>
                Nenhum produto encontrado com esses filtros. A Kauany também
                procura itens por encomenda.
              </p>
              <button className="text-link" onClick={clearFilters}>
                <ArrowLeft size={16} /> Limpar filtros
              </button>
              <WhatsAppLink className="button button-green">
                <MessageCircle size={18} /> Pedir um produto diferente
              </WhatsAppLink>
            </div>
          ) : (
            <div className="product-grid">
              {result.products.map((product) => (
                <article className="product-card" key={product.id}>
                  <button
                    className="product-image-button"
                    onClick={() => openProduct(product)}
                    aria-label={`Ver detalhes de ${product.name}`}
                  >
                    <ProductImage product={product} />
                    <span className="product-view">
                      <Plus size={18} />
                    </span>
                  </button>
                  {product.featured && (
                    <span className="product-badge">
                      <Sparkles size={12} /> NO RADAR
                    </span>
                  )}
                  <div className="product-info">
                    <span className="product-brand">
                      {product.brand ||
                        categories.find(
                          (category) => category.id === product.category,
                        )?.label}
                    </span>
                    <h3>
                      <button onClick={() => openProduct(product)}>
                        {product.name}
                      </button>
                    </h3>
                    <p>{product.description}</p>
                    <div className="product-price">
                      <strong>Sob consulta</strong>
                      <span>por encomenda</span>
                    </div>
                    <WhatsAppLink className="product-order" product={product}>
                      <MessageCircle size={16} /> Pedir pelo WhatsApp{" "}
                      <ArrowRight size={15} />
                    </WhatsAppLink>
                  </div>
                </article>
              ))}
            </div>
          )}
          {!loading && !error && pages > 1 && (
            <nav className="pagination" aria-label="Páginas de produtos">
              <button
                disabled={query.page === 1}
                className="icon-button"
                aria-label="Página anterior"
                onClick={() => {
                  setQuery((current) => ({
                    ...current,
                    page: current.page - 1,
                  }));
                  catalogRef.current?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                <ChevronLeft size={19} />
              </button>
              <span>
                Página {query.page} de {pages}
              </span>
              <button
                disabled={query.page >= pages}
                className="icon-button"
                aria-label="Próxima página"
                onClick={() => {
                  setQuery((current) => ({
                    ...current,
                    page: current.page + 1,
                  }));
                  catalogRef.current?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                <ChevronRight size={19} />
              </button>
            </nav>
          )}
          <div className="custom-request">
            <span className="request-icon">
              <ShoppingBag size={24} strokeWidth={1.3} />
            </span>
            <div>
              <h3>Não encontrou o que procura?</h3>
              <p>Mande sua ideia ou uma foto. A Kauany procura para você.</p>
            </div>
            <WhatsAppLink className="text-link">
              Quero fazer uma encomenda <ArrowRight size={17} />
            </WhatsAppLink>
          </div>
        </section>

        <section className="how-section" id="como-funciona">
          <div className="container">
            <div className="section-heading">
              <div>
                <span className="eyebrow">SIMPLES, DO SEU JEITO</span>
                <h2>
                  Do seu desejo <em>à sua porta.</em>
                </h2>
              </div>
              <span className="how-heading-note">
                Você escolhe. A Kauany faz acontecer. <Sparkles size={20} />
              </span>
            </div>
            <div className="steps">
              <article>
                <div className="step-top">
                  <span>01</span>
                  <Search size={26} strokeWidth={1.2} />
                </div>
                <h3>Encontre o seu favorito</h3>
                <p>
                  Explore o catálogo ou envie uma foto do produto que está na
                  sua lista de desejos.
                </p>
              </article>
              <article>
                <div className="step-top">
                  <span>02</span>
                  <MessageCircle size={26} strokeWidth={1.2} />
                </div>
                <h3>Converse com a Kauany</h3>
                <p>
                  Peça pelo WhatsApp e combine o valor, a disponibilidade e o
                  prazo da sua encomenda.
                </p>
              </article>
              <article>
                <div className="step-top">
                  <span>03</span>
                  <Package size={26} strokeWidth={1.2} />
                </div>
                <h3>Agora é com ela</h3>
                <p>
                  A Kauany procura seu produto no Paraguai e combina a entrega
                  em Curitiba e região.
                </p>
              </article>
            </div>
            <div className="how-footnote">
              <Check size={16} /> Sem pagamento pelo site. Tudo combinado
              diretamente, com atenção a cada detalhe.
            </div>
          </div>
        </section>

        <section className="about-section container" id="sobre">
          <div className="about-art">
            <img
              src="/images/body-mists.webp"
              alt="Body splashes Victoria’s Secret na foto de divulgação enviada pela Kauany"
              loading="lazy"
            />
            <a
              className="about-art-note"
              href="/images/encomendas.webp"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Sparkles size={23} strokeWidth={1} />
              <span>
                De uma boa descoberta
                <br />a uma nova paixão.
              </span>
              <ArrowRight size={17} />
            </a>
          </div>
          <div className="about-copy">
            <span className="eyebrow">PRAZER, KAUANY.</span>
            <h2>
              Uma ponte entre você
              <br />e os seus <em>favoritos.</em>
            </h2>
            <p>
              Tem um perfume na sua lista? Um cuidado novo para a rotina? Ou
              aquele achadinho que você procura há tempos?
            </p>
            <p>
              Eu vou ao Paraguai para encontrar os produtos que você deseja. Por
              aqui, cada encomenda começa com uma conversa: você me conta o que
              procura e a gente combina tudo, do valor à entrega.
            </p>
            <div className="about-location">
              <MapPin size={18} />
              <span>
                Do Paraguai para <strong>Curitiba e região.</strong>
              </span>
            </div>
            <WhatsAppLink className="button button-wine">
              <MessageCircle size={17} /> Fale comigo <ArrowRight size={17} />
            </WhatsAppLink>
            <span className="signature">Com carinho, Kauany</span>
          </div>
        </section>

        <section className="faq-section container">
          <div>
            <span className="eyebrow">ANTES DE ENCOMENDAR</span>
            <h2>
              Ficou com
              <br />
              alguma <em>dúvida?</em>
            </h2>
            <WhatsAppLink className="text-link">
              Vamos conversar <ArrowRight size={16} />
            </WhatsAppLink>
          </div>
          <div className="faq-list">
            {[
              [
                "Como descubro o valor de um produto?",
                "Clique em “Pedir pelo WhatsApp”. A mensagem já vai com o nome e a referência do item. A Kauany consulta o valor e confirma os detalhes com você antes de fechar a encomenda.",
              ],
              [
                "Posso pedir algo que não está no catálogo?",
                "Sim! Envie o nome, uma foto ou o link do produto pelo WhatsApp. A Kauany verifica se consegue encontrá-lo no Paraguai e retorna com as informações.",
              ],
              [
                "Como funcionam o pagamento e a entrega?",
                "As formas de pagamento, o prazo e as condições de entrega são combinados diretamente com a Kauany pelo WhatsApp. O atendimento de entregas é para Curitiba e região.",
              ],
              [
                "Os produtos estão disponíveis para pronta entrega?",
                "O catálogo reúne sugestões de produtos por encomenda. A disponibilidade precisa ser confirmada com a Kauany, assim como o preço e o prazo de cada item.",
              ],
            ].map(([title, body]) => (
              <details key={title}>
                <summary>
                  {title}
                  <Plus size={17} />
                </summary>
                <p>{body}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="contact-section">
          <div className="container contact-inner">
            <Sparkles className="contact-spark" size={46} strokeWidth={0.8} />
            <div>
              <span className="eyebrow">
                SUA LISTA DE DESEJOS TEM UM DESTINO
              </span>
              <h2>
                Vamos encontrar o seu <em>próximo favorito?</em>
              </h2>
            </div>
            <WhatsAppLink className="button button-cream">
              <MessageCircle size={18} /> Chamar a Kauany{" "}
              <ArrowRight size={17} />
            </WhatsAppLink>
          </div>
        </section>
      </main>

      <footer className="footer container">
        <div className="footer-main">
          <a className="brand" href="#inicio">
            <span className="brand-name">
              importados<span className="brand-spark">✳</span>
            </span>
            <span className="brand-subtitle">E ENCOMENDAS</span>
          </a>
          <p>
            Seus desejos, escolhidos com carinho.
            <br />
            Do Paraguai para Curitiba e região.
          </p>
          <WhatsAppLink className="footer-phone">
            <MessageCircle size={17} />
            <span>+55 41 8859-1333</span>
            <ArrowRight size={15} />
          </WhatsAppLink>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Importados e Encomendas.</span>
          <span>
            Catálogo por encomenda · Valores e disponibilidade sob consulta.
          </span>
          <a href="#inicio">Voltar ao topo ↑</a>
        </div>
      </footer>
      {selected && (
        <ProductDialog
          key={selected.id}
          product={selected}
          onClose={closeProduct}
        />
      )}
    </>
  );
}
