import "server-only";

import { redirect } from "next/navigation";

import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AuthContext } from "@/types/domain";

export async function getAuthContext(): Promise<AuthContext | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  if (error || typeof userId !== "string") return null;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (profileError || !profile) return null;

  return {
    userId,
    email:
      typeof data?.claims?.email === "string"
        ? data.claims.email
        : profile.email,
    profile,
  };
}

export async function requireAuth(nextPath = "/portal") {
  const auth = await getAuthContext();
  if (!auth) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  if (auth.profile.state !== "active") redirect("/login?error=suspended");
  return auth;
}

export async function requireAdmin(nextPath = "/admin") {
  const auth = await requireAuth(nextPath);
  if (auth.profile.must_change_password) redirect("/account/security");
  if (auth.profile.role !== "admin") redirect(auth.profile.role === "owner" ? "/owner" : "/portal");
  return auth;
}

export async function requireOwner(nextPath = "/owner") {
  const auth = await requireAuth(nextPath);
  if (auth.profile.must_change_password) redirect("/account/security");
  if (auth.profile.role !== "owner") redirect(auth.profile.role === "admin" ? "/admin" : "/portal");
  return auth;
}

export async function requireClientWorkspace() {
  const auth = await requireAuth("/portal");
  if (auth.profile.must_change_password) redirect("/account/security");
  if (auth.profile.role !== "client") redirect(auth.profile.role === "owner" ? "/owner" : "/admin");
  return auth;
}
