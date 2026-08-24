"use client";

import { Check, Copy } from "lucide-react";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { resetMemberPasswordAction } from "@/app/admin/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

function ResetButton() { const { pending } = useFormStatus(); return <Button type="submit" variant="outline" size="sm" disabled={pending}>{pending ? "Resetting…" : "Issue temporary password"}</Button>; }

export function MemberResetForm({ memberId }: { memberId: string }) {
  const [state, action] = useActionState(resetMemberPasswordAction, { status: "idle" as const }); const [copied, setCopied] = useState(false);
  return <div><form action={action}><input type="hidden" name="memberId" value={memberId} /><ResetButton /></form>{state.status === "success" ? <Alert className="mt-3"><AlertDescription><p className="text-xs">Copy now for {state.email}:</p><div className="mt-2 flex gap-2"><code className="min-w-0 flex-1 overflow-auto rounded bg-muted p-2 text-xs">{state.temporaryPassword}</code><Button type="button" size="icon-sm" variant="ghost" onClick={async () => { await navigator.clipboard.writeText(state.temporaryPassword ?? ""); setCopied(true); }}>{copied ? <Check /> : <Copy />}</Button></div></AlertDescription></Alert> : null}{state.status === "error" ? <p className="mt-2 text-xs text-destructive">{state.message}</p> : null}</div>;
}
