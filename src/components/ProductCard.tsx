import { useLanguage } from "../lib/i18n";
import Media from "./Media";
import { ArrowUpLeft, Heart, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { useStore } from "../lib/store";
import { money, price } from "../lib/utils";
import type { Product } from "../types";
export default function ProductCard({ product: p }: { product: Product }) {
  const { t } = useLanguage();
  const { data, add, favorite, favorites } = useStore();
  const sale = price(p) < p.price;
  return (
    <article className="product-card">
      <div className="product-visual">
        <Link
          to={`/product/${p.id}`}
          className="product-image-link"
          aria-label={t("عرض {value0}", { value0: p.name })}
        >
          <Media src={p.images[0]} alt={p.name} loading="lazy" />
        </Link>
        <div className="product-badges">
          {!p.stock ? (
            <span className="badge sold">{t("نفدت الكمية")}</span>
          ) : sale ? (
            <span className="badge sale">
              {t("خصم ")}
              {Math.round((1 - price(p) / p.price) * 100)}
              {t("٪")}
            </span>
          ) : p.isNew ? (
            <span className="badge">{t("وصل حديثًا")}</span>
          ) : null}
        </div>
        <button
          className={`favorite-button ${favorites.includes(p.id) ? "selected" : ""}`}
          aria-label={t(
            favorites.includes(p.id)
              ? "إزالة {name} من المفضلة"
              : "إضافة {name} إلى المفضلة",
            { name: p.name },
          )}
          onClick={() => favorite(p.id)}
        >
          <Heart
            size={18}
            fill={favorites.includes(p.id) ? "currentColor" : "none"}
          />
        </button>
        <button
          className="quick-add"
          disabled={!p.stock}
          onClick={() => add(p)}
          aria-label={t("إضافة {value0} إلى الحقيبة", { value0: p.name })}
        >
          <Plus size={17} />
          <span>{t("أضيفي إلى الحقيبة")}</span>
        </button>
      </div>
      <div className="product-copy">
        <span className="product-category">
          {data.categories.find((c) => c.id === p.category)?.name}
        </span>
        <Link to={`/product/${p.id}`} className="product-title">
          {p.name}
          <ArrowUpLeft size={17} />
        </Link>
        <div className="price">
          <span>{money(price(p), data.settings.currency)}</span>
          {sale && <del>{money(p.price, data.settings.currency)}</del>}
          <span className="color-dots">
            <i />
            <i />
          </span>
        </div>
      </div>
    </article>
  );
}
