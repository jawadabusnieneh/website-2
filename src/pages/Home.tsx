import { useLanguage } from "../lib/i18n";
import Media from "../components/Media";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpLeft,
  ChevronLeft,
  ChevronRight,
  Gem,
  Image,
  Pause,
  Play,
  Quote,
  X,
} from "lucide-react";
import { useStore } from "../lib/store";
import { safeLink } from "../lib/utils";
import ProductCard from "../components/ProductCard";
function Heading({
  label,
  title,
  sub,
  link = "/shop",
  linkText = "اكتشفي التشكيلة",
}: {
  label: string;
  title: string;
  sub?: string;
  link?: string;
  linkText?: string;
}) {
  const { t } = useLanguage();
  return (
    <div className="section-heading">
      <div>
        <span className="eyebrow">{label}</span>
        <h2>{title}</h2>
        {sub && <p>{sub}</p>}
      </div>
      <Link className="text-link" to={link}>
        {t(linkText)}
        <ArrowUpLeft size={17} />
      </Link>
    </div>
  );
}
export default function Home() {
  const { t } = useLanguage();
  const { data } = useStore();
  const banners = data.banners
    .filter((b) => b.visible)
    .sort((a, b) => a.order - b.order);
  const [slide, setSlide] = useState(0),
    [paused, setPaused] = useState(false),
    [interacting, setInteracting] = useState(false),
    [visible, setVisible] = useState(!document.hidden),
    [review, setReview] = useState<number | null>(null);
  const startX = useRef(0);
  const current = banners[slide % banners.length];
  const reviews = data.reviews
    .filter((r) => r.visible)
    .sort((a, b) => a.order - b.order);
  function changeSlide(delta: number) {
    setSlide((s) => (s + delta + banners.length) % banners.length);
  }
  useEffect(() => {
    if (
      paused ||
      interacting ||
      !visible ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      data.settings.autoplay < 1 ||
      banners.length < 2
    )
      return;
    const t = setInterval(
      () => setSlide((s) => (s + 1) % banners.length),
      data.settings.autoplay * 1000,
    );
    return () => clearInterval(t);
  }, [paused, interacting, visible, data.settings.autoplay, banners.length]);
  useEffect(() => {
    if (review === null) return;
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") setReview(null);
      if (e.key === "ArrowLeft")
        setReview((r) => (r === null ? null : (r + 1) % reviews.length));
      if (e.key === "ArrowRight")
        setReview((r) =>
          r === null ? null : (r - 1 + reviews.length) % reviews.length,
        );
    };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [review, reviews.length]);
  useEffect(() => {
    const handler = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);
  const products = data.products
    .filter((p) => p.visible)
    .sort((a, b) => a.order - b.order);
  const sections: Record<string, React.ReactNode> = {
    categories: (
      <section className="section categories-section container">
        <Heading
          label="A LITTLE SOMETHING FOR EVERY YOU"
          title={t("لكل إطلالة، تفصيلها.")}
          sub={t("تصفّحي مختاراتنا، واعثري على ما يُشبهك.")}
          linkText={t("جميع الأصناف")}
        />
        <div className="category-grid">
          {data.categories
            .filter((c) => c.visible && c.featured)
            .sort((a, b) => a.order - b.order)
            .map((c, i) => (
              <Link
                to={`/shop?category=${c.id}`}
                className={`category-card category-${i}`}
                key={c.id}
              >
                <div className="category-photo">
                  <Media src={c.image} alt={c.name} loading="lazy" />
                  <span className="category-index">0{i + 1}</span>
                </div>
                <div className="category-text">
                  <span>
                    <h3>{c.name}</h3>
                    <small>{c.description}</small>
                  </span>
                  <span className="circle-arrow">
                    <ArrowUpLeft size={20} />
                  </span>
                </div>
              </Link>
            ))}
        </div>
      </section>
    ),
    new: (
      <section className="section new-section">
        <div className="container">
          <Heading
            label="JUST ARRIVED"
            title={t("جديد يُلفت، وتفاصيل تُحبّ.")}
            sub={t("أحدث إضافاتنا، اختيرت لتكون المفضّلة لديكِ.")}
            link="/shop?new=1"
            linkText={t("كل ما هو جديد")}
          />
          <div className="product-grid">
            {products
              .filter((p) => p.isNew)
              .slice(0, 4)
              .map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
          </div>
        </div>
      </section>
    ),
    featured: (
      <section className="section container featured-section">
        <Heading
          label="THE ELITE EDIT"
          title={t("اختيارات إيليت")}
          sub={t("قطع نحبّها، ونظن أنكِ ستُحبّينها أيضًا.")}
        />
        <div className="product-grid">
          {products
            .filter((p) => p.featured)
            .slice(0, 4)
            .map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
        </div>
      </section>
    ),
    offers: (
      <section className="section offers-section">
        <div className="container">
          <Heading
            label="BEAUTIFUL FINDS, LOVELY PRICES"
            title={t("قطع مميّزة، بفرصة أجمل.")}
            link="/shop?sale=1"
            linkText={t("اكتشفي العروض")}
          />
          <div className="product-grid">
            {products
              .filter((p) => p.salePrice !== null && p.salePrice < p.price)
              .slice(0, 4)
              .map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
          </div>
        </div>
      </section>
    ),
    promo: (
      <section className="promo container">
        <div className="promo-picture">
          <Media
            src={data.settings.promoImage}
            alt={t("تفاصيل من عالم إيليت")}
            loading="lazy"
          />
        </div>
        <div className="promo-copy">
          <span className="eyebrow">A THOUGHTFUL LITTLE LUXURY</span>
          <Gem size={31} strokeWidth={1} />
          <h2>{data.settings.promoTitle}</h2>
          <p>{data.settings.promoText}</p>
          <Link to="/shop" className="button button-light">
            {t("اختاري هديتك ")}
            <ArrowLeft size={18} />
          </Link>
          <span className="promo-signature">With love, Elite</span>
        </div>
      </section>
    ),
    reviews: (
      <section className="section container reviews-section">
        <div className="reviews-intro">
          <Quote size={30} strokeWidth={1} />
          <span className="eyebrow">YOUR WORDS, OUR JOY</span>
          <h2>{t("آراء زبائننا")}</h2>
          <p>{t("لكل قطعة حكاية، ولكلماتكنّ مكان خاص.")}</p>
        </div>
        {reviews.length ? (
          <div className="review-grid">
            {reviews.map((r, i) => (
              <button
                key={r.id}
                className="review-card"
                onClick={() => setReview(i)}
              >
                <Media
                  src={r.image}
                  alt={r.caption || t("رأي زبونة منشور بإذنها")}
                  loading="lazy"
                />
                {r.caption && <span>{r.caption}</span>}
                <span className="small">
                  {t("اضغطي للتكبير ")}
                  <ArrowUpLeft size={14} />
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="reviews-empty">
            <Image size={26} strokeWidth={1} />
            <p>{t("مساحة لكلماتكنّ الجميلة")}</p>
            <span>{t("نشارك هنا صور الآراء بعد موافقة صاحباتها.")}</span>
          </div>
        )}
      </section>
    ),
    about: (
      <section className="about-strip">
        <div className="container">
          <span className="about-monogram">E.</span>
          <div>
            <span className="eyebrow">MORE THAN AN ACCESSORY</span>
            <h2>
              {t("الأناقة ليست ما ترتدينه،")}
              <br />
              {t("بل كيف تشعرين به.")}
            </h2>
          </div>
          <div>
            <p>{data.settings.about}</p>
            <Link to="/about" className="text-link">
              {t("تعرّفي إلى حكايتنا ")}
              <ArrowUpLeft size={17} />
            </Link>
          </div>
        </div>
      </section>
    ),
  };
  return (
    <>
      {current && (
        <section
          className={`hero align-${current.placement}`}
          aria-roledescription={t("عارض صور")}
          onMouseEnter={() => setInteracting(true)}
          onMouseLeave={() => setInteracting(false)}
          onFocusCapture={() => setInteracting(true)}
          onBlurCapture={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node))
              setInteracting(false);
          }}
          onTouchStart={(e) => {
            startX.current = e.touches[0].clientX;
            setPaused(true);
          }}
          onTouchEnd={(e) => {
            if (Math.abs(e.changedTouches[0].clientX - startX.current) > 45)
              changeSlide(
                e.changedTouches[0].clientX > startX.current ? 1 : -1,
              );
          }}
        >
          <picture key={current.id}>
            {current.mobileImage && (
              <source media="(max-width: 640px)" srcSet={current.mobileImage} />
            )}
            <Media
              className="hero-image"
              src={current.image}
              alt={t("مجموعة إيليت للإكسسوارات")}
              fetchPriority="high"
            />
          </picture>
          <div className="hero-soften" />
          {current.overlay && (
            <div className="container hero-inner">
              <div className="hero-copy" key={current.id}>
                <span className="hero-eyebrow">
                  <span />
                  {current.eyebrow}
                </span>
                <h1>{current.title}</h1>
                <p>{current.description}</p>
                {current.button && (
                  <Link className="button" to={safeLink(current.link)}>
                    {current.button}
                    <ArrowLeft size={18} />
                  </Link>
                )}
                <div className="hero-note">
                  <span className="fine-line" />
                  {t("مصمّمة لتُكمّل جمالك، لا لتُغيّره.")}
                </div>
              </div>
            </div>
          )}
          <div className="container hero-bottom">
            <div className="hero-slide-label">
              <span>{t("مختارات الموسم")}</span>
              <small>THE EVERYDAY COLLECTION</small>
            </div>
            <div className="slider-controls">
              <button
                className="slider-arrow"
                aria-label={t("الصورة السابقة")}
                onClick={() => changeSlide(-1)}
              >
                <ArrowRight size={18} />
              </button>
              <div className="slide-dots">
                {banners.map((b, i) => (
                  <button
                    key={b.id}
                    aria-label={t("الصورة {value0}", { value0: i + 1 })}
                    aria-current={slide % banners.length === i}
                    onClick={() => setSlide(i)}
                  />
                ))}
              </div>
              <button
                className="slider-arrow"
                aria-label={t("الصورة التالية")}
                onClick={() => changeSlide(1)}
              >
                <ArrowLeft size={18} />
              </button>
              <button
                className="autoplay-button"
                aria-label={
                  paused ? t("تشغيل العرض التلقائي") : t("إيقاف العرض التلقائي")
                }
                onClick={() => setPaused(!paused)}
              >
                {paused ? <Play size={13} /> : <Pause size={13} />}
              </button>
            </div>
            <span className="hero-number" dir="ltr">
              0{(slide % banners.length) + 1} <i>/ 0{banners.length}</i>
            </span>
          </div>
        </section>
      )}
      <div className="brand-ribbon">
        <span>LESS IS MORE. DETAILS ARE EVERYTHING.</span>
        <span className="ribbon-diamond" />
        <span>{t("جمالٌ في كل تفصيل")}</span>
        <span className="ribbon-diamond" />
        <span>CURATED WITH LOVE, WORN WITH CONFIDENCE.</span>
      </div>
      {data.settings.sections.map((key) => (
        <div key={key}>{sections[key]}</div>
      ))}
      {review !== null && reviews[review] && (
        <div
          className="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={t("صورة رأي زبونة")}
          onClick={() => setReview(null)}
          onTouchStart={(e) => {
            startX.current = e.touches[0].clientX;
          }}
          onTouchEnd={(e) => {
            if (Math.abs(e.changedTouches[0].clientX - startX.current) > 40)
              setReview(
                (review +
                  (e.changedTouches[0].clientX > startX.current ? 1 : -1) +
                  reviews.length) %
                  reviews.length,
              );
          }}
        >
          <button
            className="lightbox-close"
            aria-label={t("إغلاق الصورة")}
            autoFocus
            onClick={() => setReview(null)}
          >
            <X />
          </button>
          <button
            aria-label={t("السابق")}
            onClick={(e) => {
              e.stopPropagation();
              setReview((review - 1 + reviews.length) % reviews.length);
            }}
          >
            <ChevronRight />
          </button>
          <figure onClick={(e) => e.stopPropagation()}>
            <Media
              src={reviews[review].image}
              alt={reviews[review].caption || t("رأي زبونة")}
            />
            <figcaption>{reviews[review].caption}</figcaption>
          </figure>
          <button
            aria-label={t("التالي")}
            onClick={(e) => {
              e.stopPropagation();
              setReview((review + 1) % reviews.length);
            }}
          >
            <ChevronLeft />
          </button>
        </div>
      )}
    </>
  );
}
