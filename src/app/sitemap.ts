import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/env";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  return ["", "/book", "/privacy", "/login", "/register"].map(route => ({
    url: `${base}${route}`,
    changeFrequency: route === "" ? "weekly" as const : "monthly" as const,
  }));
}
