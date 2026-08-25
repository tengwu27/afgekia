import Link from "next/link";

import { withdrawProjectRequestAction } from "@/app/portal/actions";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { requireClientWorkspace } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function ClientRequestsPage() {
  await requireClientWorkspace();
  const supabase = await createSupabaseServerClient();
  const { data: requests } = await supabase.from("project_requests").select("*").order("created_at", { ascending: false });
  return <><WorkspaceHeading eyebrow="Real-estate listing" title="Your requests" description="Track requests sent to your chosen owner. Approved requests become private listing projects automatically." actions={<Button asChild><Link href="/request">New request</Link></Button>} /><div className="space-y-4">{requests?.map(request => <article key={request.id} className="rounded-xl border bg-card p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-3"><span className="font-mono text-xs text-muted-foreground">{request.reference_code}</span><StatusBadge value={request.status} /></div><h2 className="mt-2 text-2xl">{request.property_address_short} · {request.seller_nickname}</h2><p className="mt-2 text-sm text-muted-foreground">Submitted {formatDate(request.created_at)}</p></div>{request.status === "submitted" ? <form action={withdrawProjectRequestAction.bind(null, request.id)}><Button type="submit" size="sm" variant="outline">Withdraw</Button></form> : request.resulting_project_id ? <Button asChild size="sm"><Link href={`/portal/projects/${request.resulting_project_id}`}>View project</Link></Button> : null}</div><p className="mt-4 text-sm leading-6">{request.summary}</p>{request.owner_response ? <p className="mt-4 rounded-lg bg-muted p-4 text-sm">Owner response: {request.owner_response}</p> : null}</article>)}{!requests?.length ? <div className="rounded-xl border border-dashed p-8 text-center"><p className="text-muted-foreground">You have not submitted a listing request yet.</p><Button asChild className="mt-4"><Link href="/request">Start a request</Link></Button></div> : null}</div></>;
}
