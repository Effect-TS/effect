import type * as AiResponse from "@effect/ai/AiResponse"
import * as Predicate from "effect/Predicate"
import type { StopReason } from "../AmazonBedrockSchema.js"

/** @internal */
export const ProviderMetadataKey = "@effect/ai-amazon-bedrock/AmazonBedrockLanguageModel/ProviderMetadata"

const finishReasonMap: Record<StopReason, AiResponse.FinishReason> = {
  content_filtered: "content-filter",
  end_turn: "stop",
  guardrail_intervened: "content-filter",
  max_tokens: "length",
  stop_sequence: "stop",
  tool_use: "tool-calls"
}

/** @internal */
export const resolveFinishReason = (stopReason: StopReason): AiResponse.FinishReason => {
  const reason = finishReasonMap[stopReason]
  return Predicate.isUndefined(reason) ? "unknown" : reason
}
