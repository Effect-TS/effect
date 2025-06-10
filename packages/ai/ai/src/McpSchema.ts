import * as Rpc from "@effect/rpc/Rpc"
import * as RpcGroup from "@effect/rpc/RpcGroup"
import * as Schema from "effect/Schema"

// =============================================================================
// Common
// =============================================================================

/**
 * A uniquely identifying ID for a request in JSON-RPC.
 */
export const RequestId: Schema.Union<[
  typeof Schema.String,
  typeof Schema.Number
]> = Schema.Union(Schema.String, Schema.Number)
export type RequestId = typeof RequestId.Type

/**
 * A progress token, used to associate progress notifications with the original
 * request.
 */
export const ProgressToken: Schema.Union<[
  typeof Schema.String,
  typeof Schema.Number
]> = Schema.Union(Schema.String, Schema.Number)
export type ProgressToken = typeof ProgressToken.Type

export class RequestMeta extends Schema.Class<RequestMeta>(
  "@effect/ai/McpSchema/RequestMeta"
)({
  _meta: Schema.optional(Schema.Struct({
    /**
     * If specified, the caller is requesting out-of-band progress notifications
     * for this request (as represented by notifications/progress). The value of
     * this parameter is an opaque token that will be attached to any subsequent
     * notifications. The receiver is not obligated to provide these
     * notifications.
     */
    progressToken: Schema.optional(ProgressToken)
  }))
}) {}

export class ResultMeta extends Schema.Class<ResultMeta>(
  "@effect/ai/McpSchema/ResultMeta"
)({
  /**
   * This result property is reserved by the protocol to allow clients and
   * servers to attach additional metadata to their responses.
   */
  _meta: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown }))
}) {}

export class NotificationMeta extends Schema.Class<NotificationMeta>(
  "@effect/ai/McpSchema/NotificationMeta"
)({
  /**
   * This parameter name is reserved by MCP to allow clients and servers to
   * attach additional metadata to their notifications.
   */
  _meta: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown }))
}) {}

/**
 * An opaque token used to represent a cursor for pagination.
 */
export const Cursor: typeof Schema.String = Schema.String
export type Cursor = typeof Cursor.Type

export class PaginatedRequestMeta extends Schema.Class<PaginatedRequestMeta>(
  "@effect/ai/McpSchema/PaginatedRequestMeta"
)({
  ...RequestMeta.fields,
  /**
   * An opaque token representing the current pagination position.
   * If provided, the server should return results starting after this cursor.
   */
  cursor: Schema.optional(Cursor)
}) {}

export class PaginatedResultMeta extends Schema.Class<PaginatedResultMeta>(
  "@effect/ai/McpSchema/PaginatedResultMeta"
)({
  ...ResultMeta.fields,
  /**
   * An opaque token representing the pagination position after the last returned result.
   * If present, there may be more results available.
   */
  nextCursor: Schema.optional(Cursor)
}) {}

/**
 * The sender or recipient of messages and data in a conversation.
 */
export const Role: Schema.Literal<["user", "assistant"]> = Schema.Literal("user", "assistant")
export type Role = typeof Role.Type

/**
 * Optional annotations for the client. The client can use annotations to
 * inform how objects are used or displayed
 */
export class Annotations extends Schema.Class<Annotations>(
  "@effect/ai/McpSchema/Annotations"
)({
  /**
   * Describes who the intended customer of this object or data is.
   *
   * It can include multiple entries to indicate content useful for multiple
   * audiences (e.g., `["user", "assistant"]`).
   */
  audience: Schema.optional(Schema.Array(Role)),
  /**
   * Describes how important this data is for operating the server.
   *
   * A value of 1 means "most important," and indicates that the data is
   * effectively required, while 0 means "least important," and indicates that
   * the data is entirely optional.
   */
  priority: Schema.optional(Schema.Number.pipe(Schema.between(0, 1)))
}) {}

/**
 * Describes the name and version of an MCP implementation.
 */
export class Implementation extends Schema.Class<Implementation>(
  "@effect/ai/McpSchema/Implementation"
)({
  name: Schema.String,
  version: Schema.String
}) {}

/**
 * Capabilities a client may support. Known capabilities are defined here, in
 * this schema, but this is not a closed set: any client can define its own,
 * additional capabilities.
 */
export class ClientCapabilities extends Schema.Class<ClientCapabilities>(
  "@effect/ai/McpSchema/ClientCapabilities"
)({
  /**
   * Experimental, non-standard capabilities that the client supports.
   */
  experimental: Schema.optional(Schema.Record({
    key: Schema.String,
    value: Schema.Struct({})
  })),
  /**
   * Present if the client supports listing roots.
   */
  roots: Schema.optional(Schema.Struct({
    /**
     * Whether the client supports notifications for changes to the roots list.
     */
    listChanged: Schema.optional(Schema.Boolean)
  })),
  /**
   * Present if the client supports sampling from an LLM.
   */
  sampling: Schema.optional(Schema.Struct({}))
}) {}

/**
 * Capabilities that a server may support. Known capabilities are defined
 * here, in this schema, but this is not a closed set: any server can define
 * its own, additional capabilities.
 */
