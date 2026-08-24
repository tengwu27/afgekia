import type { Metadata } from "next";

import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = { title: "Client login", robots: { index: false, follow: false } };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const query = await searchParams;
  return <div className="container-shell grid min-h-[70vh] place-items-center py-16"><div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-sm sm:p-9"><p className="eyebrow">Private workspace</p><h1 className="mt-4 text-4xl">Welcome back.</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">Sign in to view assigned projects, milestones, updates, and booking history.</p><div className="mt-8"><LoginForm next={typeof query.next === "string" ? query.next : undefined} error={typeof query.error === "string" ? query.error : undefined} /></div></div></div>;
}
