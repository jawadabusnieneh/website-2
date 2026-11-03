import {
  productWebUrl,
  webImageUrl,
  type OrderImageLinks,
} from "./order-images";
import { deliveryQuote } from "./delivery";
import { optionLabel, translator } from "./i18n-core";
import type { CartItem, Customer, Language, Product, Settings } from "../types";
export const normalize = (value: string) =>
  value
    .normalize("NFKD")
    .replace(
      /[\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7\u064B-\u065F\u0670\u0640]/g,
      "",
    )
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .toLowerCase()
    .trim();
export const price = (p: Product) =>
  p.salePrice !== null && p.salePrice < p.price ? p.salePrice : p.price;
export const money = (n: number, currency = "₪") =>
  `${new Intl.NumberFormat("ar-u-nu-latn", { maximumFractionDigits: 2 }).format(n)} ${currency}`;
export const cartKey = (x: Pick<CartItem, "productId" | "color" | "size">) =>
  JSON.stringify([x.productId, x.color, x.size]);
export const safeLink = (url: string) =>
  /^(https:\/\/|\/(?!\/))/.test(url) ? url : "/shop";
export function readLocal<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}
export function cartProblem(items: CartItem[], products: Product[]) {
  for (const item of items) {
    const p = products.find((p) => p.id === item.productId && p.visible);
    if (
      !p ||
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      items
        .filter((x) => x.productId === item.productId)
        .reduce((n, x) => n + x.quantity, 0) > p.stock
    )
      return true;
    if (
      (p.colors.length && !p.colors.includes(item.color)) ||
      (p.sizes.length && !p.sizes.includes(item.size))
    )
      return true;
  }
  return false;
}
export function whatsappOrder(
  items: CartItem[],
  products: Product[],
  customer: Customer,
  settings: Settings,
  reference: string,
  media: OrderImageLinks = {},
  language: Language = "ar",
) {
  const t = translator(language);
  const number = settings.whatsapp.replace(/[^\d]/g, "");
  if (!/^\d{8,15}$/.test(number))
    throw new Error(
      t("رقم واتساب المتجر غير مُعدّ بعد. يُرجى التواصل مع المتجر قبل الطلب."),
    );
  if (cartProblem(items, products))
    throw new Error(
      t("تغيّر توفر إحدى القطع أو خياراتها. يُرجى مراجعة السلة."),
    );
  let total = 0,
    count = 0;
  const linkedProducts = new Set<string>();
  const lines = items.map((item) => {
    const p = products.find((p) => p.id === item.productId && p.visible);
    if (!p || item.quantity > p.stock || item.quantity < 1)
      throw new Error(t("تغيّر توفر إحدى القطع. يُرجى مراجعة السلة."));
    if (
      (p.colors.length && !p.colors.includes(item.color)) ||
      (p.sizes.length && !p.sizes.includes(item.size))
    )
      throw new Error(t("يُرجى مراجعة خيارات القطع في السلة."));
    const subtotal = price(p) * item.quantity;
    total += subtotal;
    count += item.quantity;
    const links: string[] = [];
    if (!linkedProducts.has(p.id)) {
      const image = webImageUrl(
        media.images?.[p.id] ?? p.images[0],
        media.origin,
      );
      const product = productWebUrl(p.id, media.origin);
      if (image) links.push(t("صورة المنتج: {url}", { url: image }));
      if (product) links.push(t("رابط المنتج: {url}", { url: product }));
      linkedProducts.add(p.id);
    }
    return [
      [
        p.name,
        [
          optionLabel(p, "colors", item.color, language),
          optionLabel(p, "sizes", item.size, language),
        ]
          .filter(Boolean)
          .join(" / "),
        t("الكمية: {quantity} | سعر القطعة: {price}", {
          quantity: item.quantity,
          price: money(price(p), settings.currency),
        }),
        t("المجموع: {total}", { total: money(subtotal, settings.currency) }),
      ].join("\n"),
      ...links,
    ].join("\n");
  });
  if (!items.length) throw new Error(t("السلة فارغة."));
  const delivery = deliveryQuote(settings, customer.deliveryRegion, language);
  const message = [
    t("طلب جديد — {name}", { name: settings.name }),
    t("مرجع الطلب: {reference}", { reference }),
    "",
    ...lines.map((l) => l + "\n"),
    t("عدد القطع: {count}", { count }),
    t("مجموع المنتجات: {total}", { total: money(total, settings.currency) }),
    t("منطقة التوصيل: {region}", { region: delivery.label }),
    t("رسوم التوصيل: {fee}", { fee: money(delivery.fee, settings.currency) }),
    t("الإجمالي: {total}", {
      total: money(total + delivery.fee, settings.currency),
    }),
    "",
    t("الاسم: {name}", { name: customer.name }),
    t("الهاتف: {phone}", { phone: customer.phone }),
    t("المدينة: {city}", { city: customer.city }),
    t("العنوان: {address}", { address: customer.address }),
    customer.landmark &&
      t("أقرب معلم: {landmark}", { landmark: customer.landmark }),
    customer.maps && t("الموقع: {maps}", { maps: customer.maps }),
    customer.notes && t("ملاحظات: {notes}", { notes: customer.notes }),
  ].join("\n");
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
export const uuid = () => crypto.randomUUID();
