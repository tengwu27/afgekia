"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useSyncExternalStore } from "react";
import { useFormStatus } from "react-dom";

import { registerClientAction } from "@/app/(marketing)/register/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState = { status: "idle" as const };
const subscribeToNothing = () => () => undefined;

function ErrorText({ errors }: { errors?: string[] }) {
  return errors?.length ? <p className="text-sm text-destructive">{errors[0]}</p> : null;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending}>{pending ? "Submitting…" : "Request an account"}</Button>;
}

export function RegisterForm() {
  const [state, action] = useActionState(registerClientAction, initialState);
  const startedAt = useRef<HTMLInputElement>(null);
  const timezone = useSyncExternalStore(
    subscribeToNothing,
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Los_Angeles",
    () => "America/Los_Angeles",
  );
  useEffect(() => { if (startedAt.current) startedAt.current.value = String(Date.now()); }, []);

  if (state.status === "success") {
    return <Alert className="border-primary/30 bg-primary/8"><AlertTitle>Registration received</AlertTitle><AlertDescription className="mt-2">{state.message} You can return to <Link href="/login" className="underline underline-offset-4">sign in</Link> after activation.</AlertDescription></Alert>;
  }

  return <form action={action} className="space-y-5" noValidate>
    <input ref={startedAt} type="hidden" name="formStartedAt" />
    <input type="hidden" name="timezone" value={timezone} />
    <div className="absolute -left-[10000px]" aria-hidden="true"><Label htmlFor="website">Website</Label><Input id="website" name="website" tabIndex={-1} autoComplete="off" /></div>
    {state.status === "error" ? <Alert variant="destructive"><AlertDescription>{state.message}</AlertDescription></Alert> : null}
    <div className="space-y-2"><Label htmlFor="fullName">Full name</Label><Input id="fullName" name="fullName" autoComplete="name" required maxLength={120} /><ErrorText errors={state.fieldErrors?.fullName} /></div>
    <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" autoComplete="email" required maxLength={320} /><ErrorText errors={state.fieldErrors?.email} /></div>
    <div className="grid gap-5 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="password">Password</Label><Input id="password" name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={128} /><ErrorText errors={state.fieldErrors?.password} /></div><div className="space-y-2"><Label htmlFor="confirmPassword">Confirm password</Label><Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required /><ErrorText errors={state.fieldErrors?.confirmPassword} /></div></div>
    <p className="text-xs leading-5 text-muted-foreground">Use at least 12 characters with upper- and lowercase letters and a number. Your detected timezone is {timezone.replaceAll("_", " ")}.</p>
    <div className="flex items-start gap-3 rounded-xl bg-muted/60 p-4"><Checkbox id="privacyConsent" name="privacyConsent" value="on" required className="mt-0.5" /><Label htmlFor="privacyConsent" className="font-normal leading-6">I agree that Afgekia may use these details to create and review my account under the <Link href="/privacy" className="underline underline-offset-4">privacy notice</Link>.</Label></div><ErrorText errors={state.fieldErrors?.privacyConsent} />
    <SubmitButton />
  </form>;
}
