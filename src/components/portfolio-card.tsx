import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { getPublicMediaUrl } from "@/lib/media";
import { cn } from "@/lib/utils";
import type { PortfolioItem } from "@/types/domain";

const accentClasses = { olive: "bg-olive", terracotta: "bg-terracotta", gold: "bg-gold", plum: "bg-plum" } as const;

export function PortfolioCard({ item, priority = false }: { item: PortfolioItem; priority?: boolean }) {
  const coverUrl = getPublicMediaUrl(item.cover_path);
  return (
    <Link href={`/work/${item.slug}`} className={cn("group relative flex min-h-80 flex-col justify-between overflow-hidden rounded-2xl border bg-card p-6 transition-transform duration-300 hover:-translate-y-1 sm:p-8", priority && "md:col-span-2 md:min-h-96")}>
      <div aria-hidden="true" className={cn("absolute -top-16 -right-12 size-48 rounded-full opacity-14 blur-2xl transition-transform duration-500 group-hover:scale-125", accentClasses[item.accent])} />
      <div className="relative">{coverUrl ? <div className="relative mb-7 aspect-[16/9] overflow-hidden rounded-xl bg-muted"><Image src={coverUrl} alt="" fill sizes={priority ? "(min-width: 768px) 60vw, 90vw" : "(min-width: 768px) 40vw, 90vw"} className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" /></div> : null}<p className="eyebrow">{item.eyebrow}</p><h2 className={cn("mt-4 max-w-xl text-4xl leading-[1.02] tracking-[-0.02em]", priority && "sm:text-5xl")}>{item.title}</h2><p className="mt-5 max-w-xl leading-7 text-muted-foreground">{item.summary}</p></div>
      <div className="relative mt-12 flex items-center justify-between text-sm font-semibold"><span>View the work</span><span className="grid size-10 place-items-center rounded-full border transition-colors group-hover:bg-primary group-hover:text-primary-foreground"><ArrowUpRight /></span></div>
    </Link>
  );
}
