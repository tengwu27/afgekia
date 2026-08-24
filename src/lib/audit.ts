import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "@/types/database.generated";

export async function writeAuditEvent(
  supabase: SupabaseClient<Database>,
  input: {
    actorId: string;
    action: string;
    entityType: string;
    entityId?: string | null;
    details?: Json;
  },
) {
  const { error } = await supabase.from("audit_events").insert({
    actor_id: input.actorId,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    details: input.details ?? {},
  });

  if (error) throw new Error(`Could not write audit event: ${error.message}`);
}
