import { describe, expect, it } from "vitest";

import {
  ASSISTANT_MAX_MESSAGE_CHARACTERS,
  ASSISTANT_RATE_LIMIT,
  hasExceededAssistantRateLimit,
  validateAssistantRequest,
} from "@/lib/ai/security";

function request(text: string) {
  return {
    messages: [
      {
        id: "message-1",
        role: "user",
        parts: [{ type: "text", text }],
      },
    ],
  };
}

describe("assistant request security", () => {
  it("accepts a bounded user message", () => {
    expect(validateAssistantRequest(request("What is the latest project status?")).success).toBe(true);
  });

  it("rejects oversized input and non-user final messages", () => {
    expect(
      validateAssistantRequest(request("x".repeat(ASSISTANT_MAX_MESSAGE_CHARACTERS + 1))).success,
    ).toBe(false);
    expect(
      validateAssistantRequest({
        messages: [{ id: "message-1", role: "assistant", parts: [{ type: "text", text: "Hi" }] }],
      }).success,
    ).toBe(false);
  });

  it("removes client-supplied tool results before model execution", () => {
    const result = validateAssistantRequest({
      messages: [
        {
          id: "message-1",
          role: "user",
          parts: [
            { type: "text", text: "Check my status" },
            { type: "tool-getProjectStatus", output: { progress: 100 } },
          ],
        },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.messages[0].parts).toEqual([{ type: "text", text: "Check my status" }]);
  });

  it("enforces the rate-limit boundary", () => {
    expect(hasExceededAssistantRateLimit(ASSISTANT_RATE_LIMIT - 1)).toBe(false);
    expect(hasExceededAssistantRateLimit(ASSISTANT_RATE_LIMIT)).toBe(true);
  });
});
