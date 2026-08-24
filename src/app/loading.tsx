import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return <main className="container-shell min-h-[70vh] py-20" aria-busy="true" aria-label="Loading"><Skeleton className="h-4 w-28" /><Skeleton className="mt-5 h-14 max-w-2xl" /><Skeleton className="mt-4 h-14 max-w-xl" /><div className="mt-14 grid gap-5 md:grid-cols-3"><Skeleton className="h-64" /><Skeleton className="h-64" /><Skeleton className="h-64" /></div></main>;
}
