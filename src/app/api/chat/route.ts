import { createAgentUIStreamResponse } from "ai";

import { writeAuditEvent } from "@/lib/audit";
import {
  ASSISTANT_RATE_WINDOW_MINUTES,
  hasExceededAssistantRateLimit,
  validateAssistantRequest,
} from "@/lib/ai/security";
import { getAIModelId } from "@/lib/ai/gateway";
import { createProjectAssistant } from "@/lib/ai/project-assistant";
import { getAuthContext } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 35;

export async function POST(request: Request) {
  const auth = await getAuthContext();
  if (!auth || auth.profile.state !== "active") {
    return Response.json({ error: "Authentication is required." }, { status: 401 });
  }
  if (auth.profile.must_change_password) {
    return Response.json(
      { error: "Change your temporary password before using the assistant." },
      { status: 403 },
    );
  }
  if (auth.profile.role === "admin") {
    return Response.json({ error: "The project assistant is available only in owner and client workspaces." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "The chat request is invalid." }, { status: 400 });
  }

  const validated = validateAssistantRequest(body);
  if (!validated.success) {
    return Response.json({ error: validated.error }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const rateWindowStart = new Date(
    Date.now() - ASSISTANT_RATE_WINDOW_MINUTES * 60_000,
  ).toISOString();
  const { count, error: countError } = await admin
    .from("audit_events")
    .select("id", { count: "exact", head: true })
    .eq("actor_id", auth.userId)
    .eq("action", "assistant.requested")
    .gte("created_at", rateWindowStart);

  if (countError) {
    return Response.json({ error: "The assistant is temporarily unavailable." }, { status: 503 });
  }
  if (hasExceededAssistantRateLimit(count ?? 0)) {
    return Response.json(
      { error: "You have sent several requests. Please wait a few minutes and try again." },
      { status: 429, headers: { "Retry-After": "600" } },
    );
  }

  const supabase = await createSupabaseServerClient();
  await writeAuditEvent(supabase, {
    actorId: auth.userId,
    action: "assistant.requested",
    entityType: "assistant_session",
    details: {
      model: getAIModelId(),
      message_count: validated.messages.length,
    },
  });

  try {
    const agent = createProjectAssistant({
      supabase,
      role: auth.profile.role,
      onEnd: async ({ inputTokens, outputTokens, totalTokens, toolNames }) => {
        try {
          await writeAuditEvent(supabase, {
            actorId: auth.userId,
            action: "assistant.completed",
            entityType: "assistant_session",
            details: {
              model: getAIModelId(),
              input_tokens: inputTokens ?? null,
              output_tokens: outputTokens ?? null,
              total_tokens: totalTokens ?? null,
              tool_names: toolNames,
            },
          });
        } catch {
          // Usage telemetry must never turn an otherwise successful answer into an error.
        }
      },
    });

    return await createAgentUIStreamResponse({
      agent,
      uiMessages: validated.messages,
      abortSignal: request.signal,
      timeout: { totalMs: 30_000 },
      headers: {
        "Cache-Control": "no-store, private",
        "X-Content-Type-Options": "nosniff",
      },
      onError: () => "The assistant could not complete that request. Please try again.",
    });
  } catch {
    return Response.json({ error: "The assistant is temporarily unavailable." }, { status: 503 });
  }
}
