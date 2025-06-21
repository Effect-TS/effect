import type * as AiResponse from "@effect/ai/AiResponse"
import * as Predicate from "effect/Predicate"
import type { CandidateFinishReason } from "../Generated.js"

/** @internal */
export const ProviderMetadataKey = "@effect/ai-google/GoogleGenerativeAiLanguageModel/ProviderMetadata"

const finishReasonMap: Record<typeof CandidateFinishReason.Type, AiResponse.FinishReason> = {
  BLOCKLIST: "content-filter",
  FINISH_REASON_UNSPECIFIED: "other",
  IMAGE_SAFETY: "content-filter",
  LANGUAGE: "content-filter",
  MALFORMED_FUNCTION_CALL: "error",
  MAX_TOKENS: "length",
  OTHER: "other",
  PROHIBITED_CONTENT: "content-filter",
  RECITATION: "content-filter",
  SAFETY: "content-filter",
  SPII: "content-filter",
  STOP: "stop"
}

/** @internal */
export const resolveFinishReason = (finishReason: typeof CandidateFinishReason.Type): AiResponse.FinishReason => {
  const reason = finishReasonMap[finishReason]
  return Predicate.isUndefined(reason) ? "unknown" : reason
}