export class ServerCapabilities extends Schema.Class<ServerCapabilities>(
  "@effect/ai/McpSchema/ServerCapabilities"
)({
  /**
   * Experimental, non-standard capabilities that the server supports.
   */
  experimental: Schema.optional(Schema.Record({
    key: Schema.String,
    value: Schema.Struct({})
  })),
  /**
   * Present if the server supports sending log messages to the client.
   */
  logging: Schema.optional(Schema.Struct({})),
  /**
   * Present if the server supports argument autocompletion suggestions.
   */
  completions: Schema.optional(Schema.Struct({})),
  /**
   * Present if the server offers any prompt templates.
   */
  prompts: Schema.optional(Schema.Struct({
    /**
     * Whether this server supports notifications for changes to the prompt list.
     */
    listChanged: Schema.optional(Schema.Boolean)
  })),
  /**
   * Present if the server offers any resources to read.
   */
  resources: Schema.optional(Schema.Struct({
    /**
     * Whether this server supports subscribing to resource updates.
     */
    subscribe: Schema.optional(Schema.Boolean),
    /**
     * Whether this server supports notifications for changes to the resource list.
     */
    listChanged: Schema.optional(Schema.Boolean)
  })),
  /**
   * Present if the server offers any tools to call.
   */
  tools: Schema.optional(Schema.Struct({
    /**
     * Whether this server supports notifications for changes to the tool list.
     */
    listChanged: Schema.optional(Schema.Boolean)
  }))
}) {}

// =============================================================================
// Errors
// =============================================================================

export class McpError extends Schema.Class<McpError>(
  "@effect/ai/McpSchema/McpError"
)({
  /**
   * The error type that occurred.
   */
  code: Schema.Number,
  /**
   * A short description of the error. The message SHOULD be limited to a
   * concise single sentence.
   */
  message: Schema.String,
  /**
   * Additional information about the error. The value of this member is
   * defined by the sender (e.g. detailed error information, nested errors etc.).
   */
  data: Schema.optional(Schema.Unknown)
}) {}

export const INVALID_REQUEST_ERROR_CODE = -32600 as const
export const METHOD_NOT_FOUND_ERROR_CODE = -32601 as const
export const INVALID_PARAMS_ERROR_CODE = -32602 as const
export const INTERNAL_ERROR_CODE = -32603 as const
export const PARSE_ERROR_CODE = -32700 as const

export class ParseError extends Schema.TaggedError<ParseError>()("ParseError", {
  ...McpError.fields,
  code: Schema.tag(PARSE_ERROR_CODE)
}) {}

export class InvalidRequest extends Schema.TaggedError<InvalidRequest>()("InvalidRequest", {
  ...McpError.fields,
  code: Schema.tag(INVALID_REQUEST_ERROR_CODE)
}) {}

export class MethodNotFound extends Schema.TaggedError<MethodNotFound>()("MethodNotFound", {
  ...McpError.fields,
  code: Schema.tag(METHOD_NOT_FOUND_ERROR_CODE)
}) {}

export class InvalidParams extends Schema.TaggedError<InvalidParams>()("InvalidParams", {
  ...McpError.fields,
  code: Schema.tag(INVALID_PARAMS_ERROR_CODE)
}) {}

export class InternalError extends Schema.TaggedError<InternalError>()("InternalError", {
  ...McpError.fields,
  code: Schema.tag(INTERNAL_ERROR_CODE)
}) {
  static readonly notImplemented = new InternalError({ message: "Not implemented" })
}

// =============================================================================
// Ping
// =============================================================================

/**
 * A ping, issued by either the server or the client, to check that the other
 * party is still alive. The receiver must promptly respond, or else may be
 * disconnected.
 */
export class Ping extends Rpc.make("ping", {
  success: Schema.Struct({}),
  error: McpError,
  payload: RequestMeta
}) {}

// =============================================================================
// Initialization
// =============================================================================

/**
 * After receiving an initialize request from the client, the server sends this
 * response.
 */
export class InitializeResult extends Schema.Class<InitializeResult>(
  "@effect/ai/McpSchema/InitializeResult"
)({
  ...ResultMeta.fields,
  /**
   * The version of the Model Context Protocol that the server wants to use.
   * This may not match the version that the client requested. If the client
   * cannot support this version, it MUST disconnect.
   */
  protocolVersion: Schema.String,
  capabilities: ServerCapabilities,
  serverInfo: Implementation,
  /**
   * Instructions describing how to use the server and its features.
   *
   * This can be used by clients to improve the LLM's understanding of available
   * tools, resources, etc. It can be thought of like a "hint" to the model.
   * For example, this information MAY be added to the system prompt.
   */
  instructions: Schema.optional(Schema.String)
}) {}

/**
 * This request is sent from the client to the server when it first connects,
 * asking it to begin initialization.
 */
export class Initialize extends Rpc.make("initialize", {
  success: InitializeResult,
  error: McpError,
  payload: {
    ...RequestMeta.fields,
    /**
     * The latest version of the Model Context Protocol that the client
     * supports. The client MAY decide to support older versions as well.
     */
    protocolVersion: Schema.String,
    /**
     * Capabilities a client may support. Known capabilities are defined here,
     * in this schema, but this is not a closed set: any client can define its
     * own, additional capabilities.
     */
    capabilities: ClientCapabilities,
    /**
     * Describes the name and version of an MCP implementation.
     */
    clientInfo: Implementation
  }
}) {}

/**
 * This notification is sent from the client to the server after initialization
 * has finished.
 */
export class InitializedNotification extends Rpc.make("notifications/initialized", {
  payload: NotificationMeta
}) {}

// =============================================================================
// Cancellation
// =============================================================================

