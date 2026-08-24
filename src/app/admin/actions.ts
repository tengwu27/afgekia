"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { writeAuditEvent } from "@/lib/audit";
import { canManageAccount } from "@/lib/access";
import { requireStaff } from "@/lib/auth";
import { generateProjectReference, generateTemporaryPassword } from "@/lib/security";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  articleSchema, bookingStatusSchema, createMemberSchema, isBookingTransitionAllowed,
  isProjectTransitionAllowed, milestoneSchema, portfolioSchema, projectProgressSchema,
  projectSchema, projectUpdateSchema, serviceSchema, settingsSchema, validateProgressForStatus,
} from "@/lib/validation";
import type { Json } from "@/types/database.generated";
import type { CredentialActionState } from "@/types/domain";

function value(formData: FormData, key: string) { return formData.get(key); }
function checked(formData: FormData, key: string) { return formData.get(key) === "on"; }
function failure(message: string): never { throw new Error(message); }

export async function createServiceAction(formData: FormData) {
  const auth = await requireStaff();
  const parsed = serviceSchema.safeParse({ name: value(formData, "name"), slug: value(formData, "slug"), description: value(formData, "description"), durationMinutes: value(formData, "durationMinutes"), displayOrder: value(formData, "displayOrder") });
  if (!parsed.success) failure(parsed.error.issues[0]?.message ?? "Invalid service.");
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("booking_services").insert({ name: parsed.data.name, slug: parsed.data.slug, description: parsed.data.description, duration_minutes: parsed.data.durationMinutes, display_order: parsed.data.displayOrder, active: true }).select("id").single();
  if (error) failure(error.message);
  await writeAuditEvent(supabase, { actorId: auth.userId, action: "service.created", entityType: "booking_service", entityId: data.id });
  revalidatePath("/admin/services"); revalidatePath("/services");
}

export async function toggleServiceAction(id: string, active: boolean, _formData: FormData) {
  void _formData;
  const auth = await requireStaff(); const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("booking_services").update({ active: !active }).eq("id", id); if (error) failure(error.message);
  await writeAuditEvent(supabase, { actorId: auth.userId, action: active ? "service.deactivated" : "service.activated", entityType: "booking_service", entityId: id });
  revalidatePath("/admin/services"); revalidatePath("/services");
}

export async function createProjectAction(formData: FormData) {
  const auth = await requireStaff();
  const parsed = projectSchema.safeParse({ title: value(formData, "title"), summary: value(formData, "summary"), description: value(formData, "description"), clientUserId: value(formData, "clientUserId"), startDate: value(formData, "startDate"), targetDate: value(formData, "targetDate") });
  if (!parsed.success) failure(parsed.error.issues[0]?.message ?? "Invalid project.");
  const supabase = await createSupabaseServerClient();
  if (parsed.data.clientUserId) { const { data: targetClient } = await supabase.from("profiles").select("id").eq("id", parsed.data.clientUserId).eq("role", "client").eq("state", "active").maybeSingle(); if (!targetClient) failure("Choose an active client account."); }
  const { data, error } = await supabase.from("projects").insert({ reference_code: generateProjectReference(), title: parsed.data.title, summary: parsed.data.summary, description: parsed.data.description, status: "planning", progress: 0, start_date: parsed.data.startDate || null, target_date: parsed.data.targetDate || null, created_by: auth.userId }).select("id").single();
  if (error) failure(error.message);
  if (parsed.data.clientUserId) { const { error: memberError } = await supabase.from("project_members").insert({ project_id: data.id, user_id: parsed.data.clientUserId }); if (memberError) { await supabase.from("projects").delete().eq("id", data.id); failure(memberError.message); } }
  await writeAuditEvent(supabase, { actorId: auth.userId, action: "project.created", entityType: "project", entityId: data.id });
  redirect(`/admin/projects/${data.id}`);
}

