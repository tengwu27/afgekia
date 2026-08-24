import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { requireStaff } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { uploadMediaAction } from "../actions";

export default async function AdminMediaPage() {
  await requireStaff(); const supabase = await createSupabaseServerClient(); const { data: assets } = await supabase.from("media_assets").select("*").order("created_at", { ascending: false });
  return <><WorkspaceHeading eyebrow="Public storage" title="Media" description="Public article and portfolio images only. Private project files are intentionally excluded." /><section className="rounded-xl border bg-card p-5 sm:p-7"><h2 className="text-2xl">Upload image</h2><form action={uploadMediaAction} className="mt-5 grid gap-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end" encType="multipart/form-data"><div className="space-y-2"><Label htmlFor="file">Image</Label><Input id="file" name="file" type="file" accept="image/jpeg,image/png,image/webp,image/avif" required /></div><div className="space-y-2"><Label htmlFor="altText">Alternative text</Label><Input id="altText" name="altText" required maxLength={240} placeholder="Describe the meaningful visual content" /></div><Button type="submit">Upload</Button></form><p className="mt-3 text-xs text-muted-foreground">JPEG, PNG, WebP, or AVIF. Maximum 5 MB. Public reads; staff-only writes.</p></section><div className="mt-7 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{assets?.map((asset) => { const url = supabase.storage.from(asset.bucket).getPublicUrl(asset.path).data.publicUrl; return <article key={asset.id} className="overflow-hidden rounded-xl border bg-card"><div className="relative aspect-[4/3] bg-muted"><Image src={url} alt={asset.alt_text} fill sizes="(min-width: 1280px) 25vw, (min-width: 640px) 40vw, 90vw" className="object-cover" /></div><div className="p-4"><p className="text-sm leading-6">{asset.alt_text}</p><code className="mt-2 block overflow-x-auto text-xs text-muted-foreground">{asset.path}</code><p className="mt-2 text-xs text-muted-foreground">{asset.mime_type} · {(asset.bytes / 1024).toFixed(0)} KB</p></div></article>; })}</div></>;
}