export class CancelledNotification extends Rpc.make("notifications/cancelled", {
  payload: {
    ...NotificationMeta.fields,
    /**
     * The ID of the request to cancel.
     *
     * This MUST correspond to the ID of a request previously issued in the
     * same direction.
     */
    requestId: RequestId,
    /**
     * An optional string describing the reason for the cancellation. This MAY
     * be logged or presented to the user.
     */
    reason: Schema.optional(Schema.String)
  }
}) {}

// =============================================================================
// Progress
// =============================================================================

/**
 * An out-of-band notification used to inform the receiver of a progress update
 * for a long-running request.
 */
export class ProgressNotification extends Rpc.make("notifications/progress", {
  payload: {
    ...NotificationMeta.fields,
    /**
     * The progress token which was given in the initial request, used to
     * associate this notification with the request that is proceeding.
     */
    progressToken: ProgressToken,
    /**
     * The progress thus far. This should increase every time progress is made,
     * even if the total is unknown.
     */
    progress: Schema.optional(Schema.Number),
    /**
     * Total number of items to process (or total progress required), if known.
     */
    total: Schema.optional(Schema.Number),
    /**
     * An optional message describing the current progress.
     */
    message: Schema.optional(Schema.String)
  }
}) {}

// =============================================================================
// Resources
// =============================================================================

/**
 * A known resource that the server is capable of reading.
 */
export class Resource extends Schema.Class<Resource>(
  "@effect/ai/McpSchema/Resource"
)({
  /**
   * The URI of this resource.
   */
  uri: Schema.String,
  /**
   * A human-readable name for this resource.
   *
   * This can be used by clients to populate UI elements.
   */
  name: Schema.String,
  /**
   * A description of what this resource represents.
   *
   * This can be used by clients to improve the LLM's understanding of available
   * resources. It can be thought of like a "hint" to the model.
   */
  description: Schema.optional(Schema.String),
  /**
   * The MIME type of this resource, if known.
   */
  mimeType: Schema.optional(Schema.String),
  /**
   * Optional annotations for the client.
   */
  annotations: Schema.optional(Annotations),
  /**
   * The size of the raw resource content, in bytes (i.e., before base64
   * encoding or any tokenization), if known.
   *
   * This can be used by Hosts to display file sizes and estimate context
   * window usage.
   */
  size: Schema.optional(Schema.Number)
}) {}

/**
 * A template description for resources available on the server.
 */
export class ResourceTemplate extends Schema.Class<ResourceTemplate>(
  "@effect/ai/McpSchema/ResourceTemplate"
)({
  /**
   * A URI template (according to RFC 6570) that can be used to construct
   * resource URIs.
   */
  uriTemplate: Schema.String,
  /**
   * A human-readable name for the type of resource this template refers to.
   *
   * This can be used by clients to populate UI elements.
   */
  name: Schema.String,
  /**
   * A description of what this template is for.
   *
   * This can be used by clients to improve the LLM's understanding of available
   * resources. It can be thought of like a "hint" to the model.
   */
  description: Schema.optional(Schema.String),

  /**
   * The MIME type for all resources that match this template. This should only
   * be included if all resources matching this template have the same type.
   */
  mimeType: Schema.optional(Schema.String),

  /**
   * Optional annotations for the client.
   */
  annotations: Schema.optional(Annotations)
}) {}

/**
 * The contents of a specific resource or sub-resource.
 */
export class ResourceContents extends Schema.Class<ResourceContents>(
  "@effect/ai/McpSchema/ResourceContents"
)({
  /**
   * The URI of this resource.
   */
  uri: Schema.String,
  /**
   * The MIME type of this resource, if known.
   */
  mimeType: Schema.optional(Schema.String)
}) {}

export class TextResourceContents extends ResourceContents.extend<TextResourceContents>(
  "@effect/ai/McpSchema/TextResourceContents"
)({
  /**
   * The text of the item. This must only be set if the item can actually be
   * represented as text (not binary data).
   */
  text: Schema.String
}) {}

export class BlobResourceContents extends ResourceContents.extend<BlobResourceContents>(
  "@effect/ai/McpSchema/BlobResourceContents"
)({
  /**
   * The binary data of the item decoded from a base64-encoded string.
   */
  blob: Schema.Uint8ArrayFromBase64
}) {}

/**
 * The server's response to a resources/list request from the client.
 */
export class ListResourcesResult extends Schema.Class<ListResourcesResult>(
  "@effect/ai/McpSchema/ListResourcesResult"
)({
  ...PaginatedResultMeta.fields,
  resources: Schema.Array(Resource)
}) {}

/**
 * Sent from the client to request a list of resources the server has.
 */
export class ListResources extends Rpc.make("resources/list", {
  success: ListResourcesResult,
  error: McpError,
  payload: PaginatedRequestMeta
}) {}

/**
 * The server's response to a resources/templates/list request from the client.
 */
export class ListResourceTemplatesResult extends Schema.Class<ListResourceTemplatesResult>(
  "@effect/ai/McpSchema/ListResourceTemplatesResult"
)({
  ...PaginatedResultMeta.fields,
  resourceTemplates: Schema.Array(ResourceTemplate)
}) {}

/**
 * Sent from the client to request a list of resource templates the server has.
 */
export class ListResourceTemplates extends Rpc.make("resources/templates/list", {
  success: ListResourceTemplatesResult,
  error: McpError,
  payload: PaginatedRequestMeta
}) {}

