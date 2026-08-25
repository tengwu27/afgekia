import { Badge } from "@/components/ui/badge";
import { humanize } from "@/lib/format";
import { cn } from "@/lib/utils";

export function StatusBadge({ value }: { value: string }) {
  const tone = value === "completed" || value === "done" || value === "published" || value === "confirmed" || value === "approved"
    ? "bg-primary/12 text-primary"
    : value === "blocked" || value === "declined" || value === "suspended" || value === "changes_requested"
      ? "bg-destructive/10 text-destructive"
      : value === "active" ? "bg-terracotta/15 text-terracotta" : "bg-muted text-muted-foreground";
  return <Badge variant="secondary" className={cn("border-0 font-medium", tone)}>{humanize(value)}</Badge>;
}
