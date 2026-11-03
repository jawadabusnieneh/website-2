import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { demoData } from "../../src/lib/demo";
for (const available of [true, false]) {
  test(`private product image links are ${available ? "signed for seven days" : "omitted safely when signing is denied"}`, async ({
    page,
  }) => {
    const photo = await readFile("public/images/necklace.webp");
    const durations: number[] = [];
    const product = {
      ...demoData.products[0],
      images: ["storage://product.webp"],
    };
    await page.routeWebSocket("wss://elite-auth-test.invalid/**", (socket) =>
      socket.close(),
    );
    await page.route("https://elite-auth-test.invalid/**", async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname === "/rest/v1/products") {
        await route.fulfill({
          status: 200,
          json: [{ id: product.id, payload: product }],
        });
        return;
      }
      if (url.pathname === "/rest/v1/categories") {
        await route.fulfill({
          status: 200,
          json: demoData.categories.map((c) => ({ id: c.id, payload: c })),
        });
        return;
      }
      if (url.pathname === "/rest/v1/settings") {
        await route.fulfill({
          status: 200,
          json: [
            {
              id: "store",
              payload: { ...demoData.settings, whatsapp: "970599123456" },
            },
          ],
        });
        return;
      }
      if (
        url.pathname === "/storage/v1/object/sign/store-media/product.webp" &&
        route.request().method() === "POST"
      ) {
        const duration = route.request().postDataJSON().expiresIn;
        durations.push(duration);
        if (!available) {
          await route.fulfill({
            status: 403,
            json: { message: "not allowed" },
          });
          return;
        }
        await route.fulfill({
          status: 200,
          json: {
            signedURL: `/object/sign/store-media/product.webp?token=photo-${duration}`,
          },
        });
        return;
      }
      if (url.pathname === "/storage/v1/object/sign/store-media/product.webp") {
        await route.fulfill({
          status: 200,
          contentType: "image/webp",
          body: photo,
        });
        return;
      }
      await route.fulfill({ status: 200, json: [] });
    });
    await page.addInitScript(() => {
      localStorage.setItem(
        "elite-cart",
        JSON.stringify([
          { productId: "p1", quantity: 1, color: "ذهبي", size: "" },
        ]),
      );
      window.open = (url?: string | URL) => {
        (window as any).opened = String(url);
        return null;
      };
    });
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
    const message = decodeURIComponent(
      await page.evaluate(() => (window as any).opened),
    );
    expect(durations).toContain(604800);
    expect(message).not.toContain("storage://");
    expect(message).toContain("رابط المنتج: http://127.0.0.1:5174/product/p1");
    if (available) {
      expect(message).toContain("token=photo-604800");
      await expect(
        page.getByRole("button", {
          name: "تنزيل صورة عقد اللؤلؤة الكلاسيكي",
          exact: true,
        }),
      ).toBeVisible();
    } else {
      expect(message).not.toContain("صورة المنتج:");
      await expect(page.locator(".order-photos")).toContainText(
        "تعذّر تجهيز بعض الصور",
      );
    }
    expect(message).toContain("الإجمالي: 125 ₪");
  });
}