/**
 * The server's response to a resources/read request from the client.
 */
export class ReadResourceResult extends Schema.Class<ReadResourceResult>(
  "@effect/ai/McpSchema/ReadResourceResult"
)({
  ...ResultMeta.fields,
  contents: Schema.Array(Schema.Union(
    TextResourceContents,
    BlobResourceContents
  ))
}) {}

/**
 * Sent from the client to the server, to read a specific resource URI.
 */
export class ReadResource extends Rpc.make("resources/read", {
  success: ReadResourceResult,
  error: McpError,
  payload: {
    ...RequestMeta.fields,
    /**
     * The URI of the resource to read. The URI can use any protocol; it is up
     * to the server how to interpret it.
     */
    uri: Schema.String
  }
}) {}

/**
 * An optional notification from the server to the client, informing it that the
 * list of resources it can read from has changed. This may be issued by servers
 * without any previous subscription from the client.
 */
export class ResourceListChangedNotification extends Rpc.make("notifications/resources/list_changed", {
  payload: NotificationMeta
}) {}

/**
 * Sent from the client to request resources/updated notifications from the
 * server whenever a particular resource changes.
 */
export class Subscribe extends Rpc.make("resources/subscribe", {
  error: McpError,
  payload: {
    ...RequestMeta.fields,
    /**
     * The URI of the resource to subscribe to. The URI can use any protocol;
     * it is up to the server how to interpret it.
     */
    uri: Schema.String
  }
}) {}

/**
 * Sent from the client to request cancellation of resources/updated
 * notifications from the server. This should follow a previous
 * resources/subscribe request.
 */
export class Unsubscribe extends Rpc.make("resources/unsubscribe", {
  error: McpError,
  payload: {
    ...RequestMeta.fields,
    /**
     * The URI of the resource to subscribe to. The URI can use any protocol;
     * it is up to the server how to interpret it.
     */
    uri: Schema.String
  }
}) {}

export class ResourceUpdatedNotification extends Rpc.make("notifications/resources/updated", {
  payload: {
    ...NotificationMeta.fields,
    /**
     * The URI of the resource that has been updated. This might be a sub-resource of the one that the client actually subscribed to.
     */
    uri: Schema.String
  }
}) {}

// =============================================================================
// Prompts
// =============================================================================

/**
 * Describes an argument that a prompt can accept.
 */
export class PromptArgument extends Schema.Class<PromptArgument>(
  "@effect/ai/McpSchema/PromptArgument"
)({
  /**
   * The name of the argument.
   */
  name: Schema.String,
  /**
   * A human-readable description of the argument.
   */
  description: Schema.optional(Schema.String),
  /**
   * Whether this argument must be provided.
   */
  required: Schema.optional(Schema.Boolean)
}) {}

/**
 * A prompt or prompt template that the server offers.
 */
export class Prompt extends Schema.Class<Prompt>(
  "@effect/ai/McpSchema/Prompt"
)({
  /**
   * The name of the prompt or prompt template.
   */
  name: Schema.String,
  /**
   * An optional description of what this prompt provides
   */
  description: Schema.optional(Schema.String),
  /**
   * A list of arguments to use for templating the prompt.
   */
  arguments: Schema.optional(Schema.Array(PromptArgument))
}) {}

/**
 * Text provided to or from an LLM.
 */
export class TextContent extends Schema.Class<TextContent>(
  "@effect/ai/McpSchema/TextContent"
)({
  type: Schema.tag("text"),
  /**
   * The text content of the message.
   */
  text: Schema.String,
  /**
   * Optional annotations for the client.
   */
  annotations: Schema.optional(Annotations)
}) {}

/**
 * An image provided to or from an LLM.
 */
export class ImageContent extends Schema.Class<ImageContent>(
  "@effect/ai/McpSchema/ImageContent"
)({
  type: Schema.tag("image"),
  /**
   * The image data.
   */
  data: Schema.Uint8ArrayFromBase64,
  /**
   * The MIME type of the image. Different providers may support different
   * image types.
   */
  mimeType: Schema.String,
  /**
   * Optional annotations for the client.
   */
  annotations: Schema.optional(Annotations)
}) {}

/**
 * Audio provided to or from an LLM.
 */
export class AudioContent extends Schema.Class<AudioContent>(
  "@effect/ai/McpSchema/AudioContent"
)({
  type: Schema.tag("audio"),
  /**
   * The audio data.
   */
  data: Schema.Uint8ArrayFromBase64,
  /**
   * The MIME type of the audio. Different providers may support different
   * audio types.
   */
  mimeType: Schema.String,
  /**
   * Optional annotations for the client.
   */
  annotations: Schema.optional(Annotations)
}) {}

/**
 * The contents of a resource, embedded into a prompt or tool call result.
 *
 * It is up to the client how best to render embedded resources for the benefit
 * of the LLM and/or the user.
 */
export class EmbeddedResource extends Schema.Class<EmbeddedResource>(
  "@effect/ai/McpSchema/EmbeddedResource"
)({
  type: Schema.tag("resource"),
  resource: Schema.Union(TextResourceContents, BlobResourceContents),
  /**
   * Optional annotations for the client.
   */
  annotations: Schema.optional(Annotations)
}) {}

/**
 * Describes a message returned as part of a prompt.
 *
 * This is similar to `SamplingMessage`, but also supports the embedding of
 * resources from the MCP server.
 */
