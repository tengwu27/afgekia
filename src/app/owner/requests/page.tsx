import { decideProjectRequestAction } from "@/app/owner/actions";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { requireOwner } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function OwnerRequestsPage() {
  await requireOwner();
  const supabase = await createSupabaseServerClient();
  const { data: requests } = await supabase.from("project_requests").select("*").order("created_at", { ascending: false });
  return <><WorkspaceHeading eyebrow="Real-estate listing" title="Project requests" description="Only requests sent directly to you appear here. Approval creates the listing project and adds the requester as its first client." /><div className="space-y-5">{requests?.map(request => <article key={request.id} className="rounded-2xl border bg-card p-5 sm:p-7"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-3"><span className="font-mono text-xs text-muted-foreground">{request.reference_code}</span><StatusBadge value={request.status} /></div><h2 className="mt-3 text-2xl">{request.property_address_short} · {request.seller_nickname}</h2><p className="mt-2 text-sm text-muted-foreground">Received {formatDate(request.created_at)}</p></div></div><p className="mt-5 leading-7">{request.summary}</p>{request.details ? <p className="mt-3 whitespace-pre-line text-sm leading-6 text-muted-foreground">{request.details}</p> : null}{request.status === "submitted" ? <form action={decideProjectRequestAction} className="mt-6 space-y-4 border-t pt-5"><input type="hidden" name="requestId" value={request.id} /><div className="space-y-2"><Label htmlFor={`response-${request.id}`}>Response to client <span className="font-normal text-muted-foreground">(optional)</span></Label><Textarea id={`response-${request.id}`} name="ownerResponse" maxLength={2000} rows={3} /></div><div className="flex flex-wrap gap-3"><Button type="submit" name="decision" value="approved">Approve and create project</Button><Button type="submit" name="decision" value="declined" variant="outline">Decline</Button></div></form> : request.owner_response ? <p className="mt-5 rounded-xl bg-muted p-4 text-sm">Your response: {request.owner_response}</p> : null}</article>)}{!requests?.length ? <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">No listing requests have been sent to you.</p> : null}</div></>;
}
