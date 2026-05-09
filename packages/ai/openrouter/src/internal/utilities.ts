import type * as Response from "@effect/ai/Response"
import * as Predicate from "effect/Predicate"
import type * as Generated from "../Generated.js"

const finishReasonMap: Record<string, Response.FinishReason> = {
  content_filter: "content-filter",
  error: "error",
  function_call: "tool-calls",
  tool_calls: "tool-calls",
  length: "length",
  stop: "stop"
}

/** @internal */
export const resolveFinishReason = (
  finishReason: typeof Generated.ChatCompletionFinishReason.Type | null
): Response.FinishReason => {
  if (Predicate.isNull(finishReason)) {
    return "unknown"
  }
  const reason = finishReasonMap[finishReason]
  if (Predicate.isUndefined(reason)) {
    return "unknown"
  }
  return reason
}
