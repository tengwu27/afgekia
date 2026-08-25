import { z } from "zod";

export const ASSISTANT_RATE_LIMIT = 20;
export const ASSISTANT_RATE_WINDOW_MINUTES = 10;
export const ASSISTANT_MAX_MESSAGES = 20;
export const ASSISTANT_MAX_MESSAGE_CHARACTERS = 2_000;
export const ASSISTANT_MAX_REQUEST_BYTES = 40_000;

const chatMessageSchema = z
  .object({
    id: z.string().min(1).max(200),
    role: z.enum(["user", "assistant"]),
    parts: z.array(z.unknown()).max(30),
  })
  .passthrough();

const chatRequestSchema = z
  .object({
    messages: z.array(chatMessageSchema).min(1).max(ASSISTANT_MAX_MESSAGES),
  })
  .passthrough();

export function validateAssistantRequest(input: unknown) {
  const serialized = JSON.stringify(input);
  if (serialized.length > ASSISTANT_MAX_REQUEST_BYTES) {
    return { success: false as const, error: "The conversation is too large. Start a new chat." };
  }

  const parsed = chatRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: "The chat request is invalid." };
  }

  const lastMessage = parsed.data.messages.at(-1);
  if (lastMessage?.role !== "user") {
    return { success: false as const, error: "The last chat message must come from the user." };
  }

  const userTextLength = parsed.data.messages
    .filter((message) => message.role === "user")
    .flatMap((message) => message.parts)
    .reduce<number>((length, part) => {
      if (!part || typeof part !== "object" || Array.isArray(part)) return length;
      const candidate = part as { type?: unknown; text?: unknown };
      return length +
        (candidate.type === "text" && typeof candidate.text === "string"
          ? candidate.text.length
          : 0);
    }, 0);

  if (userTextLength > ASSISTANT_MAX_MESSAGE_CHARACTERS * 6) {
    return { success: false as const, error: "The conversation contains too much text." };
  }

  const lastMessageTextLength = lastMessage.parts.reduce<number>((length, part) => {
    if (!part || typeof part !== "object" || Array.isArray(part)) return length;
    const candidate = part as { type?: unknown; text?: unknown };
    return length +
      (candidate.type === "text" && typeof candidate.text === "string"
        ? candidate.text.length
        : 0);
  }, 0);

  if (lastMessageTextLength < 1 || lastMessageTextLength > ASSISTANT_MAX_MESSAGE_CHARACTERS) {
    return {
      success: false as const,
      error: "Enter a message between 1 and 2,000 characters.",
    };
  }

  const messages = parsed.data.messages.map((message) => ({
    id: message.id,
    role: message.role,
    parts: message.parts.flatMap((part) => {
      if (!part || typeof part !== "object" || Array.isArray(part)) return [];
      const candidate = part as { type?: unknown; text?: unknown };
      return candidate.type === "text" && typeof candidate.text === "string"
        ? [{ type: "text" as const, text: candidate.text }]
        : [];
    }),
  }));

  return { success: true as const, messages };
}

export function hasExceededAssistantRateLimit(requestCount: number) {
  return requestCount >= ASSISTANT_RATE_LIMIT;
}
