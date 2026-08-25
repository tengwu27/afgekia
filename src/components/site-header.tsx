import { LogOut, Menu } from "lucide-react";
import Link from "next/link";

import { logoutAction } from "@/app/actions/auth";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { accountDestination } from "@/lib/access";
import { getAuthContext } from "@/lib/auth";

const links = [["How it works", "/#process"], ["Booking", "/book"]] as const;

export async function SiteHeader() {
  const auth = await getAuthContext();
  const signedIn = auth?.profile.state === "active";
  const dashboardHref = signedIn
    ? accountDestination(auth.profile.role, auth.profile.must_change_password)
    : null;

  return (
    <header className="sticky top-0 z-40 border-b bg-background/92 backdrop-blur-xl">
      <div className="container-shell flex h-18 items-center justify-between">
        <Brand />
        <nav aria-label="Main navigation" className="hidden items-center gap-6 md:flex">
          {links.map(([label, href]) => <Link key={href} href={href} className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">{label}</Link>)}
          {dashboardHref ? <div className="flex items-center gap-1"><Button asChild variant="outline" size="lg"><Link href={dashboardHref}>Dashboard</Link></Button><form action={logoutAction}><Button type="submit" variant="ghost" size="lg"><LogOut /> Sign out</Button></form></div> : <Link href="/login" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">Client login</Link>}
          <Button asChild size="lg"><Link href="/request">Request a listing project</Link></Button>
        </nav>
        <Sheet>
          <SheetTrigger asChild><Button variant="outline" size="icon-lg" className="md:hidden" aria-label="Open navigation"><Menu /></Button></SheetTrigger>
          <SheetContent side="right" className="w-[88vw] max-w-sm bg-background p-7">
            <SheetHeader className="sr-only"><SheetTitle>Navigation</SheetTitle><SheetDescription>Browse Afgekia</SheetDescription></SheetHeader>
            <Brand className="mb-12" />
            <nav aria-label="Mobile navigation" className="flex flex-col gap-6">
              {links.map(([label, href]) => <Link key={href} href={href} className="font-heading text-3xl">{label}</Link>)}
              {dashboardHref ? <><Link href={dashboardHref} className="font-heading text-3xl">Dashboard</Link><form action={logoutAction}><Button type="submit" variant="outline" size="lg" className="h-11 w-full"><LogOut /> Sign out</Button></form></> : <Link href="/login" className="font-heading text-3xl">Client login</Link>}
              <Button asChild size="lg" className="mt-3 h-11"><Link href="/request">Request a listing project</Link></Button>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
