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
    ? deliveryQuote(data.settings, customer.deliveryRegion)
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
      setError("يُرجى كتابة الاسم الكامل والمدينة وعنوان توصيل واضح.");
      return;
    }
    if (!/^[+\d\s()-]{8,20}$/.test(customer.phone)) {
      setError("يُرجى إدخال رقم هاتف صحيح.");
      return;
    }
    if (
      customer.maps &&
      !/^https:\/\/(maps\.app\.goo\.gl|maps\.google\.[a-z.]+|www\.google\.[a-z.]+|goo\.gl)\//.test(
        customer.maps,
      )
    ) {
      setError("يُرجى إدخال رابط موقع صالح من خرائط Google.");
      return;
    }
    if (!isDeliveryRegion(customer.deliveryRegion)) {
      setError("اختاري منطقة التوصيل قبل إرسال الطلب.");
      return;
    }
    if (orderImages.linksLoading) {
      setError("جارٍ تجهيز روابط صور الطلب. انتظري قليلًا ثم حاولي مجددًا.");
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
        <h1>حقيبتك تنتظر تفاصيلك</h1>
        <p>اختاري قطعًا تُشبهك، وسنحتفظ بها هنا.</p>
        <Link to="/shop" className="button">
          اكتشفي التشكيلة <ArrowLeft size={18} />
        </Link>
      </div>
    );
  return (
    <div className="container cart-page">
      <div className="breadcrumbs">
        <Link to="/">الرئيسية</Link>
        <span>/</span>
        <Link to="/cart">الحقيبة</Link>
        {checkout && (
          <>
            <span>/</span>
            <span>إتمام الطلب</span>
          </>
        )}
      </div>
      <div className="page-title">
        <span className="eyebrow">YOUR LITTLE SELECTION</span>
        <h1>{checkout ? "خطوة أقرب إلى قطعتك" : "حقيبة التسوق"}</h1>
        <p>
          {checkout
            ? "دون حساب أو تسجيل. نُكمل تفاصيل طلبك معك عبر واتساب."
            : `${count} قطع اخترتِها بحُب`}
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
              <h2>تفاصيل التوصيل</h2>
              <div className="form-grid">
                {[
                  ["name", "الاسم الكامل", "text"],
                  ["phone", "رقم الهاتف", "tel"],
                  ["city", "المدينة / البلدة", "text"],
                  ["address", "عنوان التوصيل الكامل", "text"],
                  ["landmark", "أقرب معلم (اختياري)", "text"],
                  ["maps", "رابط خرائط Google (اختياري)", "url"],
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
                  ملاحظات إضافية (اختياري)
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
                  مناطق التوصيل:{" "}
                  {getDeliveryOptions(data.settings)
                    .map((option) => option.label)
                    .join("، ")}
                  . اختاري المنطقة من ملخّص الطلب لحساب رسومها.
                </p>
              </div>
              <Link to="/cart" className="text-link">
                <ArrowRight size={16} />
                العودة إلى الحقيبة
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
                    <strong>طلبك جاهز للإرسال</strong>
                    <p>
                      اضغطي «إرسال» داخل واتساب ليصل إلى المتجر. فتح واتساب وحده
                      لا يؤكد استلام الطلب.
                    </p>
                    <p>
                      تتضمن الرسالة روابط صور المنتجات المتاحة. لإرفاق ملفات
                      الصور، استخدمي قسم صور الطلب أدناه.
                    </p>
                    <a
                      href={orderUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-link"
                    >
                      فتح الطلب في واتساب مجددًا <ArrowLeft size={16} />
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
                            {[item.color, item.size]
                              .filter(Boolean)
                              .join(" / ")}
                          </span>
                          <strong>
                            {money(price(p), data.settings.currency)}
                          </strong>
                          {(!p.visible || p.stock < item.quantity) && (
                            <span className="form-error small">
                              الكمية غير متوفرة، عدّلي السلة.
                            </span>
                          )}
                          <div className="quantity-control">
                            <button
                              aria-label={`تقليل ${p.name}`}
                              disabled={item.quantity <= 1}
                              onClick={() => updateCart(key, item.quantity - 1)}
                            >
                              <Minus size={14} />
                            </button>
                            <span>{item.quantity}</span>
                            <button
                              aria-label={`زيادة ${p.name}`}
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
                            aria-label={`إزالة ${p.name}`}
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
                        <p>قطعة لم تعد متاحة</p>
                        <button
                          className="text-link"
                          onClick={() => removeCart(key)}
                        >
                          حذف القطعة
                        </button>
                      </>
                    )}
                  </article>
                );
              })}
              <Link to="/shop" className="text-link">
                <ArrowRight size={16} />
                متابعة التسوق
              </Link>
            </div>
          )}
        </div>
        <aside className="order-summary">
          <h2>ملخّص اختياراتك</h2>
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
                        {[item.color, item.size].filter(Boolean).join(" / ")}
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
            <span>مجموع المنتجات ({count})</span>
            <span>{money(subtotal, data.settings.currency)}</span>
          </div>
          <div className="summary-row">
            <span>{delivery ? `التوصيل — ${delivery.label}` : "التوصيل"}</span>
            <span>
              {delivery
                ? money(delivery.fee, data.settings.currency)
                : "يُحدَّد حسب المنطقة"}
            </span>
          </div>
          <div className="summary-row total">
            <strong>
              {delivery ? "الإجمالي التقديري" : "الإجمالي قبل التوصيل"}
            </strong>
            <strong>
              {money(subtotal + (delivery?.fee ?? 0), data.settings.currency)}
            </strong>
          </div>
          {invalid && (
            <p className="form-error">
              تغيّر توفر بعض القطع أو خياراتها. يُرجى حذفها وإضافتها مجددًا قبل
              المتابعة.
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
                ? "جارٍ تجهيز صور الطلب..."
                : "إرسال الطلب عبر واتساب"}
            </button>
          ) : (
            <button
              className="button full-width"
              disabled={invalid}
              onClick={() => navigate("/checkout")}
            >
              متابعة لإتمام الطلب <ArrowLeft size={18} />
            </button>
          )}
          <p className="summary-footnote">
            لا يتم الدفع هنا. يُؤكَّد الطلب والتوصيل مباشرة مع المتجر عبر
            واتساب.
          </p>
          {demo && !data.settings.whatsapp && (
            <p className="demo-note">
              هذا عرض تجريبي. يجب ضبط رقم المتجر من إعدادات الإدارة لتفعيل إرسال
              الطلب.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
