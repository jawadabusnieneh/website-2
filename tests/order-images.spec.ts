import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { demoData } from "../src/lib/demo";
const cart = [
  { productId: "p1", quantity: 1, color: "ذهبي", size: "" },
  { productId: "p1", quantity: 1, color: "فضي", size: "" },
  { productId: "p3", quantity: 1, color: "ذهبي", size: "6" },
];
async function checkout(
  page: Page,
  share: "supported" | "cancelled" | "unsupported" = "unsupported",
) {
  await page.addInitScript((mode) => {
    Object.defineProperty(navigator, "canShare", {
      configurable: true,
      value:
        mode === "unsupported"
          ? undefined
          : (data: { files?: File[] }) => !!data.files?.length,
    });
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value:
        mode === "unsupported"
          ? undefined
          : async (data: ShareData) => {
              if (mode === "cancelled")
                throw new DOMException("cancelled", "AbortError");
              (window as any).shared = {
                text: data.text,
                title: data.title,
                files: data.files?.map((file) => ({
                  name: file.name,
                  type: file.type,
                  size: file.size,
                })),
              };
            },
    });
    window.open = (url?: string | URL) => {
      (window as any).opened = String(url);
      return null;
    };
  }, share);
  await page.goto("/");
  await page.evaluate(
    ({ data, cart }) => {
      localStorage.setItem("elite-demo-v1", JSON.stringify(data));
      localStorage.setItem("elite-cart", JSON.stringify(cart));
    },
    {
      data: {
        ...demoData,
        settings: { ...demoData.settings, whatsapp: "970599123456" },
      },
      cart,
    },
  );
  await page.goto("/checkout");
  await page.getByLabel("الاسم الكامل").fill("سارة أحمد");
  await page.getByLabel("رقم الهاتف").fill("0599000000");
  await page.getByLabel("المدينة / البلدة").fill("القدس");
  await page.getByLabel("عنوان التوصيل الكامل").fill("شارع واضح، بناية 12");
  await page
    .getByLabel("منطقة التوصيل", { exact: true })
    .selectOption("jerusalem");
  await page
    .getByRole("button", { name: "إرسال الطلب عبر واتساب", exact: true })
    .click();
  await expect(page.locator(".order-photos")).toBeVisible();
}
test("WhatsApp message includes cart image links and valid JPEG downloads without repeating variants", async ({
  page,
}) => {
  await checkout(page);
  const message = decodeURIComponent(
    await page.evaluate(() => (window as any).opened),
  );
  expect(message).toContain(
    "صورة المنتج: http://127.0.0.1:5173/images/necklace.webp",
  );
  expect(message).toContain(
    "صورة المنتج: http://127.0.0.1:5173/images/rings.webp",
  );
  expect(message.match(/صورة المنتج:/g)).toHaveLength(2);
  expect(message).toContain("الإجمالي: 295 ₪");
  await expect(page.locator(".order-photo")).toHaveCount(2);
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", {
      name: "تنزيل صورة عقد اللؤلؤة الكلاسيكي",
      exact: true,
    })
    .click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^EL-.+-01-EL-100\.jpg$/);
  const file = await readFile((await download.path())!);
  expect([...file.subarray(0, 3)]).toEqual([255, 216, 255]);
  await expect(
    page.getByRole("button", { name: "مشاركة الطلب مع الصور", exact: true }),
  ).toHaveCount(0);
});
test("supported phones share real photo files and the full order through the system picker", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await checkout(page, "supported");
  await page
    .getByRole("button", { name: "مشاركة الطلب مع الصور", exact: true })
    .click();
  const shared = await page.evaluate(() => (window as any).shared);
  expect(shared.files).toHaveLength(2);
  for (const file of shared.files) {
    expect(file.type).toBe("image/jpeg");
    expect(file.size).toBeGreaterThan(1000);
    expect(file.name).toMatch(/^EL-.+\.jpg$/);
  }
  expect(shared.text).toContain("مرجع الطلب: EL-");
  expect(shared.text).toContain("الإجمالي: 295 ₪");
  expect(shared.text).toContain("سارة أحمد");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.locator(".order-photos").scrollIntoViewIfNeeded();
  await page
    .locator(".order-photo img")
    .evaluateAll((images) =>
      Promise.all(images.map((image) => (image as HTMLImageElement).decode())),
    );
  await page.locator(".order-photos").screenshot({
    path: "/tmp/elite-whatsapp-order-photos.png",
    animations: "disabled",
  });
});
test("cancelling the native share keeps the order available without marking it received", async ({
  page,
}) => {
  await checkout(page, "cancelled");
  await page
    .getByRole("button", { name: "مشاركة الطلب مع الصور", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "مشاركة الطلب مع الصور", exact: true }),
  ).toBeEnabled();
  await expect(page.locator(".order-photos [role=alert]")).toHaveCount(0);
  await expect(page.locator(".success-panel")).toContainText(
    "فتح واتساب وحده لا يؤكد استلام الطلب",
  );
});
