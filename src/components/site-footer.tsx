import Link from "next/link";

import { Brand } from "@/components/brand";
import type { SiteSettings } from "@/types/domain";

export function SiteFooter({ settings }: { settings: SiteSettings }) {
  return (
    <footer className="mt-24 bg-foreground text-background">
      <div className="container-shell grid gap-12 py-14 md:grid-cols-[1fr_auto] md:items-end">
        <div><Brand inverse /><p className="mt-5 max-w-md text-sm leading-6 text-background/70">{settings.tagline} Based in the Pacific time zone, working thoughtfully across distances.</p></div>
        <div className="grid grid-cols-2 gap-x-10 gap-y-3 text-sm">
          <Link href="/services">Services</Link><Link href="/work">Work</Link><Link href="/insights">Insights</Link><Link href="/book">Booking</Link><Link href="/privacy">Privacy</Link><Link href="/login">Client login</Link>
        </div>
      </div>
      <div className="border-t border-background/15"><div className="container-shell flex flex-col gap-2 py-5 text-xs text-background/60 sm:flex-row sm:justify-between"><span>© {new Date().getFullYear()} {settings.business_name}</span><a href={`mailto:${settings.contact_email}`}>{settings.contact_email}</a></div></div>
    </footer>
  );
}
