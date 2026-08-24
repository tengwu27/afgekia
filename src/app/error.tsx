"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return <main className="container-shell grid min-h-[70vh] place-items-center py-20 text-center"><div><p className="eyebrow">Something went wrong</p><h1 className="mt-4 text-5xl">We couldn’t finish that request.</h1><p className="mx-auto mt-5 max-w-md text-muted-foreground">No changes were made. Please try once more.</p><Button onClick={reset} className="mt-8" size="lg">Try again</Button></div></main>;
}
