import type { Metadata } from "next";

import { ArticleCard } from "@/components/article-card";
import { PageHeading } from "@/components/page-heading";
import { getArticles } from "@/lib/data/public";

export const metadata: Metadata = { title: "Insights", description: "Practical notes on planning, coordination, communication, and sustainable work." };

export default async function InsightsPage() {
  const articles = await getArticles();
  return <div className="container-shell py-18 sm:py-24"><PageHeading eyebrow="Insights" title="Notes for working with more intention." description="Short, practical observations about making plans clearer, communication kinder, and follow-through more dependable." /><div className="mt-16">{articles.map((article) => <ArticleCard key={article.id} article={article} />)}</div></div>;
}
