import Link from "next/link";

import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return <main className="container-shell grid min-h-screen place-items-center py-20 text-center"><div><Brand className="mb-14 justify-center" /><p className="eyebrow">404 · Not found</p><h1 className="mt-4 text-5xl">That page has moved on.</h1><p className="mx-auto mt-5 max-w-md leading-7 text-muted-foreground">The link may be old, or the page may no longer be public.</p><Button asChild size="lg" className="mt-8"><Link href="/">Return home</Link></Button></div></main>;
}
