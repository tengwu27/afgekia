import type { Metadata } from "next";

import { PageHeading } from "@/components/page-heading";
import { getServices, getSiteSettings } from "@/lib/data/public";
import { BookingForm } from "./booking-form";

export const metadata: Metadata = { title: "Request a conversation", description: "Send a private booking request to Afgekia." };

export default async function BookingPage({ searchParams }: PageProps<"/book">) {
  const [services, settings, query] = await Promise.all([getServices(), getSiteSettings(), searchParams]);
  return <div className="container-shell py-18 sm:py-24"><PageHeading eyebrow="Booking request" title="Tell me what needs moving." description="Choose a starting point and share a few details. This is a request rather than instant booking; you will hear back personally with next steps." /><div className="mt-14 grid gap-10 lg:grid-cols-[1fr_20rem]"><div className="rounded-2xl border bg-card p-5 sm:p-8"><BookingForm services={services} defaultService={typeof query.service === "string" ? query.service : undefined} /></div><aside className="space-y-6 lg:pt-4"><div><h2 className="text-2xl">What happens next</h2><ol className="mt-4 space-y-4 text-sm leading-6 text-muted-foreground"><li><strong className="text-foreground">1.</strong> Your request receives a reference number.</li><li><strong className="text-foreground">2.</strong> Afgekia reviews the context and timing.</li><li><strong className="text-foreground">3.</strong> You receive a personal response to confirm, suggest another time, or clarify fit.</li></ol></div><div className="rounded-xl bg-secondary p-5 text-sm leading-6"><p className="font-medium">Prefer email?</p><a href={`mailto:${settings.contact_email}`} className="mt-1 block text-primary underline underline-offset-4">{settings.contact_email}</a></div></aside></div></div>;
}
