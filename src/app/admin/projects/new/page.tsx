import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { requireStaff } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createProjectAction } from "../../actions";

export default async function NewProjectPage() {
  await requireStaff(); const supabase = await createSupabaseServerClient(); const { data: clients } = await supabase.from("profiles").select("id, full_name, email").eq("role", "client").eq("state", "active").order("full_name");
  return <><WorkspaceHeading eyebrow="Delivery" title="New project" description="Create the private project first. Public-safe stories remain separate records." /><form action={createProjectAction} className="max-w-3xl space-y-6 rounded-2xl border bg-card p-6 sm:p-8"><div className="space-y-2"><Label htmlFor="title">Project title</Label><Input id="title" name="title" required maxLength={160} /></div><div className="space-y-2"><Label htmlFor="summary">Client-facing summary</Label><Textarea id="summary" name="summary" required minLength={20} maxLength={600} rows={3} /></div><div className="space-y-2"><Label htmlFor="description">Working description</Label><Textarea id="description" name="description" maxLength={12000} rows={7} /></div><div className="space-y-2"><Label htmlFor="clientUserId">Assign client</Label><select id="clientUserId" name="clientUserId" className="h-9 w-full rounded-lg border bg-background px-3 text-sm"><option value="">No client yet</option>{clients?.map((client) => <option key={client.id} value={client.id}>{client.full_name} · {client.email}</option>)}</select></div><div className="grid gap-5 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="startDate">Start date</Label><Input id="startDate" name="startDate" type="date" /></div><div className="space-y-2"><Label htmlFor="targetDate">Target date</Label><Input id="targetDate" name="targetDate" type="date" /></div></div><Button type="submit">Create project</Button></form></>;
}