export class PromptMessage extends Schema.Class<PromptMessage>(
  "@effect/ai/McpSchema/PromptMessage"
)({
  role: Role,
  content: Schema.Union(
    TextContent,
    ImageContent,
    AudioContent,
    EmbeddedResource
  )
}) {}

/**
 * The server's response to a prompts/list request from the client.
 */
export class ListPromptsResult extends Schema.Class<ListPromptsResult>(
  "@effect/ai/McpSchema/ListPromptsResult"
)({
  ...PaginatedResultMeta.fields,
  prompts: Schema.Array(Prompt)
}) {}

/**
 * Sent from the client to request a list of prompts and prompt templates the
 * server has.
 */
export class ListPrompts extends Rpc.make("prompts/list", {
  success: ListPromptsResult,
  error: McpError,
  payload: PaginatedRequestMeta
}) {}

/**
 * The server's response to a prompts/get request from the client.
 */
export class GetPromptResult extends Schema.Class<GetPromptResult>(
  "@effect/ai/McpSchema/GetPromptResult"
)({
  ...ResultMeta.fields,
  messages: Schema.Array(PromptMessage),
  /**
   * An optional description for the prompt.
   */
  description: Schema.optional(Schema.String)
}) {}

/**
 * Used by the client to get a prompt provided by the server.
 */
export class GetPrompt extends Rpc.make("prompts/get", {
  success: GetPromptResult,
  error: McpError,
  payload: {
    ...RequestMeta.fields,
    /**
     * The name of the prompt or prompt template.
     */
    name: Schema.String,
    /**
     * Arguments to use for templating the prompt.
     */
    arguments: Schema.optional(Schema.Record({
      key: Schema.String,
      value: Schema.String
    }))
  }
}) {}

/**
 * An optional notification from the server to the client, informing it that
 * the list of prompts it offers has changed. This may be issued by servers
 * without any previous subscription from the client.
 */
export class PromptListChangedNotification extends Rpc.make("notifications/prompts/list_changed", {
  payload: NotificationMeta
}) {}

// =============================================================================
// Tools
// =============================================================================

/**
 * Additional properties describing a Tool to clients.
 *
 * NOTE: all properties in ToolAnnotations are **hints**. They are not
 * guaranteed to provide a faithful description of tool behavior (including
 * descriptive properties like `title`).
 *
 * Clients should never make tool use decisions based on ToolAnnotations
 * received from untrusted servers.
 */
export class ToolAnnotations extends Schema.Class<ToolAnnotations>(
  "@effect/ai/McpSchema/ToolAnnotations"
)({
  /**
   * A human-readable title for the tool.
   */
  title: Schema.optional(Schema.String),
  /**
   * If true, the tool does not modify its environment.
   *
   * Default: `false`
   */
  readOnlyHint: Schema.optionalWith(Schema.Boolean, { default: () => false }),
  /**
   * If true, the tool may perform destructive updates to its environment.
   * If false, the tool performs only additive updates.
   *
   * (This property is meaningful only when `readOnlyHint == false`)
   *
   * Default: `true`
   */
  destructiveHint: Schema.optionalWith(Schema.Boolean, { default: () => true }),
  /**
   * If true, calling the tool repeatedly with the same arguments
   * will have no additional effect on the its environment.
   *
   * (This property is meaningful only when `readOnlyHint == false`)
   *
   * Default: `false`
   */
  idempotentHint: Schema.optionalWith(Schema.Boolean, { default: () => false }),
  /**
   * If true, this tool may interact with an "open world" of external
   * entities. If false, the tool's domain of interaction is closed.
   * For example, the world of a web search tool is open, whereas that
   * of a memory tool is not.
   *
   * Default: `true`
   */
  openWorldHint: Schema.optionalWith(Schema.Boolean, { default: () => true })
}) {}

/**
 * Definition for a tool the client can call.
 */
export class Tool extends Schema.Class<Tool>(
  "@effect/ai/McpSchema/Tool"
)({
  /**
   * The name of the tool.
   */
  name: Schema.String,
  /**
   * A human-readable description of the tool.
   *
   * This can be used by clients to improve the LLM's understanding of available tools. It can be thought of like a "hint" to the model.
   */
  description: Schema.optional(Schema.String),
  /**
   * A JSON Schema object defining the expected parameters for the tool.
   */
  inputSchema: Schema.Struct({
    type: Schema.tag("object"),
    properties: Schema.optional(Schema.Record({
      key: Schema.String,
      value: Schema.Unknown
    })),
    required: Schema.optional(Schema.Array(Schema.String))
  }),
  /**
   * Optional additional tool information.
   */
  annotations: Schema.optional(ToolAnnotations)
}) {}

/**
 * The server's response to a tools/list request from the client.
 */
export class ListToolsResult extends Schema.Class<ListToolsResult>(
  "@effect/ai/McpSchema/ListToolsResult"
)({
  ...PaginatedResultMeta.fields,
  tools: Schema.Array(Tool)
}) {}

/**
 * Sent from the client to request a list of tools the server has.
 */
export class ListTools extends Rpc.make("tools/list", {
  success: ListToolsResult,
  error: McpError,
  payload: PaginatedRequestMeta
}) {}

