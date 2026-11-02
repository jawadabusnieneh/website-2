import { test, expect } from "@playwright/test";

test("RTL filters stay inside the sidebar and mobile drawer", async ({
  page,
}) => {
  for (const width of [1770, 1280, 1024, 820, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/shop");
    await page.evaluate(() => document.fonts.ready);
    if (width <= 700) {
      await page.getByRole("button", { name: "تصفية", exact: true }).click();
    }
    const overflow = await page.locator(".filters").evaluate((sidebar) => {
      const bounds = sidebar.getBoundingClientRect();
      return Array.from(
        sidebar.querySelectorAll<HTMLElement>(
          "input, legend, .radio-label, .filter-option-name, .price-range",
        ),
      ).flatMap((element) => {
        const box = element.getBoundingClientRect();
        return box.left < bounds.left - 1 || box.right > bounds.right + 1
          ? [
              `${element.getAttribute("aria-label") || element.textContent?.trim() || element.tagName}: ${Math.round(box.left)}..${Math.round(box.right)}, sidebar ${Math.round(bounds.left)}..${Math.round(bounds.right)}`,
            ]
          : [];
      });
    });
    expect(overflow, `Filter controls overflow at ${width}px`).toEqual([]);
    await expect(
      page.getByRole("radio", { name: "جميع القطع", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("spinbutton", { name: "السعر من" }),
    ).toBeVisible();
    await expect(
      page.getByRole("spinbutton", { name: "السعر إلى" }),
    ).toBeVisible();
    for (const name of ["السعر من", "السعر إلى"]) {
      const bounds = await page.getByRole("spinbutton", { name }).boundingBox();
      expect(
        bounds?.width,
        `${name} must remain usable at ${width}px`,
      ).toBeGreaterThanOrEqual(60);
    }
    await page.getByRole("spinbutton", { name: "السعر من" }).fill("80");
    await page.getByRole("spinbutton", { name: "السعر إلى" }).fill("120");
    await expect(page.locator(".product-card")).toHaveCount(3);
    if (width <= 700) {
      await page.getByRole("button", { name: "عرض 3 قطعة" }).click();
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});
