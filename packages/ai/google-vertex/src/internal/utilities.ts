import type * as Response from "effect/unstable/ai/Response"

// =============================================================================
// Finish Reason
//
// https://docs.cloud.google.com/gemini-enterprise-agent-platform/reference/rest/v1/GenerateContentResponse
// =============================================================================

/** @internal */
export const resolveFinishReason = (
  finishReason: string | null | undefined,
  hasToolCalls: boolean
): Response.FinishReason => {
  switch (finishReason) {
    case "FINISH_REASON_UNSPECIFIED":
      return "unknown"
    case "STOP":
      return hasToolCalls ? "tool-calls" : "stop"
    case "MAX_TOKENS":
      return "length"
    case "SAFETY":
    case "RECITATION":
    case "BLOCKLIST":
    case "PROHIBITED_CONTENT":
    case "SPII":
    case "MODEL_ARMOR":
    case "IMAGE_SAFETY":
    case "IMAGE_PROHIBITED_CONTENT":
    case "IMAGE_RECITATION":
      return "content-filter"
    case "MALFORMED_FUNCTION_CALL":
    case "UNEXPECTED_TOOL_CALL":
    case "NO_IMAGE":
      return "error"
    default:
      return "other"
  }
}

// =============================================================================
// Model Path
// =============================================================================

/**
 * Builds the model path segment used in Vertex AI URLs. A raw resource path
 * (containing a slash) is passed through unchanged.
 *
 * @internal
 */
export const getModelPath = (modelId: string): string => modelId.includes("/") ? modelId : `models/${modelId}`

// =============================================================================
// File Data
// =============================================================================

/** @internal */
export const isUrlData = (data: string | Uint8Array | URL): data is URL =>
  data instanceof URL ||
  (typeof data === "string" && /^https?:\/\//i.test(data))

/** @internal */
export const getUrlString = (data: string | URL): string => data instanceof URL ? data.toString() : data