/**
 * The server's response to a tool call.
 *
 * Any errors that originate from the tool SHOULD be reported inside the result
 * object, with `isError` set to true, _not_ as an MCP protocol-level error
 * response. Otherwise, the LLM would not be able to see that an error occurred
 * and self-correct.
 *
 * However, any errors in _finding_ the tool, an error indicating that the
 * server does not support tool calls, or any other exceptional conditions,
 * should be reported as an MCP error response.
 */
export class CallToolResult extends Schema.Class<CallToolResult>(
  "@effect/ai/McpSchema/CallToolResult"
)({
  ...ResultMeta.fields,
  content: Schema.Array(Schema.Union(
    TextContent,
    ImageContent,
    AudioContent,
    EmbeddedResource
  )),
  /**
   * Whether the tool call ended in an error.
   *
   * If not set, this is assumed to be false (the call was successful).
   */
  isError: Schema.optional(Schema.Boolean)
}) {}

/**
 * Used by the client to invoke a tool provided by the server.
 */
export class CallTool extends Rpc.make("tools/call", {
  success: CallToolResult,
  error: McpError,
  payload: {
    ...RequestMeta.fields,
    name: Schema.String,
    arguments: Schema.Record({
      key: Schema.String,
      value: Schema.Unknown
    })
  }
}) {}

/**
 * An optional notification from the server to the client, informing it that
 * the list of tools it offers has changed. This may be issued by servers
 * without any previous subscription from the client.
 */
export class ToolListChangedNotification extends Rpc.make("notifications/tools/list_changed", {
  payload: NotificationMeta
}) {}

// =============================================================================
// Logging
// =============================================================================

/**
 * The severity of a log message.
 *
 * These map to syslog message severities, as specified in RFC-5424:
 * https://datatracker.ietf.org/doc/html/rfc5424#section-6.2.1
 */
export const LoggingLevel: Schema.Literal<[
  "debug",
  "info",
  "notice",
  "warning",
  "error",
  "critical",
  "alert",
  "emergency"
]> = Schema.Literal(
  "debug",
  "info",
  "notice",
  "warning",
  "error",
  "critical",
  "alert",
  "emergency"
)
export type LoggingLevel = typeof LoggingLevel.Type

/**
 * A request from the client to the server, to enable or adjust logging.
 */
export class SetLevel extends Rpc.make("logging/setLevel", {
  payload: {
    ...RequestMeta.fields,
    /**
     * The level of logging that the client wants to receive from the server.
     * The server should send all logs at this level and higher (i.e., more
     * severe) to the client as notifications/message.
     */
    level: LoggingLevel
  },
  error: McpError
}) {}

export class LoggingMessageNotification extends Rpc.make("notifications/message", {
  payload: Schema.Struct({
    ...NotificationMeta.fields,
    /**
     * The severity of this log message.
     */
    level: LoggingLevel,
    /**
     * An optional name of the logger issuing this message.
     */
    logger: Schema.optional(Schema.String),
    /**
     * The data to be logged, such as a string message or an object. Any JSON
     * serializable type is allowed here.
     */
    data: Schema.Unknown
  })
}) {}

// =============================================================================
// Sampling
// =============================================================================

/**
 * Describes a message issued to or received from an LLM API.
 */
export class SamplingMessage extends Schema.Class<SamplingMessage>(
  "@effect/ai/McpSchema/SamplingMessage"
)({
  role: Role,
  content: Schema.Union(TextContent, ImageContent, AudioContent)
}) {}

/**
 * Hints to use for model selection.
 *
 * Keys not declared here are currently left unspecified by the spec and are up
 * to the client to interpret.
 */
export class ModelHint extends Schema.Class<ModelHint>(
  "@effect/ai/McpSchema/ModelHint"
)({
  /**
   * A hint for a model name.
   *
   * The client SHOULD treat this as a substring of a model name; for example:
   *  - `claude-3-5-sonnet` should match `claude-3-5-sonnet-20241022`
   *  - `sonnet` should match `claude-3-5-sonnet-20241022`, `claude-3-sonnet-20240229`, etc.
   *  - `claude` should match any Claude model
   *
   * The client MAY also map the string to a different provider's model name or
   * a different model family, as long as it fills a similar niche; for example:
   *  - `gemini-1.5-flash` could match `claude-3-haiku-20240307`
   */
  name: Schema.optional(Schema.String)
}) {}

/**
 * The server's preferences for model selection, requested of the client during sampling.
 *
 * Because LLMs can vary along multiple dimensions, choosing the "best" model is
 * rarely straightforward.  Different models excel in different areas—some are
 * faster but less capable, others are more capable but more expensive, and so
 * on. This interface allows servers to express their priorities across multiple
 * dimensions to help clients make an appropriate selection for their use case.
 *
 * These preferences are always advisory. The client MAY ignore them. It is also
 * up to the client to decide how to interpret these preferences and how to
 * balance them against other considerations.
 */
export class ModelPreferences extends Schema.Class<ModelPreferences>(
  "@effect/ai/McpSchema/ModelPreferences"
)({
  /**
   * Optional hints to use for model selection.
   *
   * If multiple hints are specified, the client MUST evaluate them in order
   * (such that the first match is taken).
   *
   * The client SHOULD prioritize these hints over the numeric priorities, but
   * MAY still use the priorities to select from ambiguous matches.
   */
  hints: Schema.optional(Schema.Array(ModelHint)),
  /**
   * How much to prioritize cost when selecting a model. A value of 0 means cost
   * is not important, while a value of 1 means cost is the most important
   * factor.
   */
  costPriority: Schema.optional(Schema.Number.pipe(Schema.between(0, 1))),
  /**
   * How much to prioritize sampling speed (latency) when selecting a model. A
   * value of 0 means speed is not important, while a value of 1 means speed is
   * the most important factor.
   */
  speedPriority: Schema.optional(Schema.Number.pipe(Schema.between(0, 1))),
  /**
   * How much to prioritize intelligence and capabilities when selecting a
   * model. A value of 0 means intelligence is not important, while a value of 1
   * means intelligence is the most important factor.
   */
  intelligencePriority: Schema.optional(Schema.Number.pipe(Schema.between(0, 1)))
}) {}

