import type { CartItem, Product } from "../types";

/** Call only with a successfully loaded catalog, never a failed/initial fetch. */
export function pruneUnavailableCart(items: CartItem[], products: Product[]) {
  const available = new Set(products.filter((p) => p.visible).map((p) => p.id));
  const next = items.filter((item) => available.has(item.productId));
  return next.length === items.length ? items : next;
}
export function readCart(value: unknown): CartItem[] {
  return Array.isArray(value)
    ? value.filter(
        (x) =>
          x &&
          typeof x.productId === "string" &&
          Number.isInteger(x.quantity) &&
          x.quantity > 0 &&
          typeof x.color === "string" &&
          typeof x.size === "string",
      )
    : [];
}