export async function updateProjectProgressAction(formData: FormData) {
  const auth = await requireStaff(); const parsed = projectProgressSchema.safeParse({ projectId: value(formData, "projectId"), status: value(formData, "status"), progress: value(formData, "progress"), targetDate: value(formData, "targetDate") });
  if (!parsed.success) failure(parsed.error.issues[0]?.message ?? "Invalid project update.");
  const progressError = validateProgressForStatus(parsed.data.status, parsed.data.progress); if (progressError) failure(progressError);
  const supabase = await createSupabaseServerClient(); const { data: current } = await supabase.from("projects").select("status").eq("id", parsed.data.projectId).single();
  if (!current || !isProjectTransitionAllowed(current.status, parsed.data.status)) failure(`Cannot move a project from ${current?.status ?? "unknown"} to ${parsed.data.status}.`);
  const { error } = await supabase.from("projects").update({ status: parsed.data.status, progress: parsed.data.progress, target_date: parsed.data.targetDate || null }).eq("id", parsed.data.projectId); if (error) failure(error.message);
  await writeAuditEvent(supabase, { actorId: auth.userId, action: "project.progress_updated", entityType: "project", entityId: parsed.data.projectId, details: { status: parsed.data.status, progress: parsed.data.progress } });
  revalidatePath(`/admin/projects/${parsed.data.projectId}`); revalidatePath("/portal");
}

export async function addMilestoneAction(formData: FormData) {
  const auth = await requireStaff(); const parsed = milestoneSchema.safeParse({ projectId: value(formData, "projectId"), title: value(formData, "title"), description: value(formData, "description"), status: value(formData, "status"), dueDate: value(formData, "dueDate"), position: value(formData, "position"), clientVisible: checked(formData, "clientVisible") });
  if (!parsed.success) failure(parsed.error.issues[0]?.message ?? "Invalid milestone."); const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("milestones").insert({ project_id: parsed.data.projectId, title: parsed.data.title, description: parsed.data.description, status: parsed.data.status, due_date: parsed.data.dueDate || null, completed_at: parsed.data.status === "done" ? new Date().toISOString() : null, client_visible: parsed.data.clientVisible, position: parsed.data.position }).select("id").single(); if (error) failure(error.message);
  await writeAuditEvent(supabase, { actorId: auth.userId, action: "milestone.created", entityType: "milestone", entityId: data.id }); revalidatePath(`/admin/projects/${parsed.data.projectId}`); revalidatePath(`/portal/projects/${parsed.data.projectId}`);
}

export async function setMilestoneStatusAction(milestoneId: string, projectId: string, formData: FormData) {
  const auth = await requireStaff(); const status = String(value(formData, "status") ?? ""); if (!["not_started", "active", "blocked", "done"].includes(status)) failure("Invalid milestone status.");
  const supabase = await createSupabaseServerClient(); const { error } = await supabase.from("milestones").update({ status: status as "not_started" | "active" | "blocked" | "done", completed_at: status === "done" ? new Date().toISOString() : null }).eq("id", milestoneId).eq("project_id", projectId); if (error) failure(error.message);
  await writeAuditEvent(supabase, { actorId: auth.userId, action: "milestone.status_updated", entityType: "milestone", entityId: milestoneId, details: { status } }); revalidatePath(`/admin/projects/${projectId}`); revalidatePath(`/portal/projects/${projectId}`);
}

export async function assignProjectMemberAction(formData: FormData) {
  const auth = await requireStaff(); const projectId = String(value(formData, "projectId") ?? ""); const userId = String(value(formData, "userId") ?? ""); if (!projectId || !userId) failure("Choose a client.");
  const supabase = await createSupabaseServerClient(); const { data: targetClient } = await supabase.from("profiles").select("id").eq("id", userId).eq("role", "client").eq("state", "active").maybeSingle(); if (!targetClient) failure("Choose an active client account."); const { error } = await supabase.from("project_members").upsert({ project_id: projectId, user_id: userId }); if (error) failure(error.message);
  await writeAuditEvent(supabase, { actorId: auth.userId, action: "project.client_assigned", entityType: "project", entityId: projectId, details: { user_id: userId } }); revalidatePath(`/admin/projects/${projectId}`); revalidatePath("/portal");
}