/**
 * The client's response to a sampling/create_message request from the server.
 * The client should inform the user before returning the sampled message, to
 * allow them to inspect the response (human in the loop) and decide whether to
 * allow the server to see it.
 */
export class CreateMessageResult extends Schema.Class<CreateMessageResult>(
  "@effect/ai/McpSchema/CreateMessageResult"
)({
  /**
   * The name of the model that generated the message.
   */
  model: Schema.String,
  /**
   * The reason why sampling stopped, if known.
   */
  stopReason: Schema.optional(Schema.String)
}) {}

/**
 * A request from the server to sample an LLM via the client. The client has
 * full discretion over which model to select. The client should also inform the
 * user before beginning sampling, to allow them to inspect the request (human
 * in the loop) and decide whether to approve it.
 */
export class CreateMessage extends Rpc.make("sampling/createMessage", {
  success: CreateMessageResult,
  error: McpError,
  payload: {
    messages: Schema.Array(SamplingMessage),
    /**
     * The server's preferences for which model to select. The client MAY ignore
     * these preferences.
     */
    modelPreferences: Schema.optional(ModelPreferences),
    /**
     * An optional system prompt the server wants to use for sampling. The
     * client MAY modify or omit this prompt.
     */
    systemPrompt: Schema.optional(Schema.String),
    /**
     * A request to include context from one or more MCP servers (including the
     * caller), to be attached to the prompt. The client MAY ignore this request.
     */
    includeContext: Schema.optional(Schema.Literal("none", "thisServer", "allServers")),
    temperature: Schema.optional(Schema.Number),
    /**
     * The maximum number of tokens to sample, as requested by the server. The
     * client MAY choose to sample fewer tokens than requested.
     */
    maxTokens: Schema.Number,
    stopSequences: Schema.optional(Schema.Array(Schema.String)),
    /**
     * Optional metadata to pass through to the LLM provider. The format of
     * this metadata is provider-specific.
     */
    metadata: Schema.Unknown
  }
}) {}

// =============================================================================
// Autocomplete
// =============================================================================

/**
 * A reference to a resource or resource template definition.
 */
export class ResourceReference extends Schema.Class<ResourceReference>(
  "@effect/ai/McpSchema/ResourceReference"
)({
  type: Schema.tag("ref/resource"),
  /**
   * The URI or URI template of the resource.
   */
  uri: Schema.String
}) {}

/**
 * Identifies a prompt.
 */
export class PromptReference extends Schema.Class<PromptReference>(
  "@effect/ai/McpSchema/PromptReference"
)({
  type: Schema.tag("ref/prompt"),
  /**
   * The name of the prompt or prompt template
   */
  name: Schema.String
}) {}

/**
 * The server's response to a completion/complete request
 */
export class CompleteResult extends Schema.Class<CompleteResult>(
  "@effect/ai/McpSchema/CompleteResult"
)({
  completion: Schema.Struct({
    /**
     * An array of completion values. Must not exceed 100 items.
     */
    values: Schema.Array(Schema.String),
    /**
     * The total number of completion options available. This can exceed the
     * number of values actually sent in the response.
     */
    total: Schema.optional(Schema.Number),
    /**
     * Indicates whether there are additional completion options beyond those
     * provided in the current response, even if the exact total is unknown.
     */
    hasMore: Schema.optional(Schema.Boolean)
  })
}) {}

/**
 * A request from the client to the server, to ask for completion options.
 */
export class Complete extends Rpc.make("completion/complete", {
  success: CompleteResult,
  error: McpError,
  payload: {
    ref: Schema.Union(PromptReference, ResourceReference),
    /**
     * The argument's information
     */
    argument: Schema.Struct({
      /**
       * The name of the argument
       */
      name: Schema.String,
      /**
       * The value of the argument to use for completion matching.
       */
      value: Schema.String
    })
  }
}) {}

// =============================================================================
// Roots
// =============================================================================

/**
 * Represents a root directory or file that the server can operate on.
 */
export class Root extends Schema.Class<Root>(
  "@effect/ai/McpSchema/Root"
)({
  /**
   * The URI identifying the root. This *must* start with file:// for now.
   * This restriction may be relaxed in future versions of the protocol to allow
   * other URI schemes.
   */
  uri: Schema.String,
  /**
   * An optional name for the root. This can be used to provide a human-readable
   * identifier for the root, which may be useful for display purposes or for
   * referencing the root in other parts of the application.
   */
  name: Schema.optional(Schema.String)
}) {}

/**
 * The client's response to a roots/list request from the server. This result
 * contains an array of Root objects, each representing a root directory or file
 * that the server can operate on.
 */
export class ListRootsResult extends Schema.Class<ListRootsResult>(
  "@effect/ai/McpSchema/ListRootsResult"
)({
  roots: Schema.Array(Root)
}) {}

