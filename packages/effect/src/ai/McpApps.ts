/**
 * Server-side support for MCP Apps, the `io.modelcontextprotocol/ui`
 * extension.
 *
 * An MCP App is an HTML page that a host renders in a sandboxed iframe next to
 * a tool call. The server publishes the page as a `ui://` resource with the
 * `text/html;profile=mcp-app` MIME type, and links tools to it through
 * `_meta.ui.resourceUri`. A tool can also be hidden from the model so that only
 * the page can call it.
 *
 * Registering an app resource, or a tool annotated with {@link ToolUi},
 * declares the extension in the server capabilities on every protocol
 * revision. An explicit `extensions` entry for the extension in the server
 * options takes precedence.
 *
 * `_meta`, on tools, resource listings and resource contents alike, reaches
 * the wire only on protocol 2025-06-18 and later, so `_meta.ui` is not sent on
 * 2024-11-05 or 2025-03-26. Every MCP Apps host speaks 2025-06-18 or later.
 *
 * Use {@link isSupported} to check whether a client can render apps, for
 * example in a tool's `EnabledWhen` annotation.
 *
 * **Example** (Linking a tool to an app)
 *
 * ```ts
 * import { Effect, Layer, Schema } from "effect"
 * import { McpApps, McpServer, Prompt, Tool, Toolkit } from "effect/ai"
 *
 * const Dashboard = McpApps.resource({
 *   uri: "ui://dashboard/view.html",
 *   name: "Dashboard",
 *   meta: { csp: { connectDomains: ["https://api.example.com"] } },
 *   content: Effect.succeed("<!doctype html><html><body>...</body></html>")
 * })
 *
 * const ShowDashboard = Tool.make("ShowDashboard", {
 *   success: Schema.Struct({ count: Schema.Number }),
 *   toModelOutput: ({ count }) => [Prompt.textPart({ text: `Showing ${count} rows` })]
 * }).annotate(McpApps.ToolUi, { resourceUri: "ui://dashboard/view.html" })
 *
 * const toolkit = Toolkit.make(ShowDashboard)
 *
 * export const AppLayer = Layer.mergeAll(
 *   Dashboard,
 *   McpServer.toolkit(toolkit).pipe(
 *     Layer.provide(toolkit.toLayer({ ShowDashboard: () => Effect.succeed({ count: 3 }) }))
 *   )
 * )
 * ```
 *
 * @see https://github.com/modelcontextprotocol/ext-apps
 *
 * @stability unstable
 * @since 4.1.3
 */
import * as Cause from "../Cause.ts"
import * as Context from "../Context.ts"
import * as Effect from "../Effect.ts"
import * as Layer from "../Layer.ts"
import * as Predicate from "../Predicate.ts"
import * as Schema from "../Schema.ts"
import * as Internal from "./internal/mcpApps.ts"
import * as McpSchema from "./McpSchema.ts"
import * as McpServer from "./McpServer.ts"

/**
 * The extension identifier, used as the key under `extensions` in client and
 * server capabilities.
 *
 * @stability unstable
 * @category constants
 * @since 4.1.3
 */
export const EXTENSION_ID: "io.modelcontextprotocol/ui" = Internal.EXTENSION_ID

/**
 * The MIME type of an MCP App HTML resource.
 *
 * @stability unstable
 * @category constants
 * @since 4.1.3
 */
export const MIME_TYPE: "text/html;profile=mcp-app" = Internal.MIME_TYPE

/**
 * A `ui://` URI, which identifies an MCP App resource.
 *
 * @stability unstable
 * @category schemas
 * @since 4.1.3
 */
export const UiUri: Schema.TemplateLiteral<readonly ["ui://", Schema.String]> = Schema.TemplateLiteral([
  "ui://",
  Schema.String
])

/**
 * The type of {@link UiUri}.
 *
 * @stability unstable
 * @category models
 * @since 4.1.3
 */
export type UiUri = typeof UiUri.Type

/**
 * The origins an app may reach. The host builds the iframe's Content Security
 * Policy from them; without any, the page can load only inline content.
 *
 * @stability unstable
 * @category schemas
 * @since 4.1.3
 */
export const ResourceCsp = Schema.Struct({
  /**
   * Origins for `fetch`, XHR and WebSocket connections (`connect-src`).
   */
  connectDomains: McpSchema.optional(Schema.Array(Schema.String)),
  /**
   * Origins for scripts, styles, images, fonts and media.
   */
  resourceDomains: McpSchema.optional(Schema.Array(Schema.String)),
  /**
   * Origins the app may embed in nested iframes (`frame-src`).
   */
  frameDomains: McpSchema.optional(Schema.Array(Schema.String)),
  /**
   * Allowed document base URIs (`base-uri`).
   */
  baseUriDomains: McpSchema.optional(Schema.Array(Schema.String))
})

