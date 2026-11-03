import { expect, test } from "@playwright/test";
import { demoData } from "../src/lib/demo";

test("language switch persists and keeps the same cart, variant and delivery selection", async ({
  page,
}) => {
  await page.goto("/product/p1");
  await page.getByRole("button", { name: "فضي", exact: true }).click();
  await page
    .getByRole("button", { name: "أضيفي إلى الحقيبة", exact: true })
    .click();
  await page.getByLabel("اللغة", { exact: true }).selectOption("he");
  await expect(page.locator("html")).toHaveAttribute("lang", "he");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "שרשרת פנינה קלאסית",
  );
  await expect(page.locator(".variant.selected")).toHaveText("כסף");
  await page.goto("/cart");
  await expect(page.locator(".cart-item")).toContainText("כסף");
  await page
    .getByLabel("אזור המשלוח", { exact: true })
    .selectOption("jerusalem");
  await expect(page.locator(".summary-row.total")).toContainText("125 ₪");
  await page.reload();
  await expect(page.getByLabel("שפה", { exact: true })).toHaveValue("he");
  await expect(page.locator(".cart-item")).toContainText("שרשרת פנינה קלאסית");
  await page.getByLabel("שפה", { exact: true }).selectOption("ar");
  await expect(page.locator(".cart-item")).toContainText(
    "عقد اللؤلؤة الكلاسيكي",
  );
  await expect(page.locator(".cart-item")).toContainText("فضي");
  await expect(page.getByLabel("منطقة التوصيل", { exact: true })).toHaveValue(
    "jerusalem",
  );
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem("elite-cart")!)),
  ).toEqual([{ productId: "p1", quantity: 1, color: "فضي", size: "" }]);
});

test("Hebrew checkout sends Hebrew product, prices, region and photo links to WhatsApp", async ({
  page,
}) => {
  await page.addInitScript((data) => {
    localStorage.setItem(
      "elite-demo-v1",
      JSON.stringify({
        ...data,
        settings: { ...data.settings, whatsapp: "970599123456" },
      }),
    );
    localStorage.setItem("elite-language", JSON.stringify("he"));
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
  }, demoData);
  await page.goto("/checkout");
  await page.getByLabel("שם מלא", { exact: true }).fill("שרה כהן");
  await page.getByLabel("מספר טלפון", { exact: true }).fill("0501234567");
  await page.getByLabel("עיר / יישוב", { exact: true }).fill("ירושלים");
  await page
    .getByLabel("כתובת מלאה למשלוח", { exact: true })
    .fill("רחוב הפרחים 12");
  await page.getByLabel("אזור המשלוח", { exact: true }).selectOption("inside");
  await expect(page.locator(".summary-row.total")).toContainText("165 ₪");
  await page
    .getByRole("button", { name: "שליחת ההזמנה בוואטסאפ", exact: true })
    .click();
  const text = new URL(
    await page.evaluate(() => (window as any).opened),
  ).searchParams.get("text")!;
  expect(text).toContain("שרשרת פנינה קלאסית");
  expect(text).toContain("סכום לתשלום: 165 ₪");
  expect(text).toContain("אזור המשלוח: פנים הארץ");
  expect(text).toContain(
    "תמונת המוצר: http://127.0.0.1:5173/images/necklace.webp",
  );
  expect(text).not.toMatch(/[\u0600-\u06ff]/);
  const downloadEvent = page.waitForEvent("download");
  await page
    .getByRole("button", {
      name: "הורדת תמונה של שרשרת פנינה קלאסית",
      exact: true,
    })
    .click();
  expect((await downloadEvent).suggestedFilename()).toMatch(
    /^EL-.+-01-EL-100\.jpg$/,
  );
});

test("owner edits Hebrew content without overwriting Arabic or duplicating inventory", async ({
  page,
}) => {
  await page.goto("/elite-management-portal");
  await page.getByRole("button", { name: "فتح لوحة تجريبية" }).click();
  await page
    .getByRole("button", { name: "إدارة المنتجات", exact: true })
    .click();
  await page
    .getByRole("button", { name: "تعديل عقد اللؤلؤة الكلاسيكي", exact: true })
    .click();
  await page
    .getByLabel("اسم المنتج بالعبرية", { exact: true })
    .fill("שרשרת בדיקה ייחודית");
  await page
    .getByLabel("الوصف القصير بالعبرية", { exact: true })
    .fill("תיאור שנכתב בניהול");
  await page
    .getByLabel("اللون «ذهبي» بالعبرية", { exact: true })
    .fill("זהב בהיר");
  await page.getByRole("button", { name: "حفظ المحتوى", exact: true }).click();
  await expect(page.locator(".editor-modal")).toHaveCount(0);
  await page
    .getByRole("button", { name: "إدارة الصفحة الرئيسية", exact: true })
    .click();
  await page
    .getByLabel("شريط الإعلان بالعبرية", { exact: true })
    .fill("ברוכים הבאים לחנות");
  await page
    .getByRole("button", { name: "حفظ التغييرات", exact: true })
    .click();
  await page.goto("/product/p1");
  await page.getByLabel("اللغة", { exact: true }).selectOption("he");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "שרשרת בדיקה ייחודית",
  );
  await expect(page.locator(".detail-copy")).toContainText(
    "תיאור שנכתב בניהול",
  );
  await expect(page.locator(".announcement")).toContainText(
    "ברוכים הבאים לחנות",
  );
  await expect(
    page.getByRole("button", { name: "זהב בהיר", exact: true }),
  ).toBeVisible();
  await page.goto("/shop?q=" + encodeURIComponent("שרשרת בדיקה"));
  await expect(page.locator(".shop-grid .product-card")).toHaveCount(1);
  await page.getByLabel("שפה", { exact: true }).selectOption("ar");
  await page.goto("/product/p1");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "عقد اللؤلؤة الكلاسيكي",
  );
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("elite-demo-v1")!).products.length,
    ),
  ).toBe(demoData.products.length);
});

test("Hebrew mobile navigation, catalog and checkout fit a 360px phone", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/");
  await page.getByLabel("اللغة", { exact: true }).selectOption("he");
  await page.getByRole("button", { name: "פתיחת התפריט", exact: true }).click();
  await page
    .locator(".mobile-nav")
    .getByRole("link", { name: "כל האקססוריז", exact: true })
    .click();
  await expect(page.locator(".shop-grid .product-card")).toHaveCount(8);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.goto("/product/p1");
  await page.getByRole("button", { name: "הוסיפי לסל", exact: true }).click();
  await page.goto("/checkout");
  await expect(page.getByLabel("שם מלא", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "/tmp/elite-hebrew-checkout.png",
    fullPage: true,
  });
});
