"use client";

import { useActionState, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { BookingService } from "@/types/domain";
import { submitBookingRequest } from "./actions";

const initialState = { status: "idle" as const };
const subscribeToNothing = () => () => undefined;

function ErrorText({ errors }: { errors?: string[] }) {
  return errors?.length ? <p className="text-sm text-destructive">{errors[0]}</p> : null;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return <Button type="submit" size="lg" className="h-11 w-full sm:w-auto" disabled={pending}>{pending ? "Sending request…" : "Send booking request"}</Button>;
}

export function BookingForm({ services, defaultService }: { services: BookingService[]; defaultService?: string }) {
  const [state, action] = useActionState(submitBookingRequest, initialState);
  const startedAtRef = useRef<HTMLInputElement>(null);
  const timezone = useSyncExternalStore(
    subscribeToNothing,
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Los_Angeles",
    () => "America/Los_Angeles",
  );
  const [preferredLocal, setPreferredLocal] = useState("");
  const [alternateLocal, setAlternateLocal] = useState("");

  useEffect(() => {
    if (startedAtRef.current) startedAtRef.current.value = String(Date.now());
  }, []);

  if (state.status === "success") return <Alert className="border-primary/30 bg-primary/8 p-6"><AlertTitle className="font-heading text-3xl">Request received</AlertTitle><AlertDescription className="mt-3 leading-7">Thank you. Your reference is <strong className="font-mono text-foreground">{state.referenceCode}</strong>. Afgekia will review your note and contact you personally. Save this reference for your records.</AlertDescription></Alert>;

  return (
    <form action={action} className="space-y-7" noValidate>
      <input ref={startedAtRef} type="hidden" name="formStartedAt" defaultValue="" />
      <input type="hidden" name="timezone" value={timezone} />
      <input type="hidden" name="preferredAt" value={preferredLocal ? new Date(preferredLocal).toISOString() : ""} />
      <input type="hidden" name="alternateAt" value={alternateLocal ? new Date(alternateLocal).toISOString() : ""} />
      <div className="absolute -left-[10000px]" aria-hidden="true"><Label htmlFor="website">Website</Label><Input id="website" name="website" tabIndex={-1} autoComplete="off" /></div>
      {state.status === "error" ? <Alert variant="destructive"><AlertTitle>Request not sent</AlertTitle><AlertDescription>{state.message}</AlertDescription></Alert> : null}
      <div className="space-y-2"><Label htmlFor="serviceId">What would you like help with?</Label><select id="serviceId" name="serviceId" defaultValue={defaultService && services.some((service) => service.id === defaultService) ? defaultService : ""} required className="h-11 w-full rounded-lg border bg-background px-3 text-sm"><option value="" disabled>Choose a service</option>{services.map((service) => <option key={service.id} value={service.id}>{service.name} · {service.duration_minutes} min</option>)}</select><ErrorText errors={state.fieldErrors?.serviceId} /></div>
      <div className="grid gap-5 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="fullName">Your name</Label><Input id="fullName" name="fullName" autoComplete="name" required maxLength={120} className="h-11" /><ErrorText errors={state.fieldErrors?.fullName} /></div><div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" inputMode="email" autoComplete="email" required maxLength={320} className="h-11" /><ErrorText errors={state.fieldErrors?.email} /></div></div>
      <div className="space-y-2"><Label htmlFor="phone">Phone <span className="font-normal text-muted-foreground">(optional)</span></Label><Input id="phone" name="phone" type="tel" autoComplete="tel" maxLength={40} className="h-11" /><ErrorText errors={state.fieldErrors?.phone} /></div>
      <fieldset><legend className="text-sm font-medium">Times that could work for you</legend><p className="mt-1 text-sm text-muted-foreground">Shown in {timezone.replaceAll("_", " ")}. These are preferences, not confirmed appointments.</p><div className="mt-4 grid gap-5 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="preferredLocal">Preferred time</Label><Input id="preferredLocal" type="datetime-local" value={preferredLocal} onChange={(event) => setPreferredLocal(event.target.value)} required className="h-11" /><ErrorText errors={state.fieldErrors?.preferredAt} /></div><div className="space-y-2"><Label htmlFor="alternateLocal">Alternate time <span className="font-normal text-muted-foreground">(optional)</span></Label><Input id="alternateLocal" type="datetime-local" value={alternateLocal} onChange={(event) => setAlternateLocal(event.target.value)} className="h-11" /><ErrorText errors={state.fieldErrors?.alternateAt} /></div></div></fieldset>
      <div className="space-y-2"><Label htmlFor="message">What is happening, and what would help?</Label><Textarea id="message" name="message" required minLength={20} maxLength={3000} rows={7} placeholder="A little context helps us make the first conversation useful…" /><div className="flex justify-between gap-4"><ErrorText errors={state.fieldErrors?.message} /><span className="ml-auto text-xs text-muted-foreground">20–3,000 characters</span></div></div>
      <div className="flex items-start gap-3 rounded-xl bg-muted/60 p-4"><Checkbox id="privacyConsent" name="privacyConsent" value="on" required className="mt-0.5" /><Label htmlFor="privacyConsent" className="text-sm font-normal leading-6">I agree that Afgekia may use these details to respond to my request, as described in the <Link href="/privacy" className="font-medium underline underline-offset-4">privacy notice</Link>.</Label></div><ErrorText errors={state.fieldErrors?.privacyConsent} />
      <div className="flex flex-col gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between"><p className="max-w-md text-xs leading-5 text-muted-foreground">A human will review your request. This form does not create a live calendar appointment.</p><SubmitButton /></div>
    </form>
  );
}
