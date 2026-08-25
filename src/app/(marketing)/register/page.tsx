import type { Metadata } from "next";
import Link from "next/link";

import { RegisterForm } from "@/components/register-form";

export const metadata: Metadata = { title: "Request a client account", robots: { index: false } };

export default function RegisterPage() {
  return <div className="container-shell py-18 sm:py-24"><div className="mx-auto max-w-2xl"><p className="eyebrow">Client registration</p><h1 className="mt-4 text-5xl">Start with a secure account.</h1><p className="mt-5 max-w-xl leading-7 text-muted-foreground">Registration is reviewed manually. Once an administrator activates your account, you can request a real-estate listing project and follow its progress.</p><div className="mt-10 rounded-2xl border bg-card p-5 sm:p-8"><RegisterForm /></div><p className="mt-6 text-center text-sm text-muted-foreground">Already registered? <Link href="/login" className="font-medium text-foreground underline underline-offset-4">Sign in</Link></p></div></div>;
}
