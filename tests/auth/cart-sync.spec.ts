import { expect, test, type BrowserContext } from "@playwright/test";
import { demoData } from "../../src/lib/demo";
import type { Product } from "../../src/types";
const initialCart = [
  { productId: "p1", quantity: 1, color: "ذهبي", size: "" },
  { productId: "p1", quantity: 1, color: "فضي", size: "" },
  { productId: "p2", quantity: 1, color: "ذهبي", size: "" },
];
interface State {
  products: Product[];
  fail: boolean;
  gate?: Promise<void>;
}
async function mockStore(context: BrowserContext, state: State) {
  await context.addInitScript(
    (items) => localStorage.setItem("elite-cart", JSON.stringify(items)),
    initialCart,
  );
  await context.routeWebSocket("wss://elite-auth-test.invalid/**", (socket) =>
    socket.close(),
  );
  await context.route("https://elite-auth-test.invalid/**", async (route) => {
    const table = new URL(route.request().url()).pathname.split("/").pop();
    if (table === "products") {
      if (state.gate) await state.gate;
      if (state.fail)
        return route.fulfill({ status: 500, json: { message: "unavailable" } });
      return route.fulfill({
        json: state.products
          .filter((p) => p.visible)
          .map((p) => ({ id: p.id, payload: p })),
      });
    }
    const records =
      table === "categories"
        ? demoData.categories
        : table === "settings"
          ? [demoData.settings]
          : [];
    await route.fulfill({
      json: records.map((record) => ({ id: record.id, payload: record })),
    });
  });
}

test("hidden and deleted products are removed from two independent saved carts without realtime", async ({
  browser,
}) => {
  const state: State = { products: demoData.products.slice(0, 2), fail: false };
  const contexts = await Promise.all([
    browser.newContext(),
    browser.newContext(),
  ]);
  try {
    const pages = await Promise.all(
      contexts.map(async (context) => {
        await mockStore(context, state);
        const page = await context.newPage();
        await page.clock.install();
        await page.goto("http://127.0.0.1:5174/cart");
        await expect(page.locator(".cart-item")).toHaveCount(3);
        return page;
      }),
    );
    state.products = state.products.map((product) =>
      product.id === "p1" ? { ...product, visible: false } : product,
    );
    for (const page of pages) {
      await page.clock.runFor(15050);
      await expect(page.locator(".cart-item")).toHaveCount(1);
      await expect(page.locator(".cart-item")).toContainText(
        "أقراط الهالة الذهبية",
      );
      expect(
        await page.evaluate(() =>
          JSON.parse(localStorage.getItem("elite-cart")!),
        ),
      ).toEqual([initialCart[2]]);
      await expect(page.locator(".cart-count")).toHaveText("1");
      await expect(page.locator(".summary-row.total")).toContainText("85 ₪");
    }
    state.products = [];
    for (const page of pages) {
      await page.clock.runFor(15050);
      await expect(
        page.getByRole("heading", { name: "حقيبتك تنتظر تفاصيلك" }),
      ).toBeVisible();
      expect(
        await page.evaluate(() =>
          JSON.parse(localStorage.getItem("elite-cart")!),
        ),
      ).toEqual([]);
      await expect(page.locator(".cart-count")).toHaveText("0");
    }
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
  }
});

test("pending and failed catalog requests never erase a saved cart; a successful retry cleans it", async ({
  page,
  context,
}) => {
  let release!: () => void;
  const state: State = {
    products: [demoData.products[1]],
    fail: true,
    gate: new Promise<void>((resolve) => {
      release = resolve;
    }),
  };
  await mockStore(context, state);
  await page.goto("/cart");
  await expect(page.getByText("جارٍ تحميل مختارات إيليت...")).toBeVisible();
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem("elite-cart")!)),
  ).toEqual(initialCart);
  release();
  await expect(page.locator(".error-banner")).toBeVisible();
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem("elite-cart")!)),
  ).toEqual(initialCart);
  state.fail = false;
  await page
    .getByRole("button", { name: "إعادة المحاولة", exact: true })
    .click();
  await expect(page.locator(".cart-item")).toHaveCount(1);
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem("elite-cart")!)),
  ).toEqual([initialCart[2]]);
  state.fail = true;
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.locator(".error-banner")).toBeVisible();
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem("elite-cart")!)),
  ).toEqual([initialCart[2]]);
});