export async function addProjectUpdateAction(formData: FormData) {
  const auth = await requireStaff(); const parsed = projectUpdateSchema.safeParse({ projectId: value(formData, "projectId"), title: value(formData, "title"), bodyJson: value(formData, "bodyJson"), bodyText: value(formData, "bodyText"), audience: value(formData, "audience") });
  if (!parsed.success) failure(parsed.error.issues[0]?.message ?? "Invalid update."); const supabase = await createSupabaseServerClient(); const { data: project } = await supabase.from("projects").select("status, progress").eq("id", parsed.data.projectId).single(); if (!project) failure("Project not found.");
  const { data, error } = await supabase.from("project_updates").insert({ project_id: parsed.data.projectId, title: parsed.data.title, body_json: parsed.data.bodyJson as Json, body_text: parsed.data.bodyText, audience: parsed.data.audience, status_snapshot: project.status, progress_snapshot: project.progress, occurred_at: new Date().toISOString(), created_by: auth.userId }).select("id").single(); if (error) failure(error.message);
  await writeAuditEvent(supabase, { actorId: auth.userId, action: "project_update.created", entityType: "project_update", entityId: data.id }); revalidatePath(`/admin/projects/${parsed.data.projectId}`); revalidatePath(`/portal/projects/${parsed.data.projectId}`);
}

export async function createPortfolioAction(formData: FormData) {
  const auth = await requireStaff(); const parsed = portfolioSchema.safeParse({ sourceProjectId: value(formData, "sourceProjectId"), slug: value(formData, "slug"), eyebrow: value(formData, "eyebrow"), title: value(formData, "title"), summary: value(formData, "summary"), bodyJson: value(formData, "bodyJson"), bodyText: value(formData, "bodyText"), coverPath: value(formData, "coverPath"), accent: value(formData, "accent"), status: value(formData, "status"), featured: checked(formData, "featured") });
  if (!parsed.success) failure(parsed.error.issues[0]?.message ?? "Invalid portfolio story."); const supabase = await createSupabaseServerClient();
  const publishedAt = parsed.data.status === "published" ? new Date().toISOString() : null;
  const { data, error } = await supabase.from("portfolio_items").insert({ slug: parsed.data.slug, eyebrow: parsed.data.eyebrow, title: parsed.data.title, summary: parsed.data.summary, body_json: parsed.data.bodyJson as Json, body_text: parsed.data.bodyText, cover_path: parsed.data.coverPath || null, accent: parsed.data.accent, status: parsed.data.status, featured: parsed.data.featured, published_at: publishedAt, created_by: auth.userId }).select("id").single(); if (error) failure(error.message);
  if (parsed.data.sourceProjectId) { const { error: sourceError } = await supabase.from("portfolio_item_sources").insert({ portfolio_item_id: data.id, source_project_id: parsed.data.sourceProjectId, created_by: auth.userId }); if (sourceError) { await supabase.from("portfolio_items").delete().eq("id", data.id); failure(sourceError.message); } }
  await writeAuditEvent(supabase, { actorId: auth.userId, action: "portfolio.created", entityType: "portfolio_item", entityId: data.id, details: { source_project_id: parsed.data.sourceProjectId || null } }); revalidatePath("/admin/portfolio"); revalidatePath("/work");
}

export async function setPortfolioStateAction(id: string, state: "draft" | "published" | "archived", _formData: FormData) {
  void _formData;
  const auth = await requireStaff(); const supabase = await createSupabaseServerClient(); const { error } = await supabase.from("portfolio_items").update({ status: state, published_at: state === "published" ? new Date().toISOString() : null }).eq("id", id); if (error) failure(error.message);
  await writeAuditEvent(supabase, { actorId: auth.userId, action: `portfolio.${state}`, entityType: "portfolio_item", entityId: id }); revalidatePath("/admin/portfolio"); revalidatePath("/work");
}

