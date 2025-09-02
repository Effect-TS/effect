/**
 * @since 1.0.0
 */
import * as Tool from "@effect/ai/Tool"
import * as Schema from "effect/Schema"
import * as Struct from "effect/Struct"
import * as Generated from "./Generated.js"

/**
 * @since 1.0.0
 * @category Schemas
 */
export const ProviderDefinedTools: Schema.Union<[
  typeof Generated.BetaBashTool20241022,
  typeof Generated.BetaBashTool20250124,
  typeof Generated.BetaCodeExecutionTool20250522,
  typeof Generated.BetaComputerUseTool20241022,
  typeof Generated.BetaComputerUseTool20250124,
  typeof Generated.BetaTextEditor20241022,
  typeof Generated.BetaTextEditor20250124,
  typeof Generated.BetaTextEditor20250429,
  typeof Generated.BetaWebSearchTool20250305
]> = Schema.Union(
  Generated.BetaBashTool20241022,
  Generated.BetaBashTool20250124,
  Generated.BetaCodeExecutionTool20250522,
  Generated.BetaComputerUseTool20241022,
  Generated.BetaComputerUseTool20250124,
  Generated.BetaTextEditor20241022,
  Generated.BetaTextEditor20250124,
  Generated.BetaTextEditor20250429,
  Generated.BetaWebSearchTool20250305
)

/**
 * @since 1.0.0
 * @category Schemas
 */
export type ProviderDefinedTools = typeof ProviderDefinedTools.Type

/**
 * @since 1.0.0
 * @category Schemas
 */
export const WebSearch_20250305Args = Schema.Struct(
  Struct.omit(Generated.WebSearchTool20250305.fields, "name", "type")
)

/**
 * @since 1.0.0
 * @category Schemas
 */
export type WebSearch_20250305Args = typeof WebSearch_20250305Args.Type

/**
 * @since 1.0.0
 * @category Schemas
 */
export const WebSearch_20250305Result = Schema.Array(Generated.RequestWebSearchResultBlock)

/**
 * @since 1.0.0
 * @category Schemas
 */
export type WebSearch_20250305Result = typeof WebSearch_20250305Result.Type

/**
 * @since 1.0.0
 * @category Tools
 */
export const WebSearch_20250305 = Tool.providerDefined({
  id: "anthropic.web_search_20250305",
  name: "web_search",
  args: WebSearch_20250305Args.fields,
  success: WebSearch_20250305Result,
  failure: Generated.ResponseWebSearchToolResultError
})
