import type * as AiResponse from "@effect/ai/AiResponse"
import * as Predicate from "effect/Predicate"

/** @internal */
export const ProviderOptionsKey = "@effect/ai-anthropic/AnthropicLanguageModel/ProviderOptions"

/** @internal */
export const ProviderMetadataKey = "@effect/ai-anthropic/AnthropicLanguageModel/ProviderMetadata"

const finishReasonMap: Record<string, AiResponse.FinishReason> = {
  end_turn: "stop",
  max_tokens: "length",
  stop_sequence: "stop",
  tool_use: "tool-calls"
}

/** @internal */
export const resolveFinishReason = (
  finishReason: string,
  isJsonResponse: boolean = false
): AiResponse.FinishReason => {
  const reason = finishReasonMap[finishReason]
  if (Predicate.isUndefined(reason)) {
    return "unknown"
  }
  if (isJsonResponse && reason === "tool-calls") {
    return "stop"
  }
  return reason
}
