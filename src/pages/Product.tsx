import { getDeliveryOptions } from "../lib/delivery";
import Media from "../components/Media";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Heart,
  Minus,
  Plus,
  ShoppingBag,
  Truck,
} from "lucide-react";
import { useStore } from "../lib/store";
import { money, price } from "../lib/utils";
import ProductCard from "../components/ProductCard";
export default function ProductPage() {
  const { id } = useParams(),
    { data, add, favorites, favorite } = useStore();
  const p = data.products.find((p) => p.id === id && p.visible);
  const [photo, setPhoto] = useState(0),
    [quantity, setQuantity] = useState(1),
    [color, setColor] = useState(""),
    [size, setSize] = useState("");
  useEffect(() => {
    setPhoto(0);
    setQuantity(1);
    setColor(p?.colors[0] ?? "");
    setSize(p?.sizes[0] ?? "");
  }, [id, p?.colors.join(","), p?.sizes.join(",")]);
  if (!p)
    return (
      <div className="container empty-state">
        <ShoppingBag size={38} />
        <h1>هذه القطعة غير متاحة حاليًا</h1>
        <Link to="/shop" className="button">
          استكشفي التشكيلة <ArrowLeft size={18} />
        </Link>
      </div>
    );
  return (
    <div className="container product-page">
      <div className="breadcrumbs">
        <Link to="/">الرئيسية</Link>
        <span>/</span>
        <Link to={`/shop?category=${p.category}`}>
          {data.categories.find((c) => c.id === p.category)?.name}
        </Link>
        <span>/</span>
        <span>{p.name}</span>
      </div>
      <div className="product-detail">
        <div className="product-gallery">
          <div className="detail-image">
            <Media src={p.images[photo] ?? p.images[0]} alt={p.name} />
          </div>
          {p.images.length > 1 && (
            <div className="image-thumbs">
              {p.images.map((image, i) => (
                <button
                  key={i}
                  className={photo === i ? "active" : ""}
                  aria-label={`صورة المنتج ${i + 1}`}
                  onClick={() => setPhoto(i)}
                >
                  <Media src={image} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="detail-copy">
          <span className="eyebrow">A DETAIL TO CALL YOUR OWN</span>
          <p className="muted small">
            {data.categories.find((c) => c.id === p.category)?.name}{" "}
            <span className="sku" dir="ltr">
              {p.sku}
            </span>
          </p>
          <h1>{p.name}</h1>
          <p>{p.shortDescription}</p>
          <div className="detail-price price">
            <strong>{money(price(p), data.settings.currency)}</strong>
            {price(p) < p.price && (
              <del>{money(p.price, data.settings.currency)}</del>
            )}
          </div>
          <span className={`stock-label ${!p.stock ? "out" : ""}`}>
            <span />
            {p.stock ? `متوفر — ${p.stock} قطع` : "نفدت الكمية حاليًا"}
          </span>
          {p.colors.length > 0 && (
            <fieldset className="variant-field">
              <legend>اللون: {color}</legend>
              <div>
                {p.colors.map((c) => (
                  <button
                    key={c}
                    className={color === c ? "variant selected" : "variant"}
                    onClick={() => setColor(c)}
                  >
                    {c}
                    {color === c && <Check size={13} />}
                  </button>
                ))}
              </div>
            </fieldset>
          )}
          {p.sizes.length > 0 && (
            <fieldset className="variant-field">
              <legend>المقاس</legend>
              <div>
                {p.sizes.map((s) => (
                  <button
                    key={s}
                    className={size === s ? "variant selected" : "variant"}
                    onClick={() => setSize(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </fieldset>
          )}
          <div className="detail-purchase">
            <div className="quantity-control">
              <button
                aria-label="تقليل الكمية"
                disabled={quantity <= 1}
                onClick={() => setQuantity((q) => q - 1)}
              >
                <Minus size={15} />
              </button>
              <span>{quantity}</span>
              <button
                aria-label="زيادة الكمية"
                disabled={quantity >= p.stock}
                onClick={() => setQuantity((q) => q + 1)}
              >
                <Plus size={15} />
              </button>
            </div>
            <button
              disabled={!p.stock}
              className="button"
              onClick={() => add(p, quantity, color, size)}
            >
              <ShoppingBag size={18} />
              أضيفي إلى الحقيبة
            </button>
            <button
              className={`icon-button detail-favorite ${favorites.includes(p.id) ? "selected" : ""}`}
              aria-label="تبديل المفضلة"
              onClick={() => favorite(p.id)}
            >
              <Heart
                fill={favorites.includes(p.id) ? "currentColor" : "none"}
                size={21}
              />
            </button>
          </div>
          <div className="delivery-note">
            <Truck size={20} />
            <span>
              توصيل إلى بابك حسب المنطقة
              <small>
                {getDeliveryOptions(data.settings)
                  .map(
                    (option) =>
                      `${option.label} ${money(option.fee, data.settings.currency)}`,
                  )
                  .join(" · ")}
              </small>
              <small>يتم تأكيد التوفر والتوصيل مع المتجر عبر واتساب.</small>
            </span>
          </div>
          <details open>
            <summary>
              عن هذه القطعة <ChevronDown size={17} />
            </summary>
            <p>{p.description}</p>
          </details>
          <details>
            <summary>
              العناية والتوصيل <ChevronDown size={17} />
            </summary>
            <p>
              احفظي القطعة بعيدًا عن العطور والماء، ونظّفيها بقطعة قماش ناعمة.
              تُحدّد مدة التوصيل عند تأكيد الطلب.
            </p>
            <Link className="text-link" to="/info/delivery">
              تفاصيل التوصيل <ArrowLeft size={15} />
            </Link>
          </details>
        </div>
      </div>
      <section className="section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">THE PERFECT PAIRING</span>
            <h2>قد تُحبّين أيضًا</h2>
          </div>
          <Link className="text-link" to="/shop">
            جميع القطع <ArrowLeft size={17} />
          </Link>
        </div>
        <div className="product-grid">
          {data.products
            .filter((x) => x.visible && x.id !== p.id)
            .sort(
              (a, b) =>
                Number(b.category === p.category) -
                Number(a.category === p.category),
            )
            .slice(0, 4)
            .map((x) => (
              <ProductCard key={x.id} product={x} />
            ))}
        </div>
      </section>
    </div>
  );
}
