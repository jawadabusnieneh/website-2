import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  authDiagnostic,
  ownerLoginError,
  signInOwner,
} from "../src/lib/owner-auth";

function setup() {
  const signIn = vi.fn().mockResolvedValue({ error: null });
  const getUser = vi
    .fn()
    .mockResolvedValue({ data: { user: { id: "owner-uuid" } }, error: null });
  const signOut = vi.fn().mockResolvedValue({ error: null });
  const maybeSingle = vi
    .fn()
    .mockResolvedValue({ data: { user_id: "owner-uuid" }, error: null });
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ select });
  const client = {
    auth: { signInWithPassword: signIn, getUser, signOut },
    from,
  } as unknown as SupabaseClient;
  return { client, signIn, getUser, signOut, maybeSingle, eq, from };
}
describe("owner authentication", () => {
  it("checks the authenticated user membership and preserves password whitespace", async () => {
    const t = setup();
    await signInOwner(t.client, " owner@example.test ", " test password ");
    expect(t.signIn).toHaveBeenCalledWith({
      email: "owner@example.test",
      password: " test password ",
    });
    expect(t.getUser).toHaveBeenCalledOnce();
    expect(t.eq).toHaveBeenCalledWith("user_id", "owner-uuid");
    expect(t.signOut).not.toHaveBeenCalled();
  });
  it("does not query ownership when credentials are rejected", async () => {
    const t = setup();
    t.signIn.mockResolvedValue({
      error: { code: "invalid_credentials", status: 400 },
    });
    await expect(
      signInOwner(t.client, "owner@example.test", "test"),
    ).rejects.toThrow("لم يقبل مشروع Supabase");
    expect(t.from).not.toHaveBeenCalled();
  });
  it("distinguishes unconfirmed email from credentials", async () => {
    const t = setup();
    t.signIn.mockResolvedValue({
      error: { code: "email_not_confirmed", status: 400 },
    });
    await expect(
      signInOwner(t.client, "owner@example.test", "test"),
    ).rejects.toThrow("غير مؤكّد");
  });
  it("denies and locally signs out valid accounts without owner membership", async () => {
    const t = setup();
    t.maybeSingle.mockResolvedValue({ data: null, error: null });
    await expect(
      signInOwner(t.client, "owner@example.test", "test"),
    ).rejects.toThrow("غير مخوّل");
    expect(t.signOut).toHaveBeenCalledWith({ scope: "local" });
  });
  it("does not misreport ownership lookup failures as missing membership", async () => {
    const t = setup();
    t.maybeSingle.mockResolvedValue({ data: null, error: { code: "42501" } });
    await expect(
      signInOwner(t.client, "owner@example.test", "test"),
    ).rejects.toThrow("تعذّر فحص صلاحية المالك");
    expect(t.signOut).toHaveBeenCalledWith({ scope: "local" });
  });
  it("rejects failed user verification before querying membership", async () => {
    const t = setup();
    t.getUser.mockResolvedValue({
      data: { user: null },
      error: { code: "bad_jwt", status: 401 },
    });
    await expect(
      signInOwner(t.client, "owner@example.test", "test"),
    ).rejects.toThrow("جلسة الدخول");
    expect(t.from).not.toHaveBeenCalled();
    expect(t.signOut).toHaveBeenCalled();
  });
  it("translates thrown network failures", async () => {
    const t = setup();
    t.signIn.mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(
      signInOwner(t.client, "owner@example.test", "test"),
    ).rejects.toThrow("تعذّر الاتصال");
  });
});
describe("safe authentication diagnostics", () => {
  it.each([
    [{ message: "Invalid API key", status: 401 }, "إعدادات ربط"],
    [{ name: "AuthRetryableFetchError", status: 0 }, "تعذّر الاتصال"],
    [{ code: "over_request_rate_limit", status: 429 }, "عدد محاولات"],
    [{ code: "user_banned", status: 403 }, "موقوف"],
    [{ code: "email_provider_disabled", status: 400 }, "غير مفعّل"],
    [{ status: 503 }, "غير متاحة"],
  ])(
    "identifies the prerequisite without blaming the password (%j)",
    (failure, expected) => expect(ownerLoginError(failure)).toContain(expected),
  );
  it("does not display raw errors or credentials", () =>
    expect(
      ownerLoginError({ message: "sensitive raw provider detail" }),
    ).not.toContain("sensitive"));
});

describe("unknown provider diagnostics", () => {
  it("reports status and error type without serializing provider values", () => {
    const failure = {
      status: 418,
      name: "AuthApiError",
      message: "private provider body",
      code: "sb_secret_example",
    };
    expect(ownerLoginError(failure)).toContain("HTTP 418 / AuthApiError");
    expect(ownerLoginError(failure)).not.toContain("private provider body");
    expect(ownerLoginError(failure)).not.toContain("sb_secret");
  });
  it("retains provider machine codes while excluding credential-like values", () => {
    expect(
      authDiagnostic({
        status: 400,
        name: "AuthApiError",
        code: "validation_failed",
      }),
    ).toContain("validation_failed");
    expect(
      authDiagnostic({
        status: 401,
        name: "AuthApiError",
        code: "sb_publishable_example",
      }),
    ).not.toContain("sb_publishable");
    expect(
      authDiagnostic({
        status: 401,
        name: "AuthApiError",
        code: "eyJhbGciOiJIUzI1NiJ9.signature",
      }),
    ).not.toContain("eyJ");
  });
  it("rejects untrusted names and statuses in diagnostic output", () => {
    expect(
      authDiagnostic({ name: "private provider detail", status: 9999 }),
    ).toBe("HTTP unknown / UnknownError");
  });
  it("distinguishes a wrong endpoint and non-JSON replies", () => {
    expect(ownerLoginError({ name: "AuthApiError", status: 404 })).toContain(
      "عنوان خدمة",
    );
    expect(ownerLoginError({ name: "AuthUnknownError" })).toContain(
      "استجابة غير صالحة",
    );
  });
});
