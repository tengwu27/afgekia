"use server";

import { revalidatePath } from "next/cache";

import { writeAuditEvent } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth";
import { generateTemporaryPassword } from "@/lib/security";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createOwnerSchema } from "@/lib/validation";
import type { CredentialActionState } from "@/types/domain";

function fail(message: string): never { throw new Error(message); }

export async function createOwnerAction(
  _previous: CredentialActionState,
  formData: FormData,
): Promise<CredentialActionState> {
  const auth = await requireAdmin();
  const parsed = createOwnerSchema.safeParse({ fullName: formData.get("fullName"), email: formData.get("email"), timezone: formData.get("timezone") });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Invalid owner account." };
  const temporaryPassword = generateTemporaryPassword();
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: temporaryPassword,
    email_confirm: true,
    app_metadata: { role: "owner", must_change_password: true },
    user_metadata: { full_name: parsed.data.fullName, timezone: parsed.data.timezone },
  });
  if (error || !data.user) return { status: "error", message: error?.message ?? "Owner account creation failed." };
  const supabase = await createSupabaseServerClient();
  const { error: listingError } = await supabase.from("owner_project_types").insert({ owner_id: data.user.id, project_type: "real_estate_listing", display_name: parsed.data.fullName, listed: true, display_order: 100 });
  if (listingError) return { status: "error", message: "The owner was created, but their listing eligibility needs attention." };
  await writeAuditEvent(supabase, { actorId: auth.userId, action: "owner.created", entityType: "profile", entityId: data.user.id });
  revalidatePath("/admin/owners");
  revalidatePath("/request");
  revalidatePath("/book");
  return { status: "success", message: "Owner created. Copy the temporary password now.", email: parsed.data.email, temporaryPassword };
}

export async function activateClientAction(clientId: string, _formData: FormData) {
  void _formData;
  const auth = await requireAdmin();
  const admin = createSupabaseAdminClient();
  const { data: target } = await admin.from("profiles").select("id, role, state").eq("id", clientId).maybeSingle();
  if (!target || target.role !== "client" || target.state !== "pending") fail("Pending client not found.");
  const { error: authError } = await admin.auth.admin.updateUserById(clientId, { email_confirm: true });
  if (authError) fail(authError.message);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("profiles").update({ state: "active" }).eq("id", clientId).eq("state", "pending");
  if (error) fail(error.message);
  await writeAuditEvent(supabase, { actorId: auth.userId, action: "client.activated", entityType: "profile", entityId: clientId });
  revalidatePath("/admin/registrations");
}

export async function setAccountStateAction(memberId: string, nextState: "active" | "suspended", _formData: FormData) {
  void _formData;
  const auth = await requireAdmin();
  if (memberId === auth.userId) fail("You cannot change your own access state.");
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("profiles").update({ state: nextState }).eq("id", memberId).neq("role", "admin").select("id, role").maybeSingle();
  if (error || !data) fail(error?.message ?? "Account not found.");
  await writeAuditEvent(supabase, { actorId: auth.userId, action: `account.${nextState}`, entityType: "profile", entityId: memberId, details: { role: data.role } });
  revalidatePath("/admin/owners");
  revalidatePath("/admin/registrations");
}

export async function toggleOwnerListingAction(ownerId: string, listed: boolean, _formData: FormData) {
  void _formData;
  const auth = await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("owner_project_types").update({ listed: !listed }).eq("owner_id", ownerId).eq("project_type", "real_estate_listing");
  if (error) fail(error.message);
  await writeAuditEvent(supabase, { actorId: auth.userId, action: listed ? "owner.delisted" : "owner.listed", entityType: "profile", entityId: ownerId });
  revalidatePath("/admin/owners"); revalidatePath("/request"); revalidatePath("/book");
}

export async function resetOwnerPasswordAction(
  _previous: CredentialActionState,
  formData: FormData,
): Promise<CredentialActionState> {
  await requireAdmin();
  const ownerId = String(formData.get("memberId") ?? "");
  const admin = createSupabaseAdminClient();
  const { data: owner } = await admin.from("profiles").select("email, role").eq("id", ownerId).maybeSingle();
  if (!owner || owner.role !== "owner") return { status: "error", message: "Owner not found." };
  const temporaryPassword = generateTemporaryPassword();
  const { error } = await admin.auth.admin.updateUserById(ownerId, { password: temporaryPassword });
  if (error) return { status: "error", message: error.message };
  await admin.from("profiles").update({ must_change_password: true }).eq("id", ownerId);
  return { status: "success", message: "Temporary password issued. Copy it now.", email: owner.email, temporaryPassword };
}
