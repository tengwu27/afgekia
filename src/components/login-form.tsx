"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { loginAction } from "@/app/actions/auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function LoginButton() { const { pending } = useFormStatus(); return <Button type="submit" size="lg" className="h-11 w-full" disabled={pending}>{pending ? "Signing in…" : "Sign in securely"}</Button>; }

export function LoginForm({ next, error }: { next?: string; error?: string }) {
  const [state, action] = useActionState(loginAction, { status: "idle" as const });
  return <form action={action} className="space-y-5" noValidate><input type="hidden" name="next" value={next ?? ""} />{error === "suspended" ? <Alert variant="destructive"><AlertDescription>This account is suspended. Contact the owner for help.</AlertDescription></Alert> : null}{state.status === "error" ? <Alert variant="destructive"><AlertDescription>{state.message}</AlertDescription></Alert> : null}<div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" autoComplete="username" required className="h-11" /><p className="text-sm text-destructive">{state.fieldErrors?.email?.[0]}</p></div><div className="space-y-2"><Label htmlFor="password">Password</Label><Input id="password" name="password" type="password" autoComplete="current-password" required className="h-11" /><p className="text-sm text-destructive">{state.fieldErrors?.password?.[0]}</p></div><LoginButton /><p className="text-center text-xs leading-5 text-muted-foreground">Accounts are invitation-only. Password help is provided by an administrator; no recovery email is sent in this MVP.</p></form>;
}
