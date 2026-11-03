import { useLanguage } from "../lib/i18n";
import { getDeliveryOptions } from "../lib/delivery";
import { money } from "../lib/utils";
import Media from "../components/Media";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Gem, Instagram, MessageCircle } from "lucide-react";
import { useStore } from "../lib/store";
export default function Info({ kind = "info" }: { kind?: string }) {
  const { t, language } = useLanguage();
  const { data } = useStore(),
    { slug } = useParams();
  const pages: Record<string, [string, string, string]> = {
    delivery: [
      t("الشحن والتوصيل"),
      t(
        "أسعار التوصيل حسب المنطقة: {value0}. اختاري منطقتك عند الطلب ليظهر الإجمالي شاملًا التوصيل.",
        {
          value0: getDeliveryOptions(data.settings, language)
            .map(
              (option) =>
                `${option.label}: ${money(option.fee, data.settings.currency)}`,
            )
            .join(t("، ")),
        },
      ),
      t(
        "{value0}وقت التوصيل وتوفر المنتجات وسياسة الاستبدال تُؤكَّد مع المتجر عبر واتساب قبل اعتماد الطلب. الإجمالي في السلة تقديري حتى تأكيد تفاصيل التوصيل.",
        {
          value0: data.settings.deliveryAreas
            ? t("تفاصيل مناطق الخدمة: {value0}. ", {
                value0: data.settings.deliveryAreas,
              })
            : "",
        },
      ),
    ],
    care: [
      t("لتحافظي على جمال قطعك"),
      t(
        "احفظي الإكسسوارات في مكان جاف بعيدًا عن أشعة الشمس المباشرة، وافصلي القطع عن بعضها لحمايتها من الخدوش.",
      ),
      t(
        "تجنّبي ملامسة العطر والكريمات والماء، واستخدمي قماشًا ناعمًا وجافًا للتنظيف. تُضاف مواصفات المواد لكل قطعة عند تجهيز الكتالوج الفعلي.",
      ),
    ],
    privacy: [
      t("خصوصيتك من تفاصيل اهتمامنا"),
      t(
        "يمكنك التسوق دون إنشاء حساب. تُحفظ السلة والمفضلة في متصفحك، ولا تُرسل بيانات التوصيل إلا ضمن رسالة واتساب التي تختارين إرسالها.",
      ),
      t(
        "يستخدم المتجر Supabase لاستضافة المحتوى وإدارة حساب المالك عند تفعيله. لا ننشر صور محادثات أو آراء دون موافقة أصحابها. عند استخدام واتساب تنطبق سياسة خصوصية الخدمة أيضًا.",
      ),
    ],
  };
  if (kind === "contact")
    return (
      <div className="container info-page">
        <span className="eyebrow">A CONVERSATION AWAY</span>
        <h1>{t("نحن هنا لأجلك")}</h1>
        <p>{data.settings.contact}</p>
        <div className="contact-actions">
          {data.settings.whatsapp ? (
            <a
              className="button"
              target="_blank"
              rel="noreferrer"
              href={`https://wa.me/${data.settings.whatsapp.replace(/\D/g, "")}`}
            >
              <MessageCircle size={20} />
              {t("تواصلي عبر واتساب")}
            </a>
          ) : (
            <div className="form-notice">
              {t("ستتوفر معلومات التواصل عند إطلاق المتجر. هذا عرض تجريبي.")}
            </div>
          )}
          {data.settings.instagram && (
            <a
              className="button button-outline"
              href={data.settings.instagram}
              rel="noreferrer"
              target="_blank"
            >
              <Instagram size={19} />
              {t("إنستغرام")}
            </a>
          )}
        </div>
      </div>
    );
  if (kind === "about")
    return (
      <>
        <div className="container about-page">
          <div>
            <span className="eyebrow">THE STORY OF ELITE</span>
            <h1>
              {t("تفاصيل بحُب،")}
              <br />
              {t("وأناقة تُشبهك.")}
            </h1>
            <p>{data.settings.about}</p>
            <p>
              {t(
                "هنا، نترك مساحة لذوقك الخاص. من قطعة يومية هادئة إلى تفصيل يرافق أجمل مناسباتك، نريد لاختيارك أن يُشعرك بأنك أنتِ.",
              )}
            </p>
            <Link to="/shop" className="button">
              {t("اكتشفي عالم إيليت ")}
              <ArrowLeft size={18} />
            </Link>
          </div>
          <Media src="/images/hero.webp" alt={t("عالم إيليت للإكسسوارات")} />
        </div>
      </>
    );
  const page = pages[slug ?? ""];
  if (!page)
    return (
      <div className="empty-state container">
        <Gem size={40} />
        <h1>{t("لم نجد هذه الصفحة")}</h1>
        <Link to="/" className="button">
          {t("العودة للرئيسية ")}
          <ArrowLeft size={18} />
        </Link>
      </div>
    );
  return (
    <div className="container info-page">
      <span className="eyebrow">THE FINER DETAILS</span>
      <h1>{page[0]}</h1>
      <p>{page[1]}</p>
      <p>{page[2]}</p>
      <Link to="/contact" className="text-link">
        {t("لديكِ سؤال؟ تواصلي معنا ")}
        <ArrowLeft size={17} />
      </Link>
    </div>
  );
}
