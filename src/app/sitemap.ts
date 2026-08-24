import type { MetadataRoute } from "next";

import { getArticles, getPortfolio } from "@/lib/data/public";
import { getSiteUrl } from "@/lib/env";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [work, articles] = await Promise.all([getPortfolio(), getArticles()]);
  const base = getSiteUrl();
  const routes = ["", "/services", "/work", "/insights", "/book", "/privacy"];
  return [
    ...routes.map((route) => ({ url: `${base}${route}`, changeFrequency: route === "" ? "weekly" as const : "monthly" as const })),
    ...work.map((item) => ({ url: `${base}/work/${item.slug}`, lastModified: item.updated_at, changeFrequency: "monthly" as const })),
    ...articles.map((article) => ({ url: `${base}/insights/${article.slug}`, lastModified: article.updated_at, changeFrequency: "monthly" as const })),
  ];
}
