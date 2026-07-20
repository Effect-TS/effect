/**
 * Google Vertex provider-defined tools for use with the LanguageModel.
 *
 * Provides grounding and execution tools that are natively supported by the
 * Gemini API, including Google Search grounding, URL context, and code
 * execution.
 *
 * @since 4.0.0
 */
import * as Schema from "effect/Schema"
import * as Tool from "effect/unstable/ai/Tool"

/**
 * Union of all Google Vertex provider-defined tools.
 *
 * @category models
 * @since 4.0.0
 */
export type GoogleVertexTool =
  | ReturnType<typeof GoogleSearch>
  | ReturnType<typeof UrlContext>
  | ReturnType<typeof CodeExecution>

/**
 * The Google Search grounding tool. When enabled, the model can ground its
 * responses in Google Search results.
 *
 * @category Google Search
 * @since 4.0.0
 */
export const GoogleSearch = Tool.providerDefined({
  id: "google.google_search",
  customName: "GoogleSearch",
  providerName: "google_search"
})

/**
 * The URL context tool. When enabled, the model can retrieve and reason over
 * the content of URLs provided in the prompt.
 *
 * @category URL Context
 * @since 4.0.0
 */
export const UrlContext = Tool.providerDefined({
  id: "google.url_context",
  customName: "UrlContext",
  providerName: "url_context"
})

/**
 * The code execution tool. When enabled, the model can generate and run code
 * to answer queries.
 *
 * @category Code Execution
 * @since 4.0.0
 */
export const CodeExecution = Tool.providerDefined({
  id: "google.code_execution",
  customName: "CodeExecution",
  providerName: "code_execution",
  parameters: Schema.Struct({
    language: Schema.String,
    code: Schema.String
  }),
  success: Schema.Struct({
    outcome: Schema.String,
    output: Schema.optionalKey(Schema.NullOr(Schema.String))
  })
})