/**
 * The type of {@link ResourceCsp}.
 *
 * @stability unstable
 * @category models
 * @since 4.1.3
 */
export type ResourceCsp = typeof ResourceCsp.Type

/**
 * Browser permissions an app requests. The host may deny any of them.
 *
 * @stability unstable
 * @category schemas
 * @since 4.1.3
 */
export const ResourcePermissions = Schema.Struct({
  camera: McpSchema.optional(Schema.Struct({})),
  microphone: McpSchema.optional(Schema.Struct({})),
  geolocation: McpSchema.optional(Schema.Struct({})),
  clipboardWrite: McpSchema.optional(Schema.Struct({}))
})

/**
 * The type of {@link ResourcePermissions}.
 *
 * @stability unstable
 * @category models
 * @since 4.1.3
 */
export type ResourcePermissions = typeof ResourcePermissions.Type

/**
 * The `_meta.ui` of an app resource: security and rendering configuration for
 * the host.
 *
 * @stability unstable
 * @category schemas
 * @since 4.1.3
 */
export const ResourceMeta = Schema.Struct({
  csp: McpSchema.optional(ResourceCsp),
  permissions: McpSchema.optional(ResourcePermissions),
  /**
   * A dedicated origin for the app, in a host-specific format.
   */
  domain: McpSchema.optional(Schema.String),
  /**
   * Whether the host should draw a border around the app.
   */
  prefersBorder: McpSchema.optional(Schema.Boolean)
})

/**
 * The type of {@link ResourceMeta}.
 *
 * @stability unstable
 * @category models
 * @since 4.1.3
 */
export type ResourceMeta = typeof ResourceMeta.Type

/**
 * The `_meta.ui` of a tool.
 *
 * **Details**
 *
 * `resourceUri` names the app the host renders for the tool's calls; an
 * app-only tool may omit it. `visibility` says who may call the tool: `"model"`
 * lists it to the model and `"app"` lets the app call it through the host. It
 * defaults to both.
 *
 * @stability unstable
 * @category schemas
 * @since 4.1.3
 */
export const ToolMeta = Schema.Struct({
  resourceUri: McpSchema.optional(UiUri),
  visibility: McpSchema.optional(Schema.Array(Schema.Literals(["model", "app"])))
})

/**
 * The type of {@link ToolMeta}.
 *
 * @stability unstable
 * @category models
 * @since 4.1.3
 */
export type ToolMeta = typeof ToolMeta.Type

/**
 * The settings a client declares under {@link EXTENSION_ID} in its
 * capabilities: the app MIME types it can render.
 *
 * @stability unstable
 * @category schemas
 * @since 4.1.3
 */
export const ClientCapabilities = Schema.Struct({
  mimeTypes: Schema.Array(Schema.String)
})

/**
 * The type of {@link ClientCapabilities}.
 *
 * @stability unstable
 * @category models
 * @since 4.1.3
 */
export type ClientCapabilities = typeof ClientCapabilities.Type

/**
 * Checks whether client capabilities declare support for rendering MCP Apps.
 *
 * **Example** (Registering a tool only for clients that render apps)
 *
 * ```ts
 * import { McpApps, McpSchema, Tool } from "effect/ai"
 *
 * const ShowDashboard = Tool.make("ShowDashboard")
 *   .annotate(McpApps.ToolUi, { resourceUri: "ui://dashboard/view.html" })
 *   .annotate(McpSchema.EnabledWhen, ({ capabilities }) => McpApps.isSupported(capabilities))
 * ```
 *
 * @stability unstable
 * @category guards
 * @since 4.1.3
 */
export const isSupported = (capabilities: McpSchema.ClientCapabilities): boolean => {
  const settings = capabilities.extensions?.[EXTENSION_ID]
  return Predicate.isReadonlyObject(settings) && Array.isArray(settings.mimeTypes) &&
    settings.mimeTypes.includes(MIME_TYPE)
}

