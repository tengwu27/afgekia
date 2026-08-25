import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { requireOwner } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createServiceAction, toggleServiceAction } from "../actions";

export default async function OwnerAppointmentsPage() {
  await requireOwner();
  const supabase = await createSupabaseServerClient();
  const { data: services } = await supabase.from("booking_services").select("*").order("display_order");
  return <>
    <WorkspaceHeading eyebrow="Offerings" title="Booking services" description="Only active services are offered on the public request form." />
    <div className="grid gap-7 xl:grid-cols-[1fr_23rem]">
      <div className="space-y-3">{services?.map((service) => <article key={service.id} className="flex flex-col gap-4 rounded-xl border bg-card p-5 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-3"><h2 className="font-sans text-lg font-medium">{service.name}</h2><StatusBadge value={service.active ? "active" : "archived"} /></div><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{service.description}</p><p className="mt-2 text-xs text-muted-foreground">{service.duration_minutes} min · /{service.slug} · order {service.display_order}</p></div><form action={toggleServiceAction.bind(null, service.id, service.active)}><Button type="submit" size="sm" variant="outline">{service.active ? "Deactivate" : "Activate"}</Button></form></article>)}</div>
      <aside className="rounded-xl border bg-card p-5"><h2 className="text-2xl">Add service</h2><form action={createServiceAction} className="mt-5 space-y-4">
        <div className="space-y-2"><Label htmlFor="serviceName">Name</Label><Input id="serviceName" name="name" required /></div>
        <div className="space-y-2"><Label htmlFor="serviceSlug">Slug</Label><Input id="serviceSlug" name="slug" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required /></div>
        <div className="space-y-2"><Label htmlFor="serviceDescription">Description</Label><Textarea id="serviceDescription" name="description" minLength={20} maxLength={800} required rows={5} /></div>
        <div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label htmlFor="serviceMinutes">Minutes</Label><Input id="serviceMinutes" name="durationMinutes" type="number" min="15" max="480" defaultValue="60" /></div><div className="space-y-2"><Label htmlFor="serviceOrder">Order</Label><Input id="serviceOrder" name="displayOrder" type="number" min="0" defaultValue={(services?.length ?? 0) * 10 + 10} /></div></div>
        <Button type="submit">Add service</Button>
      </form></aside>
    </div>
  </>;
}
