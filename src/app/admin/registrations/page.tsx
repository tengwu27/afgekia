import { activateClientAction, setAccountStateAction } from "@/app/admin/actions";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { requireAdmin } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function RegistrationsPage() {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const { data: clients } = await supabase.from("profiles").select("*").eq("role", "client").order("created_at", { ascending: false });
  return <><WorkspaceHeading eyebrow="Client access" title="Registrations" description="New registrations remain unable to sign in until you activate them. Activation confirms the Auth identity without sending email." /><div className="space-y-3">{clients?.map(client => <article key={client.id} className="rounded-xl border bg-card p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-sans text-lg font-medium">{client.full_name}</h2><StatusBadge value={client.state} /></div><p className="mt-2 text-sm text-muted-foreground">{client.email} · {client.timezone}</p><p className="mt-1 text-xs text-muted-foreground">Registered {formatDate(client.created_at)}</p></div><div>{client.state === "pending" ? <form action={activateClientAction.bind(null, client.id)}><Button type="submit">Activate client</Button></form> : <form action={setAccountStateAction.bind(null, client.id, client.state === "active" ? "suspended" : "active")}><Button type="submit" variant="outline">{client.state === "active" ? "Suspend" : "Restore"}</Button></form>}</div></div></article>)}{!clients?.length ? <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">No client registrations yet.</p> : null}</div></>;
}
