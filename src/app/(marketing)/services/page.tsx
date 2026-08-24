import type { Metadata } from "next";
import { ArrowRight, Clock3 } from "lucide-react";
import Link from "next/link";

import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import { getServices } from "@/lib/data/public";

export const metadata: Metadata = { title: "Services", description: "Project clarity, workflow, and ongoing business assistance from Afgekia." };

export default async function ServicesPage() {
  const services = await getServices();
  return <div className="container-shell py-18 sm:py-24"><PageHeading eyebrow="Services" title="Practical help for complicated work." description="Every engagement begins by getting honest about what needs to move, what is getting in the way, and what a useful outcome actually looks like." /><div className="mt-16 grid gap-5 lg:grid-cols-3">{services.map((service, index) => <article key={service.id} className="flex min-h-96 flex-col rounded-2xl border bg-card p-7"><span className="font-heading text-4xl text-terracotta/65">0{index + 1}</span><h2 className="mt-10 text-3xl leading-tight">{service.name}</h2><p className="mt-4 flex-1 leading-7 text-muted-foreground">{service.description}</p><div className="mt-7 flex items-center gap-2 border-t pt-5 text-sm text-muted-foreground"><Clock3 className="size-4" /> About {service.duration_minutes} minutes</div><Button asChild variant="outline" className="mt-5"><Link href={`/book?service=${service.id}`}>Request this service <ArrowRight /></Link></Button></article>)}</div><section className="mt-20 grid gap-7 rounded-3xl bg-secondary p-8 sm:p-12 lg:grid-cols-2"><h2 className="text-4xl leading-tight">Not sure which shape of support fits?</h2><div><p className="leading-7 text-muted-foreground">That is a perfectly useful place to begin. Choose the ongoing assistance consult and describe what feels stuck; we can find the right starting point together.</p><Button asChild className="mt-6"><Link href="/book">Start with the work <ArrowRight /></Link></Button></div></section></div>;
}
