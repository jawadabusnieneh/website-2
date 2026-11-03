import { demoData } from "../src/lib/demo";
import { test, expect, type Page } from "@playwright/test";
async function cart(page: Page) {
  await page.goto("/product/p1");
  await page
    .getByRole("button", { name: "أضيفي إلى الحقيبة", exact: true })
    .click();
  await page.goto("/cart");
}
async function configureWhatsApp(page: Page) {
  await page.goto("/elite-management-portal");
  await page.getByRole("button", { name: "فتح لوحة تجريبية" }).click();
  await page
    .getByRole("button", { name: "إعدادات المتجر", exact: true })
    .click();
  await page.getByLabel("رقم واتساب الدولي").fill("970599123456");
  await page
    .getByRole("button", { name: "حفظ التغييرات", exact: true })
    .click();
}
test("delivery area controls cart total and persists through checkout and reload", async ({
  page,
}) => {
  await cart(page);
  const total = page.locator(".summary-row.total");
  await expect(total).toContainText("الإجمالي قبل التوصيل");
  await expect(total).toContainText("95");
  await expect(page.locator(".order-summary")).toContainText(
    "يُحدَّد حسب المنطقة",
  );
  for (const [region, amount] of [
    ["jerusalem", "125"],
    ["west-bank", "115"],
    ["inside", "165"],
  ]) {
    await page
      .getByLabel("منطقة التوصيل", { exact: true })
      .selectOption(region);
    await expect(total).toContainText(amount);
  }
  await page.reload();
  await expect(page.getByLabel("منطقة التوصيل", { exact: true })).toHaveValue(
    "inside",
  );
  await expect(total).toContainText("165");
  await page.getByRole("button", { name: "متابعة لإتمام الطلب" }).click();
  await expect(page.getByLabel("منطقة التوصيل", { exact: true })).toHaveValue(
    "inside",
  );
  await expect(total).toContainText("165");
  expect(
    await page
      .getByLabel("منطقة التوصيل", { exact: true })
      .evaluate((select: HTMLSelectElement) => select.form?.id),
  ).toBe("checkout-form");
});
test("checkout requires a region and WhatsApp agrees with the selected region total", async ({
  page,
}) => {
  await configureWhatsApp(page);
  await cart(page);
  await page.goto("/checkout");
  await page.getByLabel("الاسم الكامل").fill("سارة أحمد");
  await page.getByLabel("رقم الهاتف").fill("0599000000");
  await page.getByLabel("المدينة / البلدة").fill("القدس");
  await page.getByLabel("عنوان التوصيل الكامل").fill("شارع واضح، بناية 12");
  await page.evaluate(() => {
    (window as any).opened = "";
    window.open = (url?: string | URL) => {
      (window as any).opened = String(url);
      return null;
    };
  });
  await page.getByRole("button", { name: "إرسال الطلب عبر واتساب" }).click();
  expect(await page.evaluate(() => (window as any).opened)).toBe("");
  await expect(page.locator("select:invalid")).toHaveCount(1);
  for (const [region, label, fee, total] of [
    ["jerusalem", "القدس", 30, 125],
    ["west-bank", "الضفة الغربية", 20, 115],
    ["inside", "الداخل", 70, 165],
  ]) {
    await page
      .getByLabel("منطقة التوصيل", { exact: true })
      .selectOption(String(region));
    await page.getByRole("button", { name: "إرسال الطلب عبر واتساب" }).click();
    await expect(page.locator(".success-panel")).toBeVisible();
    const message = decodeURIComponent(
      await page.evaluate(() => (window as any).opened),
    );
    expect(message).toContain(`منطقة التوصيل: ${label}`);
    expect(message).toContain(`رسوم التوصيل: ${fee} ₪`);
    expect(message).toContain(`الإجمالي: ${total} ₪`);
    await expect(page.locator(".summary-row.total")).toContainText(
      String(total),
    );
  }
  await page.getByLabel("ملاحظات إضافية").fill("اتصلي قبل التوصيل");
  await expect(page.locator(".success-panel")).toHaveCount(0);
});
test("owner can save each delivery rate and storefront uses the persisted values", async ({
  page,
}) => {
  await configureWhatsApp(page);
  await page.getByLabel("توصيل القدس").fill("35");
  await page.getByLabel("توصيل الضفة الغربية").fill("25");
  await page.getByLabel("توصيل الداخل").fill("80");
  await page
    .getByRole("button", { name: "حفظ التغييرات", exact: true })
    .click();
  await cart(page);
  await page
    .getByLabel("منطقة التوصيل", { exact: true })
    .selectOption("jerusalem");
  await expect(page.locator(".summary-row.total")).toContainText("130");
  await page.goto("/info/delivery");
  await expect(page.locator("main")).toContainText("القدس: 35 ₪");
  await expect(page.locator("main")).toContainText("الضفة الغربية: 25 ₪");
  await expect(page.locator("main")).toContainText("الداخل: 80 ₪");
  await page.goto("/elite-management-portal");
  await page.getByRole("button", { name: "فتح لوحة تجريبية" }).click();
  await page
    .getByRole("button", { name: "إعدادات المتجر", exact: true })
    .click();
  await expect(page.getByLabel("توصيل القدس")).toHaveValue("35");
  await page.getByLabel("توصيل القدس").fill("");
  await page
    .getByRole("button", { name: "حفظ التغييرات", exact: true })
    .click();
  expect(
    await page
      .getByLabel("توصيل القدس")
      .evaluate((input: HTMLInputElement) => input.validity.valueMissing),
  ).toBe(true);
});
test("regional checkout stays usable on a 360px phone", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await cart(page);
  await page
    .getByLabel("منطقة التوصيل", { exact: true })
    .selectOption("jerusalem");
  await page.getByRole("button", { name: "متابعة لإتمام الطلب" }).click();
  await expect(page.locator(".summary-row.total")).toContainText("125");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "/tmp/elite-regional-checkout-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
});

test("legacy store settings automatically use the new regional tariffs", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate((data) => {
    delete data.settings.deliveryRates;
    data.settings.deliveryFee = 999;
    localStorage.setItem("elite-demo-v1", JSON.stringify(data));
  }, demoData);
  await cart(page);
  for (const [region, total] of [
    ["jerusalem", "125"],
    ["west-bank", "115"],
    ["inside", "165"],
  ]) {
    await page
      .getByLabel("منطقة التوصيل", { exact: true })
      .selectOption(region);
    await expect(page.locator(".summary-row.total")).toContainText(total);
  }
});
