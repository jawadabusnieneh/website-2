import { test, expect } from "@playwright/test";
test("desktop visual and public navigation", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "تفاصيل صغيرة، أناقة لا تُنسى." }),
  ).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: "/tmp/elite-desktop.png",
    fullPage: true,
    animations: "disabled",
  });
  await expect(
    page.getByRole("link", { name: /إدارة|لوحة التحكم|المالك/ }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "آراء زبائننا" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "الصورة التالية", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "لمستكِ الخاصة، في كل إطلالة." }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("live Arabic search and catalog filters", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("searchbox").count();
  await page.getByRole("textbox", { name: "ابحثي عن قطعة" }).fill("أقْراط");
  await expect(page.locator(".search-results").getByRole("link")).toHaveCount(
    2,
  );
  await page.locator(".search-results").getByRole("link").first().click();
  await expect(page).toHaveURL(/product/);
  await page.goto("/shop");
  await page.getByRole("radio", { name: /خواتم/ }).click();
  await expect(page.locator(".product-card")).toHaveCount(2);
  await page.getByRole("checkbox", { name: "عليه عرض" }).click();
  await expect(page.locator(".product-card")).toHaveCount(1);
  await page.getByRole("button", { name: "مسح جميع الفلاتر" }).click();
  await expect(page.locator(".product-card")).toHaveCount(8);
  await page
    .getByRole("textbox", { name: "بحث في المنتجات" })
    .fill("غير موجود");
  await expect(
    page.getByRole("heading", { name: "لم نجد قطعة هنا بعد" }),
  ).toBeVisible();
});
test("variants, quantity and persistent cart", async ({ page }) => {
  await page.goto("/product/p3");
  await page.getByRole("button", { name: "فضي", exact: true }).click();
  await page.getByRole("button", { name: "7", exact: true }).click();
  await page.getByRole("button", { name: "زيادة الكمية", exact: true }).click();
  await page
    .getByRole("button", { name: "أضيفي إلى الحقيبة", exact: true })
    .click();
  await page.goto("/cart");
  await expect(page.locator(".cart-item")).toHaveCount(1);
  await expect(page.locator(".cart-item")).toContainText("فضي / 7");
  await page
    .getByLabel("منطقة التوصيل", { exact: true })
    .selectOption("west-bank");
  await expect(page.locator(".summary-row.total")).toContainText("170");
  await page.reload();
  await expect(page.locator(".cart-item")).toHaveCount(1);
  await page.getByRole("button", { name: "إزالة خاتم تناغم" }).click();
  await expect(
    page.getByRole("heading", { name: "حقيبتك تنتظر تفاصيلك" }),
  ).toBeVisible();
});
test("checkout validation and encoded WhatsApp handoff", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem("elite-demo-v1") || "null");
    return data;
  });
  await page.goto("/elite-management-portal");
  await page.getByRole("button", { name: "فتح لوحة تجريبية" }).click();
  await page
    .getByRole("button", { name: "إعدادات المتجر", exact: true })
    .click();
  await page.getByLabel("رقم واتساب الدولي").fill("970599123456");
  await page.getByRole("button", { name: "حفظ التغييرات" }).click();
  await page.goto("/product/p1");
  await page
    .getByRole("button", { name: "أضيفي إلى الحقيبة", exact: true })
    .click();
  await page.goto("/checkout");
  await page.getByRole("button", { name: "إرسال الطلب عبر واتساب" }).click();
  await expect(
    page.locator("#checkout-form input:invalid").first(),
  ).toBeVisible();
  await page.getByLabel("الاسم الكامل").fill("سارة أحمد");
  await page.getByLabel("رقم الهاتف").fill("0599000000");
  await page.getByLabel("المدينة / البلدة").fill("رام الله");
  await page.getByLabel("عنوان التوصيل الكامل").fill("شارع الإرسال، بناية 12");
  await page
    .getByLabel("منطقة التوصيل", { exact: true })
    .selectOption("west-bank");
  await page.evaluate(() => {
    (window as any).opened = "";
    window.open = (url?: string | URL) => {
      (window as any).opened = String(url);
      return null;
    };
  });
  await page.getByRole("button", { name: "إرسال الطلب عبر واتساب" }).click();
  await expect(
    page.getByText("طلبك جاهز للإرسال", { exact: true }),
  ).toBeVisible();
  const url = await page.evaluate(() => (window as any).opened as string);
  expect(url).toContain("https://wa.me/970599123456?text=");
  expect(decodeURIComponent(url)).toContain("الإجمالي: 115 ₪");
  await expect(page.locator(".success-panel")).toContainText(
    "فتح واتساب وحده لا يؤكد استلام الطلب",
  );
});
test("admin creates, edits, duplicates and deletes product; homepage updates", async ({
  page,
}) => {
  await page.goto("/elite-management-portal");
  await expect(
    page.getByRole("button", { name: "إدارة المنتجات", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "فتح لوحة تجريبية" }).click();
  await page
    .getByRole("button", { name: "إدارة المنتجات", exact: true })
    .click();
  await page.getByRole("button", { name: "إضافة منتج", exact: true }).click();
  await page.getByLabel("اسم المنتج").fill("قطعة اختبار");
  await page.getByLabel("رمز المنتج / SKU").fill("TEST-01");
  await page.getByLabel("السعر الأصلي").fill("50");
  await page.getByLabel("الكمية المتوفرة").fill("3");
  await page
    .locator(".editor-modal input[type=file]")
    .setInputFiles("public/images/rings.webp");
  await expect(page.locator(".upload-image img")).toBeVisible();
  await page.getByLabel("منشور للزوار").setChecked(true);
  await page.getByRole("button", { name: "حفظ المحتوى" }).click();
  await expect(page.locator(".editor-modal")).toHaveCount(0);
  await expect(page.locator("tbody")).toContainText("قطعة اختبار");
  await page
    .getByRole("button", { name: "تعديل قطعة اختبار", exact: true })
    .click();
  await page.getByLabel("اسم المنتج").fill("قطعة معدلة");
  await page.getByRole("button", { name: "حفظ المحتوى" }).click();
  await expect(page.locator("tbody")).toContainText("قطعة معدلة");
  await page
    .getByRole("button", { name: "نسخ قطعة معدلة", exact: true })
    .click();
  await expect(page.locator("tbody")).toContainText("قطعة معدلة — نسخة");
  await page
    .getByRole("button", { name: "حذف قطعة معدلة", exact: true })
    .click();
  await page.getByRole("button", { name: "تأكيد الحذف" }).click();
  await expect(
    page.getByRole("button", { name: "تعديل قطعة معدلة", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "إدارة الصفحة الرئيسية", exact: true })
    .click();
  await page.getByLabel("شريط الإعلان").fill("إعلان اختبار جديد");
  await page.getByRole("button", { name: "حفظ التغييرات" }).click();
  await page.goto("/");
  await expect(page.locator(".announcement")).toContainText(
    "إعلان اختبار جديد",
  );
});
test("category, banner and review image management", async ({ page }) => {
  await page.goto("/elite-management-portal");
  await page.getByRole("button", { name: "فتح لوحة تجريبية" }).click();
  await page
    .getByRole("button", { name: "إدارة الأصناف", exact: true })
    .click();
  await page.getByRole("button", { name: "إضافة صنف", exact: true }).click();
  await page.getByLabel("اسم الصنف").fill("صنف جديد");
  await page
    .locator(".editor-modal input[type=file]")
    .setInputFiles("public/images/earrings.webp");
  await expect(page.locator(".upload-image img")).toBeVisible();
  await page.getByLabel("منشور للزوار").setChecked(true);
  await page.getByRole("button", { name: "حفظ المحتوى" }).click();
  await expect(page.locator("tbody")).toContainText("صنف جديد");
  await page
    .getByRole("button", { name: "إدارة صور الواجهة", exact: true })
    .click();
  await page
    .getByRole("button", { name: "تعديل تفاصيل صغيرة، أناقة لا تُنسى." })
    .click();
  await page.getByLabel("العنوان", { exact: true }).fill("مجموعة اختبار");
  await page.getByRole("button", { name: "حفظ المحتوى" }).click();
  await page.getByRole("button", { name: "آراء الزبائن", exact: true }).click();
  await page.getByRole("button", { name: "إضافة رأي", exact: true }).click();
  await page
    .getByLabel("تعليق قصير")
    .fill("صورة اختبار فقط وليست رأيًا فعليًا");
  await page
    .locator(".editor-modal input[type=file]")
    .setInputFiles("public/images/rings.webp");
  await expect(page.locator(".upload-image img")).toBeVisible();
  await page.getByLabel("منشور للزوار").setChecked(true);
  await page.getByRole("button", { name: "حفظ المحتوى" }).click();
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "مجموعة اختبار" }),
  ).toBeVisible();
  await expect(page.locator(".category-text")).toContainText([
    "عقود وسلاسل",
    "أقراط",
    "خواتم",
    "ساعات",
    "صنف جديد",
  ]);
  await page.locator(".review-card").click();
  await expect(
    page.getByRole("dialog", { name: "صورة رأي زبونة" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
test("mobile RTL layout, search, menu and filtering", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: "/tmp/elite-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "فتح القائمة" }).click();
  await page
    .locator(".mobile-nav")
    .getByRole("link", { name: "جميع الإكسسوارات" })
    .click();
  await page.getByRole("button", { name: "تصفية", exact: true }).click();
  await page.getByRole("radio", { name: /أقراط/ }).click();
  await page.getByRole("button", { name: "عرض 2 قطعة" }).click();
  await expect(page.locator(".product-card")).toHaveCount(2);
  await page.getByRole("button", { name: "فتح البحث" }).click();
  await page
    .getByRole("textbox", { name: "ابحثي عن قطعة" })
    .last()
    .fill("خاتم");
  await expect(page.locator(".search-results a")).toHaveCount(2);
});
test("public content contains no emoji and internal links resolve", async ({
  page,
}) => {
  for (const path of [
    "/",
    "/shop",
    "/about",
    "/contact",
    "/info/delivery",
    "/info/care",
    "/info/privacy",
    "/cart",
    "/missing",
  ]) {
    await page.goto(path);
    const text = await page.locator("body").innerText();
    expect(text).not.toMatch(/\p{Extended_Pictographic}/u);
    expect(
      await page.evaluate(() => document.documentElement.getAttribute("dir")),
    ).toBe("rtl");
    expect(await page.locator("main").innerText()).not.toBe("");
  }
});
test("favorites, price sorting, availability and shared-stock limits", async ({
  page,
}) => {
  await page.goto("/product/p1");
  await page.getByRole("button", { name: "تبديل المفضلة" }).click();
  await page.goto("/shop?favorites=1");
  await expect(page.locator(".product-card")).toHaveCount(1);
  await page.goto("/shop?min=80&max=120&stock=1&sort=low");
  await expect(page.locator(".product-card")).toHaveCount(3);
  await expect(page.locator(".product-title").first()).toContainText("أقراط");
  await page.goto("/product/p1");
  for (let i = 0; i < 7; i++)
    await page
      .getByRole("button", { name: "زيادة الكمية", exact: true })
      .click();
  await page
    .getByRole("button", { name: "أضيفي إلى الحقيبة", exact: true })
    .click();
  await page.getByRole("button", { name: "فضي", exact: true }).click();
  await page
    .getByRole("button", { name: "أضيفي إلى الحقيبة", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("غير متوفرة");
  await page.goto("/cart");
  await expect(page.locator(".cart-item")).toHaveCount(1);
  await page.goto("/product/p7");
  await expect(
    page.getByRole("button", { name: "أضيفي إلى الحقيبة", exact: true }),
  ).toBeDisabled();
});
test("image validation, cropping, section visibility and mobile admin", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/elite-management-portal");
  await page.getByRole("button", { name: "فتح لوحة تجريبية" }).click();
  await page.screenshot({
    path: "/tmp/elite-admin-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "قائمة الإدارة" }).click();
  await page.getByRole("button", { name: "آراء الزبائن", exact: true }).click();
  await page.getByRole("button", { name: "إضافة رأي", exact: true }).click();
  await page.locator(".editor-modal input[type=file]").setInputFiles({
    name: "not-image.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("not an image"),
  });
  await expect(page.getByRole("status")).toContainText("الملفات المسموحة");
  await page
    .locator(".editor-modal input[type=file]")
    .setInputFiles("public/images/rings.webp");
  await expect(page.locator(".upload-image img")).toBeVisible();
  const before = await page.locator(".upload-image img").getAttribute("src");
  await page.getByRole("button", { name: "قص الصورة", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "قص الصورة" })).toBeVisible();
  await page.getByLabel("التقريب").focus();
  await page.getByLabel("التقريب").press("End");
  await page.getByRole("button", { name: "حفظ القص" }).click();
  await expect(page.getByRole("dialog", { name: "قص الصورة" })).toHaveCount(0);
  await expect(page.locator(".upload-image img")).not.toHaveAttribute(
    "src",
    before!,
  );
  await page.getByRole("button", { name: "إغلاق المحرر" }).click();
  await page.getByRole("button", { name: "قائمة الإدارة" }).click();
  await page
    .getByRole("button", { name: "إدارة الصفحة الرئيسية", exact: true })
    .click();
  await page.getByLabel("العروض", { exact: true }).uncheck();
  await page.getByRole("button", { name: "حفظ التغييرات" }).click();
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "قطع مميّزة، بفرصة أجمل." }),
  ).toHaveCount(0);
});
test("carousel keyboard controls and independent desktop owner layout", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "الصورة 3", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "اختيارات مُميّزة، للحظاتك الأجمل." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "إيقاف العرض التلقائي" }).click();
  await expect(
    page.getByRole("button", { name: "تشغيل العرض التلقائي" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "فتح البحث" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.goto("/elite-management-portal");
  await page.getByRole("button", { name: "فتح لوحة تجريبية" }).click();
  await page.screenshot({
    path: "/tmp/elite-admin-desktop.png",
    fullPage: true,
    animations: "disabled",
  });
});
test("mobile product gallery, cart and checkout remain usable at 360px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/product/p1");
  await page
    .getByRole("button", { name: "صورة المنتج 2", exact: true })
    .click();
  await expect(page.locator(".detail-image img")).toHaveAttribute(
    "src",
    "/images/hero.webp",
  );
  await page
    .getByRole("button", { name: "أضيفي إلى الحقيبة", exact: true })
    .click();
  await page.goto("/cart");
  await page
    .getByLabel("منطقة التوصيل", { exact: true })
    .selectOption("west-bank");
  await expect(page.locator(".summary-row.total")).toContainText("115");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "متابعة لإتمام الطلب" }).click();
  await expect(page.getByLabel("الاسم الكامل")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "/tmp/elite-checkout-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
});
