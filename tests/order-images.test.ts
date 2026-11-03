import { describe, expect, it, vi } from "vitest";
import {
  ORDER_IMAGE_LINK_SECONDS,
  orderImageProducts,
  orderPhotoFilename,
  resolveOrderImages,
  webImageUrl,
} from "../src/lib/order-images";
import { whatsappOrder } from "../src/lib/utils";
import { demoData } from "../src/lib/demo";
const items = [
  { productId: "p1", quantity: 1, color: "ذهبي", size: "" },
  { productId: "p1", quantity: 1, color: "فضي", size: "" },
  { productId: "p3", quantity: 1, color: "ذهبي", size: "6" },
];
const customer = {
  deliveryRegion: "jerusalem" as const,
  name: "سارة أحمد",
  phone: "0599000000",
  city: "القدس",
  address: "شارع واضح، بناية 12",
  landmark: "",
  maps: "",
  notes: "",
};
const settings = { ...demoData.settings, whatsapp: "970599123456" };
describe("WhatsApp product images", () => {
  it("includes absolute main-image and product links without repeating variants or quantities", () => {
    const text = decodeURIComponent(
      whatsappOrder(items, demoData.products, customer, settings, "EL-IMAGES", {
        origin: "https://shop.example.test",
      }).split("?text=")[1],
    );
    expect(text).toContain(
      "صورة المنتج: https://shop.example.test/images/necklace.webp",
    );
    expect(text).toContain(
      "صورة المنتج: https://shop.example.test/images/rings.webp",
    );
    expect(text.match(/صورة المنتج:/g)).toHaveLength(2);
    expect(text).toContain("رابط المنتج: https://shop.example.test/product/p1");
    expect(text).toContain("عدد القطع: 3");
    expect(text).toContain("الإجمالي: 295 ₪");
  });
  it("signs only visible products in the cart for seven days", async () => {
    const hidden = { ...demoData.products[1], visible: false };
    const selected = orderImageProducts(
      [
        ...items,
        { productId: hidden.id, quantity: 1, color: "ذهبي", size: "" },
      ],
      [...demoData.products.filter((p) => p.id !== hidden.id), hidden],
    );
    expect(selected.map((p) => p.id)).toEqual(["p1", "p3"]);
    const sign = vi.fn(
      async () =>
        "https://project.supabase.co/storage/v1/object/sign/store-media/photo.webp?token=test-signature",
    );
    const images = await resolveOrderImages(
      [{ ...selected[0], images: ["storage://photo.webp"] }, hidden],
      "https://shop.example.test",
      sign,
    );
    expect(sign).toHaveBeenCalledOnce();
    expect(sign).toHaveBeenCalledWith("photo.webp", ORDER_IMAGE_LINK_SECONDS);
    expect(ORDER_IMAGE_LINK_SECONDS).toBe(604800);
    expect(images).toHaveLength(1);
    const text = decodeURIComponent(
      whatsappOrder([items[0]], demoData.products, customer, settings, "EL-X", {
        origin: "https://shop.example.test",
        images: { p1: images[0].imageUrl! },
      }).split("?text=")[1],
    );
    expect(text).toContain("token=test-signature");
    expect(text).not.toContain("storage://");
  });
  it("falls back to a permanent product page after storage signing fails", async () => {
    const sign = vi.fn(async () => {
      throw new Error("permission denied");
    });
    const product = {
      ...demoData.products[0],
      images: ["storage://private.webp"],
    };
    const images = await resolveOrderImages(
      [product],
      "https://shop.example.test",
      sign,
    );
    expect(images[0].imageUrl).toBeUndefined();
    expect(images[0].unavailable).toBe(true);
    const text = decodeURIComponent(
      whatsappOrder([items[0]], [product], customer, settings, "EL-X", {
        origin: "https://shop.example.test",
      }).split("?text=")[1],
    );
    expect(text).toContain("رابط المنتج: https://shop.example.test/product/p1");
    expect(text).not.toContain("storage://");
    expect(text).not.toContain("صورة المنتج:");
  });
  it.each([
    "data:image/jpeg;base64,abc",
    "blob:https://example.test/abc",
    "storage://photo.webp",
    "javascript:alert(1)",
    "file:///private/image.png",
    "http://external.example.test/image.jpg",
  ])("does not share non-web image references (%s)", (source) =>
    expect(webImageUrl(source, "https://shop.example.test")).toBeUndefined(),
  );
  it("keeps valid HTTPS image URLs and safely encodes filenames", () => {
    expect(
      webImageUrl("/images/قطعة ذهبية.webp", "https://shop.example.test"),
    ).toContain("%20");
    expect(webImageUrl("https://cdn.example.test/image.jpg")).toBe(
      "https://cdn.example.test/image.jpg",
    );
    expect(orderPhotoFilename(0, "EL/100", "EL-TEST")).toBe(
      "EL-TEST-01-EL-100.jpg",
    );
  });
});
