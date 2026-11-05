/**
 * The MCP Apps extension (`io.modelcontextprotocol/ui`): the pieces
 * `McpServer` needs without importing the public `McpApps` module.
 */
import * as Context from "../../Context.ts"
import * as Predicate from "../../Predicate.ts"

/**
 * @internal
 */
export const EXTENSION_ID = "io.modelcontextprotocol/ui"

/**
 * @internal
 */
export const MIME_TYPE = "text/html;profile=mcp-app"

/**
 * @internal
 */
export interface ToolMeta {
  readonly resourceUri?: `ui://${string}` | undefined
  readonly visibility?: ReadonlyArray<"model" | "app"> | undefined
}

/**
 * The key of the public `McpApps.ToolUi` annotation. `Context` looks services
 * up by key, so `McpServer` reads the annotation through {@link ToolUiReader}
 * without importing the public module, which imports `McpServer`.
 *
 * @internal
 */
export const TOOL_UI_KEY = "effect/ai/McpApps/ToolUi" as const

interface ToolUiReaderId {
  readonly _: unique symbol
}

/**
 * @internal
 */
export const ToolUiReader: Context.Service<ToolUiReaderId, ToolMeta> = Context.Service<ToolUiReaderId, ToolMeta>(
  TOOL_UI_KEY
)

/**
 * @internal
 */
export const isUiUri = (uri: unknown): uri is `ui://${string}` => typeof uri === "string" && uri.startsWith("ui://")

/**
 * Adds the extension declaration while any app resource or app tool is
 * registered, unless the server configuration already declares it.
 *
 * @internal
 */
export const declareExtension = <A>(
  extensions: Readonly<Record<string, A>> | undefined,
  servesApps: boolean
): Readonly<Record<string, A | {}>> | undefined =>
  servesApps && (extensions === undefined || !Object.hasOwn(extensions, EXTENSION_ID))
    ? { ...extensions, [EXTENSION_ID]: {} }
    : extensions

/**
 * Whether a resource or tool descriptor belongs to an MCP App.
 *
 * @internal
 */
export const isAppResource = (descriptor: { readonly mimeType?: string | undefined }): boolean =>
  descriptor.mimeType === MIME_TYPE

/**
 * @internal
 */
export const isAppTool = (descriptor: { readonly _meta?: Readonly<Record<string, unknown>> | undefined }): boolean =>
  Predicate.isReadonlyObject(descriptor._meta?.ui)

/**
 * Merges a `ToolUi` annotation into the tool's `Tool.Meta` record as `ui`.
 * Returns a message when the two cannot be combined.
 *
 * @internal
 */
export const mergeToolMeta = (
  toolName: string,
  meta: Readonly<Record<string, unknown>> | undefined,
  ui: ToolMeta | undefined
): { readonly meta: Readonly<Record<string, unknown>> | undefined } | { readonly error: string } => {
  if (ui === undefined) return { meta }
  if (meta !== undefined && Object.hasOwn(meta, "ui")) {
    return { error: `McpServer cannot register tool '${toolName}': both Tool.Meta and McpApps.ToolUi set _meta.ui` }
  }
  if (ui.resourceUri !== undefined && !isUiUri(ui.resourceUri)) {
    return {
      error: `McpServer cannot register tool '${toolName}': McpApps.ToolUi resourceUri must start with ui://, ` +
        `received '${ui.resourceUri}'`
    }
  }
  const value: Record<string, unknown> = {}
  if (ui.resourceUri !== undefined) value.resourceUri = ui.resourceUri
  if (ui.visibility !== undefined) value.visibility = ui.visibility
  return { meta: { ...meta, ui: value } }
}
