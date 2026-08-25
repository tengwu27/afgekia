import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { requireOwner } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { updateBookingAction } from "../actions";

const statuses = ["submitted", "confirmed", "reschedule_proposed", "declined", "cancelled", "completed"];

export default async function OwnerBookingsPage() {
  await requireOwner();
  const supabase = await createSupabaseServerClient();
  const [{ data: bookings }, { data: services }, { data: administration }] = await Promise.all([
    supabase.from("booking_requests").select("*").order("created_at", { ascending: false }),
    supabase.from("booking_services").select("id, name"),
    supabase.from("booking_request_admin").select("booking_id, notes"),
  ]);
  const serviceNames = new Map(services?.map((service) => [service.id, service.name]));
  const adminNotes = new Map(administration?.map((entry) => [entry.booking_id, entry.notes]));

  return <>
    <WorkspaceHeading eyebrow="Requests" title="Bookings" description="Review every request manually, link it to a client when appropriate, and record the operational status." />
    <div className="space-y-5">
      {bookings?.map((booking) => {
        const statusId = `status-${booking.id}`;
        const clientId = `client-${booking.id}`;
        const notesId = `notes-${booking.id}`;
        return <article key={booking.id} className="rounded-2xl border bg-card p-5 sm:p-7">
          <div className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:justify-between">
            <div><div className="flex flex-wrap items-center gap-3"><span className="font-mono text-xs text-muted-foreground">{booking.reference_code}</span><StatusBadge value={booking.status} /></div><h2 className="mt-3 text-2xl">{booking.full_name}</h2><p className="mt-1 text-sm text-muted-foreground">{booking.email}{booking.phone ? ` · ${booking.phone}` : ""}</p></div>
            <div className="text-sm sm:text-right"><p className="font-medium">{serviceNames.get(booking.service_id) ?? "Service unavailable"}</p><p className="mt-1 text-muted-foreground">Preferred {formatDateTime(booking.preferred_at, booking.timezone)}</p>{booking.alternate_at ? <p className="mt-1 text-muted-foreground">Alternate {formatDateTime(booking.alternate_at, booking.timezone)}</p> : null}<p className="mt-1 text-xs text-muted-foreground">{booking.timezone}</p></div>
          </div>
          <p className="my-5 whitespace-pre-line text-sm leading-6">{booking.message}</p>
          <form action={updateBookingAction} className="grid gap-4 border-t pt-5 lg:grid-cols-[11rem_1fr_1fr_auto] lg:items-end">
            <input type="hidden" name="bookingId" value={booking.id} />
            <div className="space-y-2"><Label htmlFor={statusId}>Status</Label><select id={statusId} name="status" defaultValue={booking.status} className="h-8 w-full rounded-lg border bg-background px-2 text-sm">{statuses.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}</select></div>
            <div className="space-y-2"><Label htmlFor={clientId}>Link active client by email</Label><Input id={clientId} name="clientEmail" type="email" placeholder={booking.client_user_id ? "Linked client—leave blank to keep" : "client@example.com"} /></div>
            <div className="space-y-2"><Label htmlFor={notesId}>Private owner notes</Label><Textarea id={notesId} name="adminNotes" defaultValue={adminNotes.get(booking.id) ?? ""} rows={2} maxLength={3000} /></div>
            <Button type="submit">Save</Button>
          </form>
        </article>;
      })}
      {!bookings?.length ? <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">No booking requests yet.</p> : null}
    </div>
  </>;
}
