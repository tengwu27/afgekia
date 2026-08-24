"use server";

import { redirect } from "next/navigation";
import type { Route } from "next";

import { writeAuditEvent } from "@/lib/audit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { changePasswordSchema, loginSchema, zodFieldErrors } from "@/lib/validation";
import type { ActionState } from "@/types/domain";

export async function loginAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password"), next: formData.get("next") || undefined });
  if (!parsed.success) return { status: "error", message: "Check your email and password.", fieldErrors: zodFieldErrors(parsed.error) };
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
  if (error || !data.user) return { status: "error", message: "Those credentials were not recognized." };
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).single();
  if (!profile || profile.state !== "active") {
    await supabase.auth.signOut();
    return { status: "error", message: "This account is suspended. Contact the site owner." };
  }
  await writeAuditEvent(supabase, { actorId: data.user.id, action: "auth.signed_in", entityType: "profile", entityId: data.user.id });
  let destination: Route = profile.must_change_password ? "/account/security" : profile.role === "client" ? "/portal" : "/admin";
  if (parsed.data.next?.startsWith("/") && !parsed.data.next.startsWith("//") && !profile.must_change_password) destination = parsed.data.next as Route;
  redirect(destination);
}

export async function logoutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function changePasswordAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = changePasswordSchema.safeParse({ currentPassword: formData.get("currentPassword"), newPassword: formData.get("newPassword"), confirmPassword: formData.get("confirmPassword") });
  if (!parsed.success) return { status: "error", message: "Please review the password fields.", fieldErrors: zodFieldErrors(parsed.error) };
  const supabase = await createSupabaseServerClient();
  const { data: claims } = await supabase.auth.getClaims();
  const email = typeof claims?.claims?.email === "string" ? claims.claims.email : null;
  const userId = typeof claims?.claims?.sub === "string" ? claims.claims.sub : null;
  if (!email || !userId) return { status: "error", message: "Your session expired. Sign in again." };
  const { error: verifyError } = await supabase.auth.signInWithPassword({ email, password: parsed.data.currentPassword });
  if (verifyError) return { status: "error", message: "The current password is not correct.", fieldErrors: { currentPassword: ["Enter the temporary or current password."] } };
  const { error: updateError } = await supabase.auth.updateUser({ password: parsed.data.newPassword });
  if (updateError) return { status: "error", message: updateError.message };
  const admin = createSupabaseAdminClient();
  const { error: profileError } = await admin.from("profiles").update({ must_change_password: false }).eq("id", userId);
  if (profileError) return { status: "error", message: "The password changed, but the account flag did not update. Contact an administrator." };
  await writeAuditEvent(supabase, { actorId: userId, action: "auth.password_changed", entityType: "profile", entityId: userId });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).single();
  redirect(profile?.role === "client" ? "/portal" : "/admin");
}
