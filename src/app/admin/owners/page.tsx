import { setAccountStateAction, toggleOwnerListingAction } from "@/app/admin/actions";
import { MemberResetForm } from "@/components/member-reset-form";
import { OwnerCreateForm } from "@/components/owner-create-form";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function OwnersPage() {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const [{ data: owners }, { data: listings }] = await Promise.all([
    supabase.from("profiles").select("*").eq("role", "owner").order("created_at"),
    supabase.from("owner_project_types").select("*").eq("project_type", "real_estate_listing"),
  ]);
  const admin = createSupabaseAdminClient();
  const blockers = new Map<string, number>();
  await Promise.all((owners ?? []).map(async owner => {
    const [requests, bookings, projects] = await Promise.all([
      admin.from("project_requests").select("id", { count: "exact", head: true }).eq("owner_id", owner.id).eq("status", "submitted"),
      admin.from("booking_requests").select("id", { count: "exact", head: true }).eq("owner_id", owner.id).in("status", ["submitted", "confirmed", "reschedule_proposed"]),
      admin.from("projects").select("id", { count: "exact", head: true }).eq("owner_id", owner.id).in("status", ["planning", "active", "on_hold"]),
    ]);
    blockers.set(owner.id, (requests.count ?? 0) + (bookings.count ?? 0) + (projects.count ?? 0));
  }));
  const listingByOwner = new Map(listings?.map(listing => [listing.owner_id, listing]));
  return <><WorkspaceHeading eyebrow="Technical champions" title="Owners" description="Owners receive listing requests and manage only their assigned projects and bookings. Delisting stops new routing; suspension also removes workspace access." /><div className="grid gap-7 xl:grid-cols-[1fr_25rem]"><div className="space-y-3">{owners?.map(owner => { const listing = listingByOwner.get(owner.id); const blockerCount = blockers.get(owner.id) ?? 0; return <article key={owner.id} className="rounded-xl border bg-card p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-sans text-lg font-medium">{owner.full_name}</h2><StatusBadge value={owner.state} /><StatusBadge value={listing?.listed ? "listed" : "delisted"} /></div><p className="mt-2 text-sm text-muted-foreground">{owner.email} · {owner.timezone}</p><p className="mt-2 text-xs text-muted-foreground">{blockerCount ? `${blockerCount} unresolved work item${blockerCount === 1 ? "" : "s"} block suspension.` : "No unresolved work blocks suspension."}</p></div><div className="space-y-2"><form action={toggleOwnerListingAction.bind(null, owner.id, listing?.listed ?? false)}><Button type="submit" size="sm" variant="outline">{listing?.listed ? "Delist" : "List for requests"}</Button></form><MemberResetForm memberId={owner.id} /><form action={setAccountStateAction.bind(null, owner.id, owner.state === "active" ? "suspended" : "active")}><Button type="submit" size="sm" variant="ghost" disabled={owner.state === "active" && blockerCount > 0}>{owner.state === "active" ? "Suspend access" : "Restore access"}</Button></form></div></div></article>; })}</div><aside className="h-fit rounded-xl border bg-card p-5"><h2 className="text-2xl">Create owner</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">The temporary password is shown once and must be replaced on first login.</p><div className="mt-5"><OwnerCreateForm /></div></aside></div></>;
}