// The key must match `TOOL_UI_KEY` in the internal module, which `McpServer` reads.
/**
 * Tool annotation that links a tool to an MCP App.
 *
 * **Details**
 *
 * `McpServer` merges the value into the tool's `_meta.ui`, next to any other
 * `Tool.Meta` keys. Registration dies when `Tool.Meta` already sets `ui` or
 * when `resourceUri` is not a `ui://` URI. The deprecated flat
 * `ui/resourceUri` key is not emitted.
 *
 * **Example** (Annotating a tool)
 *
 * ```ts
 * import { McpApps, Tool } from "effect/ai"
 *
 * // Rendered with the dashboard app, and callable by the model and the app.
 * const ShowDashboard = Tool.make("ShowDashboard")
 *   .annotate(McpApps.ToolUi, { resourceUri: "ui://dashboard/view.html" })
 *
 * // Callable only by the app, so the model never sees it.
 * const Refresh = Tool.make("Refresh")
 *   .annotate(McpApps.ToolUi, { visibility: ["app"] })
 * ```
 *
 * @stability unstable
 * @category annotations
 * @since 4.1.3
 */
export class ToolUi extends Context.Service<ToolUi, ToolMeta>()("effect/ai/McpApps/ToolUi") {}

/**
 * Options for {@link registerResource} and {@link resource}.
 *
 * **Details**
 *
 * The fields match `McpServer.registerResource`, except that the MIME type is
 * always {@link MIME_TYPE} and `meta` holds the resource's `_meta.ui`.
 *
 * @stability unstable
 * @category models
 * @since 4.1.3
 */
export interface ResourceOptions<E, R> {
  readonly uri: UiUri
  readonly name: string
  readonly description?: string | undefined
  readonly audience?: ReadonlyArray<"user" | "assistant"> | undefined
  readonly priority?: number | undefined
  readonly meta?: ResourceMeta | undefined
  /**
   * The page's HTML, its bytes, or a full `resources/read` result.
   */
  readonly content: Effect.Effect<McpSchema.ReadResourceResult | string | Uint8Array, E, R>
  readonly annotations?: Context.Context<never> | undefined
}

const encodeResourceMeta = Schema.encodeSync(ResourceMeta)

/**
 * Registers an MCP App HTML resource from an Effect program.
 *
 * **Details**
 *
 * The listing and every content item carry {@link MIME_TYPE} and, when `meta`
 * is set, `_meta.ui`. For a `ReadResourceResult`, every item's MIME type is
 * replaced with {@link MIME_TYPE}, and an item's own `_meta.ui` fields take
 * precedence over `meta`, as the host reads the item first. A `uri` that does
 * not start with `ui://` dies with `IllegalArgumentError`.
 *
 * @see {@link resource} for the layer-based wrapper
 *
 * @stability unstable
 * @category handlers
 * @since 4.1.3
 */
export const registerResource = <E, R>(
  options: ResourceOptions<E, R>
): Effect.Effect<void, never, McpServer.ResourceRequirements<R>> =>
  Effect.suspend(() => {
    const { uri } = options
    if (!Internal.isUiUri(uri)) {
      return Effect.die(new Cause.IllegalArgumentError(`McpApps resource URI must start with ui://, received '${uri}'`))
    }
    const ui = options.meta === undefined ? undefined : encodeResourceMeta(options.meta)
    const _meta = ui === undefined ? undefined : { ui }
    const item = (fields: { readonly text: string } | { readonly blob: Uint8Array }) => ({
      uri,
      mimeType: MIME_TYPE,
      ...fields,
      ...(_meta === undefined ? {} : { _meta })
    })
    // The fields an item sets itself win, as the host reads the item before the listing.
    const mergeItemMeta = (meta: Readonly<Record<string, unknown>> | undefined) =>
      ui === undefined ? meta : {
        ...meta,
        ui: Predicate.isReadonlyObject(meta?.ui) ? { ...ui, ...meta.ui } : ui
      }
    return McpServer.registerResource({
      uri,
      name: options.name,
      description: options.description,
      mimeType: MIME_TYPE,
      audience: options.audience,
      priority: options.priority,
      _meta,
      annotations: options.annotations,
      content: Effect.map(options.content, (content): McpSchema.ReadResourceResult => {
        if (typeof content === "string") return { contents: [item({ text: content })] }
        if (content instanceof Uint8Array) return { contents: [item({ blob: content })] }
        return {
          ...content,
          contents: content.contents.map((entry) => {
            const meta = mergeItemMeta(entry._meta)
            return { ...entry, mimeType: MIME_TYPE, ...(meta === undefined ? {} : { _meta: meta }) }
          })
        }
      })
    })
  })

/**
 * Creates a layer that registers an MCP App HTML resource.
 *
 * @see {@link registerResource} for the details
 *
 * @stability unstable
 * @category layers
 * @since 4.1.3
 */
export const resource = <E, R>(
  options: ResourceOptions<E, R>
): Layer.Layer<never, never, McpServer.ResourceRequirements<R>> => Layer.effectDiscard(registerResource(options))
