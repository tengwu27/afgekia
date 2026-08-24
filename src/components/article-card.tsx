import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { formatDate } from "@/lib/format";
import type { Article } from "@/types/domain";

export function ArticleCard({ article }: { article: Article }) {
  return <article className="group border-t py-7"><Link href={`/insights/${article.slug}`} className="grid gap-4 rounded-sm sm:grid-cols-[9rem_1fr_auto] sm:items-start"><time className="text-sm text-muted-foreground" dateTime={article.published_at ?? undefined}>{formatDate(article.published_at)}</time><div><h2 className="text-3xl leading-tight transition-colors group-hover:text-primary">{article.title}</h2><p className="mt-3 max-w-2xl leading-7 text-muted-foreground">{article.excerpt}</p></div><ArrowRight className="mt-1 hidden text-primary transition-transform group-hover:translate-x-1 sm:block" /></Link></article>;
}
