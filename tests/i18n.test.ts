import { describe, expect, it } from "vitest";
import { localizeStore, optionLabel, translator } from "../src/lib/i18n-core";
import { demoData } from "../src/lib/demo";
import { cartProblem, normalize, whatsappOrder } from "../src/lib/utils";
describe("Arabic and Hebrew catalog", () => {
  it("preserves Arabic records and falls back for untranslated owner content", () => {
    expect(localizeStore(demoData, "ar")).toBe(demoData);
    const custom = {
      ...demoData.products[0],
      name: "اسم مخصص",
      translations: { he: { description: "תיאור אישי" } },
    };
    const data = localizeStore({ ...demoData, products: [custom] }, "he");
    expect(data.products[0].name).toBe("اسم مخصص");
    expect(data.products[0].description).toBe("תיאור אישי");
    expect(custom.description).toBe(demoData.products[0].description);
  });
  it("uses Hebrew overrides without translating canonical variants or prices", () => {
    const product = {
      ...demoData.products[0],
      translations: {
        he: { name: "שרשרת מיוחדת", colors: ["זהב בהיר", "כסף"] },
      },
    };
    const he = localizeStore({ ...demoData, products: [product] }, "he")
      .products[0];
    expect(he.name).toBe("שרשרת מיוחדת");
    expect(he.colors).toEqual(product.colors);
    expect(he.stock).toBe(product.stock);
    expect(optionLabel(he, "colors", "ذهبي", "he")).toBe("זהב בהיר");
    expect(optionLabel(he, "colors", "ذهبي", "ar")).toBe("ذهبي");
    expect(
      cartProblem(
        [{ productId: he.id, color: "ذهبي", size: "", quantity: 1 }],
        [he],
      ),
    ).toBe(false);
  });
  it("translates labels with values and searches Hebrew with vowel marks", () => {
    expect(translator("he")("الإجمالي: {total}", { total: "125 ₪" })).toBe(
      "סכום לתשלום: 125 ₪",
    );
    expect(normalize("שָׁלוֹם")).toBe(normalize("שלום"));
  });
  it("creates a fully Hebrew WhatsApp order with the same totals and photo links", () => {
    const data = localizeStore(
      {
        ...demoData,
        settings: { ...demoData.settings, whatsapp: "970599123456" },
      },
      "he",
    );
    const url = whatsappOrder(
      [{ productId: "p1", color: "ذهبي", size: "", quantity: 1 }],
      data.products,
      {
        name: "שרה כהן",
        phone: "0501234567",
        city: "ירושלים",
        address: "רחוב 12",
        deliveryRegion: "jerusalem",
        landmark: "",
        maps: "",
        notes: "",
      },
      data.settings,
      "EL-HEBREW",
      { origin: "https://store.example" },
      "he",
    );
    const text = new URL(url).searchParams.get("text")!;
    expect(text).toContain("שרשרת פנינה קלאסית");
    expect(text).toContain("זהב");
    expect(text).toContain("דמי משלוח: 30 ₪");
    expect(text).toContain("סכום לתשלום: 125 ₪");
    expect(text).toContain(
      "תמונת המוצר: https://store.example/images/necklace.webp",
    );
    expect(text).toContain("מספר הזמנה: EL-HEBREW");
    expect(text).not.toMatch(/[\u0600-\u06ff]/);
  });
});
