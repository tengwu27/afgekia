"use client";

import { useActionState } from "react";

import { assignProjectMemberAction } from "@/app/owner/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ProjectMemberAssignmentFormProps {
  projectId: string;
}

const initialState = { status: "idle" as const };

export function ProjectMemberAssignmentForm({
  projectId,
}: ProjectMemberAssignmentFormProps) {
  const [state, action, pending] = useActionState(
    assignProjectMemberAction,
    initialState,
  );
  const actionMessageId = "seller-assignment-message";

  return (
    <form action={action} className="mt-4 space-y-3">
      <input type="hidden" name="projectId" value={projectId} />
      <Label htmlFor="clientEmail">Add a registered client by email</Label>
      <Input
        id="clientEmail"
        name="email"
        type="email"
        autoComplete="email"
        required
        aria-describedby={state.message ? actionMessageId : undefined}
        aria-invalid={state.status === "error"}
        disabled={pending}
        placeholder="client@example.com"
      />
      <p className="text-xs text-muted-foreground">The account must already be registered and activated. Client accounts are never listed for browsing.</p>
      {state.status === "error" ? (
        <Alert id={actionMessageId} variant="destructive" aria-live="polite">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}
      {state.status === "success" ? (
        <Alert id={actionMessageId} aria-live="polite">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? "Adding…" : "Add client"}
      </Button>
    </form>
  );
}
