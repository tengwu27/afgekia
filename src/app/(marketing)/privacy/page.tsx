import type { Metadata } from "next";

import { PageHeading } from "@/components/page-heading";
import { getSiteSettings } from "@/lib/data/public";

export const metadata: Metadata = { title: "Privacy", description: "How Afgekia handles booking and client information." };

export default async function PrivacyPage() {
  const settings = await getSiteSettings();
  return <article className="container-shell py-18 sm:py-24"><PageHeading eyebrow="Privacy" title="Your information is handled with care." description="This notice explains the information Afgekia collects through this website and how it is used." /><div className="prose-afgekia mt-14 max-w-3xl"><h2>Booking requests</h2><p>When you request a conversation, we collect your contact details, selected service, preferred times, timezone, and message. We use this information only to review and respond to your request, arrange the conversation, and maintain an operational record.</p><h2>Client accounts</h2><p>Client access is invitation-only. Account and project information is used to provide a private view of assigned work. Afgekia does not sell personal information, and private project records are not used as public portfolio content.</p><h2>Public publishing</h2><p>Portfolio stories and public updates are separate records containing approved, public-safe copy. A private source can be linked for internal provenance without exposing that source to public visitors.</p><h2>Retention and security</h2><p>Information is retained while it is useful for the working relationship, legal obligations, and ordinary business records. Access is limited by account role and project assignment. No online system can promise absolute security, but practical technical and organizational controls are applied.</p><h2>Your questions</h2><p>To ask about, correct, or request deletion of your personal information, email <a href={`mailto:${settings.contact_email}`}>{settings.contact_email}</a>.</p><p className="text-sm text-muted-foreground">Last updated August 23, 2026.</p></div></article>;
}
