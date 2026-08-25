import "server-only";

import { gateway } from "ai";

export const DEFAULT_AI_MODEL = "minimax/minimax-m3";

export function getAIModelId() {
  return process.env.AI_MODEL?.trim() || DEFAULT_AI_MODEL;
}

export function createAIModel() {
  return gateway(getAIModelId());
}
