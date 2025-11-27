/**
 * @since 1.0.0
 */
import * as Tool from "@effect/ai/Tool"
import * as Generated from "./Generated.js"

/**
 * @since 1.0.0
 * @category Tools
 */
export const CodeExecution = Tool.providerDefined({
  id: "google.code_execution",
  toolkitName: "GoogleCodeExecution",
  providerName: "code_execution",
  args: {},
  parameters: Generated.ExecutableCode.fields,
  success: Generated.CodeExecutionResult
})

/**
 * @since 1.0.0
 * @category Tools
 */
export const GoogleSearch = Tool.providerDefined({
  id: "google.google_search",
  toolkitName: "GoogleSearch",
  providerName: "google_search",
  args: {}
})

/**
 * Gemini 1.5 support a legacy tool named `google_search_retrieval`. This tool
 * provides a dynamic mode that allows the model to decide whether to perform a
 * search based on its confidence that the prompt requires fresh information.
 *
 * If the model's confidence is above a `dynamic_threshold` you set (a value
 * between `0.0` and `1.0`), it will perform a search.
 *
 * **Note**: The `google_search` tool is recommended for Gemini 2.0 and later.
 *
 * @since 1.0.0
 * @category Tools
 */
export const GoogleSearchRetrieval = Tool.providerDefined({
  id: "google.google_search_retrieval",
  toolkitName: "GoogleSearchRetrieval",
  providerName: "google_search_retrieval",
  args: Generated.DynamicRetrievalConfig.fields
})

/**
 * @since 1.0.0
 * @category Tools
 */
export const UrlContext = Tool.providerDefined({
  id: "google.url_context",
  toolkitName: "GoogleUrlContext",
  providerName: "url_context",
  args: {}
})
