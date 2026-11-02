import { describe, it, expect } from "vitest";
import {
  normalize,
  price,
  cartKey,
  cartProblem,
  whatsappOrder,
  safeLink,
} from "../src/lib/utils";
import { demoData } from "../src/lib/demo";
const customer = {
  name: "سارة أحمد",
  phone: "0599000000",
  city: "رام الله",
  address: "شارع الإرسال، بناية 12",
  landmark: "قرب الحديقة",
  maps: "https://maps.google.com/maps?q=31,35",
  notes: "اتصلي قبل التوصيل",
};
const settings = { ...demoData.settings, whatsapp: "+970 599 123 456" };
describe("Arabic discovery", () => {
  it("normalizes diacritics, tatweel and letter variations", () => {
    expect(normalize("إِكْسَسُوارات أنِيقَة")).toBe(
      normalize("اكسسوارات انيقه"),
    );
    expect(normalize("ELITE")).toBe("elite");
    expect(normalize("سِلْسِـلَة")).toBe("سلسله");
  });
});
describe("cart and WhatsApp", () => {
  it("uses valid discounted prices", () => {
    expect(price(demoData.products[0])).toBe(95);
    expect(price({ ...demoData.products[0], salePrice: 130 })).toBe(120);
  });
  it("keeps different variants separate", () =>
    expect(cartKey({ productId: "p1", color: "ذهبي", size: "" })).not.toBe(
      cartKey({ productId: "p1", color: "فضي", size: "" }),
    ));
  it("encodes complete order with exact total and optional customer details", () => {
    const url = whatsappOrder(
      [{ productId: "p1", quantity: 2, color: "ذهبي", size: "" }],
      demoData.products,
      customer,
      settings,
      "EL-TEST",
    );
    expect(url.startsWith("https://wa.me/970599123456?text=")).toBe(true);
    const text = decodeURIComponent(url.split("?text=")[1]);
    for (const content of [
      "EL-TEST",
      "عدد القطع: 2",
      "الإجمالي: 210 ₪",
      customer.maps,
      customer.address,
      customer.notes,
      "ذهبي",
    ])
      expect(text).toContain(content);
    expect(text).not.toMatch(/\p{Extended_Pictographic}/u);
  });
  it("enforces shared stock across different variants", () => {
    expect(
      cartProblem(
        [
          { productId: "p1", quantity: 8, color: "ذهبي", size: "" },
          { productId: "p1", quantity: 5, color: "فضي", size: "" },
        ],
        demoData.products,
      ),
    ).toBe(true);
  });
  it("does not invent a merchant phone number", () =>
    expect(() =>
      whatsappOrder(
        [{ productId: "p1", quantity: 1, color: "ذهبي", size: "" }],
        demoData.products,
        customer,
        demoData.settings,
        "X",
      ),
    ).toThrow("رقم واتساب"));
  it("rejects empty orders, unavailable stock, hidden products and invalid variants", () => {
    expect(() =>
      whatsappOrder([], demoData.products, customer, settings, "X"),
    ).toThrow();
    for (const item of [
      { productId: "p1", quantity: 99, color: "ذهبي", size: "" },
      { productId: "p1", quantity: 1, color: "غير موجود", size: "" },
      { productId: "missing", quantity: 1, color: "", size: "" },
    ])
      expect(() =>
        whatsappOrder([item], demoData.products, customer, settings, "X"),
      ).toThrow();
    expect(() =>
      whatsappOrder(
        [{ productId: "p1", quantity: 1, color: "ذهبي", size: "" }],
        [{ ...demoData.products[0], visible: false }],
        customer,
        settings,
        "X",
      ),
    ).toThrow();
  });
});
describe("banner links", () =>
  it("accepts only internal and HTTPS links", () => {
    expect(safeLink("javascript:alert(1)")).toBe("/shop");
    expect(safeLink("//example.com")).toBe("/shop");
    expect(safeLink("/shop?sale=1")).toBe("/shop?sale=1");
  }));
