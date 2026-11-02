import type { CartItem, Customer, Product, Settings } from "../types";
export const normalize = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
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
) {
  const number = settings.whatsapp.replace(/[^\d]/g, "");
  if (!/^\d{8,15}$/.test(number))
    throw new Error(
      "رقم واتساب المتجر غير مُعدّ بعد. يُرجى التواصل مع المتجر قبل الطلب.",
    );
  if (cartProblem(items, products))
    throw new Error("تغيّر توفر إحدى القطع أو خياراتها. يُرجى مراجعة السلة.");
  let total = 0,
    count = 0;
  const lines = items.map((item) => {
    const p = products.find((p) => p.id === item.productId && p.visible);
    if (!p || item.quantity > p.stock || item.quantity < 1)
      throw new Error("تغيّر توفر إحدى القطع. يُرجى مراجعة السلة.");
    if (
      (p.colors.length && !p.colors.includes(item.color)) ||
      (p.sizes.length && !p.sizes.includes(item.size))
    )
      throw new Error("يُرجى مراجعة خيارات القطع في السلة.");
    const subtotal = price(p) * item.quantity;
    total += subtotal;
    count += item.quantity;
    return `${p.name}\n${[item.color, item.size].filter(Boolean).join(" / ")}\nالكمية: ${item.quantity} | سعر القطعة: ${money(price(p), settings.currency)}\nالمجموع: ${money(subtotal, settings.currency)}`;
  });
  if (!items.length) throw new Error("السلة فارغة.");
  const message = [
    `طلب جديد — ${settings.name}`,
    `مرجع الطلب: ${reference}`,
    "",
    ...lines.map((l) => l + "\n"),
    `عدد القطع: ${count}`,
    `مجموع المنتجات: ${money(total, settings.currency)}`,
    `رسوم التوصيل: ${money(settings.deliveryFee, settings.currency)}`,
    `الإجمالي: ${money(total + settings.deliveryFee, settings.currency)}`,
    "",
    `الاسم: ${customer.name}`,
    `الهاتف: ${customer.phone}`,
    `المدينة: ${customer.city}`,
    `العنوان: ${customer.address}`,
    customer.landmark && `أقرب معلم: ${customer.landmark}`,
    customer.maps && `الموقع: ${customer.maps}`,
    customer.notes && `ملاحظات: ${customer.notes}`,
  ].join("\n");
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
export const uuid = () => crypto.randomUUID();
