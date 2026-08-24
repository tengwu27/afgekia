import type { Metadata } from "next";

import { PageHeading } from "@/components/page-heading";
import { PortfolioCard } from "@/components/portfolio-card";
import { getPortfolio } from "@/lib/data/public";

export const metadata: Metadata = { title: "Selected work", description: "Curated, public-safe stories of practical project progress." };

export default async function WorkPage() {
  const items = await getPortfolio();
  return <div className="container-shell py-18 sm:py-24"><PageHeading eyebrow="Selected work" title="The shape of useful progress." description="These public stories are independently written and approved. Private client details never appear here unless intentionally curated for publication." /><div className="mt-16 grid gap-5 md:grid-cols-2">{items.map((item, index) => <PortfolioCard key={item.id} item={item} priority={index === 0} />)}</div></div>;
}
