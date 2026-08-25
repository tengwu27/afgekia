"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";

import { hasExceededRegistrationThrottle } from "@/lib/registration-security";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { registrationSchema, zodFieldErrors } from "@/lib/validation";
import type { ActionState } from "@/types/domain";

const genericSuccess: ActionState = {
  status: "success",
  message: "Registration received. An administrator will review your account before you can sign in.",
};

function digest(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export async function registerClientAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = registrationSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    timezone: formData.get("timezone"),
    privacyConsent: formData.get("privacyConsent"),
    formStartedAt: formData.get("formStartedAt"),
    website: formData.get("website") ?? "",
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please review the registration fields.",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }

  const requestHeaders = await headers();
  const forwarded = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ipHash = digest(forwarded || "unknown");
  const emailHash = digest(parsed.data.email);
  const admin = createSupabaseAdminClient();
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [ipResult, emailResult] = await Promise.all([
    admin.from("registration_attempts").select("id", { count: "exact", head: true }).eq("ip_hash", ipHash).gte("created_at", hourAgo),
    admin.from("registration_attempts").select("id", { count: "exact", head: true }).eq("email_hash", emailHash).gte("created_at", dayAgo),
  ]);
  if (ipResult.error || emailResult.error) {
    return { status: "error", message: "Registration is temporarily unavailable. Please try again." };
  }
  if (hasExceededRegistrationThrottle(ipResult.count ?? 0, emailResult.count ?? 0)) {
    return { status: "error", message: "Too many registration attempts. Please try again later." };
  }
  const { error: attemptError } = await admin.from("registration_attempts").insert({ ip_hash: ipHash, email_hash: emailHash });
  if (attemptError) {
    return { status: "error", message: "Registration is temporarily unavailable. Please try again." };
  }

  const consentAt = new Date().toISOString();
  const { error } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: false,
    app_metadata: { role: "client", must_change_password: false },
    user_metadata: {
      full_name: parsed.data.fullName,
      timezone: parsed.data.timezone,
      privacy_consent_at: consentAt,
    },
  });

  if (error && !/already|registered|exists/i.test(error.message)) {
    return { status: "error", message: "Registration is temporarily unavailable. Please try again." };
  }
  return genericSuccess;
}
