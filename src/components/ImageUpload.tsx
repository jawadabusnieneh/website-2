import Media from "./Media";
import { useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Crop,
  ImagePlus,
  LoaderCircle,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useStore } from "../lib/store";
async function optimize(
  file: File,
  crop?: { ratio: number; x: number; y: number; zoom: number },
): Promise<Blob> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("الملفات المسموحة: JPG، PNG، WEBP.");
  if (file.size > 8 * 1024 * 1024)
    throw new Error("حجم الصورة يجب ألا يتجاوز 8 ميغابايت.");
  const bitmap = await createImageBitmap(file);
  let sw = bitmap.width,
    sh = bitmap.height,
    sx = 0,
    sy = 0;
  if (crop && crop.ratio) {
    if (sw / sh > crop.ratio) sw = sh * crop.ratio;
    else sh = sw / crop.ratio;
    sw /= crop.zoom;
    sh /= crop.zoom;
    sx = ((bitmap.width - sw) * crop.x) / 100;
    sy = ((bitmap.height - sh) * crop.y) / 100;
  }
  const scale = Math.min(1, 1800 / Math.max(sw, sh)),
    canvas = document.createElement("canvas");
  canvas.width = Math.round(sw * scale);
  canvas.height = Math.round(sh * scale);
  canvas
    .getContext("2d")!
    .drawImage(bitmap, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("تعذرت معالجة الصورة.")),
      "image/webp",
      0.85,
    ),
  );
}
export default function ImageUpload({
  images,
  onChange,
  multiple = false,
}: {
  images: string[];
  onChange: (images: string[]) => void;
  multiple?: boolean;
}) {
  const { toast } = useStore(),
    [busy, setBusy] = useState(false),
    [replace, setReplace] = useState<number | null>(null),
    input = useRef<HTMLInputElement>(null);
  const [cropFile, setCropFile] = useState<File | null>(null),
    [cropUrl, setCropUrl] = useState(""),
    [ratio, setRatio] = useState(1),
    [x, setX] = useState(50),
    [y, setY] = useState(50),
    [zoom, setZoom] = useState(1);
  async function upload(
    files: File[],
    crop?: { ratio: number; x: number; y: number; zoom: number },
  ) {
    setBusy(true);
    try {
      const urls = [];
      for (const file of files) {
        const blob = await optimize(file, crop);
        if (supabase) {
          const path = `${crypto.randomUUID()}.webp`;
          const { error } = await supabase.storage
            .from("store-media")
            .upload(path, blob, { contentType: "image/webp", upsert: false });
          if (error)
            throw new Error(
              "تعذّر رفع الصورة. تحققي من صلاحية المالك وإعداد التخزين.",
            );
          urls.push("storage://" + path);
        } else {
          urls.push(
            await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            }),
          );
        }
      }
      if (replace !== null) {
        const next = [...images];
        next[replace] = urls[0];
        onChange(next);
      } else onChange(multiple ? [...images, ...urls] : [urls[0]]);
      setCropFile(null);
      setReplace(null);
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }
  function pick(index: number | null = null) {
    setReplace(index);
    input.current?.click();
  }
  function move(index: number, delta: number) {
    const next = [...images];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    onChange(next);
  }
  return (
    <div className="image-uploader">
      <input
        ref={input}
        hidden
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple={multiple && replace === null}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length) void upload(files);
        }}
      />
      <div className="upload-grid">
        {images.filter(Boolean).map((src, i) => (
          <div className="upload-image" key={i}>
            <Media src={src} alt={`معاينة الصورة ${i + 1}`} />
            {multiple && i === 0 && (
              <span className="main-image-label">الرئيسية</span>
            )}
            <div>
              <button
                type="button"
                title="استبدال الصورة"
                onClick={() => pick(i)}
              >
                <RefreshCw size={14} />
              </button>
              <button
                type="button"
                title="قص الصورة"
                onClick={async () => {
                  try {
                    const source =
                      src.startsWith("storage://") && supabase
                        ? (
                            await supabase.storage
                              .from("store-media")
                              .createSignedUrl(src.slice(10), 60)
                          ).data?.signedUrl
                        : src;
                    if (!source) throw new Error();
                    const response = await fetch(source);
                    if (!response.ok) throw new Error();
                    const blob = await response.blob();
                    const file = new File([blob], "image.webp", {
                      type: blob.type,
                    });
                    setCropFile(file);
                    setCropUrl(URL.createObjectURL(blob));
                    setReplace(i);
                    setRatio(1);
                    setZoom(1);
                    setX(50);
                    setY(50);
                  } catch {
                    toast("تعذّر فتح الصورة للقص. ارفعي نسخة محلية منها.");
                  }
                }}
              >
                <Crop size={14} />
              </button>
              {i > 0 && (
                <button
                  type="button"
                  title="تقديم الصورة"
                  onClick={() => move(i, -1)}
                >
                  <ArrowRight size={14} />
                </button>
              )}
              {i < images.length - 1 && (
                <button
                  type="button"
                  title="تأخير الصورة"
                  onClick={() => move(i, 1)}
                >
                  <ArrowLeft size={14} />
                </button>
              )}
              <button
                type="button"
                title="إزالة الصورة من المحتوى"
                onClick={() => onChange(images.filter((_, j) => j !== i))}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
        {(multiple || !images.filter(Boolean).length) && (
          <button
            type="button"
            className="upload-target"
            disabled={busy}
            onClick={() => pick()}
          >
            {busy ? (
              <LoaderCircle size={25} className="spin" />
            ) : (
              <ImagePlus size={25} strokeWidth={1} />
            )}
            <span>{busy ? "جارٍ الرفع..." : "رفع صورة"}</span>
          </button>
        )}
      </div>
      <span className="field-help">
        JPG, PNG, WEBP · حتى 8MB · تُضغط الصور تلقائيًا
        {multiple ? " · الصورة الأولى هي الرئيسية" : ""}
      </span>
      {busy && (
        <span role="status" className="small muted">
          جارٍ معالجة الصور وحفظها...
        </span>
      )}
      {cropFile && (
        <div className="modal-backdrop">
          <div
            className="crop-modal"
            role="dialog"
            aria-label="قص الصورة"
            aria-modal="true"
          >
            <div className="modal-heading">
              <h3>قص الصورة قبل النشر</h3>
              <button
                type="button"
                aria-label="إغلاق"
                onClick={() => {
                  setCropFile(null);
                  URL.revokeObjectURL(cropUrl);
                }}
              >
                <X />
              </button>
            </div>
            <div className="crop-preview" style={{ aspectRatio: ratio || 1 }}>
              <Media
                src={cropUrl}
                alt="معاينة القص"
                style={{
                  objectPosition: `${x}% ${y}%`,
                  transform: `scale(${zoom})`,
                }}
              />
            </div>
            <label>
              نسبة القص
              <select
                value={ratio}
                onChange={(e) => setRatio(Number(e.target.value))}
              >
                <option value={1}>مربع</option>
                <option value={0.75}>رأسي 3:4</option>
                <option value={1.5}>أفقي 3:2</option>
              </select>
            </label>
            <label>
              الموضع الأفقي
              <input
                type="range"
                min="0"
                max="100"
                value={x}
                onChange={(e) => setX(+e.target.value)}
              />
            </label>
            <label>
              الموضع الرأسي
              <input
                type="range"
                min="0"
                max="100"
                value={y}
                onChange={(e) => setY(+e.target.value)}
              />
            </label>
            <label>
              التقريب
              <input
                type="range"
                min="1"
                max="3"
                step="0.1"
                value={zoom}
                onChange={(e) => setZoom(+e.target.value)}
              />
            </label>
            <button
              type="button"
              className="button"
              disabled={busy}
              onClick={() => void upload([cropFile], { ratio, x, y, zoom })}
            >
              حفظ القص
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
