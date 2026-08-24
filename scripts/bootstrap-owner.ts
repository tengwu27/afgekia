import { existsSync } from "node:fs";
import readline from "node:readline";

import { createClient } from "@supabase/supabase-js";

import { getSupabaseAdminEnv } from "@/lib/env";
import { passwordSchema } from "@/lib/validation";
import type { Database } from "@/types/database.generated";

if (existsSync(".env.local") && typeof process.loadEnvFile === "function") process.loadEnvFile(".env.local");

function argument(name: string) { const index = process.argv.indexOf(`--${name}`); return index >= 0 ? process.argv[index + 1] : undefined; }

async function hiddenPrompt(prompt: string) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Error("Run this command in an interactive terminal.");
  readline.emitKeypressEvents(process.stdin); process.stdin.setRawMode(true); process.stdout.write(prompt); let result = "";
  return new Promise<string>((resolve, reject) => {
    function finish() { process.stdin.setRawMode(false); process.stdin.off("keypress", onKey); process.stdout.write("\n"); resolve(result); }
    function onKey(character: string, key: readline.Key) {
      if (key.ctrl && key.name === "c") { process.stdin.setRawMode(false); process.stdin.off("keypress", onKey); process.stdout.write("\n"); reject(new Error("Cancelled.")); return; }
      if (key.name === "return" || key.name === "enter") { finish(); return; }
      if (key.name === "backspace") { if (result.length) { result = result.slice(0, -1); process.stdout.write("\b \b"); } return; }
      if (!key.ctrl && !key.meta && character) { result += character; process.stdout.write("•"); }
    }
    process.stdin.on("keypress", onKey);
  });
}

async function main() {
  const email = argument("email")?.trim().toLowerCase(); const fullName = argument("name")?.trim();
  if (!email || !fullName) throw new Error("Usage: npm run bootstrap:owner -- --email owner@example.com --name \"Owner Name\"");
  const password = await hiddenPrompt("Owner password: "); const confirmation = await hiddenPrompt("Confirm password: "); if (password !== confirmation) throw new Error("Passwords do not match."); const passwordResult = passwordSchema.safeParse(password); if (!passwordResult.success) throw new Error(passwordResult.error.issues.map((issue) => issue.message).join(" "));
  const { url, secretKey } = getSupabaseAdminEnv(); const supabase = createClient<Database>(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  const { count, error: countError } = await supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "owner"); if (countError) throw countError; if ((count ?? 0) > 0) throw new Error("An owner account already exists. Bootstrap is intentionally single-use.");
  const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true, app_metadata: { role: "owner", must_change_password: false }, user_metadata: { full_name: fullName } }); if (error || !data.user) throw error ?? new Error("Owner creation failed.");
  const { error: profileError } = await supabase.from("profiles").update({ role: "owner", full_name: fullName, must_change_password: false }).eq("id", data.user.id); if (profileError) throw profileError;
  process.stdout.write(`Owner account created for ${email}.\n`);
}

main().catch((error: unknown) => { process.stderr.write(`${error instanceof Error ? error.message : "Owner bootstrap failed."}\n`); process.exitCode = 1; });
