import { describe, expect, it, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { normalizeSupabaseUrl } from "../src/lib/supabase-config";

describe("Supabase project URL configuration", () => {
  it.each([
    "",
    "/",
    "/rest/v1",
    "/rest/v1/",
    "/auth/v1",
    "/storage/v1",
    "/graphql/v1",
  ])(
    "uses the hosted project origin when an API path was copied (%s)",
    (path) => {
      expect(
        normalizeSupabaseUrl(
          " https://exampleproject.supabase.co" + path + " ",
        ),
      ).toBe("https://exampleproject.supabase.co");
    },
  );
  it("preserves custom gateways and demo mode", () => {
    expect(normalizeSupabaseUrl("https://gateway.example.test/supabase")).toBe(
      "https://gateway.example.test/supabase",
    );
    expect(normalizeSupabaseUrl("http://localhost:54321")).toBe(
      "http://localhost:54321",
    );
    expect(normalizeSupabaseUrl(" ")).toBeUndefined();
  });
  it("sends SDK sign-in requests to the project auth endpoint after normalization", async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            code: "invalid_credentials",
            message: "Invalid login credentials",
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              "X-Supabase-Api-Version": "2024-01-01",
            },
          },
        ),
    );
    const client = createClient(
      normalizeSupabaseUrl("https://exampleproject.supabase.co/rest/v1")!,
      "test-only-public-key",
      {
        global: { fetch: fetcher },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      },
    );
    const { error } = await client.auth.signInWithPassword({
      email: "owner@example.test",
      password: "test-only-password",
    });
    expect(fetcher).toHaveBeenCalledOnce();
    expect(fetcher.mock.calls[0]?.[0]).toBe(
      "https://exampleproject.supabase.co/auth/v1/token?grant_type=password",
    );
    expect(error?.code).toBe("invalid_credentials");
  });
});
