import { describe, expect, it } from "vitest";
import { pruneUnavailableCart } from "../src/lib/cart-sync";
import { demoData } from "../src/lib/demo";
const items = [
  { productId: "p1", quantity: 1, color: "ذهبي", size: "" },
  { productId: "p1", quantity: 2, color: "فضي", size: "" },
  { productId: "p2", quantity: 1, color: "ذهبي", size: "" },
];
describe("unpublished and deleted cart products", () => {
  it("removes all variants of hidden products while preserving other items", () => {
    const products = demoData.products.map((p) => ({
      ...p,
      visible: p.id !== "p1",
    }));
    expect(pruneUnavailableCart(items, products)).toEqual([items[2]]);
    expect(items).toHaveLength(3);
  });
  it("removes deleted products from a previously saved cart", () => {
    expect(
      pruneUnavailableCart(
        items,
        demoData.products.filter((p) => p.id !== "p1"),
      ),
    ).toEqual([items[2]]);
  });
  it("keeps sold-out products and stock validation separate from publication", () => {
    expect(
      pruneUnavailableCart(
        items,
        demoData.products.map((p) => ({ ...p, stock: 0 })),
      ),
    ).toBe(items);
  });
  it("clears a cart when a successful catalog snapshot is empty", () => {
    expect(pruneUnavailableCart(items, [])).toEqual([]);
  });
});
