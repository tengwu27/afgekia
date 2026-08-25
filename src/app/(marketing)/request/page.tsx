import type { Metadata } from "next";

import { ProjectRequestForm } from "@/components/project-request-form";
import { requireClientWorkspace } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Request a real-estate listing project", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function RequestProjectPage() {
  await requireClientWorkspace();
  const supabase = await createSupabaseServerClient();
  const { data: owners } = await supabase.from("owner_project_types").select("*").eq("project_type", "real_estate_listing").eq("listed", true).order("display_order");
  return <div className="container-shell py-18 sm:py-24"><div className="mx-auto max-w-3xl"><p className="eyebrow">Real-estate listing</p><h1 className="mt-4 text-5xl">Request a clear path to market.</h1><p className="mt-5 max-w-2xl leading-7 text-muted-foreground">Choose the owner you want to work with and share the property context. Scheduling remains separate—you can request a conversation through Booking at any time.</p><div className="mt-10 rounded-2xl border bg-card p-5 sm:p-8">{owners?.length ? <ProjectRequestForm owners={owners} /> : <AlertUnavailable />}</div></div></div>;
}

function AlertUnavailable() { return <div className="rounded-xl border border-dashed p-8 text-center"><h2 className="text-2xl">Requests are temporarily paused</h2><p className="mt-2 text-sm text-muted-foreground">No listing owners are currently accepting new requests.</p></div>; }
