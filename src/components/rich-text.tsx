import { richTextToSafeHtml } from "@/lib/rich-text";
import { cn } from "@/lib/utils";

export function RichText({ value, className }: { value: unknown; className?: string }) {
  return <div className={cn("prose-afgekia", className)} dangerouslySetInnerHTML={{ __html: richTextToSafeHtml(value) }} />;
}
