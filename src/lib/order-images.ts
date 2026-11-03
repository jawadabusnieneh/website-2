import type { CartItem, Product } from "../types";

export const ORDER_IMAGE_LINK_SECONDS = 7 * 24 * 60 * 60;
export interface OrderImage {
  productId: string;
  name: string;
  sku: string;
  source: string;
  productUrl: string;
  imageUrl?: string;
  unavailable: boolean;
}
export interface OrderPhotoFile {
  productId: string;
  file: File;
}
export interface OrderImageLinks {
  origin?: string;
  images?: Record<string, string>;
}

/** Never put browser-only data/blob/storage URIs into a WhatsApp message. */
export function webImageUrl(
  source: string | undefined,
  origin?: string,
): string | undefined {
  if (!source || /^(?:data|blob|storage):/i.test(source)) return undefined;
  try {
    const url = origin ? new URL(source, origin) : new URL(source);
    if (url.username || url.password) return undefined;
    if (
      url.protocol === "https:" ||
      (url.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(url.hostname))
    )
      return url.href;
  } catch {
    /* an unpublished/local reference has no shareable URL */
  }
  return undefined;
}
export function productWebUrl(id: string, origin?: string): string | undefined {
  return webImageUrl(`/product/${encodeURIComponent(id)}`, origin);
}
export function orderImageProducts(
  items: CartItem[],
  products: Product[],
): Product[] {
  const ids = new Set(items.map((item) => item.productId));
  const seen = new Set<string>();
  return products.filter(
    (product) =>
      product.visible &&
      ids.has(product.id) &&
      !seen.has(product.id) &&
      !!seen.add(product.id),
  );
}
function deadline<T>(operation: Promise<T>, milliseconds: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  return Promise.race([
    operation,
    new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error("image timeout")),
        milliseconds,
      );
    }),
  ]).finally(() => clearTimeout(timer));
}
export async function resolveOrderImages(
  products: Product[],
  origin: string,
  signImage?: (path: string, expiresIn: number) => Promise<string>,
): Promise<OrderImage[]> {
  return Promise.all(
    products
      .filter((product) => product.visible)
      .map(async (product) => {
        const source = product.images[0] ?? "";
        let imageUrl = webImageUrl(source, origin);
        if (source.startsWith("storage://") && signImage) {
          try {
            imageUrl = webImageUrl(
              await deadline(
                signImage(source.slice(10), ORDER_IMAGE_LINK_SECONDS),
                10000,
              ),
              origin,
            );
          } catch {
            /* ordering remains available using the permanent product link */
          }
        }
        return {
          productId: product.id,
          name: product.name,
          sku: product.sku,
          source,
          imageUrl,
          productUrl: productWebUrl(product.id, origin) ?? "",
          unavailable: !imageUrl,
        };
      }),
  );
}
export function orderPhotoFilename(
  index: number,
  name: string,
  reference = "",
): string {
  const clean = (value: string) =>
    value
      .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "-")
      .trim()
      .slice(0, 90);
  return `${reference ? clean(reference) + "-" : ""}${String(index + 1).padStart(2, "0")}-${clean(name) || "product"}.jpg`;
}
async function photoFile(
  image: OrderImage,
  index: number,
  signal: AbortSignal,
): Promise<OrderPhotoFile> {
  const source =
    image.imageUrl ||
    (image.source.startsWith("data:image/") ? image.source : undefined);
  if (!source) throw new Error("Image is unavailable");
  const response = await fetch(source, { signal });
  if (!response.ok) throw new Error("Image download failed");
  const blob = await response.blob();
  if (!blob.type.startsWith("image/") || blob.size > 12 * 1024 * 1024)
    throw new Error("Invalid image");
  const bitmap = await createImageBitmap(blob);
  try {
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Image conversion unavailable");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const jpeg = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (value) =>
          value ? resolve(value) : reject(new Error("Image conversion failed")),
        "image/jpeg",
        0.9,
      ),
    );
    return {
      productId: image.productId,
      file: new File(
        [jpeg],
        orderPhotoFilename(index, image.sku || image.name),
        { type: "image/jpeg" },
      ),
    };
  } finally {
    bitmap.close();
  }
}
export async function prepareOrderPhotoFiles(
  images: OrderImage[],
  signal: AbortSignal,
): Promise<OrderPhotoFile[]> {
  const files: OrderPhotoFile[] = [];
  // Decode one photo at a time to keep memory use small on phones.
  for (let index = 0; index < images.length && !signal.aborted; index++) {
    try {
      files.push(await photoFile(images[index], index, signal));
    } catch {
      /* other images can still be shared */
    }
  }
  return files;
}
