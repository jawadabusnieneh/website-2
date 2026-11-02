import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ownerLoginError, signInOwner } from "../src/lib/owner-auth";

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
