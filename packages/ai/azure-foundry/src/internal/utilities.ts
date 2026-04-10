/**
 * @internal
 */
import type * as Response from "@effect/ai/Response"
import * as Predicate from "effect/Predicate"

/** @internal */
export const ProviderOptionsKey = "@effect/ai-azure-foundry/AzureFoundryLanguageModel/ProviderOptions"

/** @internal */
export const ProviderMetadataKey = "@effect/ai-azure-foundry/AzureFoundryLanguageModel/ProviderMetadata"

const finishReasonMap: Record<string, Response.FinishReason> = {
  content_filter: "content-filter",
  function_call: "tool-calls",
  length: "length",
  stop: "stop",
  tool_calls: "tool-calls"
}

const providerToolNamesMap: Map<string, string> = new Map([
  ["code_interpreter", "OpenAiCodeInterpreter"],
  ["file_search", "OpenAiFileSearch"],
  ["web_search", "OpenAiWebSearch"],
  ["web_search_preview", "OpenAiWebSearchPreview"]
])

/** @internal */
export const getProviderDefinedToolName = (name: string): string | undefined => providerToolNamesMap.get(name)

/** @internal */
export const resolveFinishReason = (
  finishReason: string | undefined,
  hasToolCalls: boolean
): Response.FinishReason => {
  if (Predicate.isNullable(finishReason)) {
    return hasToolCalls ? "tool-calls" : "stop"
  }
  const reason = finishReasonMap[finishReason]
  if (Predicate.isNullable(reason)) {
    return hasToolCalls ? "tool-calls" : "unknown"
  }
  return reason
}
