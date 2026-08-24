import { cn } from "@/lib/utils";

export function PageHeading({ eyebrow, title, description, className }: { eyebrow: string; title: string; description?: string; className?: string }) {
  return (
    <div className={cn("max-w-3xl", className)}>
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="mt-4 text-balance text-5xl leading-[0.98] tracking-[-0.035em] sm:text-6xl lg:text-7xl">{title}</h1>
      {description ? <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">{description}</p> : null}
    </div>
  );
}
