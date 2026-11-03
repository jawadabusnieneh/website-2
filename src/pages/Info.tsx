import { getDeliveryOptions } from "../lib/delivery";
import { money } from "../lib/utils";
import Media from "../components/Media";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Gem, Instagram, MessageCircle } from "lucide-react";
import { useStore } from "../lib/store";
export default function Info({ kind = "info" }: { kind?: string }) {
  const { data } = useStore(),
    { slug } = useParams();
  const pages: Record<string, [string, string, string]> = {
    delivery: [
      "الشحن والتوصيل",
      `أسعار التوصيل حسب المنطقة: ${getDeliveryOptions(data.settings)
        .map(
          (option) =>
            `${option.label}: ${money(option.fee, data.settings.currency)}`,
        )
        .join("، ")}. اختاري منطقتك عند الطلب ليظهر الإجمالي شاملًا التوصيل.`,
      `${data.settings.deliveryAreas ? `تفاصيل مناطق الخدمة: ${data.settings.deliveryAreas}. ` : ""}وقت التوصيل وتوفر المنتجات وسياسة الاستبدال تُؤكَّد مع المتجر عبر واتساب قبل اعتماد الطلب. الإجمالي في السلة تقديري حتى تأكيد تفاصيل التوصيل.`,
    ],
    care: [
      "لتحافظي على جمال قطعك",
      "احفظي الإكسسوارات في مكان جاف بعيدًا عن أشعة الشمس المباشرة، وافصلي القطع عن بعضها لحمايتها من الخدوش.",
      "تجنّبي ملامسة العطر والكريمات والماء، واستخدمي قماشًا ناعمًا وجافًا للتنظيف. تُضاف مواصفات المواد لكل قطعة عند تجهيز الكتالوج الفعلي.",
    ],
    privacy: [
      "خصوصيتك من تفاصيل اهتمامنا",
      "يمكنك التسوق دون إنشاء حساب. تُحفظ السلة والمفضلة في متصفحك، ولا تُرسل بيانات التوصيل إلا ضمن رسالة واتساب التي تختارين إرسالها.",
      "يستخدم المتجر Supabase لاستضافة المحتوى وإدارة حساب المالك عند تفعيله. لا ننشر صور محادثات أو آراء دون موافقة أصحابها. عند استخدام واتساب تنطبق سياسة خصوصية الخدمة أيضًا.",
    ],
  };
  if (kind === "contact")
    return (
      <div className="container info-page">
        <span className="eyebrow">A CONVERSATION AWAY</span>
        <h1>نحن هنا لأجلك</h1>
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
              تواصلي عبر واتساب
            </a>
          ) : (
            <div className="form-notice">
              ستتوفر معلومات التواصل عند إطلاق المتجر. هذا عرض تجريبي.
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
              إنستغرام
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
              تفاصيل بحُب،
              <br />
              وأناقة تُشبهك.
            </h1>
            <p>{data.settings.about}</p>
            <p>
              هنا، نترك مساحة لذوقك الخاص. من قطعة يومية هادئة إلى تفصيل يرافق
              أجمل مناسباتك، نريد لاختيارك أن يُشعرك بأنك أنتِ.
            </p>
            <Link to="/shop" className="button">
              اكتشفي عالم إيليت <ArrowLeft size={18} />
            </Link>
          </div>
          <Media src="/images/hero.webp" alt="عالم إيليت للإكسسوارات" />
        </div>
      </>
    );
  const page = pages[slug ?? ""];
  if (!page)
    return (
      <div className="empty-state container">
        <Gem size={40} />
        <h1>لم نجد هذه الصفحة</h1>
        <Link to="/" className="button">
          العودة للرئيسية <ArrowLeft size={18} />
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
        لديكِ سؤال؟ تواصلي معنا <ArrowLeft size={17} />
      </Link>
    </div>
  );
}
