import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { RichText } from "@/components/rich-text";
import { getArticle } from "@/lib/data/public";
import { formatDate } from "@/lib/format";

export async function generateMetadata({ params }: PageProps<"/insights/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) return { title: "Insight not found" };
  return { title: article.seo_title ?? article.title, description: article.seo_description ?? article.excerpt };
}

export default async function InsightDetailPage({ params }: PageProps<"/insights/[slug]">) {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) notFound();
  return <article className="container-shell py-16 sm:py-22"><Link href="/insights" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> All insights</Link><header className="mx-auto mt-12 max-w-4xl text-center"><p className="eyebrow">Insight · {formatDate(article.published_at)}</p><h1 className="mt-5 text-balance text-6xl leading-[.98] tracking-[-.04em] sm:text-7xl">{article.title}</h1><p className="mx-auto mt-7 max-w-2xl text-xl leading-8 text-muted-foreground">{article.excerpt}</p></header><RichText value={article.body_json} className="mx-auto mt-14 max-w-3xl border-t pt-10" /></article>;
}
