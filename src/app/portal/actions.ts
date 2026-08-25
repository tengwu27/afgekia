"use server";

import { revalidatePath } from "next/cache";

import { requireClientWorkspace } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { assessmentResponseSchema } from "@/lib/validation";

function value(formData: FormData, key: string) {
  return formData.get(key);
}

export async function respondToAssessmentAction(formData: FormData) {
  const auth = await requireClientWorkspace();
  const parsed = assessmentResponseSchema.safeParse({
    projectId: value(formData, "projectId"),
    revisionId: value(formData, "revisionId"),
    response: value(formData, "response"),
    note: value(formData, "note") ?? "",
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid assessment response.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: approval } = await supabase
    .from("assessment_plan_approvals")
    .select("revision_id, status")
    .eq("revision_id", parsed.data.revisionId)
    .eq("user_id", auth.userId)
    .eq("status", "pending")
    .maybeSingle();

  if (!approval) throw new Error("This approval request is no longer pending.");

  const { error } = await supabase
    .from("assessment_plan_approvals")
    .update({
      status: parsed.data.response,
      note: parsed.data.note || null,
      responded_at: new Date().toISOString(),
    })
    .eq("revision_id", parsed.data.revisionId)
    .eq("user_id", auth.userId)
    .eq("status", "pending");

  if (error) throw new Error(error.message);

  revalidatePath(`/portal/projects/${parsed.data.projectId}`);
  revalidatePath(`/owner/projects/${parsed.data.projectId}`);
  revalidatePath("/portal");
}

export async function withdrawProjectRequestAction(requestId: string, _formData: FormData) {
  void _formData;
  const auth = await requireClientWorkspace();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("project_requests").update({ status: "withdrawn" }).eq("id", requestId).eq("requester_id", auth.userId).eq("status", "submitted").select("id").maybeSingle();
  if (error || !data) throw new Error(error?.message ?? "This request can no longer be withdrawn.");
  revalidatePath("/portal/requests");
  revalidatePath("/owner/requests");
}
