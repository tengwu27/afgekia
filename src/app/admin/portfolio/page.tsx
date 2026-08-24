import { RichTextEditor } from "@/components/rich-text-editor";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { requireStaff } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createPortfolioAction, publishProjectUpdateAction, setPortfolioStateAction } from "../actions";

export default async function AdminPortfolioPage() {
  await requireStaff();
  const supabase = await createSupabaseServerClient();
  const [{ data: items }, { data: projects }, { data: privateUpdates }] = await Promise.all([
    supabase.from("portfolio_items").select("*").order("updated_at", { ascending: false }),
    supabase.from("projects").select("id, reference_code, title").order("updated_at", { ascending: false }),
    supabase.from("project_updates").select("id, project_id, title, body_text, progress_snapshot").order("occurred_at", { ascending: false }).limit(50),
  ]);

  return <>
    <WorkspaceHeading eyebrow="Public publishing" title="Portfolio" description="Portfolio records contain only approved copy. Optional provenance links live in separate staff-only tables." />
    <div className="space-y-3">
      {items?.map((item) => <article key={item.id} className="rounded-xl border bg-card p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div><div className="flex items-center gap-3"><StatusBadge value={item.status} /><span className="text-xs text-muted-foreground">/{item.slug}</span></div><h2 className="mt-3 text-2xl">{item.title}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{item.summary}</p></div>
          <div className="flex gap-2">{item.status !== "published" ? <form action={setPortfolioStateAction.bind(null, item.id, "published")}><Button size="sm">Publish</Button></form> : <form action={setPortfolioStateAction.bind(null, item.id, "draft")}><Button size="sm" variant="outline">Unpublish</Button></form>}<form action={setPortfolioStateAction.bind(null, item.id, "archived")}><Button size="sm" variant="ghost">Archive</Button></form></div>
        </div>
      </article>)}
    </div>

    <section className="mt-9 rounded-xl border bg-card p-5 sm:p-7">
      <h2 className="text-3xl">Create public-safe story</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">Write and approve public copy independently. Selecting a source project records provenance but does not copy private fields.</p>
      <form action={createPortfolioAction} className="mt-6 space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="sourceProjectId">Source project <span className="font-normal text-muted-foreground">(optional, private)</span></Label><select id="sourceProjectId" name="sourceProjectId" className="h-8 w-full rounded-lg border bg-background px-2 text-sm"><option value="">No source link</option>{projects?.map((project) => <option key={project.id} value={project.id}>{project.reference_code} · {project.title}</option>)}</select></div>
          <div className="space-y-2"><Label htmlFor="portfolioSlug">Slug</Label><Input id="portfolioSlug" name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" /></div>
          <div className="space-y-2"><Label htmlFor="portfolioEyebrow">Eyebrow</Label><Input id="portfolioEyebrow" name="eyebrow" placeholder="Operations · Client experience" /></div>
          <div className="space-y-2"><Label htmlFor="portfolioTitle">Title</Label><Input id="portfolioTitle" name="title" required /></div>
        </div>
        <div className="space-y-2"><Label htmlFor="portfolioSummary">Public summary</Label><Textarea id="portfolioSummary" name="summary" required minLength={20} maxLength={600} rows={3} /></div>
        <RichTextEditor label="Public-safe story copy" />
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2"><Label htmlFor="portfolioCover">Cover path</Label><Input id="portfolioCover" name="coverPath" /></div>
          <div className="space-y-2"><Label htmlFor="portfolioAccent">Accent</Label><select id="portfolioAccent" name="accent" className="h-8 w-full rounded-lg border bg-background px-2 text-sm"><option value="olive">Olive</option><option value="terracotta">Terracotta</option><option value="gold">Gold</option><option value="plum">Plum</option></select></div>
          <div className="space-y-2"><Label htmlFor="portfolioState">Initial state</Label><select id="portfolioState" name="status" className="h-8 w-full rounded-lg border bg-background px-2 text-sm"><option value="draft">Draft</option><option value="published">Published</option></select></div>
        </div>
        <div className="flex items-center gap-2"><Checkbox id="portfolioFeatured" name="featured" /><Label htmlFor="portfolioFeatured" className="font-normal">Feature this story</Label></div>
        <Button type="submit">Create story</Button>
      </form>
    </section>

    {items?.length && privateUpdates?.length ? <section className="mt-9 rounded-xl border bg-card p-5 sm:p-7">
      <h2 className="text-3xl">Curate a private update</h2>
      <p className="mt-2 text-sm text-muted-foreground">This creates fresh, independently editable public copy and stores its private provenance separately.</p>
      <form action={publishProjectUpdateAction} className="mt-5 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="projectUpdateId">Private source update</Label><select id="projectUpdateId" name="projectUpdateId" className="h-8 w-full rounded-lg border bg-background px-2 text-sm" required><option value="">Choose source</option>{privateUpdates.map((update) => <option key={update.id} value={update.id}>{update.title} · {update.progress_snapshot ?? "—"}%</option>)}</select></div>
          <div className="space-y-2"><Label htmlFor="portfolioItemId">Public portfolio item</Label><select id="portfolioItemId" name="portfolioItemId" className="h-8 w-full rounded-lg border bg-background px-2 text-sm" required><option value="">Choose public story</option>{items.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></div>
        </div>
        <div className="space-y-2"><Label htmlFor="publicUpdateTitle">Approved public title</Label><Input id="publicUpdateTitle" name="title" required /></div>
        <RichTextEditor label="Approved public-safe update copy" />
        <Button type="submit">Publish independent update</Button>
      </form>
    </section> : null}
  </>;
}