export async function publishProjectUpdateAction(formData: FormData) {
  const auth = await requireStaff(); const projectUpdateId = String(value(formData, "projectUpdateId") ?? ""); const portfolioItemId = String(value(formData, "portfolioItemId") ?? ""); const title = String(value(formData, "title") ?? "").trim(); const bodyText = String(value(formData, "bodyText") ?? "").trim(); const bodyJsonRaw = String(value(formData, "bodyJson") ?? "");
  if (!projectUpdateId || !portfolioItemId) failure("Choose a private source and a public portfolio item.");
  if (title.length < 2 || bodyText.length < 1) failure("Public-safe title and copy are required."); let bodyJson: unknown; try { bodyJson = JSON.parse(bodyJsonRaw); } catch { failure("Invalid rich-text document."); }
  const supabase = await createSupabaseServerClient(); const { data: source } = await supabase.from("project_updates").select("progress_snapshot").eq("id", projectUpdateId).single(); if (!source) failure("Private update not found.");
  const { data, error } = await supabase.from("portfolio_updates").insert({ portfolio_item_id: portfolioItemId, title, body_text: bodyText, body_json: bodyJson as Json, progress: source.progress_snapshot, published_at: new Date().toISOString(), created_by: auth.userId }).select("id").single(); if (error) failure(error.message);
  const { error: provenanceError } = await supabase.from("portfolio_update_sources").insert({ portfolio_update_id: data.id, source_project_update_id: projectUpdateId, created_by: auth.userId }); if (provenanceError) { await supabase.from("portfolio_updates").delete().eq("id", data.id); failure(provenanceError.message); }
  await writeAuditEvent(supabase, { actorId: auth.userId, action: "portfolio_update.published_from_private", entityType: "portfolio_update", entityId: data.id, details: { source_project_update_id: projectUpdateId } }); revalidatePath("/admin/portfolio"); revalidatePath("/work");
}

export async function createArticleAction(formData: FormData) {
  const auth = await requireStaff(); const parsed = articleSchema.safeParse({ slug: value(formData, "slug"), title: value(formData, "title"), excerpt: value(formData, "excerpt"), bodyJson: value(formData, "bodyJson"), bodyText: value(formData, "bodyText"), coverPath: value(formData, "coverPath"), status: value(formData, "status"), featured: checked(formData, "featured") });
  if (!parsed.success) failure(parsed.error.issues[0]?.message ?? "Invalid article."); const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("articles").insert({ slug: parsed.data.slug, title: parsed.data.title, excerpt: parsed.data.excerpt, body_json: parsed.data.bodyJson as Json, body_text: parsed.data.bodyText, cover_path: parsed.data.coverPath || null, status: parsed.data.status, featured: parsed.data.featured, published_at: parsed.data.status === "published" ? new Date().toISOString() : null, author_id: auth.userId }).select("id").single(); if (error) failure(error.message);
  await writeAuditEvent(supabase, { actorId: auth.userId, action: "article.created", entityType: "article", entityId: data.id }); revalidatePath("/admin/articles"); revalidatePath("/insights");
}

export async function setArticleStateAction(id: string, state: "draft" | "published" | "archived", _formData: FormData) {
  void _formData;
  const auth = await requireStaff(); const supabase = await createSupabaseServerClient(); const { error } = await supabase.from("articles").update({ status: state, published_at: state === "published" ? new Date().toISOString() : null }).eq("id", id); if (error) failure(error.message);
  await writeAuditEvent(supabase, { actorId: auth.userId, action: `article.${state}`, entityType: "article", entityId: id }); revalidatePath("/admin/articles"); revalidatePath("/insights");
}

