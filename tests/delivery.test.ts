import { describe, expect, it } from "vitest";
import {
  deliveryQuote,
  getDeliveryOptions,
  getDeliveryRates,
  validateDeliveryRates,
} from "../src/lib/delivery";
import { demoData } from "../src/lib/demo";
import { whatsappOrder } from "../src/lib/utils";
import type { Customer, DeliveryRegion } from "../src/types";
const customer: Customer = {
  deliveryRegion: "west-bank",
  name: "سارة أحمد",
  phone: "0599000000",
  city: "رام الله",
  address: "شارع الإرسال، بناية 12",
  landmark: "",
  maps: "",
  notes: "",
};
const settings = { ...demoData.settings, whatsapp: "970599123456" };
const items = [{ productId: "p1", quantity: 1, color: "ذهبي", size: "" }];
describe("regional delivery", () => {
  it.each<[DeliveryRegion, string, number, number]>([
    ["jerusalem", "القدس", 30, 125],
    ["west-bank", "الضفة الغربية", 20, 115],
    ["inside", "الداخل", 70, 165],
  ])(
    "quotes %s and includes the same delivery charge and total in WhatsApp",
    (deliveryRegion, label, fee, total) => {
      expect(deliveryQuote(settings, deliveryRegion)).toMatchObject({
        id: deliveryRegion,
        label,
        fee,
      });
      const text = decodeURIComponent(
        whatsappOrder(
          items,
          demoData.products,
          { ...customer, deliveryRegion },
          settings,
          "EL-REGION",
        ).split("?text=")[1],
      );
      expect(text).toContain(`منطقة التوصيل: ${label}`);
      expect(text).toContain(`رسوم التوصيل: ${fee} ₪`);
      expect(text).toContain(`الإجمالي: ${total} ₪`);
    },
  );
  it("applies the regional tariff to legacy flat-fee settings without migration", () => {
    const { deliveryRates: _, ...legacy } = settings;
    expect(getDeliveryRates(legacy)).toEqual({
      jerusalem: 30,
      "west-bank": 20,
      inside: 70,
    });
    expect(
      deliveryQuote(
        { ...legacy, deliveryFee: 999 } as typeof settings,
        "jerusalem",
      ).fee,
    ).toBe(30);
  });
  it.each(["", "other", null, undefined, 30])(
    "rejects a missing or unrecognized region %s",
    (deliveryRegion) => {
      expect(() => deliveryQuote(settings, deliveryRegion)).toThrow(
        "اختاري منطقة التوصيل",
      );
      expect(() =>
        whatsappOrder(
          items,
          demoData.products,
          { ...customer, deliveryRegion } as Customer,
          settings,
          "X",
        ),
      ).toThrow("اختاري منطقة التوصيل");
    },
  );
  it("honors valid owner-configured rates including zero", () => {
    const configured = {
      ...settings,
      deliveryRates: { jerusalem: 35, "west-bank": 0, inside: 80 },
    };
    expect(getDeliveryOptions(configured).map((option) => option.fee)).toEqual([
      35, 0, 80,
    ]);
    const text = decodeURIComponent(
      whatsappOrder(items, demoData.products, customer, configured, "X").split(
        "?text=",
      )[1],
    );
    expect(text).toContain("رسوم التوصيل: 0 ₪");
    expect(text).toContain("الإجمالي: 95 ₪");
  });
  it("validates owner input and does not charge malformed stored values", () => {
    for (const invalid of [-1, NaN, Infinity])
      expect(() =>
        validateDeliveryRates({
          jerusalem: invalid,
          "west-bank": 20,
          inside: 70,
        }),
      ).toThrow("سعر توصيل");
    expect(
      getDeliveryRates({
        deliveryRates: { jerusalem: -1, "west-bank": NaN, inside: Infinity },
      }),
    ).toEqual({ jerusalem: 30, "west-bank": 20, inside: 70 });
  });
});
