"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";

import { submitProjectRequestAction } from "@/app/(marketing)/request/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { OwnerProjectType } from "@/types/domain";

const initialState = { status: "idle" as const };
function ErrorText({ errors }: { errors?: string[] }) { return errors?.length ? <p className="text-sm text-destructive">{errors[0]}</p> : null; }
function SubmitButton() { const { pending } = useFormStatus(); return <Button type="submit" disabled={pending}>{pending ? "Sending…" : "Send listing request"}</Button>; }

export function ProjectRequestForm({ owners }: { owners: OwnerProjectType[] }) {
  const [state, action] = useActionState(submitProjectRequestAction, initialState);
  const startedAt = useRef<HTMLInputElement>(null);
  useEffect(() => { if (startedAt.current) startedAt.current.value = String(Date.now()); }, []);
  if (state.status === "success") return <Alert className="border-primary/30 bg-primary/8 p-6"><AlertTitle className="font-heading text-3xl">Request sent</AlertTitle><AlertDescription className="mt-3 leading-7">{state.message} Your reference is <strong className="font-mono text-foreground">{state.referenceCode}</strong>. Track it in <Link href="/portal/requests" className="underline underline-offset-4">your requests</Link>.</AlertDescription></Alert>;
  return <form action={action} className="space-y-6" noValidate>
    <input ref={startedAt} type="hidden" name="formStartedAt" />
    <div className="absolute -left-[10000px]" aria-hidden="true"><Label htmlFor="website">Website</Label><Input id="website" name="website" tabIndex={-1} autoComplete="off" /></div>
    {state.status === "error" ? <Alert variant="destructive"><AlertDescription>{state.message}</AlertDescription></Alert> : null}
    <div className="space-y-2"><Label htmlFor="ownerId">Project owner</Label><select id="ownerId" name="ownerId" required defaultValue="" className="h-11 w-full rounded-lg border bg-background px-3 text-sm"><option value="" disabled>Choose an owner</option>{owners.map(owner => <option key={owner.owner_id} value={owner.owner_id}>{owner.display_name}</option>)}</select><ErrorText errors={state.fieldErrors?.ownerId} /></div>
    <div className="grid gap-5 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="propertyAddressShort">Short property address</Label><Input id="propertyAddressShort" name="propertyAddressShort" required maxLength={100} placeholder="123 Main St" /><ErrorText errors={state.fieldErrors?.propertyAddressShort} /></div><div className="space-y-2"><Label htmlFor="sellerNickname">Seller nickname</Label><Input id="sellerNickname" name="sellerNickname" required maxLength={50} placeholder="The Parkers" /><ErrorText errors={state.fieldErrors?.sellerNickname} /></div></div>
    <div className="space-y-2"><Label htmlFor="summary">What support do you need?</Label><Textarea id="summary" name="summary" required minLength={20} maxLength={600} rows={4} placeholder="Tell the owner where the listing stands and what you need help coordinating." /><ErrorText errors={state.fieldErrors?.summary} /></div>
    <div className="space-y-2"><Label htmlFor="details">Additional details <span className="font-normal text-muted-foreground">(optional)</span></Label><Textarea id="details" name="details" maxLength={12000} rows={7} /><ErrorText errors={state.fieldErrors?.details} /></div>
    <div className="flex items-start gap-3 rounded-xl bg-muted/60 p-4"><Checkbox id="privacyConsent" name="privacyConsent" value="on" required className="mt-0.5" /><Label htmlFor="privacyConsent" className="font-normal leading-6">I agree that Afgekia and the selected owner may use these details to review this listing request under the <Link href="/privacy" className="underline underline-offset-4">privacy notice</Link>.</Label></div><ErrorText errors={state.fieldErrors?.privacyConsent} />
    <SubmitButton />
  </form>;
}
