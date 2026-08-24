import { MemberCreateForm } from "@/components/member-create-form";
import { MemberResetForm } from "@/components/member-reset-form";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { requireStaff } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { setMemberStateAction } from "../actions";

export default async function AdminMembersPage() {
  const auth = await requireStaff(); const supabase = await createSupabaseServerClient(); const { data: members } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
  return <><WorkspaceHeading eyebrow="Access" title="Members" description="Clients are managed by staff. Only the owner can create, reset, or suspend administrator access." /><div className="grid gap-7 xl:grid-cols-[1fr_24rem]"><div className="space-y-3">{members?.map((member) => { const canManage = member.role === "client" || auth.profile.role === "owner"; return <article key={member.id} className="rounded-xl border bg-card p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-sans text-lg font-medium">{member.full_name}</h2><StatusBadge value={member.role} /><StatusBadge value={member.state} />{member.must_change_password ? <StatusBadge value="password change required" /> : null}</div><p className="mt-2 text-sm text-muted-foreground">{member.email} · {member.timezone}</p><p className="mt-1 text-xs text-muted-foreground">Joined {formatDate(member.created_at)}</p></div>{canManage && member.id !== auth.userId ? <div className="space-y-2"><MemberResetForm memberId={member.id} /><form action={setMemberStateAction.bind(null, member.id, member.state === "active" ? "suspended" : "active")}><Button type="submit" variant="ghost" size="sm">{member.state === "active" ? "Suspend access" : "Restore access"}</Button></form></div> : null}</div></article>; })}</div><aside className="h-fit rounded-xl border bg-card p-5"><h2 className="text-2xl">Create invited account</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">A confirmed account and one-time temporary password are created without sending email.</p><div className="mt-5"><MemberCreateForm canCreateAdmin={auth.profile.role === "owner"} /></div></aside></div></>;
}
