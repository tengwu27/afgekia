import type { Metadata } from "next";

import { PageHeading } from "@/components/page-heading";
import { getListedOwners, getServices, getSiteSettings } from "@/lib/data/public";
import { BookingForm } from "./booking-form";

export const metadata: Metadata = { title: "Request a conversation", description: "Send a private booking request to Afgekia." };

export default async function BookingPage({ searchParams }: PageProps<"/book">) {
  const [services, owners, settings, query] = await Promise.all([getServices(), getListedOwners(), getSiteSettings(), searchParams]);
  return <div className="container-shell py-18 sm:py-24"><PageHeading eyebrow="Booking request" title="Request time with an owner." description="Booking is separate from project intake. Choose an owner, an appointment type, and times that could work." /><div className="mt-14 grid gap-10 lg:grid-cols-[1fr_20rem]"><div className="rounded-2xl border bg-card p-5 sm:p-8"><BookingForm services={services} owners={owners} defaultService={typeof query.service === "string" ? query.service : undefined} /></div><aside className="space-y-6 lg:pt-4"><div><h2 className="text-2xl">What happens next</h2><ol className="mt-4 space-y-4 text-sm leading-6 text-muted-foreground"><li><strong className="text-foreground">1.</strong> Your request receives a reference number.</li><li><strong className="text-foreground">2.</strong> The selected owner reviews the context and timing.</li><li><strong className="text-foreground">3.</strong> You receive a personal response to confirm or suggest another time.</li></ol></div><div className="rounded-xl bg-secondary p-5 text-sm leading-6"><p className="font-medium">Prefer email?</p><a href={`mailto:${settings.contact_email}`} className="mt-1 block text-primary underline underline-offset-4">{settings.contact_email}</a></div></aside></div></div>;
}
