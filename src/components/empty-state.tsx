import type { LucideIcon } from "lucide-react";

export function EmptyState({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return <div className="grid min-h-56 place-items-center rounded-2xl border border-dashed bg-card/50 p-8 text-center"><div><span className="mx-auto grid size-11 place-items-center rounded-full bg-muted text-muted-foreground"><Icon className="size-5" /></span><h2 className="mt-4 text-2xl">{title}</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p></div></div>;
}
