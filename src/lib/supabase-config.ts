/** Hosted Supabase APIs all share the project's origin. Copying a REST/Auth
 * endpoint from the dashboard must not append /auth/v1 twice during login. */
export function normalizeSupabaseUrl(
  value: string | undefined,
): string | undefined {
  const raw = value?.trim();
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    if (url.protocol === "https:" && url.hostname.endsWith(".supabase.co")) {
      return url.origin;
    }
  } catch {
    // createClient retains responsibility for rejecting malformed URLs.
  }
  // Preserve custom gateway paths and local development endpoints.
  return raw;
}
