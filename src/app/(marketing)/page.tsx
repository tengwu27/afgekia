import { ArrowRight, Camera, CheckCircle2, Hammer, House, SearchCheck, Sparkles } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { getSiteSettings } from "@/lib/data/public";

const stages = [
  [SearchCheck, "Assessment", "Define the property plan, timeline, and seller approvals before the work becomes official."],
  [Sparkles, "Prepare", "Coordinate cleaning, remodeling, and staging with milestones everyone can follow."],
  [Camera, "Go to market", "Move through photography, marketing, and open house with clear progress updates."],
  [House, "Close", "Track the path from offer and contract through a completed or archived listing."],
] as const;

export default async function HomePage() {
  const settings = await getSiteSettings();
  return <>
    <section className="container-shell grid min-h-[76vh] items-center gap-12 py-20 lg:grid-cols-[1.15fr_.85fr] lg:py-28"><div><p className="eyebrow">Real-estate listing support</p><h1 className="mt-5 max-w-4xl text-balance text-6xl leading-[.92] tracking-[-.045em] sm:text-7xl lg:text-[6rem]">A clearer path<br /><em className="font-normal text-primary">from assessment to close.</em></h1><p className="mt-7 max-w-2xl text-lg leading-8 text-muted-foreground">{settings.description}</p><div className="mt-9 flex flex-col gap-3 sm:flex-row"><Button asChild size="lg" className="h-11 px-5"><Link href="/request">Request listing support <ArrowRight /></Link></Button><Button asChild size="lg" variant="outline" className="h-11 px-5"><Link href="/book">Book a conversation</Link></Button></div></div><aside className="relative mx-auto w-full max-w-md rounded-[2rem] border bg-card p-7 shadow-[0_30px_80px_-50px_rgba(45,51,30,.55)] sm:p-9"><div aria-hidden="true" className="absolute -top-7 -right-6 size-20 rounded-full bg-terracotta/25 blur-xl" /><Hammer className="size-8 text-primary" /><p className="mt-5 font-heading text-3xl">One private listing workspace</p><div className="mt-7 space-y-5">{["Address-first project identity", "Seller-approved assessment plan", "Visible stages, milestones, and updates", "Quick status answers through the AI assistant"].map(item => <div key={item} className="flex gap-3"><CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" /><p className="text-sm leading-6">{item}</p></div>)}</div></aside></section>
    <section id="process" className="border-y bg-card/65 py-20 sm:py-28"><div className="container-shell"><p className="eyebrow">The listing process</p><h2 className="mt-4 max-w-3xl text-5xl leading-none">The next step stays visible.</h2><div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{stages.map(([Icon, title, description], index) => <article key={title} className="rounded-2xl border bg-background/75 p-6"><div className="flex items-center justify-between"><Icon className="size-6 text-primary" /><span className="font-heading text-3xl text-terracotta/70">0{index + 1}</span></div><h3 className="mt-8 text-2xl">{title}</h3><p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p></article>)}</div></div></section>
    <section className="container-shell py-20 sm:py-28"><div className="rounded-[2rem] bg-primary px-7 py-14 text-center text-primary-foreground sm:px-12 sm:py-20"><p className="text-xs font-semibold tracking-[.18em] uppercase text-primary-foreground/70">A clean start</p><h2 className="mx-auto mt-5 max-w-3xl text-balance text-5xl leading-none sm:text-6xl">Ready to make the listing plan official?</h2><p className="mx-auto mt-6 max-w-xl leading-7 text-primary-foreground/75">Register for a private client account, choose your project owner, and submit the property context without mixing scheduling into the request.</p><div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><Button asChild size="lg" variant="secondary" className="h-11"><Link href="/register">Register as a client</Link></Button><Button asChild size="lg" variant="outline" className="h-11 border-primary-foreground/35 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"><Link href="/book">Book first</Link></Button></div></div></section>
  </>;
}
