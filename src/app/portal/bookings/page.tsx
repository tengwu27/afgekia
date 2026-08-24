import { CalendarDays } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { requireClientWorkspace } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function ClientBookingsPage() {
  await requireClientWorkspace();
  const supabase = await createSupabaseServerClient();
  const { data: bookings } = await supabase.from("booking_requests").select("*").order("created_at", { ascending: false });
  return <><WorkspaceHeading eyebrow="Your requests" title="Booking history" description="Requests only appear after an administrator links them to your client account." />{bookings?.length ? <div className="space-y-4">{bookings.map((booking) => <article key={booking.id} className="rounded-2xl border bg-card p-5 sm:p-7"><div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between"><div><p className="font-mono text-xs text-muted-foreground">{booking.reference_code}</p><h2 className="mt-2 text-2xl">{formatDateTime(booking.preferred_at, booking.timezone)}</h2><p className="mt-2 text-sm text-muted-foreground">{booking.timezone.replaceAll("_", " ")}{booking.alternate_at ? ` · Alternate ${formatDateTime(booking.alternate_at, booking.timezone)}` : ""}</p><p className="mt-4 max-w-2xl text-sm leading-6">{booking.message}</p></div><StatusBadge value={booking.status} /></div></article>)}</div> : <EmptyState icon={CalendarDays} title="No linked booking requests" description="If you have made a public request, an administrator can link it to this account." />}</>;
}