/**
 * Sent from the server to request a list of root URIs from the client. Roots
 * allow servers to ask for specific directories or files to operate on. A
 * common example for roots is providing a set of repositories or directories a
 * server should operate
 * on.
 *
 * This request is typically used when the server needs to understand the file
 * system structure or access specific locations that the client has permission
 * to read from.
 */
export class ListRoots extends Rpc.make("roots/list", {
  success: ListRootsResult,
  error: McpError,
  payload: RequestMeta
}) {}

/**
 * A notification from the client to the server, informing it that the list of
 * roots has changed. This notification should be sent whenever the client adds,
 * removes, or modifies any root. The server should then request an updated list
 * of roots using the ListRootsRequest.
 */
export class RootsListChangedNotification extends Rpc.make("notifications/roots/list_changed", {
  payload: NotificationMeta
}) {}

// =============================================================================
// Protocol
// =============================================================================

export type RequestEncoded<Group extends RpcGroup.Any> = RpcGroup.Rpcs<
  Group
> extends infer Rpc ? Rpc extends Rpc.Rpc<
    infer _Tag,
    infer _Payload,
    infer _Success,
    infer _Error,
    infer _Middleware
  > ? {
      readonly _tag: "Request"
      readonly id: string | number
      readonly method: _Tag
      readonly payload: _Payload["Encoded"]
    }
  : never
  : never

export type NotificationEncoded<Group extends RpcGroup.Any> = RpcGroup.Rpcs<
  Group
> extends infer Rpc ? Rpc extends Rpc.Rpc<
    infer _Tag,
    infer _Payload,
    infer _Success,
    infer _Error,
    infer _Middleware
  > ? {
      readonly _tag: "Notification"
      readonly method: _Tag
      readonly payload: _Payload["Encoded"]
    }
  : never
  : never

export type SuccessEncoded<Group extends RpcGroup.Any> = RpcGroup.Rpcs<
  Group
> extends infer Rpc ? Rpc extends Rpc.Rpc<
    infer _Tag,
    infer _Payload,
    infer _Success,
    infer _Error,
    infer _Middleware
  > ? {
      readonly _tag: "Success"
      readonly id: string | number
      readonly result: _Success["Encoded"]
    }
  : never
  : never

export type FailureEncoded<Group extends RpcGroup.Any> = RpcGroup.Rpcs<
  Group
> extends infer Rpc ? Rpc extends Rpc.Rpc<
    infer _Tag,
    infer _Payload,
    infer _Success,
    infer _Error,
    infer _Middleware
  > ? {
      readonly _tag: "Failure"
      readonly id: string | number
      readonly error: _Error["Encoded"]
    }
  : never
  : never

export class ClientRequestRpcs extends RpcGroup.make(
  Ping,
  Initialize,
  Complete,
  SetLevel,
  GetPrompt,
  ListPrompts,
  ListResources,
  ListResourceTemplates,
  ReadResource,
  Subscribe,
  Unsubscribe,
  CallTool,
  ListTools
) {}

export type ClientRequestEncoded = RequestEncoded<typeof ClientRequestRpcs>

export class ClientNotificationRpcs extends RpcGroup.make(
  CancelledNotification,
  ProgressNotification,
  InitializedNotification,
  RootsListChangedNotification
) {}
export type ClientNotificationEncoded = NotificationEncoded<typeof ClientNotificationRpcs>

export class ClientRpcs extends ClientRequestRpcs.merge(ClientNotificationRpcs) {}

export type ClientSuccessEncoded = SuccessEncoded<typeof ServerRequestRpcs>
export type ClientFailureEncoded = FailureEncoded<typeof ServerRequestRpcs>

export class ServerRequestRpcs extends RpcGroup.make(
  Ping,
  CreateMessage,
  ListRoots
) {}
export type ServerRequestEncoded = RequestEncoded<typeof ServerRequestRpcs>

export class ServerNotificationRpcs extends RpcGroup.make(
  CancelledNotification,
  ProgressNotification,
  LoggingMessageNotification,
  ResourceUpdatedNotification,
  ResourceListChangedNotification,
  ToolListChangedNotification,
  PromptListChangedNotification
) {}
export type ServerNotificationEncoded = NotificationEncoded<typeof ServerNotificationRpcs>

export type ServerSuccessEncoded = SuccessEncoded<typeof ClientRequestRpcs>
export type ServerFailureEncoded = FailureEncoded<typeof ClientRequestRpcs>
export type ServerResultEncoded = ServerSuccessEncoded | ServerFailureEncoded

export type FromClientEncoded = ClientRequestEncoded | ClientNotificationEncoded
export type FromServerEncoded = ServerResultEncoded | ServerNotificationEncoded

// =============================================================================
// JSON RPC
// =============================================================================

export interface JsonRpcRequest {
  readonly jsonrpc: "2.0"
  readonly id: string | number
  readonly method: string
  readonly params?: {
    readonly [key: string]: unknown
  }
}

export interface JsonRpcResponse {
  readonly jsonrpc: "2.0"
  readonly id: string | number
  readonly result?: {
    readonly [key: string]: unknown
  }
  readonly error?: {
    readonly code: number
    readonly message: string
    readonly data?: unknown
  }
}

export interface JsonRpcNotification {
  readonly jsonrpc: "2.0"
  readonly method: string
  readonly params?: {
    readonly [key: string]: unknown
  }
}
