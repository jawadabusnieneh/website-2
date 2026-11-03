import { useState } from "react";
import { Download, Images, Share2 } from "lucide-react";
import type { OrderImage, OrderPhotoFile } from "../lib/order-images";
import { orderPhotoFilename } from "../lib/order-images";
import Media from "./Media";
export default function OrderPhotos({
  images,
  files,
  loading,
  orderUrl,
}: {
  images: OrderImage[];
  files: OrderPhotoFile[];
  loading: boolean;
  orderUrl: string;
}) {
  const [sharing, setSharing] = useState(false),
    [error, setError] = useState("");
  const text = new URL(orderUrl).searchParams.get("text") ?? "";
  const reference = text.match(/^مرجع الطلب: (.+)$/m)?.[1] ?? "";
  const namedFiles = files.map(({ file, productId }) => {
    const index = images.findIndex((image) => image.productId === productId);
    const image = images[index];
    return new File(
      [file],
      orderPhotoFilename(
        index,
        image?.sku || image?.name || "product",
        reference,
      ),
      { type: file.type },
    );
  });
  let shareSupported = false;
  try {
    shareSupported =
      !!navigator.share &&
      !!navigator.canShare &&
      namedFiles.length > 0 &&
      navigator.canShare({ files: namedFiles });
  } catch {
    /* use downloads */
  }
  async function share() {
    setError("");
    setSharing(true);
    try {
      await navigator.share({
        files: namedFiles,
        text,
        title: `صور الطلب ${reference}`,
      });
    } catch (failure) {
      if ((failure as Error).name !== "AbortError")
        setError(
          "تعذّرت المشاركة من هذا المتصفح. يمكنك تنزيل الصور وإرفاقها داخل واتساب.",
        );
    } finally {
      setSharing(false);
    }
  }
  function download(file: File) {
    const url = URL.createObjectURL(file),
      link = document.createElement("a");
    link.href = url;
    link.download = file.name;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
  return (
    <section className="order-photos" aria-label="صور منتجات الطلب">
      <h3>
        <Images size={19} />
        صور منتجات الطلب
      </h3>
      <p>
        روابط الصور المتاحة مضافة إلى رسالة الطلب. لإرسال الصور كملفات، اختاري
        واتساب ومحادثة المتجر من زر المشاركة، أو نزّليها وأرفقيها في المحادثة.
      </p>
      {loading && <p role="status">جارٍ تجهيز صور المنتجات...</p>}
      {shareSupported && (
        <button
          type="button"
          className="button button-outline"
          disabled={sharing}
          onClick={() => void share()}
        >
          <Share2 size={17} />
          {sharing ? "جارٍ فتح المشاركة..." : "مشاركة الطلب مع الصور"}
        </button>
      )}
      <div className="order-photo-grid">
        {images.map((image, index) => {
          const prepared = files.find(
            (file) => file.productId === image.productId,
          );
          return (
            <div className="order-photo" key={image.productId}>
              <Media src={image.source} alt={image.name} loading="lazy" />
              <span>{image.name}</span>
              {prepared ? (
                <button
                  type="button"
                  className="text-link"
                  onClick={() =>
                    download(
                      new File(
                        [prepared.file],
                        orderPhotoFilename(
                          index,
                          image.sku || image.name,
                          reference,
                        ),
                        { type: prepared.file.type },
                      ),
                    )
                  }
                  aria-label={`تنزيل صورة ${image.name}`}
                >
                  <Download size={14} />
                  تنزيل الصورة
                </button>
              ) : image.imageUrl ? (
                <a
                  href={image.imageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-link"
                >
                  فتح الصورة
                </a>
              ) : !loading ? (
                <span className="muted small">الصورة غير متاحة للتنزيل</span>
              ) : null}
            </div>
          );
        })}
      </div>
      {!loading && files.length < images.length && (
        <p className="small muted">
          تعذّر تجهيز بعض الصور كملفات. روابط المنتجات تبقى موجودة داخل رسالة
          الطلب.
        </p>
      )}
      <p className="small muted">
        روابط الصور المرفقة صالحة لمدة 7 أيام من تجهيز الطلب. قد يختلف دعم
        مشاركة الصور والنص حسب الهاتف وواتساب.
      </p>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
    </section>
  );
}