export async function updateBookingAction(formData: FormData) {
  const auth = await requireStaff(); const parsed = bookingStatusSchema.safeParse({ bookingId: value(formData, "bookingId"), status: value(formData, "status"), adminNotes: value(formData, "adminNotes") }); if (!parsed.success) failure(parsed.error.issues[0]?.message ?? "Invalid booking update.");
  const clientUserId = String(value(formData, "clientUserId") ?? "") || null; const supabase = await createSupabaseServerClient(); if (clientUserId) { const { data: targetClient } = await supabase.from("profiles").select("id").eq("id", clientUserId).eq("role", "client").eq("state", "active").maybeSingle(); if (!targetClient) failure("Choose an active client account."); } const { data: current } = await supabase.from("booking_requests").select("status").eq("id", parsed.data.bookingId).single(); if (!current || !isBookingTransitionAllowed(current.status, parsed.data.status)) failure(`Cannot move this booking from ${current?.status ?? "unknown"} to ${parsed.data.status}.`);
  const { error } = await supabase.from("booking_requests").update({ status: parsed.data.status, client_user_id: clientUserId, confirmed_at: parsed.data.status === "confirmed" ? new Date().toISOString() : null }).eq("id", parsed.data.bookingId); if (error) failure(error.message);
  const { data: existingNotes } = await supabase.from("booking_request_admin").select("booking_id").eq("booking_id", parsed.data.bookingId).maybeSingle();
  const notesResult = existingNotes
    ? await supabase.from("booking_request_admin").update({ notes: parsed.data.adminNotes || "", updated_by: auth.userId }).eq("booking_id", parsed.data.bookingId)
    : await supabase.from("booking_request_admin").insert({ booking_id: parsed.data.bookingId, notes: parsed.data.adminNotes || "", created_by: auth.userId, updated_by: auth.userId });
  if (notesResult.error) failure(notesResult.error.message);
  await writeAuditEvent(supabase, { actorId: auth.userId, action: "booking.updated", entityType: "booking_request", entityId: parsed.data.bookingId, details: { status: parsed.data.status, linked_client: clientUserId } }); revalidatePath("/admin/bookings"); revalidatePath("/portal/bookings");
}

export async function updateSettingsAction(formData: FormData) {
  const auth = await requireStaff(); const parsed = settingsSchema.safeParse({ businessName: value(formData, "businessName"), tagline: value(formData, "tagline"), description: value(formData, "description"), contactEmail: value(formData, "contactEmail"), phone: value(formData, "phone"), address: value(formData, "address"), timezone: value(formData, "timezone"), bookingLeadHours: value(formData, "bookingLeadHours"), bookingHorizonDays: value(formData, "bookingHorizonDays") }); if (!parsed.success) failure(parsed.error.issues[0]?.message ?? "Invalid settings.");
  const supabase = await createSupabaseServerClient(); const { error } = await supabase.from("site_settings").update({ business_name: parsed.data.businessName, tagline: parsed.data.tagline, description: parsed.data.description, contact_email: parsed.data.contactEmail, phone: parsed.data.phone || null, address: parsed.data.address || null, timezone: parsed.data.timezone, booking_lead_hours: parsed.data.bookingLeadHours, booking_horizon_days: parsed.data.bookingHorizonDays }).eq("singleton", true); if (error) failure(error.message);
  await writeAuditEvent(supabase, { actorId: auth.userId, action: "settings.updated", entityType: "site_settings", entityId: null }); revalidatePath("/", "layout");
}

export async function createMemberAction(_previous: CredentialActionState, formData: FormData): Promise<CredentialActionState> {
  const auth = await requireStaff(); const parsed = createMemberSchema.safeParse({ fullName: value(formData, "fullName"), email: value(formData, "email"), role: value(formData, "role"), timezone: value(formData, "timezone") });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Invalid account." };
  if (!canManageAccount(auth.profile.role, parsed.data.role)) return { status: "error", message: "Only the owner can create staff administrators." };
  const temporaryPassword = generateTemporaryPassword(); const admin = createSupabaseAdminClient();
  const { data, error } = await admin.auth.admin.createUser({ email: parsed.data.email, password: temporaryPassword, email_confirm: true, app_metadata: { role: parsed.data.role, must_change_password: true }, user_metadata: { full_name: parsed.data.fullName } });
  if (error || !data.user) return { status: "error", message: error?.message ?? "Account creation failed." };
  const { error: profileError } = await admin.from("profiles").update({ full_name: parsed.data.fullName, timezone: parsed.data.timezone, role: parsed.data.role, must_change_password: true }).eq("id", data.user.id);
  if (profileError) return { status: "error", message: profileError.message };
  const supabase = await createSupabaseServerClient(); await writeAuditEvent(supabase, { actorId: auth.userId, action: "member.created", entityType: "profile", entityId: data.user.id, details: { role: parsed.data.role } }); revalidatePath("/admin/members");
  return { status: "success", message: "Account created. Copy this password now; it will not be shown again.", email: parsed.data.email, temporaryPassword };
}

