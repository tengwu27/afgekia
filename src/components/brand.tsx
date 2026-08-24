import Link from "next/link";

import { cn } from "@/lib/utils";

export function Brand({ className, inverse = false }: { className?: string; inverse?: boolean }) {
  return (
    <Link href="/" className={cn("group inline-flex items-center gap-3 rounded-sm", className)} aria-label="Afgekia home">
      <span className={cn("grid size-9 place-items-center rounded-full border font-heading text-xl italic transition-transform group-hover:-rotate-6", inverse ? "border-white/40 bg-white/10 text-white" : "border-primary/25 bg-primary text-primary-foreground")}>A</span>
      <span className="font-heading text-2xl leading-none">Afgekia</span>
    </Link>
  );
}
