import { useLanguage } from "../lib/i18n";
import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Heart, Search, SlidersHorizontal, X } from "lucide-react";
import { useStore } from "../lib/store";
import { normalize, price } from "../lib/utils";
import ProductCard from "../components/ProductCard";
export default function Shop() {
  const { t, language } = useLanguage();
  const { data, favorites } = useStore(),
    [params, setParams] = useSearchParams(),
    [filters, setFilters] = useState(false);
  const q = params.get("q") ?? "",
    cat = params.get("category") ?? "";
  const latestParams = useRef(params);
  useEffect(() => {
    latestParams.current = params;
  }, [params]);
  function param(k: string, v: string) {
    // Router navigation can render asynchronously. Preserve earlier field edits
    // when the customer changes two filters before that render completes.
    const next = new URLSearchParams(latestParams.current);
    if (v) next.set(k, v);
    else next.delete(k);
    latestParams.current = next;
    setParams(next);
  }
  function clearParams() {
    latestParams.current = new URLSearchParams();
    setParams(latestParams.current);
  }
  let results = data.products
    .filter((p) => p.visible)
    .filter((p) => !cat || p.category === cat)
    .filter(
      (p) =>
        !q ||
        normalize(
          p.name +
            " " +
            p.description +
            " " +
            data.categories.find((c) => c.id === p.category)?.name,
        ).includes(normalize(q)),
    )
    .filter((p) => !params.get("new") || p.isNew)
    .filter((p) => !params.get("sale") || price(p) < p.price)
    .filter((p) => !params.get("stock") || p.stock > 0)
    .filter((p) => !params.get("favorites") || favorites.includes(p.id))
    .filter((p) => !params.get("min") || price(p) >= Number(params.get("min")))
    .filter((p) => !params.get("max") || price(p) <= Number(params.get("max")));
  const sort = params.get("sort") ?? "new";
  results.sort((a, b) =>
    sort === "low"
      ? price(a) - price(b)
      : sort === "high"
        ? price(b) - price(a)
        : sort === "name"
          ? a.name.localeCompare(b.name, language)
          : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  return (
    <div className="container shop-page">
      <div className="breadcrumbs">
        <Link to="/">{t("الرئيسية")}</Link>
        <span>/</span>
        <span>{t("التشكيلة")}</span>
      </div>
      <div className="shop-intro">
        <span className="eyebrow">FIND YOUR LITTLE LUXURY</span>
        <h1>
          {params.get("favorites")
            ? t("قطع قريبة من قلبك")
            : cat
              ? data.categories.find((c) => c.id === cat)?.name
              : params.get("new")
                ? t("وصل حديثًا")
                : params.get("sale")
                  ? t("فرص جميلة، لقطع أجمل")
                  : t("تفاصيل تختارينها على ذوقك")}
        </h1>
        <p>{t("قطع تُكمل إطلالتك، وتُعبّر عنك. اكتشفي ما يُشبهك.")}</p>
      </div>
      <div className="catalog-layout">
        <aside
          role={filters ? "dialog" : undefined}
          aria-modal={filters ? true : undefined}
          aria-label={filters ? t("تصفية المنتجات") : undefined}
          className={`filters ${filters ? "filters-open" : ""}`}
        >
          <div className="filter-title">
            <h3>
              <SlidersHorizontal size={18} />
              {t("تصفية التشكيلة")}
            </h3>
            <button
              className="icon-button mobile-only"
              aria-label={t("إغلاق الفلاتر")}
              onClick={() => setFilters(false)}
            >
              <X />
            </button>
          </div>
          <label className="filter-search">
            <Search size={17} />
            <input
              value={q}
              aria-label={t("بحث في المنتجات")}
              placeholder={t("ابحثي عن قطعة...")}
              onChange={(e) => param("q", e.target.value)}
            />
            {q && (
              <button
                aria-label={t("مسح البحث")}
                onClick={() => param("q", "")}
              >
                <X size={14} />
              </button>
            )}
          </label>
          <fieldset>
            <legend>{t("الصنف")}</legend>
            <label className="radio-label">
              <input
                type="radio"
                name="category"
                checked={!cat}
                onChange={() => param("category", "")}
              />
              <span className="filter-option-name">{t("جميع القطع")}</span>
            </label>
            {data.categories
              .filter((c) => c.visible)
              .map((c) => (
                <label className="radio-label" key={c.id}>
                  <input
                    type="radio"
                    name="category"
                    checked={cat === c.id}
                    onChange={() => param("category", c.id)}
                  />
                  <span className="filter-option-name">{c.name}</span>
                  <small>
                    {
                      data.products.filter(
                        (p) => p.visible && p.category === c.id,
                      ).length
                    }
                  </small>
                </label>
              ))}
          </fieldset>
          <fieldset>
            <legend>
              {t("نطاق السعر (")}
              {data.settings.currency})
            </legend>
            <div className="price-range">
              <input
                type="number"
                min="0"
                aria-label={t("السعر من")}
                placeholder={t("من")}
                value={params.get("min") ?? ""}
                onChange={(e) => param("min", e.target.value)}
              />
              <span>—</span>
              <input
                type="number"
                min="0"
                aria-label={t("السعر إلى")}
                placeholder={t("إلى")}
                value={params.get("max") ?? ""}
                onChange={(e) => param("max", e.target.value)}
              />
            </div>
          </fieldset>
          <fieldset>
            <legend>{t("اختياراتك")}</legend>
            {[
              ["stock", t("متوفر الآن")],
              ["new", t("وصل حديثًا")],
              ["sale", t("عليه عرض")],
              ["favorites", t("المفضلة فقط")],
            ].map(([key, label]) => (
              <label className="radio-label" key={key}>
                <input
                  type="checkbox"
                  checked={!!params.get(key)}
                  onChange={(e) => param(key, e.target.checked ? "1" : "")}
                />
                <span className="filter-option-name">{label}</span>
              </label>
            ))}
          </fieldset>
          <button className="text-link" onClick={clearParams}>
            {t("مسح جميع الفلاتر ")}
            <X size={14} />
          </button>
          <button
            className="button mobile-only"
            onClick={() => setFilters(false)}
          >
            {t("عرض ")}
            {results.length}
            {t(" قطعة")}
          </button>
        </aside>
        <div>
          <div className="catalog-toolbar">
            <span>
              {results.length}
              {t(" قطعة ")}
              <span className="muted">{t("تنتظر اكتشافك")}</span>
            </span>
            <button
              className="filter-mobile mobile-only"
              onClick={() => setFilters(true)}
            >
              <SlidersHorizontal size={16} />
              {t("تصفية")}
            </button>
            <label>
              {t("ترتيب حسب")}{" "}
              <select
                value={sort}
                onChange={(e) => param("sort", e.target.value)}
                aria-label={t("ترتيب المنتجات")}
              >
                <option value="new">{t("الأحدث أولًا")}</option>
                <option value="low">{t("السعر: من الأقل")}</option>
                <option value="high">{t("السعر: من الأعلى")}</option>
                <option value="name">{t("اسم المنتج")}</option>
              </select>
            </label>
          </div>
          {results.length ? (
            <div className="product-grid shop-grid">
              {results.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              {params.get("favorites") ? (
                <Heart size={38} strokeWidth={1} />
              ) : (
                <Search size={38} strokeWidth={1} />
              )}
              <h2>{t("لم نجد قطعة هنا بعد")}</h2>
              <p>{t("جرّبي كلمات أخرى أو عدّلي الفلاتر لاكتشاف المزيد.")}</p>
              <button className="button" onClick={clearParams}>
                {t("اكتشفي جميع القطع ")}
                <ArrowLeft size={18} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
