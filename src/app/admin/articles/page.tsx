import { RichTextEditor } from "@/components/rich-text-editor";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { requireStaff } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createArticleAction, setArticleStateAction } from "../actions";

export default async function AdminArticlesPage() {
  await requireStaff();
  const supabase = await createSupabaseServerClient();
  const { data: articles } = await supabase.from("articles").select("*").order("updated_at", { ascending: false });
  return <>
    <WorkspaceHeading eyebrow="Content" title="Articles" description="Structured rich text is sanitized again when rendered publicly." />
    <div className="grid gap-7 xl:grid-cols-[.8fr_1.2fr]">
      <div className="space-y-3">{articles?.map((article) => <article key={article.id} className="rounded-xl border bg-card p-5"><StatusBadge value={article.status} /><h2 className="mt-3 text-2xl">{article.title}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{article.excerpt}</p><p className="mt-3 text-xs text-muted-foreground">Updated {formatDate(article.updated_at)}</p><div className="mt-4 flex gap-2 border-t pt-4">{article.status !== "published" ? <form action={setArticleStateAction.bind(null, article.id, "published")}><Button size="sm">Publish</Button></form> : <form action={setArticleStateAction.bind(null, article.id, "draft")}><Button size="sm" variant="outline">Unpublish</Button></form>}<form action={setArticleStateAction.bind(null, article.id, "archived")}><Button size="sm" variant="ghost">Archive</Button></form></div></article>)}</div>
      <section className="rounded-xl border bg-card p-5 sm:p-7"><h2 className="text-3xl">New article</h2><form action={createArticleAction} className="mt-6 space-y-5">
        <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="articleTitle">Title</Label><Input id="articleTitle" name="title" required /></div><div className="space-y-2"><Label htmlFor="articleSlug">Slug</Label><Input id="articleSlug" name="slug" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required /></div></div>
        <div className="space-y-2"><Label htmlFor="articleExcerpt">Excerpt</Label><Textarea id="articleExcerpt" name="excerpt" required minLength={20} maxLength={400} rows={3} /></div>
        <RichTextEditor />
        <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="articleCover">Cover path <span className="font-normal text-muted-foreground">(optional)</span></Label><Input id="articleCover" name="coverPath" placeholder="2026/image.webp" /></div><div className="space-y-2"><Label htmlFor="articleState">Initial state</Label><select id="articleState" name="status" className="h-8 w-full rounded-lg border bg-background px-2 text-sm"><option value="draft">Draft</option><option value="published">Published</option></select></div></div>
        <div className="flex items-center gap-2"><Checkbox id="articleFeatured" name="featured" /><Label htmlFor="articleFeatured" className="font-normal">Feature this article</Label></div>
        <Button type="submit">Create article</Button>
      </form></section>
    </div>
  </>;
}
