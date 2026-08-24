"use client";

import { Check, Copy } from "lucide-react";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { createMemberAction } from "@/app/admin/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function CreateButton() { const { pending } = useFormStatus(); return <Button type="submit" disabled={pending}>{pending ? "Creating…" : "Create account"}</Button>; }

export function MemberCreateForm({ canCreateAdmin }: { canCreateAdmin: boolean }) {
  const [state, action] = useActionState(createMemberAction, { status: "idle" as const }); const [copied, setCopied] = useState(false);
  async function copyPassword() { if (!state.temporaryPassword) return; await navigator.clipboard.writeText(state.temporaryPassword); setCopied(true); }
  return <div>{state.status === "success" ? <Alert className="mb-6 border-primary/30 bg-primary/8"><AlertTitle>Copy this temporary password now</AlertTitle><AlertDescription><p className="mt-2">{state.email}</p><div className="mt-3 flex items-center gap-2"><code className="min-w-0 flex-1 overflow-x-auto rounded bg-background p-3 text-sm">{state.temporaryPassword}</code><Button type="button" variant="outline" size="icon" onClick={copyPassword} aria-label="Copy temporary password">{copied ? <Check /> : <Copy />}</Button></div><p className="mt-3 text-xs">It is not stored or logged and disappears when this page state is replaced.</p></AlertDescription></Alert> : null}{state.status === "error" ? <Alert variant="destructive" className="mb-6"><AlertDescription>{state.message}</AlertDescription></Alert> : null}<form action={action} className="grid gap-5 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="fullName">Full name</Label><Input id="fullName" name="fullName" required /></div><div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" required /></div><div className="space-y-2"><Label htmlFor="role">Role</Label><select id="role" name="role" className="h-8 w-full rounded-lg border bg-background px-2 text-sm"><option value="client">Client</option>{canCreateAdmin ? <option value="admin">Staff administrator</option> : null}</select></div><div className="space-y-2"><Label htmlFor="timezone">Timezone</Label><Input id="timezone" name="timezone" defaultValue="America/Los_Angeles" required /></div><div className="sm:col-span-2"><CreateButton /></div></form></div>;
}
