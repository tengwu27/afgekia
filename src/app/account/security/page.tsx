import type { Metadata } from "next";

import { Brand } from "@/components/brand";
import { PasswordForm } from "@/components/password-form";
import { requireAuth } from "@/lib/auth";

export const metadata: Metadata = { title: "Account security", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function SecurityPage() {
  const auth = await requireAuth("/account/security");
  return <main className="container-shell min-h-screen py-12"><Brand /><div className="mx-auto mt-14 max-w-lg rounded-2xl border bg-card p-6 sm:p-9"><p className="eyebrow">Account security</p><h1 className="mt-4 text-4xl">{auth.profile.must_change_password ? "Choose your private password." : "Change your password."}</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">{auth.profile.must_change_password ? "This temporary password can only be used to reach this step. Replace it before entering the workspace." : "Confirm your current password, then choose a new one."}</p><div className="mt-8"><PasswordForm /></div></div></main>;
}
