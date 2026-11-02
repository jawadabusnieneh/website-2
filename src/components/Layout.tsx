import Highlight from "./Highlight";
import Media from "./Media";
import { useEffect, useRef, useState } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  ArrowLeft,
  ArrowUpLeft,
  Check,
  ChevronDown,
  Heart,
  Menu,
  Search,
  ShoppingBag,
  X,
  Instagram,
  Truck,
  Gift,
  ShieldCheck,
  Sparkle,
} from "lucide-react";
import { useStore } from "../lib/store";
import { money, normalize, price } from "../lib/utils";
export function Logo() {
  const { data } = useStore();
  return (
    <Link to="/" className="brand" aria-label="إيليت أكسسوريز، الرئيسية">
      {data.settings.logo ? (
        <Media src={data.settings.logo} alt={data.settings.name} />
      ) : (
        <>
          <span className="brand-name">
            ELITE
            <Sparkle className="brand-star" size={16} strokeWidth={1} />
          </span>
          <span className="brand-sub">A C C E S S O R I E S</span>
        </>
      )}
    </Link>
  );
}
export function SearchBox({
  mobile = false,
  onClose,
}: {
  mobile?: boolean;
  onClose?: () => void;
}) {
  const { data } = useStore(),
    [query, setQuery] = useState(""),
    [open, setOpen] = useState(false),
    nav = useNavigate(),
    box = useRef<HTMLDivElement>(null);
  const results = data.products
    .filter(
      (p) =>
        p.visible &&
        normalize(
          p.name +
            " " +
            p.description +
            " " +
            (data.categories.find((c) => c.id === p.category)?.name ?? ""),
        ).includes(normalize(query)),
    )
    .slice(0, 4);
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);
  function go() {
    nav(`/shop?q=${encodeURIComponent(query)}`);
    setOpen(false);
    onClose?.();
  }
  return (
    <div
      className={`search-box ${mobile ? "mobile-search-box" : ""}`}
      ref={box}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          go();
        }}
        role="search"
      >
        <Search size={18} />
        <input
          autoFocus={mobile}
          aria-label="ابحثي عن قطعة"
          placeholder="ابحثي عن قطعتك المفضّلة..."
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
        />
        {query && (
          <button
            type="button"
            aria-label="مسح البحث"
            onClick={() => setQuery("")}
          >
            <X size={15} />
          </button>
        )}
      </form>
      {open && query && (
        <div className="search-results">
          <span className="small muted">قطع قد تُحبّينها</span>
          {results.length ? (
            results.map((p) => (
              <Link
                to={`/product/${p.id}`}
                key={p.id}
                onClick={() => {
                  setOpen(false);
                  onClose?.();
                }}
              >
                <Media src={p.images[0]} alt="" />
                <span>
                  <Highlight text={p.name} query={query} />
                  <small>{money(price(p), data.settings.currency)}</small>
                </span>
                <ArrowUpLeft size={16} />
              </Link>
            ))
          ) : (
            <p className="muted">
              لم نجد قطعة مطابقة. جرّبي اسمًا آخر أو تصفّحي الأصناف.
            </p>
          )}
          <button className="text-link" onClick={go}>
            عرض جميع النتائج <ArrowLeft size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
export default function Layout() {
  const { data, cart, notice, demo, error, loading, reload } = useStore(),
    [menu, setMenu] = useState(false),
    [search, setSearch] = useState(false);
  const location = useLocation();
  useEffect(() => {
    setMenu(false);
    setSearch(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname, location.search]);
  useEffect(() => {
    document.body.style.overflow = menu || search ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menu, search]);
  const links = [
    ["/", "الرئيسية"],
    ["/shop?new=1", "وصل حديثًا"],
    ["/shop", "جميع الإكسسوارات"],
    ["/shop?sale=1", "العروض"],
    ["/about", "حكاية إيليت"],
  ];
  return (
    <>
      <a className="skip-link" href="#main">
        تجاوز إلى المحتوى
      </a>
      {data.settings.announcement && (
        <div className="announcement">
          <span>{data.settings.announcement}</span>
          <span className="announcement-mark">ELITE, IN EVERY DETAIL</span>
        </div>
      )}
      <header className="header">
        <div className="header-main container">
          <div className="header-brand">
            <button
              className="icon-button mobile-only"
              aria-label="فتح القائمة"
              onClick={() => setMenu(true)}
            >
              <Menu />
            </button>
            <Logo />
          </div>
          <nav className="desktop-nav" aria-label="التنقل الرئيسي">
            {links.map(([to, label]) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  isActive &&
                  location.search ===
                    (to.split("?")[1] ? "?" + to.split("?")[1] : "")
                    ? "active"
                    : ""
                }
              >
                {label}
                {to === "/shop" && <ChevronDown size={12} />}
              </NavLink>
            ))}
          </nav>
          <div className="header-actions">
            <button
              className="icon-button"
              aria-label="فتح البحث"
              onClick={() => setSearch(true)}
            >
              <Search size={20} />
            </button>
            <Link
              className="icon-button wishlist-link"
              to="/shop?favorites=1"
              aria-label="القطع المفضلة"
            >
              <Heart size={20} />
            </Link>
            <span className="action-divider" />
            <Link
              to="/cart"
              className="bag-link"
              aria-label={`حقيبة التسوق، ${cart.reduce((n, x) => n + x.quantity, 0)} قطع`}
            >
              <ShoppingBag size={21} />
              <span className="cart-count">
                {cart.reduce((n, x) => n + x.quantity, 0)}
              </span>
            </Link>
          </div>
        </div>
        <div className="header-search-row">
          <div className="container">
            <span>مختارات بعناية. تفاصيل بحُب.</span>
            <SearchBox />
            <Link to="/shop">
              اكتشفي ما يُشبهك <ArrowUpLeft size={14} />
            </Link>
          </div>
        </div>
      </header>
      {(menu || search) && (
        <div
          className="mobile-overlay"
          onClick={() => {
            setMenu(false);
            setSearch(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={search ? "البحث عن المنتجات" : "القائمة الرئيسية"}
            className={`overlay-panel ${search ? "search-panel" : ""}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="overlay-top">
              <Logo />
              <button
                className="icon-button"
                aria-label="إغلاق"
                onClick={() => {
                  setMenu(false);
                  setSearch(false);
                }}
              >
                <X />
              </button>
            </div>
            {search ? (
              <>
                <h2>عن أي قطعة تبحثين؟</h2>
                <SearchBox mobile onClose={() => setSearch(false)} />
                <p className="small muted">اكتشفي الأصناف</p>
                <div className="search-chips">
                  {data.categories
                    .filter((c) => c.visible)
                    .map((c) => (
                      <Link key={c.id} to={`/shop?category=${c.id}`}>
                        {c.name}
                        <ArrowUpLeft size={15} />
                      </Link>
                    ))}
                </div>
              </>
            ) : (
              <nav className="mobile-nav">
                {links.map(([to, label]) => (
                  <Link key={to} to={to}>
                    {label}
                    <ArrowLeft size={18} />
                  </Link>
                ))}
              </nav>
            )}
          </div>
        </div>
      )}
      <main id="main">
        {error ? (
          <div className="container error-banner" role="alert">
            {error}
            <button className="text-link" onClick={() => void reload()}>
              إعادة المحاولة
            </button>
          </div>
        ) : loading ? (
          <div className="loading">جارٍ تحميل مختارات إيليت...</div>
        ) : null}
        <Outlet />
      </main>
      <div className="service-strip">
        <div className="container">
          <div>
            <Truck />
            <span>
              توصيل إلى بابك<small>إلى مناطق التوصيل المعتمدة</small>
            </span>
          </div>
          <div>
            <Gift />
            <span>
              كل قطعة، هدية<small>تفاصيل تُختار بعناية</small>
            </span>
          </div>
          <div>
            <ShieldCheck />
            <span>
              تسوّق بكل راحة<small>تأكيد طلبك مباشرة عبر واتساب</small>
            </span>
          </div>
        </div>
      </div>
      <footer>
        <div className="container footer-grid">
          <div className="footer-about">
            <Logo />
            <p>
              تفاصيل صغيرة تصنع الفرق.
              <br />
              إكسسوارات تُكمّل إطلالتك، وتُشبهك.
            </p>
            <div className="social-links">
              {data.settings.instagram && (
                <a
                  href={data.settings.instagram}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="إنستغرام"
                >
                  <Instagram size={19} />
                </a>
              )}
              {data.settings.facebook && (
                <a
                  href={data.settings.facebook}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="فيسبوك"
                >
                  f
                </a>
              )}
              <span>BE YOUR OWN KIND OF ELITE.</span>
            </div>
          </div>
          <div>
            <h3>اكتشفي إيليت</h3>
            <Link to="/shop?new=1">وصل حديثًا</Link>
            <Link to="/shop">جميع الإكسسوارات</Link>
            <Link to="/shop?sale=1">عروض مختارة</Link>
          </div>
          <div>
            <h3>نحن هنا لأجلك</h3>
            <Link to="/about">حكايتنا</Link>
            <Link to="/info/delivery">الشحن والتوصيل</Link>
            <Link to="/info/care">العناية بقطعك</Link>
            <Link to="/info/privacy">الخصوصية</Link>
          </div>
          <div className="footer-note">
            <span className="eyebrow">LET'S STAY CLOSE</span>
            <h3>
              يسعدنا أن نكون جزءًا
              <br />
              من تفاصيل يومك.
            </h3>
            <Link className="text-link" to="/contact">
              تواصلي معنا <ArrowUpLeft size={17} />
            </Link>
          </div>
        </div>
        <div className="footer-bottom container">
          <span>
            {new Date().getFullYear()} {data.settings.name}. جميع الحقوق محفوظة.
          </span>
          {demo && (
            <span className="demo-label">
              عرض تجريبي · المنتجات والأسعار للتجربة
            </span>
          )}
          <span dir="ltr">MADE FOR YOUR EVERYDAY ELEGANCE</span>
        </div>
      </footer>
      {notice && (
        <div className="toast" role="status">
          <span className="toast-check">
            <Check size={16} />
          </span>
          {notice}
        </div>
      )}
    </>
  );
}
