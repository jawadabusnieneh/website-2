import { useLanguage } from "../lib/i18n";
import { optionLabel } from "../lib/i18n-core";
import OrderPhotos from "../components/OrderPhotos";
import { useOrderImages } from "../lib/use-order-images";
import Media from "../components/Media";
import { useEffect, useState } from "react";
import DeliverySelect from "../components/DeliverySelect";
import {
  deliveryQuote,
  getDeliveryOptions,
  isDeliveryRegion,
} from "../lib/delivery";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  MapPin,
  MessageCircle,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import { useStore } from "../lib/store";
import {
  cartProblem,
  cartKey,
  money,
  price,
  readLocal,
  whatsappOrder,
} from "../lib/utils";
import type { Customer } from "../types";
export default function Cart({ checkout = false }: { checkout?: boolean }) {
  const { t, language } = useLanguage();
  const { cart, data, updateCart, removeCart, demo } = useStore(),
    navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer>({
      deliveryRegion: (() => {
        const saved = readLocal<unknown>("elite-delivery-region", "");
        return isDeliveryRegion(saved) ? saved : "";
      })(),
      name: "",
      phone: "",
      city: "",
      address: "",
      landmark: "",
      maps: "",
      notes: "",
    }),
    [error, setError] = useState(""),
    [orderUrl, setOrderUrl] = useState("");
  const subtotal = cart.reduce((n, x) => {
      const p = data.products.find((p) => p.id === x.productId);
      return n + (p ? price(p) * x.quantity : 0);
    }, 0),
    count = cart.reduce((n, x) => n + x.quantity, 0);
  const invalid = cartProblem(cart, data.products);
  const orderImages = useOrderImages(
    cart,
    data.products,
    checkout && cart.length > 0,
  );
  const delivery = isDeliveryRegion(customer.deliveryRegion)
    ? deliveryQuote(data.settings, customer.deliveryRegion, language)
    : null;
  useEffect(() => {
    try {
      localStorage.setItem(
        "elite-delivery-region",
        JSON.stringify(customer.deliveryRegion),
      );
    } catch {
      /* selection remains available in memory */
    }
  }, [customer.deliveryRegion]);
  const orderProductNames = cart
    .map(
      (item) =>
        data.products.find((product) => product.id === item.productId)?.name ??
        "",
    )
    .join("\n");
  useEffect(() => {
    setOrderUrl("");
  }, [
    customer,
    cart,
    subtotal,
    invalid,
    delivery?.fee,
    orderProductNames,
    orderImages.version,
    checkout,
    language,
    data.settings.name,
    data.settings.whatsapp,
    data.settings.currency,
  ]);
  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setOrderUrl("");
    if (
      customer.name.trim().length < 3 ||
      customer.address.trim().length < 6 ||
      customer.city.trim().length < 2
    ) {
      setError(t("يُرجى كتابة الاسم الكامل والمدينة وعنوان توصيل واضح."));
      return;
    }
    if (!/^[+\d\s()-]{8,20}$/.test(customer.phone)) {
      setError(t("يُرجى إدخال رقم هاتف صحيح."));
      return;
    }
    if (
      customer.maps &&
      !/^https:\/\/(maps\.app\.goo\.gl|maps\.google\.[a-z.]+|www\.google\.[a-z.]+|goo\.gl)\//.test(
        customer.maps,
      )
    ) {
      setError(t("يُرجى إدخال رابط موقع صالح من خرائط Google."));
      return;
    }
    if (!isDeliveryRegion(customer.deliveryRegion)) {
      setError(t("اختاري منطقة التوصيل قبل إرسال الطلب."));
      return;
    }
    if (orderImages.linksLoading) {
      setError(t("جارٍ تجهيز روابط صور الطلب. انتظري قليلًا ثم حاولي مجددًا."));
      return;
    }
    try {
      const url = whatsappOrder(
        cart,
        data.products,
        customer,
        data.settings,
        `EL-${Date.now().toString(36).toUpperCase()}`,
        {
          origin: window.location.origin,
          images: Object.fromEntries(
            orderImages.images
              .filter((image) => image.imageUrl)
              .map((image) => [image.productId, image.imageUrl!]),
          ),
        },
        language,
      );
      setOrderUrl(url);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  if (!cart.length)
    return (
      <div className="empty-state container">
        <ShoppingBag size={52} strokeWidth={1} />
        <span className="eyebrow">ROOM FOR SOMETHING LOVELY</span>
        <h1>{t("حقيبتك تنتظر تفاصيلك")}</h1>
        <p>{t("اختاري قطعًا تُشبهك، وسنحتفظ بها هنا.")}</p>
        <Link to="/shop" className="button">
          {t("اكتشفي التشكيلة ")}
          <ArrowLeft size={18} />
        </Link>
      </div>
    );
  return (
    <div className="container cart-page">
      <div className="breadcrumbs">
        <Link to="/">{t("الرئيسية")}</Link>
        <span>/</span>
        <Link to="/cart">{t("الحقيبة")}</Link>
        {checkout && (
          <>
            <span>/</span>
            <span>{t("إتمام الطلب")}</span>
          </>
        )}
      </div>
      <div className="page-title">
        <span className="eyebrow">YOUR LITTLE SELECTION</span>
        <h1>{checkout ? t("خطوة أقرب إلى قطعتك") : t("حقيبة التسوق")}</h1>
        <p>
          {checkout
            ? t("دون حساب أو تسجيل. نُكمل تفاصيل طلبك معك عبر واتساب.")
            : t("{value0} قطع اخترتِها بحُب", { value0: count })}
        </p>
      </div>
      <div className="cart-layout">
        <div>
          {checkout ? (
            <form
              id="checkout-form"
              className="checkout-form"
              onSubmit={submit}
            >
              <h2>{t("تفاصيل التوصيل")}</h2>
              <div className="form-grid">
                {[
                  ["name", t("الاسم الكامل"), "text"],
                  ["phone", t("رقم الهاتف"), "tel"],
                  ["city", t("المدينة / البلدة"), "text"],
                  ["address", t("عنوان التوصيل الكامل"), "text"],
                  ["landmark", t("أقرب معلم (اختياري)"), "text"],
                  ["maps", t("رابط خرائط Google (اختياري)"), "url"],
                ].map(([key, label, type]) => (
                  <label key={key}>
                    {label}
                    <input
                      autoComplete={
                        {
                          name: "name",
                          phone: "tel",
                          city: "address-level2",
                          address: "street-address",
                        }[key]
                      }
                      type={type}
                      required={["name", "phone", "city", "address"].includes(
                        key,
                      )}
                      value={customer[key as keyof Customer]}
                      onChange={(e) => {
                        setOrderUrl("");
                        setCustomer({ ...customer, [key]: e.target.value });
                      }}
                    />
                  </label>
                ))}
                <label className="full-width">
                  {t("ملاحظات إضافية (اختياري)")}
                  <textarea
                    rows={3}
                    value={customer.notes}
                    onChange={(e) =>
                      setCustomer({ ...customer, notes: e.target.value })
                    }
                  />
                </label>
              </div>
              <div className="form-notice">
                <MapPin size={19} />
                <p>
                  {t("مناطق التوصيل:")}{" "}
                  {getDeliveryOptions(data.settings, language)
                    .map((option) => option.label)
                    .join(t("، "))}
                  {t(". اختاري المنطقة من ملخّص الطلب لحساب رسومها.")}
                </p>
              </div>
              <Link to="/cart" className="text-link">
                <ArrowRight size={16} />
                {t("العودة إلى الحقيبة")}
              </Link>
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              {orderUrl && (
                <div className="success-panel" role="status">
                  <Check size={20} />
                  <div>
                    <strong>{t("طلبك جاهز للإرسال")}</strong>
                    <p>
                      {t(
                        "اضغطي \u00ABإرسال\u00BB داخل واتساب ليصل إلى المتجر. فتح واتساب وحده لا يؤكد استلام الطلب.",
                      )}
                    </p>
                    <p>
                      {t(
                        "تتضمن الرسالة روابط صور المنتجات المتاحة. لإرفاق ملفات الصور، استخدمي قسم صور الطلب أدناه.",
                      )}
                    </p>
                    <a
                      href={orderUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-link"
                    >
                      {t("فتح الطلب في واتساب مجددًا ")}
                      <ArrowLeft size={16} />
                    </a>
                  </div>
                </div>
              )}
              {orderUrl && (
                <OrderPhotos
                  images={orderImages.images}
                  files={orderImages.files}
                  loading={orderImages.filesLoading}
                  orderUrl={orderUrl}
                />
              )}
            </form>
          ) : (
            <div className="cart-items">
              {cart.map((item) => {
                const p = data.products.find((p) => p.id === item.productId);
                const key = cartKey(item);
                return (
                  <article className="cart-item" key={key}>
                    {p ? (
                      <>
                        <Link to={`/product/${p.id}`}>
                          <Media src={p.images[0]} alt={p.name} />
                        </Link>
                        <div className="cart-item-info">
                          <span className="small muted">
                            {
                              data.categories.find((c) => c.id === p.category)
                                ?.name
                            }
                          </span>
                          <Link to={`/product/${p.id}`}>
                            <h3>{p.name}</h3>
                          </Link>
                          <span className="small muted">
                            {[
                              optionLabel(p, "colors", item.color, language),
                              optionLabel(p, "sizes", item.size, language),
                            ]
                              .filter(Boolean)
                              .join(" / ")}
                          </span>
                          <strong>
                            {money(price(p), data.settings.currency)}
                          </strong>
                          {(!p.visible || p.stock < item.quantity) && (
                            <span className="form-error small">
                              {t("الكمية غير متوفرة، عدّلي السلة.")}
                            </span>
                          )}
                          <div className="quantity-control">
                            <button
                              aria-label={t("تقليل {value0}", {
                                value0: p.name,
                              })}
                              disabled={item.quantity <= 1}
                              onClick={() => updateCart(key, item.quantity - 1)}
                            >
                              <Minus size={14} />
                            </button>
                            <span>{item.quantity}</span>
                            <button
                              aria-label={t("زيادة {value0}", {
                                value0: p.name,
                              })}
                              disabled={item.quantity >= p.stock}
                              onClick={() => updateCart(key, item.quantity + 1)}
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        </div>
                        <div className="cart-item-end">
                          <button
                            className="icon-button"
                            aria-label={t("إزالة {value0}", { value0: p.name })}
                            onClick={() => removeCart(key)}
                          >
                            <Trash2 size={17} />
                          </button>
                          <strong>
                            {money(
                              price(p) * item.quantity,
                              data.settings.currency,
                            )}
                          </strong>
                        </div>
                      </>
                    ) : (
                      <>
                        <p>{t("قطعة لم تعد متاحة")}</p>
                        <button
                          className="text-link"
                          onClick={() => removeCart(key)}
                        >
                          {t("حذف القطعة")}
                        </button>
                      </>
                    )}
                  </article>
                );
              })}
              <Link to="/shop" className="text-link">
                <ArrowRight size={16} />
                {t("متابعة التسوق")}
              </Link>
            </div>
          )}
        </div>
        <aside className="order-summary">
          <h2>{t("ملخّص اختياراتك")}</h2>
          {checkout &&
            cart.map((item) => {
              const p = data.products.find((p) => p.id === item.productId);
              return (
                p && (
                  <div className="summary-product" key={cartKey(item)}>
                    <Media src={p.images[0]} alt="" />
                    <span>
                      {p.name}
                      <small>
                        {item.quantity} ×{" "}
                        {money(price(p), data.settings.currency)} ·{" "}
                        {[
                          optionLabel(p, "colors", item.color, language),
                          optionLabel(p, "sizes", item.size, language),
                        ]
                          .filter(Boolean)
                          .join(" / ")}
                      </small>
                    </span>
                  </div>
                )
              );
            })}
          <DeliverySelect
            value={customer.deliveryRegion}
            settings={data.settings}
            form={checkout ? "checkout-form" : undefined}
            onChange={(deliveryRegion) => {
              setError("");
              setOrderUrl("");
              setCustomer((previous) => ({ ...previous, deliveryRegion }));
            }}
          />
          <div className="summary-row">
            <span>
              {t("مجموع المنتجات (")}
              {count})
            </span>
            <span>{money(subtotal, data.settings.currency)}</span>
          </div>
          <div className="summary-row">
            <span>
              {delivery
                ? t("التوصيل \u2014 {value0}", { value0: delivery.label })
                : t("التوصيل")}
            </span>
            <span>
              {delivery
                ? money(delivery.fee, data.settings.currency)
                : t("يُحدَّد حسب المنطقة")}
            </span>
          </div>
          <div className="summary-row total">
            <strong>
              {delivery ? t("الإجمالي التقديري") : t("الإجمالي قبل التوصيل")}
            </strong>
            <strong>
              {money(subtotal + (delivery?.fee ?? 0), data.settings.currency)}
            </strong>
          </div>
          {invalid && (
            <p className="form-error">
              {t(
                "تغيّر توفر بعض القطع أو خياراتها. يُرجى حذفها وإضافتها مجددًا قبل المتابعة.",
              )}
            </p>
          )}
          {checkout ? (
            <button
              type="submit"
              form="checkout-form"
              className="button full-width"
              disabled={invalid || orderImages.linksLoading}
            >
              <MessageCircle size={19} />
              {orderImages.linksLoading
                ? t("جارٍ تجهيز صور الطلب...")
                : t("إرسال الطلب عبر واتساب")}
            </button>
          ) : (
            <button
              className="button full-width"
              disabled={invalid}
              onClick={() => navigate("/checkout")}
            >
              {t("متابعة لإتمام الطلب ")}
              <ArrowLeft size={18} />
            </button>
          )}
          <p className="summary-footnote">
            {t(
              "لا يتم الدفع هنا. يُؤكَّد الطلب والتوصيل مباشرة مع المتجر عبر واتساب.",
            )}
          </p>
          {demo && !data.settings.whatsapp && (
            <p className="demo-note">
              {t(
                "هذا عرض تجريبي. يجب ضبط رقم المتجر من إعدادات الإدارة لتفعيل إرسال الطلب.",
              )}
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
