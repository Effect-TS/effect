/**
 * @since 1.0.0
 */
import * as Tool from "@effect/ai/Tool"
import * as Schema from "effect/Schema"
import * as Struct from "effect/Struct"
import * as Generated from "./Generated.js"

/**
 * @since 1.0.0
 * @category Tools
 */
export const CodeInterpreter = Tool.providerDefined({
  id: "openai.code_interpreter",
  toolkitName: "OpenAiCodeInterpreter",
  providerName: "code_interpreter",
  args: {
    /**
     * The configuration for the code interpreter container.
     *
     * Can be either a string which specifies the ID of a container created via
     * the `/v1/containers` endpoint, or an object which specifies an optional
     * list of files to make available to the container.
     */
    container: Schema.Union(
      Schema.String,
      Schema.Struct({
        type: Schema.Literal("auto"),
        /**
         * An optional list of uploaded files to make available to your code.
         */
        file_ids: Schema.optional(Schema.Array(Schema.String))
      })
    )
  },
  parameters: {
    code: Schema.NullOr(Schema.String),
    container_id: Schema.String
  },
  success: Schema.NullOr(Schema.Array(Schema.Union(
    Generated.CodeInterpreterOutputLogs,
    Generated.CodeInterpreterOutputImage
  )))
})

/**
 * @since 1.0.0
 * @category Tools
 */
export const FileSearch = Tool.providerDefined({
  id: "openai.file_search",
  toolkitName: "OpenAiFileSearch",
  providerName: "file_search",
  args: Struct.omit(Generated.FileSearchTool.fields, "type"),
  success: Generated.FileSearchToolCall.pipe(Schema.omit("id", "type"))
})

/**
 * @since 1.0.0
 * @category Tools
 */
export const WebSearch = Tool.providerDefined({
  id: "openai.web_search",
  toolkitName: "OpenAiWebSearch",
  providerName: "web_search",
  args: Struct.omit(Generated.WebSearchTool.fields, "type"),
  parameters: {
    action: Schema.Union(
      Generated.WebSearchActionSearch,
      Generated.WebSearchActionOpenPage,
      Generated.WebSearchActionFind
    )
  },
  success: Schema.Struct({
    status: Generated.WebSearchToolCallStatus
  })
})

/**
 * @since 1.0.0
 * @category Tools
 */
export const WebSearchPreview = Tool.providerDefined({
  id: "openai.web_search_preview",
  toolkitName: "OpenAiWebSearchPreview",
  providerName: "web_search_preview",
  args: Struct.omit(Generated.WebSearchPreviewTool.fields, "type"),
  parameters: {
    action: Schema.Union(
      Generated.WebSearchActionSearch,
      Generated.WebSearchActionOpenPage,
      Generated.WebSearchActionFind
    )
  },
  success: Schema.Struct({
    status: Generated.WebSearchToolCallStatus
  })
})

type ProviderToolNames = "code_interpreter" | "file_search" | "web_search" | "web_search_preview"

const ProviderToolNamesMap: Map<ProviderToolNames | (string & {}), string> = new Map([
  ["code_interpreter", "OpenAiCodeInterpreter"],
  ["file_search", "OpenAiFileSearch"],
  ["web_search", "OpenAiWebSearch"],
  ["web_search_preview", "OpenAiWebSearchPreview"]
])

/** @internal */
export const getProviderDefinedToolName = (name: string): string | undefined => ProviderToolNamesMap.get(name)
