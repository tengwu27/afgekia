"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { changePasswordAction } from "@/app/actions/auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SaveButton() { const { pending } = useFormStatus(); return <Button type="submit" className="h-11" disabled={pending}>{pending ? "Changing password…" : "Change password"}</Button>; }

export function PasswordForm() {
  const [state, action] = useActionState(changePasswordAction, { status: "idle" as const });
  return <form action={action} className="space-y-5" noValidate>{state.status === "error" ? <Alert variant="destructive"><AlertDescription>{state.message}</AlertDescription></Alert> : null}{[["currentPassword", "Current or temporary password", "current-password"], ["newPassword", "New password", "new-password"], ["confirmPassword", "Confirm new password", "new-password"]].map(([name, label, autocomplete]) => <div className="space-y-2" key={name}><Label htmlFor={name}>{label}</Label><Input id={name} name={name} type="password" autoComplete={autocomplete} required className="h-11" /><p className="text-sm text-destructive">{state.fieldErrors?.[name]?.[0]}</p></div>)}<p className="text-sm leading-6 text-muted-foreground">Use 12–128 characters with upper and lowercase letters and a number.</p><SaveButton /></form>;
}
