import type { SupabaseClient } from "@supabase/supabase-js";

interface AuthFailure {
  code?: string;
  status?: number;
  name?: string;
  message?: string;
}

/** Translate provider outcomes without echoing tokens, passwords or raw errors. */
export function ownerLoginError(error: unknown): string {
  const failure = (error ?? {}) as AuthFailure;
  const message = failure.message ?? "";
  if (
    failure.code === "email_not_confirmed" ||
    /email (?:address )?not confirmed/i.test(message)
  ) {
    return "البريد الإلكتروني لهذا الحساب غير مؤكّد. افتح المستخدم في Supabase → Authentication → Users وأكّد بريده قبل تسجيل الدخول.";
  }
  if (failure.code === "user_banned") {
    return "حساب المستخدم موقوف في Supabase. راجع حالته في Authentication → Users.";
  }
  if (failure.code === "email_provider_disabled") {
    return "تسجيل الدخول بالبريد غير مفعّل في مشروع Supabase المرتبط. فعّل مزوّد Email من إعدادات Authentication.";
  }
  if (failure.status === 429 || failure.code?.startsWith("over_")) {
    return "تم تجاوز عدد محاولات تسجيل الدخول المسموح. انتظر قليلًا ثم حاول مجددًا.";
  }
  if (
    failure.code === "invalid_api_key" ||
    /invalid api[ _-]?key|no api[ _-]?key/i.test(message)
  ) {
    return "إعدادات ربط Supabase غير صحيحة. تأكّد أن رابط المشروع والمفتاح العام في Cloudflare مأخوذان من المشروع نفسه، ثم أعد بناء الموقع.";
  }
  if ((failure.status ?? 0) >= 500) {
    return "خدمة تسجيل الدخول في Supabase غير متاحة حاليًا. حاول مجددًا بعد قليل.";
  }
  if (
    failure.name === "AuthRetryableFetchError" ||
    failure.status === 0 ||
    /failed to fetch|networkerror|network request failed|load failed/i.test(
      message,
    )
  ) {
    return "تعذّر الاتصال بخادم تسجيل الدخول. تحقّق من الاتصال ومن رابط مشروع Supabase في تفاصيل الاتصال أدناه.";
  }
  if (
    failure.code === "invalid_credentials" ||
    /invalid login credentials/i.test(message)
  ) {
    return "لم يقبل مشروع Supabase المرتبط بيانات الدخول. تأكّد أن المستخدم موجود في المشروع الظاهر بتفاصيل الاتصال، واستخدم كلمة مرور حساب Authentication نفسه.";
  }
  if (failure.code === "bad_jwt" || failure.code === "session_expired") {
    return "تعذّر التحقق من جلسة الدخول. حدّث الصفحة وسجّل الدخول مجددًا.";
  }
  return "تعذّر إتمام تسجيل الدخول. راجع حالة المستخدم وسجل Authentication في مشروع Supabase المرتبط.";
}

export class OwnerSignInError extends Error {}

export async function signInOwner(
  client: SupabaseClient,
  email: string,
  password: string,
): Promise<void> {
  const { error } = await client.auth
    .signInWithPassword({
      email: email.trim(),
      // Password whitespace can be intentional: never modify the password.
      password,
    })
    .catch((failure: unknown) => {
      throw new OwnerSignInError(ownerLoginError(failure));
    });
  if (error) throw new OwnerSignInError(ownerLoginError(error));

  try {
    const { data, error: verificationError } = await client.auth.getUser();
    if (verificationError)
      throw new OwnerSignInError(ownerLoginError(verificationError));
    if (!data.user)
      throw new OwnerSignInError(
        "تعذّر التحقق من جلسة تسجيل الدخول. حاول مجددًا.",
      );
    const { data: member, error: membershipError } = await client
      .from("owners")
      .select("user_id")
      .eq("user_id", data.user.id)
      .maybeSingle();
    if (membershipError) {
      throw new OwnerSignInError(
        "تم التحقق من الحساب، لكن تعذّر فحص صلاحية المالك. راجع جدول owners وصلاحياته في مشروع Supabase المرتبط.",
      );
    }
    if (!member) {
      throw new OwnerSignInError(
        "تم التحقق من الحساب، لكنه غير مخوّل لإدارة المتجر. أضف User UID لهذا الحساب إلى جدول owners في المشروع نفسه.",
      );
    }
  } catch (failure) {
    // A valid password alone never grants access to the owner dashboard.
    // Clear this device's session after verification or authorization fails.
    await client.auth.signOut({ scope: "local" }).catch(() => undefined);
    throw failure instanceof OwnerSignInError
      ? failure
      : new OwnerSignInError(ownerLoginError(failure));
  }
}
