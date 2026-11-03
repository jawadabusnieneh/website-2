import {
  DELIVERY_REGIONS,
  getDeliveryRates,
  validateDeliveryRates,
} from "../lib/delivery";
import Media from "../components/Media";
import HebrewFields, { type HebrewField } from "../components/HebrewFields";
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  Copy,
  Eye,
  EyeOff,
  Gem,
  Image,
  LayoutDashboard,
  Layers3,
  LogOut,
  Menu,
  Package,
  Pencil,
  Plus,
  Search,
  Settings as SettingsIcon,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { useAdminStore } from "../lib/store";
import { supabase, supabaseProjectHost } from "../lib/supabase";
import {
  OwnerSignInError,
  ownerLoginError,
  signInOwner,
} from "../lib/owner-auth";
import { demoData } from "../lib/demo";
import { money, normalize, uuid } from "../lib/utils";
import type { Banner, Category, Collection, Product, Review } from "../types";
import ImageUpload from "../components/ImageUpload";
const nav = [
  ["overview", "لوحة التحكم", LayoutDashboard],
  ["products", "إدارة المنتجات", Package],
  ["categories", "إدارة الأصناف", Layers3],
  ["banners", "إدارة صور الواجهة", Image],
  ["reviews", "آراء الزبائن", Gem],
  ["home", "إدارة الصفحة الرئيسية", SlidersHorizontal],
  ["settings", "إعدادات المتجر", SettingsIcon],
] as const;
const sectionNames: Record<string, string> = {
  categories: "الأصناف المختارة",
  new: "وصل حديثًا",
  featured: "اختيارات إيليت",
  offers: "العروض",
  promo: "الصورة الترويجية",
  reviews: "آراء زبائننا",
  about: "حكاية المتجر",
};
const hebrewFields: Record<Collection, HebrewField[]> = {
  products: [
    { key: "name", label: "اسم المنتج" },
    { key: "shortDescription", label: "الوصف القصير", multiline: true },
    { key: "description", label: "الوصف الكامل", multiline: true },
  ],
  categories: [
    { key: "name", label: "اسم الصنف" },
    { key: "description", label: "وصف الصنف", multiline: true },
  ],
  banners: [
    { key: "title", label: "العنوان", multiline: true },
    { key: "description", label: "الوصف", multiline: true },
    { key: "eyebrow", label: "العبارة الصغيرة" },
    { key: "button", label: "نص الزر" },
  ],
  reviews: [{ key: "caption", label: "التعليق" }],
};
function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="toggle-label">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="switch" />
      {label}
    </label>
  );
}
export default function Admin() {
  const store = useAdminStore(),
    { data, demo, owner, demoAdmin, setDemoAdmin, save, remove, toast } = store;
  const [tab, setTab] = useState("overview"),
    [sidebar, setSidebar] = useState(false),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [showPassword, setShowPassword] = useState(false),
    [loginError, setLoginError] = useState(""),
    [busy, setBusy] = useState(false),
    [query, setQuery] = useState(""),
    [cat, setCat] = useState(""),
    [stock, setStock] = useState(false);
  const [editing, setEditing] = useState<{
      table: Collection;
      record: any;
    } | null>(null),
    [deleting, setDeleting] = useState<{
      table: Collection;
      id: string;
      name: string;
    } | null>(null),
    [preview, setPreview] = useState(false);
  const [settings, setSettings] = useState(data.settings),
    [settingsEditing, setSettingsEditing] = useState(false);
  const allowed = demo ? demoAdmin : owner;
  async function login(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setLoginError("");
    try {
      await signInOwner(supabase, email, password);
    } catch (error) {
      setLoginError(
        error instanceof OwnerSignInError
          ? error.message
          : ownerLoginError(error),
      );
    } finally {
      setBusy(false);
    }
  }

  async function action(
    fn: () => Promise<void>,
    message = "حُفظت التغييرات بنجاح",
  ) {
    setBusy(true);
    try {
      await fn();
      toast(message);
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function edit(table: Collection, record?: any) {
    const defaults = {
      products: {
        id: uuid(),
        name: "",
        sku: "",
        category: data.categories[0]?.id ?? "",
        description: "",
        shortDescription: "",
        images: [],
        price: 0,
        salePrice: null,
        stock: 0,
        colors: [],
        sizes: [],
        visible: false,
        featured: false,
        isNew: true,
        order: data.products.length,
        createdAt: new Date().toISOString(),
      } satisfies Product,
      categories: {
        id: uuid(),
        name: "",
        description: "",
        image: "",
        visible: false,
        featured: true,
        order: data.categories.length,
      } satisfies Category,
      banners: {
        id: uuid(),
        title: "",
        description: "",
        eyebrow: "",
        image: "",
        mobileImage: "",
        button: "",
        link: "/shop",
        visible: false,
        order: data.banners.length,
        placement: "right",
        overlay: true,
      } satisfies Banner,
      reviews: {
        id: uuid(),
        image: "",
        caption: "",
        visible: false,
        order: data.reviews.length,
      } satisfies Review,
    };
    setPreview(false);
    setEditing({
      table,
      record: record ? structuredClone(record) : defaults[table],
    });
  }
  const field = (key: string, value: any) =>
    setEditing((prev) =>
      prev ? { ...prev, record: { ...prev.record, [key]: value } } : null,
    );
  async function persist(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const { table } = editing;
    const record = { ...editing.record };
    if (table === "products") {
      if (record.translations?.he) {
        const he = { ...record.translations.he };
        for (const kind of ["colors", "sizes"] as const) {
          if (Array.isArray(he[kind]))
            he[kind] = record[kind]
              .map((value: string, i: number) =>
                value ? (he[kind][i] ?? "") : null,
              )
              .filter((value: string | null) => value !== null);
        }
        record.translations = { ...record.translations, he };
      }
      record.colors = record.colors.filter(Boolean);
      record.sizes = record.sizes.filter(Boolean);
    }
    if (
      (table === "products" && !record.images.length) ||
      (table !== "products" && !record.image)
    ) {
      toast("أضيفي صورة واحدة على الأقل قبل الحفظ.");
      return;
    }
    if (
      table === "products" &&
      record.salePrice !== null &&
      (record.salePrice < 0 || record.salePrice >= record.price)
    ) {
      toast("سعر العرض يجب أن يكون أقل من السعر الأصلي وغير سالب.");
      return;
    }
    if (
      table === "banners" &&
      record.button &&
      !/^(https:\/\/|\/(?!\/))/.test(record.link)
    ) {
      toast("أدخلي رابطًا داخليًا يبدأ بـ / أو رابط HTTPS.");
      return;
    }
    setBusy(true);
    try {
      await save(table, record);
      setEditing(null);
      toast("حُفظ المحتوى وأُحدّث المتجر.");
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function input(label: string, key: string, type = "text", required = false) {
    return (
      <label key={key}>
        {label}
        <input
          type={type}
          required={required}
          min={type === "number" ? 0 : undefined}
          step={
            key === "stock" || key === "order"
              ? "1"
              : type === "number"
                ? "0.01"
                : undefined
          }
          value={editing?.record[key] ?? ""}
          onChange={(e) =>
            field(
              key,
              type === "number"
                ? e.target.value === "" && key === "salePrice"
                  ? null
                  : Number(e.target.value)
                : e.target.value,
            )
          }
        />
      </label>
    );
  }
  function textarea(label: string, key: string) {
    return (
      <label className="full-width">
        {label}
        <textarea
          rows={3}
          value={editing?.record[key] ?? ""}
          onChange={(e) => field(key, e.target.value)}
        />
      </label>
    );
  }
  function startSettings() {
    if (!settingsEditing)
      setSettings({
        ...structuredClone(data.settings),
        deliveryRates: getDeliveryRates(data.settings),
      });
    setSettingsEditing(true);
  }
  if (!allowed)
    return (
      <div className="admin-login-page">
        <Link to="/" className="login-back">
          <ArrowLeft size={17} />
          العودة إلى المتجر
        </Link>
        <div className="login-card">
          <span className="admin-wordmark">
            ELITE<span>OWNER'S STUDIO</span>
          </span>
          <span className="login-shield">
            <ShieldCheck size={27} strokeWidth={1} />
          </span>
          <h1>مساحتك لإدارة التفاصيل</h1>
          <p>دخول خاص بمالك متجر إيليت أكسسوريز.</p>
          {demo ? (
            <>
              <div className="demo-note">
                الوضع التجريبي: لا توجد بيانات اتصال بـ Supabase. التعديلات
                تُحفظ في هذا المتصفح فقط؛ هذه المعاينة ليست تسجيل دخول آمنًا ولا
                تُستخدم لإدارة متجر فعلي.
              </div>
              <button
                className="button full-width"
                onClick={() => setDemoAdmin(true)}
              >
                فتح لوحة تجريبية <ArrowLeft size={18} />
              </button>
              <p className="small muted">
                للتشغيل الفعلي، اتبعي دليل Supabase في README.
              </p>
            </>
          ) : (
            <form onSubmit={login}>
              <label>
                البريد الإلكتروني
                <input
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  dir="ltr"
                />
              </label>
              <div className="password-field">
                <label htmlFor="owner-password">كلمة المرور</label>
                <span className="password-input">
                  <input
                    id="owner-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    dir="ltr"
                  />
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={
                      showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"
                    }
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((visible) => !visible)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </span>
              </div>
              {loginError && (
                <p className="form-error" role="alert">
                  {loginError}
                </p>
              )}
              <button className="button full-width" disabled={busy}>
                {busy ? "جارٍ التحقق..." : "تسجيل الدخول"}
              </button>
              <details className="login-connection">
                <summary>تفاصيل الاتصال</summary>
                <p>مشروع Supabase المرتبط بهذا الموقع:</p>
                <code dir="ltr">{supabaseProjectHost}</code>
                <p>
                  يجب أن يكون حساب Authentication وصلاحية المالك داخل هذا
                  المشروع نفسه.
                </p>
              </details>
            </form>
          )}
        </div>
        <span className="login-caption">EVERY DETAIL, IN YOUR HANDS.</span>
      </div>
    );
  const records = (
    ["products", "categories", "banners", "reviews"].includes(tab)
      ? data[tab as Collection]
      : []
  ) as any[];
  const filtered = records
    .filter((r) =>
      normalize(
        (r.name ?? r.title ?? r.caption ?? "") + " " + (r.sku ?? ""),
      ).includes(normalize(query)),
    )
    .filter(
      (r) =>
        tab !== "products" ||
        ((!cat || r.category === cat) && (!stock || r.stock === 0)),
    );
  return (
    <div className="admin-shell">
      <aside className={`admin-sidebar ${sidebar ? "open" : ""}`}>
        <div className="admin-sidebar-brand">
          <span>
            ELITE<small>THE OWNER'S STUDIO</small>
          </span>
          <button
            className="mobile-only icon-button"
            aria-label="إغلاق القائمة"
            onClick={() => setSidebar(false)}
          >
            <X />
          </button>
        </div>
        <p className="sidebar-caption">مساحة إدارة المتجر</p>
        <nav>
          {nav.map(([key, label, Icon]) => (
            <button
              key={key}
              className={tab === key ? "active" : ""}
              onClick={() => {
                setTab(key);
                setQuery("");
                setCat("");
                setSidebar(false);
                setSettingsEditing(false);
              }}
            >
              <Icon size={19} />
              {label}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <Link to="/" target="_blank">
            <Eye size={18} />
            معاينة المتجر
          </Link>
          <button
            onClick={() => {
              if (demo) setDemoAdmin(false);
              else void supabase?.auth.signOut();
            }}
          >
            <LogOut size={18} />
            تسجيل الخروج
          </button>
        </div>
      </aside>
      <div className="admin-content">
        <header className="admin-topbar">
          <div>
            <button
              className="mobile-only icon-button"
              aria-label="قائمة الإدارة"
              onClick={() => setSidebar(true)}
            >
              <Menu />
            </button>
            <span>مرحبًا بكِ في مساحتك</span>
          </div>
          <span className="owner-avatar">E</span>
        </header>
        <div className="admin-inner">
          {demo && (
            <div className="admin-demo-banner">
              <ShieldCheck size={18} />
              <span>
                معاينة تجريبية — التغييرات محلية في هذا المتصفح فقط. المنتجات
                والصور والأسعار تجريبية.
              </span>
            </div>
          )}
          <div className="admin-page-heading">
            <div>
              <span className="eyebrow">EVERY DETAIL MATTERS</span>
              <h1>{nav.find((x) => x[0] === tab)?.[1]}</h1>
              <p>
                {tab === "overview"
                  ? "نظرة هادئة على كل ما يخص متجرك."
                  : "كل تفصيل في مكانه. عدّلي المحتوى ثم احفظي التغييرات."}
              </p>
            </div>
            {["products", "categories", "banners", "reviews"].includes(tab) && (
              <button
                className="button"
                onClick={() => edit(tab as Collection)}
              >
                <Plus size={18} />
                {tab === "products"
                  ? "إضافة منتج"
                  : tab === "categories"
                    ? "إضافة صنف"
                    : tab === "banners"
                      ? "إضافة صورة واجهة"
                      : "إضافة رأي"}
              </button>
            )}
          </div>
          {tab === "overview" ? (
            <>
              <div className="stats-grid">
                {[
                  [Package, "المنتجات", data.products.length],
                  [Layers3, "الأصناف", data.categories.length],
                  [
                    Image,
                    "صور الواجهة النشطة",
                    data.banners.filter((x) => x.visible).length,
                  ],
                  [
                    Gem,
                    "قطع بمخزون منخفض",
                    data.products.filter((x) => x.stock <= 5).length,
                  ],
                ].map(([Icon, label, count], i) => {
                  const C = Icon as typeof Package;
                  return (
                    <div className="stat-card" key={i}>
                      <C size={23} strokeWidth={1} />
                      <span>{String(label)}</span>
                      <strong>{String(count)}</strong>
                    </div>
                  );
                })}
              </div>
              <div className="dashboard-welcome">
                <div>
                  <span className="eyebrow">CURATE YOUR WORLD</span>
                  <h2>اختياراتك هي حكاية إيليت.</h2>
                  <p>
                    أضيفي قطعك الجديدة، حدّثي صور الواجهة، واجعلي كل زيارة
                    للمتجر تجربة جميلة.
                  </p>
                  <button className="button" onClick={() => edit("products")}>
                    أضيفي قطعة جديدة <Plus size={18} />
                  </button>
                </div>
                <Media src="/images/hero.webp" alt="" />
              </div>
              <div className="admin-panel">
                <h2>تفاصيل تحتاج انتباهك</h2>
                {!data.settings.whatsapp && (
                  <p className="form-error">
                    رقم واتساب غير مُعدّ. أضيفيه من إعدادات المتجر لتفعيل
                    الطلبات.
                  </p>
                )}
                <h3>المخزون المنخفض</h3>
                {data.products
                  .filter((p) => p.stock <= 5)
                  .map((p) => (
                    <div className="stock-row" key={p.id}>
                      <Media src={p.images[0]} alt="" />
                      <span>{p.name}</span>
                      <span>{p.stock} قطع</span>
                      <button
                        className="text-link"
                        onClick={() => edit("products", p)}
                      >
                        تعديل <Pencil size={14} />
                      </button>
                    </div>
                  ))}
                {!data.products.filter((p) => p.stock <= 5).length && (
                  <p className="muted">لا توجد تنبيهات مخزون حاليًا.</p>
                )}
              </div>
              {!demo && !data.products.length && (
                <div className="admin-panel">
                  <h3>ابدئي من متجر فارغ أو استوردي بيانات التجربة</h3>
                  <p>
                    الاستيراد اختياري. المنتجات والأسعار ستُدرج كمحتوى تجريبي
                    ويجب تعديلها قبل البيع.
                  </p>
                  <button
                    className="button button-outline"
                    disabled={busy}
                    onClick={() =>
                      void action(async () => {
                        for (const t of [
                          "categories",
                          "products",
                          "banners",
                        ] as Collection[])
                          for (const r of demoData[t]) await save(t, r);
                        await save("settings", demoData.settings);
                      })
                    }
                  >
                    استيراد محتوى تجريبي
                  </button>
                </div>
              )}
            </>
          ) : ["products", "categories", "banners", "reviews"].includes(tab) ? (
            <>
              <div className="admin-list-toolbar">
                <label className="filter-search">
                  <Search size={18} />
                  <input
                    placeholder="ابحثي في المحتوى..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </label>
                {tab === "products" && (
                  <>
                    <select
                      aria-label="تصفية أصناف الإدارة"
                      value={cat}
                      onChange={(e) => setCat(e.target.value)}
                    >
                      <option value="">كل الأصناف</option>
                      {data.categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <label className="radio-label">
                      <input
                        type="checkbox"
                        checked={stock}
                        onChange={(e) => setStock(e.target.checked)}
                      />
                      غير متوفر فقط
                    </label>
                  </>
                )}
                <span className="small muted">{filtered.length} عنصر</span>
              </div>
              {tab === "reviews" && (
                <div className="privacy-reminder">
                  <ShieldCheck size={20} />
                  <p>
                    انشري الآراء بعد الحصول على الإذن وإخفاء الأسماء وأرقام
                    الهاتف والتفاصيل الخاصة. يمكنك معاينة الصور وقصّها
                    واستبدالها قبل النشر. لا نستخرج أي معلومات من الصور.
                  </p>
                </div>
              )}
              {filtered.length ? (
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>المحتوى</th>
                        {tab === "products" && (
                          <>
                            <th>السعر</th>
                            <th>المخزون</th>
                          </>
                        )}
                        <th>الترتيب</th>
                        <th>الحالة</th>
                        <th>الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered
                        .sort((a, b) => a.order - b.order)
                        .map((r) => (
                          <tr key={r.id}>
                            <td>
                              <div className="table-content">
                                <Media src={r.images?.[0] ?? r.image} alt="" />
                                <span>
                                  <strong>
                                    {r.name ||
                                      r.title ||
                                      r.caption ||
                                      "صورة رأي"}
                                  </strong>
                                  <small>
                                    {r.sku ?? r.description?.slice(0, 45) ?? ""}
                                  </small>
                                  {tab === "products" && r.featured && (
                                    <small className="featured-tag">
                                      قطعة مميّزة
                                    </small>
                                  )}
                                </span>
                              </div>
                            </td>
                            {tab === "products" && (
                              <>
                                <td>
                                  {money(
                                    r.salePrice ?? r.price,
                                    data.settings.currency,
                                  )}
                                </td>
                                <td>
                                  <span
                                    className={r.stock <= 5 ? "low-stock" : ""}
                                  >
                                    {r.stock} قطع
                                  </span>
                                </td>
                              </>
                            )}
                            <td>{r.order}</td>
                            <td>
                              <button
                                className={`status-pill ${r.visible ? "published" : ""}`}
                                disabled={busy}
                                onClick={() =>
                                  void action(() =>
                                    save(tab as Collection, {
                                      ...r,
                                      visible: !r.visible,
                                    }),
                                  )
                                }
                              >
                                {r.visible ? (
                                  <Eye size={13} />
                                ) : (
                                  <EyeOff size={13} />
                                )}{" "}
                                {r.visible ? "منشور" : "مخفي"}
                              </button>
                            </td>
                            <td>
                              <div className="table-actions">
                                <button
                                  aria-label={`تعديل ${r.name ?? r.title ?? "الصورة"}`}
                                  title="تعديل ومعاينة"
                                  onClick={() => edit(tab as Collection, r)}
                                >
                                  <Pencil size={16} />
                                </button>
                                {tab === "products" && (
                                  <button
                                    aria-label={`نسخ ${r.name}`}
                                    title="نسخ المنتج"
                                    onClick={() =>
                                      void action(() =>
                                        save("products", {
                                          ...r,
                                          id: uuid(),
                                          name: r.name + " — نسخة",
                                          sku: r.sku + "-COPY",
                                          visible: false,
                                        }),
                                      )
                                    }
                                  >
                                    <Copy size={16} />
                                  </button>
                                )}
                                <button
                                  aria-label={`حذف ${r.name ?? "العنصر"}`}
                                  title="حذف"
                                  onClick={() =>
                                    setDeleting({
                                      table: tab as Collection,
                                      id: r.id,
                                      name: r.name ?? r.title ?? "هذه الصورة",
                                    })
                                  }
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="admin-panel empty-state">
                  <Image size={35} strokeWidth={1} />
                  <h2>مساحة لشيء جميل</h2>
                  <p>لا يوجد محتوى مطابق. أضيفي أول عنصر من الزر أعلاه.</p>
                </div>
              )}
            </>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void action(async () => {
                  if (
                    settings.whatsapp &&
                    !/^\+?\d{8,15}$/.test(settings.whatsapp.replace(/\s/g, ""))
                  )
                    throw new Error(
                      "أدخلي رقم واتساب بصيغة دولية صحيحة، دون مسافات أو رمز محلي.",
                    );
                  const deliveryRates =
                    settings.deliveryRates ?? getDeliveryRates(settings);
                  validateDeliveryRates(deliveryRates);
                  await save("settings", { ...settings, deliveryRates });
                  setSettingsEditing(false);
                });
              }}
              onFocus={startSettings}
              className="admin-settings-form"
            >
              <div className="admin-panel">
                <h2>
                  {tab === "home" ? "محتوى الصفحة الرئيسية" : "تفاصيل المتجر"}
                </h2>
                {tab === "home" ? (
                  <>
                    <label>
                      شريط الإعلان
                      <input
                        value={
                          settingsEditing
                            ? settings.announcement
                            : data.settings.announcement
                        }
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            announcement: e.target.value,
                          })
                        }
                      />
                    </label>
                    <label>
                      مدة تبديل صور الواجهة (ثانية، 0 للإيقاف)
                      <input
                        type="number"
                        min="0"
                        max="120"
                        value={
                          settingsEditing
                            ? settings.autoplay
                            : data.settings.autoplay
                        }
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            autoplay: +e.target.value,
                          })
                        }
                      />
                    </label>
                    <h3>الأقسام وترتيبها</h3>
                    {[
                      ...(settingsEditing
                        ? settings.sections
                        : data.settings.sections),
                      ...Object.keys(sectionNames).filter(
                        (k) =>
                          !(
                            settingsEditing
                              ? settings.sections
                              : data.settings.sections
                          ).includes(k),
                      ),
                    ].map((key) => {
                      const active = (
                          settingsEditing
                            ? settings.sections
                            : data.settings.sections
                        ).includes(key),
                        index = settings.sections.indexOf(key);
                      return (
                        <div key={key} className="section-order-row">
                          <Toggle
                            label={sectionNames[key]}
                            value={active}
                            onChange={(checked) =>
                              setSettings({
                                ...settings,
                                sections: checked
                                  ? [...settings.sections, key]
                                  : settings.sections.filter((s) => s !== key),
                              })
                            }
                          />
                          <div>
                            <button
                              type="button"
                              aria-label={`تقديم ${sectionNames[key]}`}
                              disabled={!active || index <= 0}
                              onClick={() => {
                                const next = [...settings.sections];
                                [next[index - 1], next[index]] = [
                                  next[index],
                                  next[index - 1],
                                ];
                                setSettings({ ...settings, sections: next });
                              }}
                            >
                              <ArrowUp size={16} />
                            </button>
                            <button
                              type="button"
                              aria-label={`تأخير ${sectionNames[key]}`}
                              disabled={
                                !active ||
                                index === settings.sections.length - 1
                              }
                              onClick={() => {
                                const next = [...settings.sections];
                                [next[index + 1], next[index]] = [
                                  next[index],
                                  next[index + 1],
                                ];
                                setSettings({ ...settings, sections: next });
                              }}
                            >
                              <ArrowDown size={16} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    <p className="field-help">
                      اختاري المنتجات والأصناف المميّزة من نموذج تحرير كل منتج
                      وصنف.
                    </p>
                    <h3>المساحة الترويجية</h3>
                    <label>
                      العنوان
                      <textarea
                        value={
                          settingsEditing
                            ? settings.promoTitle
                            : data.settings.promoTitle
                        }
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            promoTitle: e.target.value,
                          })
                        }
                      />
                    </label>
                    <label>
                      النص
                      <textarea
                        value={
                          settingsEditing
                            ? settings.promoText
                            : data.settings.promoText
                        }
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            promoText: e.target.value,
                          })
                        }
                      />
                    </label>
                    <ImageUpload
                      images={[
                        (settingsEditing ? settings : data.settings).promoImage,
                      ].filter(Boolean)}
                      onChange={(imgs) =>
                        setSettings({ ...settings, promoImage: imgs[0] ?? "" })
                      }
                    />
                  </>
                ) : (
                  <>
                    <div className="form-grid">
                      {[
                        ["name", "اسم المتجر", "text"],
                        ["whatsapp", "رقم واتساب الدولي (مثل 970...)", "tel"],
                        ["instagram", "رابط إنستغرام", "url"],
                        ["facebook", "رابط فيسبوك", "url"],
                        ["currency", "رمز العملة", "text"],
                        ["deliveryAreas", "مناطق التوصيل", "text"],
                        ["contact", "معلومات التواصل", "text"],
                      ].map(([key, label, type]) => (
                        <label key={key}>
                          {label}
                          <input
                            type={type}
                            min={type === "number" ? 0 : undefined}
                            required={key === "name" || key === "currency"}
                            value={
                              (settingsEditing ? settings : data.settings)[
                                key as keyof typeof settings
                              ] as string
                            }
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                [key]:
                                  type === "number"
                                    ? +e.target.value
                                    : e.target.value,
                              })
                            }
                          />
                        </label>
                      ))}
                    </div>
                    <h3>أسعار التوصيل حسب المنطقة</h3>
                    <div className="form-grid delivery-rates-grid">
                      {DELIVERY_REGIONS.map(({ id, label }) => {
                        const current = settingsEditing
                          ? settings
                          : data.settings;
                        const fee =
                          current.deliveryRates?.[id] ??
                          getDeliveryRates(current)[id];
                        return (
                          <label key={id}>
                            توصيل {label} ({current.currency})
                            <input
                              type="number"
                              required
                              min="0"
                              step="0.01"
                              value={Number.isFinite(fee) ? fee : ""}
                              onChange={(event) =>
                                setSettings((previous) => ({
                                  ...previous,
                                  deliveryRates: {
                                    ...getDeliveryRates(previous),
                                    ...previous.deliveryRates,
                                    [id]:
                                      event.target.value === ""
                                        ? NaN
                                        : Number(event.target.value),
                                  },
                                }))
                              }
                            />
                          </label>
                        );
                      })}
                    </div>
                    <label>
                      حكاية المتجر
                      <textarea
                        rows={4}
                        value={
                          settingsEditing ? settings.about : data.settings.about
                        }
                        onChange={(e) =>
                          setSettings({ ...settings, about: e.target.value })
                        }
                      />
                    </label>
                    <h3>شعار المتجر</h3>
                    <ImageUpload
                      images={[
                        (settingsEditing ? settings : data.settings).logo,
                      ].filter(Boolean)}
                      onChange={(imgs) =>
                        setSettings({ ...settings, logo: imgs[0] ?? "" })
                      }
                    />
                    <p className="field-help">
                      لا تُضاف أي مفاتيح سرية في إعدادات المتجر. مفاتيح الخدمة
                      تبقى خارج الواجهة.
                    </p>
                  </>
                )}
                <HebrewFields
                  record={settingsEditing ? settings : data.settings}
                  fields={
                    tab === "home"
                      ? [
                          { key: "announcement", label: "شريط الإعلان" },
                          {
                            key: "promoTitle",
                            label: "العنوان الترويجي",
                            multiline: true,
                          },
                          {
                            key: "promoText",
                            label: "النص الترويجي",
                            multiline: true,
                          },
                        ]
                      : [
                          { key: "name", label: "اسم المتجر" },
                          { key: "deliveryAreas", label: "مناطق التوصيل" },
                          {
                            key: "contact",
                            label: "معلومات التواصل",
                            multiline: true,
                          },
                          {
                            key: "about",
                            label: "حكاية المتجر",
                            multiline: true,
                          },
                        ]
                  }
                  onChange={(he) =>
                    setSettings((previous) => ({
                      ...previous,
                      translations: { ...previous.translations, he },
                    }))
                  }
                />
                <button className="button" disabled={busy}>
                  <Check size={17} />
                  {busy ? "جارٍ الحفظ..." : "حفظ التغييرات"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
      {editing && (
        <div className="modal-backdrop">
          <section
            className="editor-modal"
            role="dialog"
            aria-modal="true"
            aria-label="تحرير المحتوى"
          >
            <div className="modal-heading">
              <div>
                <span className="eyebrow">CURATE THE DETAILS</span>
                <h2>
                  {editing.table === "products"
                    ? "تفاصيل المنتج"
                    : editing.table === "categories"
                      ? "تفاصيل الصنف"
                      : editing.table === "banners"
                        ? "تفاصيل صورة الواجهة"
                        : "صورة رأي زبونة"}
                </h2>
              </div>
              <button
                className="icon-button"
                aria-label="إغلاق المحرر"
                onClick={() => setEditing(null)}
              >
                <X />
              </button>
            </div>
            <form onSubmit={persist}>
              <div className="editor-scroll">
                {editing.table === "reviews" && (
                  <div className="privacy-reminder">
                    <ShieldCheck size={18} />
                    <p>
                      احصلي على إذن صاحبة الرأي وأخفي البيانات الشخصية قبل نشر
                      الصورة.
                    </p>
                  </div>
                )}
                <div className="form-grid">
                  {editing.table === "products" ? (
                    <>
                      {input("اسم المنتج", "name", "text", true)}
                      {input("رمز المنتج / SKU", "sku", "text", true)}
                      <label>
                        الصنف
                        <select
                          required
                          value={editing.record.category}
                          onChange={(e) => field("category", e.target.value)}
                        >
                          <option value="">اختاري الصنف</option>
                          {data.categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      {input("السعر الأصلي", "price", "number", true)}
                      {input("سعر العرض (اختياري)", "salePrice", "number")}
                      {input("الكمية المتوفرة", "stock", "number", true)}
                      {textarea("وصف قصير", "shortDescription")}
                      {textarea("الوصف الكامل", "description")}
                      <label>
                        الألوان (افصلي بفاصلة)
                        <input
                          value={editing.record.colors.join(",")}
                          onChange={(e) =>
                            field(
                              "colors",
                              e.target.value.split(/[,،]/).map((x) => x.trim()),
                            )
                          }
                        />
                      </label>
                      <label>
                        المقاسات / الخيارات (افصلي بفاصلة)
                        <input
                          value={editing.record.sizes.join(",")}
                          onChange={(e) =>
                            field(
                              "sizes",
                              e.target.value.split(/[,،]/).map((x) => x.trim()),
                            )
                          }
                        />
                      </label>
                      <div className="full-width">
                        <h3>صور المنتج</h3>
                        <ImageUpload
                          multiple
                          images={editing.record.images}
                          onChange={(imgs) => field("images", imgs)}
                        />
                      </div>
                      <Toggle
                        label="قطعة مميّزة"
                        value={editing.record.featured}
                        onChange={(v) => field("featured", v)}
                      />
                      <Toggle
                        label="ضمن وصل حديثًا"
                        value={editing.record.isNew}
                        onChange={(v) => field("isNew", v)}
                      />
                    </>
                  ) : editing.table === "categories" ? (
                    <>
                      {input("اسم الصنف", "name", "text", true)}
                      {textarea("وصف الصنف", "description")}
                      <div className="full-width">
                        <ImageUpload
                          images={[editing.record.image].filter(Boolean)}
                          onChange={(imgs) => field("image", imgs[0] ?? "")}
                        />
                      </div>
                      <Toggle
                        label="صنف مميّز على الرئيسية"
                        value={editing.record.featured}
                        onChange={(v) => field("featured", v)}
                      />
                    </>
                  ) : editing.table === "banners" ? (
                    <>
                      {input("العبارة الصغيرة", "eyebrow")}
                      {input("العنوان", "title")}
                      {textarea("الوصف", "description")}
                      {input("نص الزر (اختياري)", "button")}
                      {input("رابط الزر", "link")}
                      <label>
                        موضع النص
                        <select
                          value={editing.record.placement}
                          onChange={(e) => field("placement", e.target.value)}
                        >
                          <option value="right">يمين</option>
                          <option value="center">وسط</option>
                          <option value="left">يسار</option>
                        </select>
                      </label>
                      <Toggle
                        label="إظهار النص فوق الصورة"
                        value={editing.record.overlay}
                        onChange={(v) => field("overlay", v)}
                      />
                      <div className="full-width">
                        <h3>صورة سطح المكتب</h3>
                        <ImageUpload
                          images={[editing.record.image].filter(Boolean)}
                          onChange={(imgs) => field("image", imgs[0] ?? "")}
                        />
                        <h3>صورة الهاتف (اختياري)</h3>
                        <ImageUpload
                          images={[editing.record.mobileImage].filter(Boolean)}
                          onChange={(imgs) =>
                            field("mobileImage", imgs[0] ?? "")
                          }
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      {input("تعليق قصير (اختياري)", "caption")}
                      <div className="full-width">
                        <ImageUpload
                          multiple
                          images={[editing.record.image].filter(Boolean)}
                          onChange={(imgs) => {
                            field("image", imgs[0] ?? "");
                            if (imgs.length > 1)
                              void action(async () => {
                                for (const image of imgs.slice(1))
                                  await save("reviews", {
                                    id: uuid(),
                                    image,
                                    caption: "",
                                    visible: false,
                                    order: data.reviews.length + 1,
                                  });
                              }, "أُضيفت الصور الإضافية كمحتوى مخفي للمراجعة.");
                          }}
                        />
                      </div>
                    </>
                  )}
                  <HebrewFields
                    record={editing.record}
                    fields={hebrewFields[editing.table]}
                    options={
                      editing.table === "products"
                        ? {
                            colors: editing.record.colors,
                            sizes: editing.record.sizes,
                          }
                        : undefined
                    }
                    onChange={(he) =>
                      field("translations", {
                        ...editing.record.translations,
                        he,
                      })
                    }
                  />
                  {input("ترتيب العرض", "order", "number", true)}
                  <Toggle
                    label="منشور للزوار"
                    value={editing.record.visible}
                    onChange={(v) => field("visible", v)}
                  />
                </div>
                {preview && (
                  <div className="content-preview">
                    <span className="eyebrow">معاينة قبل النشر</span>
                    <Media
                      src={editing.record.images?.[0] ?? editing.record.image}
                      alt="معاينة المحتوى"
                    />
                    <h2>
                      {editing.record.name ??
                        editing.record.title ??
                        editing.record.caption}
                    </h2>
                    <p>
                      {editing.record.shortDescription ??
                        editing.record.description}
                    </p>
                    {editing.table === "products" && (
                      <strong>
                        {money(
                          editing.record.salePrice ?? editing.record.price,
                          data.settings.currency,
                        )}
                      </strong>
                    )}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="submit" className="button" disabled={busy}>
                  <Check size={17} />
                  {busy ? "جارٍ الحفظ..." : "حفظ المحتوى"}
                </button>
                <button
                  type="button"
                  className="button button-outline"
                  onClick={() => setPreview(!preview)}
                >
                  <Eye size={17} />
                  معاينة
                </button>
                <button
                  type="button"
                  className="text-link"
                  onClick={() => setEditing(null)}
                >
                  إلغاء
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
      {deleting && (
        <div className="modal-backdrop">
          <div
            className="confirm-modal"
            role="alertdialog"
            aria-modal="true"
            aria-label="تأكيد حذف المحتوى"
          >
            <span className="delete-icon">
              <Trash2 />
            </span>
            <h2>هل تريدين حذف هذا المحتوى؟</h2>
            <p>
              سيُحذف «{deleting.name}» من المتجر. لا يمكن التراجع عن الحذف.
              {deleting.table === "categories" &&
                " ستبقى منتجات الصنف، ويجب تعيين صنف بديل لها."}
            </p>
            <div>
              <button
                className="button"
                disabled={busy}
                onClick={() =>
                  void action(async () => {
                    await remove(deleting.table, deleting.id);
                    setDeleting(null);
                  }, "حُذف المحتوى.")
                }
              >
                تأكيد الحذف
              </button>
              <button
                data-dialog-close
                className="button button-outline"
                onClick={() => setDeleting(null)}
              >
                الاحتفاظ به
              </button>
            </div>
          </div>
        </div>
      )}
      {store.notice && (
        <div className="toast" role="status">
          <Check size={17} />
          {store.notice}
        </div>
      )}
    </div>
  );
}
