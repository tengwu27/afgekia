import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { RichText } from "@/components/rich-text";
import { Progress } from "@/components/ui/progress";
import { getPortfolioItem } from "@/lib/data/public";
import { formatDate } from "@/lib/format";

export async function generateMetadata({ params }: PageProps<"/work/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const item = await getPortfolioItem(slug);
  if (!item) return { title: "Work not found" };
  return { title: item.seo_title ?? item.title, description: item.seo_description ?? item.summary };
}

export default async function WorkDetailPage({ params }: PageProps<"/work/[slug]">) {
  const { slug } = await params;
  const item = await getPortfolioItem(slug);
  if (!item) notFound();
  return <article className="container-shell py-16 sm:py-22"><Link href="/work" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> All work</Link><header className="mt-12 grid gap-10 border-b pb-14 lg:grid-cols-[1.2fr_.8fr] lg:items-end"><div><p className="eyebrow">{item.eyebrow}</p><h1 className="mt-5 max-w-4xl text-balance text-6xl leading-[.96] tracking-[-.04em] sm:text-7xl">{item.title}</h1></div><p className="text-xl leading-8 text-muted-foreground">{item.summary}</p></header><div className="grid gap-14 py-14 lg:grid-cols-[1fr_18rem]"><RichText value={item.body_json} className="max-w-3xl" />{item.updates?.length ? <aside><p className="eyebrow">Published updates</p><div className="mt-5 space-y-5">{item.updates.map((update) => <div key={update.id} className="rounded-xl border bg-card p-5"><time className="text-xs text-muted-foreground" dateTime={update.published_at}>{formatDate(update.published_at)}</time><h2 className="mt-2 text-xl">{update.title}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{update.body_text}</p>{update.progress !== null ? <div className="mt-4"><div className="mb-2 flex justify-between text-xs"><span>Progress</span><span>{update.progress}%</span></div><Progress value={update.progress} /></div> : null}</div>)}</div></aside> : null}</div></article>;
}
