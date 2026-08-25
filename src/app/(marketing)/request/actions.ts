"use server";

import { revalidatePath } from "next/cache";

import { writeAuditEvent } from "@/lib/audit";
import { requireClientWorkspace } from "@/lib/auth";
import { generateProjectRequestReference } from "@/lib/security";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { projectRequestSchema, zodFieldErrors } from "@/lib/validation";
import type { ProjectRequestActionState } from "@/types/domain";

export async function submitProjectRequestAction(
  _previous: ProjectRequestActionState,
  formData: FormData,
): Promise<ProjectRequestActionState> {
  const auth = await requireClientWorkspace();
  const parsed = projectRequestSchema.safeParse({
    ownerId: formData.get("ownerId"),
    propertyAddressShort: formData.get("propertyAddressShort"),
    sellerNickname: formData.get("sellerNickname"),
    summary: formData.get("summary"),
    details: formData.get("details") ?? "",
    privacyConsent: formData.get("privacyConsent"),
    formStartedAt: formData.get("formStartedAt"),
    website: formData.get("website") ?? "",
  });
  if (!parsed.success) {
    return { status: "error", message: "Please review the request fields.", fieldErrors: zodFieldErrors(parsed.error) };
  }

  const supabase = await createSupabaseServerClient();
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabase.from("project_requests").select("id", { count: "exact", head: true }).eq("requester_id", auth.userId).gte("created_at", hourAgo);
  if ((count ?? 0) >= 3) return { status: "error", message: "You have submitted several requests. Please try again later." };

  const { data: owner } = await supabase.from("owner_project_types").select("owner_id").eq("owner_id", parsed.data.ownerId).eq("project_type", "real_estate_listing").eq("listed", true).maybeSingle();
  if (!owner) return { status: "error", message: "That owner is no longer accepting listing requests." };

  const referenceCode = generateProjectRequestReference();
  const { data, error } = await supabase.from("project_requests").insert({
    reference_code: referenceCode,
    project_type: "real_estate_listing",
    requester_id: auth.userId,
    owner_id: parsed.data.ownerId,
    property_address_short: parsed.data.propertyAddressShort,
    seller_nickname: parsed.data.sellerNickname,
    summary: parsed.data.summary,
    details: parsed.data.details,
    privacy_consent_at: new Date().toISOString(),
  }).select("id").single();
  if (error || !data) return { status: "error", message: "The request could not be submitted. Please try again." };
  await writeAuditEvent(supabase, { actorId: auth.userId, action: "project_request.submitted", entityType: "project_request", entityId: data.id });
  revalidatePath("/portal/requests");
  revalidatePath("/owner/requests");
  return { status: "success", message: "Your listing request was sent to the selected owner.", referenceCode };
}