export async function resetMemberPasswordAction(_previous: CredentialActionState, formData: FormData): Promise<CredentialActionState> {
  const auth = await requireStaff(); const memberId = String(value(formData, "memberId") ?? ""); if (!memberId) return { status: "error", message: "Member is required." };
  const admin = createSupabaseAdminClient(); const { data: target } = await admin.from("profiles").select("role, email").eq("id", memberId).single(); if (!target) return { status: "error", message: "Member not found." };
  if (!canManageAccount(auth.profile.role, target.role)) return { status: "error", message: "Only the owner can reset staff credentials." };
  const temporaryPassword = generateTemporaryPassword(); const { error } = await admin.auth.admin.updateUserById(memberId, { password: temporaryPassword }); if (error) return { status: "error", message: error.message };
  await admin.from("profiles").update({ must_change_password: true }).eq("id", memberId); const supabase = await createSupabaseServerClient(); await writeAuditEvent(supabase, { actorId: auth.userId, action: "member.password_reset", entityType: "profile", entityId: memberId }); revalidatePath("/admin/members");
  return { status: "success", message: "Temporary password issued. Copy it now; it will not be shown again.", email: target.email, temporaryPassword };
}

export async function setMemberStateAction(memberId: string, nextState: "active" | "suspended", _formData: FormData) {
  void _formData;
  const auth = await requireStaff(); if (memberId === auth.userId) failure("You cannot suspend your own account."); const admin = createSupabaseAdminClient(); const { data: target } = await admin.from("profiles").select("role").eq("id", memberId).single(); if (!target) failure("Member not found.");
  if (!canManageAccount(auth.profile.role, target.role)) failure("Only the owner can manage staff access."); const { error } = await admin.from("profiles").update({ state: nextState }).eq("id", memberId); if (error) failure(error.message);
  const supabase = await createSupabaseServerClient(); await writeAuditEvent(supabase, { actorId: auth.userId, action: `member.${nextState}`, entityType: "profile", entityId: memberId }); revalidatePath("/admin/members");
}

const allowedMediaTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

export async function uploadMediaAction(formData: FormData) {
  const auth = await requireStaff(); const file = value(formData, "file"); const altText = String(value(formData, "altText") ?? "").trim(); if (!(file instanceof File) || file.size === 0) failure("Choose an image."); if (!allowedMediaTypes.has(file.type)) failure("Use a JPEG, PNG, WebP, or AVIF image."); if (file.size > 5_242_880) failure("Images must be 5 MB or smaller."); if (altText.length < 2 || altText.length > 240) failure("Add useful alternative text.");
  const extension = ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" } as Record<string, string>)[file.type]; const path = `${new Date().getUTCFullYear()}/${randomUUID()}.${extension}`; const supabase = await createSupabaseServerClient();
  const { error: uploadError } = await supabase.storage.from("public-media").upload(path, file, { contentType: file.type, upsert: false }); if (uploadError) failure(uploadError.message);
  const { data, error } = await supabase.from("media_assets").insert({ bucket: "public-media", path, alt_text: altText, mime_type: file.type as "image/jpeg" | "image/png" | "image/webp" | "image/avif", bytes: file.size, created_by: auth.userId }).select("id").single(); if (error) { await supabase.storage.from("public-media").remove([path]); failure(error.message); }
  await writeAuditEvent(supabase, { actorId: auth.userId, action: "media.uploaded", entityType: "media_asset", entityId: data.id }); revalidatePath("/admin/media");
}
