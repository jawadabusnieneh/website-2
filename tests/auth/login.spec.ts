import { test, expect, type Page } from "@playwright/test";
const id = "11111111-1111-4111-8111-111111111111";
const user = {
  id,
  aud: "authenticated",
  role: "authenticated",
  email: "owner@example.test",
  email_confirmed_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  app_metadata: { provider: "email" },
  user_metadata: {},
};
const token = () =>
  [
    Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString(
      "base64url",
    ),
    Buffer.from(
      JSON.stringify({
        sub: id,
        aud: "authenticated",
        role: "authenticated",
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    ).toString("base64url"),
    "test-signature",
  ].join(".");
async function prepare(page: Page, mode: string) {
  await page.routeWebSocket("wss://elite-auth-test.invalid/**", (socket) =>
    socket.close(),
  );
  await page.route("https://elite-auth-test.invalid/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/auth/v1/token") {
      if (mode === "network") {
        await route.abort("failed");
        return;
      }
      if (
        [
          "email_not_confirmed",
          "invalid_credentials",
          "legacy_unconfirmed",
          "legacy_credentials",
        ].includes(mode)
      ) {
        const unconfirmed =
          mode.includes("unconfirmed") || mode === "email_not_confirmed";
        const code = unconfirmed
          ? "email_not_confirmed"
          : "invalid_credentials";
        await route.fulfill({
          status: 400,
          headers: mode.startsWith("legacy_")
            ? {}
            : { "X-Supabase-Api-Version": "2024-01-01" },
          json: {
            code,
            msg: unconfirmed
              ? "Email not confirmed"
              : "Invalid login credentials",
          },
        });
        return;
      }
      if (mode === "wrong_path") {
        await route.fulfill({ status: 404, json: { message: "Not found" } });
        return;
      }
      if (mode === "unexpected_reply") {
        await route.fulfill({
          status: 400,
          contentType: "text/html",
          body: "<!doctype html><title>Not an auth response</title>",
        });
        return;
      }
      if (mode === "unknown_error") {
        await route.fulfill({
          status: 418,
          json: { message: "Unrecognized response without account details" },
        });
        return;
      }
      if (mode === "rate_limit") {
        await route.fulfill({
          status: 429,
          json: { message: "Too many requests" },
        });
        return;
      }
      if (mode === "unavailable") {
        await route.fulfill({
          status: 503,
          json: { message: "Service unavailable" },
        });
        return;
      }
      if (mode === "invalid_key") {
        await route.fulfill({
          status: 401,
          json: { message: "Invalid API key" },
        });
        return;
      }
      await route.fulfill({
        status: 200,
        json: {
          access_token: token(),
          refresh_token: "test-refresh-token",
          token_type: "bearer",
          expires_in: 3600,
          user,
        },
      });
      return;
    }
    if (url.pathname === "/auth/v1/user") {
      await route.fulfill({ status: 200, json: user });
      return;
    }
    if (url.pathname === "/auth/v1/logout") {
      await route.fulfill({ status: 204 });
      return;
    }
    if (url.pathname === "/rest/v1/owners") {
      if (mode === "membership_error") {
        await route.fulfill({
          status: 403,
          json: { code: "42501", message: "permission denied" },
        });
        return;
      }
      await route.fulfill({
        status: 200,
        json: mode === "not_owner" ? [] : [{ user_id: id }],
      });
      return;
    }
    await route.fulfill({ status: 200, json: [] });
  });
  await page.goto("/elite-management-portal");
  await page.getByLabel("البريد الإلكتروني").fill("owner@example.test");
  await page.getByLabel("كلمة المرور", { exact: true }).fill("test-password");
}
for (const [mode, message] of [
  ["email_not_confirmed", "غير مؤكّد"],
  ["wrong_path", "HTTP 404 / AuthApiError"],
  ["unexpected_reply", "AuthUnknownError"],
  ["unknown_error", "HTTP 418 / AuthApiError"],
  ["legacy_unconfirmed", "غير مؤكّد"],
  ["legacy_credentials", "لم يقبل مشروع Supabase"],
  ["rate_limit", "عدد محاولات"],
  ["unavailable", "غير متاحة"],
  ["invalid_credentials", "لم يقبل مشروع Supabase"],
  ["invalid_key", "إعدادات ربط"],
  ["network", "تعذّر الاتصال"],
  ["not_owner", "غير مخوّل"],
  ["membership_error", "تعذّر فحص صلاحية المالك"],
]) {
  test(`owner login diagnoses ${mode} without granting access`, async ({
    page,
  }) => {
    await prepare(page, mode);
    await page
      .getByRole("button", { name: "تسجيل الدخول", exact: true })
      .click();
    await expect(page.getByRole("alert")).toContainText(message);
    await expect(page.locator(".admin-shell")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "تسجيل الدخول", exact: true }),
    ).toBeEnabled();
  });
}
test("verified owner can enter the dashboard", async ({ page }) => {
  await prepare(page, "owner");
  await page.getByRole("button", { name: "تسجيل الدخول", exact: true }).click();
  await expect(page.locator(".admin-shell")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "إدارة المنتجات", exact: true }),
  ).toBeVisible();
});
test("owner can check password visibility and the configured project without exposing keys", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await prepare(page, "invalid_credentials");
  const input = page.getByLabel("كلمة المرور", { exact: true });
  await expect(input).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "إظهار كلمة المرور" }).click();
  await expect(input).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "إخفاء كلمة المرور" }).click();
  await expect(input).toHaveAttribute("type", "password");
  await page.getByText("تفاصيل الاتصال", { exact: true }).click();
  await expect(page.locator(".login-connection")).toContainText(
    "elite-auth-test.invalid",
  );
  await expect(page.locator("body")).not.toContainText("test-only-public-key");
  await page.screenshot({
    path: "/tmp/elite-owner-login.png",
    fullPage: true,
    animations: "disabled",
  });
});
