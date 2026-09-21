/**
 * Exact MCP v2024-11-05 wire schemas.
 *
 * Transport topology is intentionally not represented here. This module owns
 * the dated JSON-RPC method payloads and results only.
 *
 * @internal
 * @unstable
 */
import * as Option from "../../../Option.ts"
import * as Rpc from "../../../rpc/Rpc.ts"
import * as RpcGroup from "../../../rpc/RpcGroup.ts"
import * as Schema from "../../../Schema.ts"
import * as SchemaGetter from "../../../SchemaGetter.ts"

/**
 * @internal
 * @unstable
 */
export const protocolVersion = "2024-11-05"

/**
 * @internal
 * @unstable
 */
export const optional = <S extends Schema.Constraint>(
  schema: S
): Schema.decodeTo<Schema.optional<S>, Schema.optionalKey<S>> =>
  Schema.optionalKey(schema).pipe(
    Schema.decodeTo(Schema.optional(schema), {
      decode: SchemaGetter.passthrough(),
      encode: SchemaGetter.transformOptional(Option.flatMap(Option.fromUndefinedOr))
    })
  )
const JsonObject = Schema.JsonObject

/**
 * @internal
 * @unstable
 */
export const RequestId = Schema.Union([Schema.String, Schema.Finite])
/**
 * @internal
 * @unstable
 */
export const ProgressToken = Schema.Union([Schema.String, Schema.Finite])
/**
 * @internal
 * @unstable
 */
export const Role = Schema.Literals(["user", "assistant"])
/**
 * @internal
 * @unstable
 */
export const LoggingLevel = Schema.Literals([
  "debug",
  "info",
  "notice",
  "warning",
  "error",
  "critical",
  "alert",
  "emergency"
])

/**
 * @internal
 * @unstable
 */
export const RequestMeta = Schema.Struct({
  _meta: optional(Schema.StructWithRest(
    Schema.Struct({
      progressToken: optional(ProgressToken)
    }),
    [Schema.JsonObject]
  ))
})

/**
 * @internal
 * @unstable
 */
export const NotificationMeta = Schema.Struct({
  _meta: optional(JsonObject)
})

/**
 * @internal
 * @unstable
 */
export const ResultMeta = Schema.Struct({
  _meta: optional(JsonObject)
})

/**
 * @internal
 * @unstable
 */
export const PaginatedRequest = Schema.Struct({
  ...RequestMeta.fields,
  cursor: optional(Schema.String)
})

/**
 * @internal
 * @unstable
 */
export const PaginatedResult = Schema.Struct({
  ...ResultMeta.fields,
  nextCursor: optional(Schema.String)
})

/**
 * @internal
 * @unstable
 */
export const Implementation = Schema.Struct({
  name: Schema.String,
  version: Schema.String
})

/**
 * @internal
 * @unstable
 */
export const ClientCapabilities = Schema.Struct({
  experimental: optional(Schema.Record(Schema.String, JsonObject)),
  roots: optional(Schema.Struct({
    listChanged: optional(Schema.Boolean)
  })),
  sampling: optional(JsonObject)
})

/**
 * @internal
 * @unstable
 */
export const ServerCapabilities = Schema.Struct({
  experimental: optional(Schema.Record(Schema.String, JsonObject)),
  logging: optional(JsonObject),
  prompts: optional(Schema.Struct({
    listChanged: optional(Schema.Boolean)
  })),
  resources: optional(Schema.Struct({
    subscribe: optional(Schema.Boolean),
    listChanged: optional(Schema.Boolean)
  })),
  tools: optional(Schema.Struct({
    listChanged: optional(Schema.Boolean)
  }))
})

/**
 * @internal
 * @unstable
 */
export const McpError = Schema.Struct({
  code: Schema.Int,
  message: Schema.String,
  data: optional(Schema.Any)
})
/**
 * @internal
 * @unstable
 */
export type McpError = typeof McpError.Type

/**
 * @internal
 * @unstable
 */
export const Annotation = Schema.Struct({
  audience: optional(Schema.Array(Role)),
  priority: optional(Schema.Finite.check(Schema.isBetween({ minimum: 0, maximum: 1 })))
})

/**
 * @internal
 * @unstable
 */
export const TextResourceContents = Schema.Struct({
  uri: Schema.String,
  mimeType: optional(Schema.String),
  text: Schema.String
})

/**
 * @internal
 * @unstable
 */
export const BlobResourceContents = Schema.Struct({
  uri: Schema.String,
  mimeType: optional(Schema.String),
  blob: Schema.String
})

/**
 * @internal
 * @unstable
 */
export const ResourceContents = Schema.Union([
  TextResourceContents,
  BlobResourceContents
])

/**
 * @internal
 * @unstable
 */
export const TextContent = Schema.Struct({
  type: Schema.Literal("text"),
  text: Schema.String,
  annotations: optional(Annotation)
})

/**
 * @internal
 * @unstable
 */
export const ImageContent = Schema.Struct({
  type: Schema.Literal("image"),
  data: Schema.String,
  mimeType: Schema.String,
  annotations: optional(Annotation)
})

/**
 * @internal
 * @unstable
 */
export const EmbeddedResource = Schema.Struct({
  type: Schema.Literal("resource"),
  resource: ResourceContents,
  annotations: optional(Annotation)
})

/**
 * @internal
 * @unstable
 */
export const PromptOrToolContent = Schema.Union([
  TextContent,
  ImageContent,
  EmbeddedResource
])

/**
 * @internal
 * @unstable
 */
export const SamplingContent = Schema.Union([
  TextContent,
  ImageContent
])

/**
 * @internal
 * @unstable
 */
export const Resource = Schema.Struct({
  uri: Schema.String,
  name: Schema.String,
  description: optional(Schema.String),
  mimeType: optional(Schema.String),
  size: optional(Schema.Finite),
  annotations: optional(Annotation)
})

/**
 * @internal
 * @unstable
 */
export const ResourceTemplate = Schema.Struct({
  uriTemplate: Schema.String,
  name: Schema.String,
  description: optional(Schema.String),
  mimeType: optional(Schema.String),
  annotations: optional(Annotation)
})

/**
 * @internal
 * @unstable
 */
export const PromptArgument = Schema.Struct({
  name: Schema.String,
  description: optional(Schema.String),
  required: optional(Schema.Boolean)
})

/**
 * @internal
 * @unstable
 */
export const Prompt = Schema.Struct({
  name: Schema.String,
  description: optional(Schema.String),
  arguments: optional(Schema.Array(PromptArgument))
})

/**
 * @internal
 * @unstable
 */
export const PromptMessage = Schema.Struct({
  role: Role,
  content: PromptOrToolContent
})

/**
 * @internal
 * @unstable
 */
export const ToolInputSchema = Schema.Struct({
  type: Schema.Literal("object"),
  properties: optional(Schema.Record(Schema.String, JsonObject)),
  required: optional(Schema.Array(Schema.String))
})

/**
 * @internal
 * @unstable
 */
export const Tool = Schema.Struct({
  name: Schema.String,
  description: optional(Schema.String),
  inputSchema: ToolInputSchema
})

/**
 * @internal
 * @unstable
 */
export const ModelHint = Schema.Struct({
  name: optional(Schema.String)
})

/**
 * @internal
 * @unstable
 */
export const ModelPreferences = Schema.Struct({
  hints: optional(Schema.Array(ModelHint)),
  costPriority: optional(Schema.Finite.check(Schema.isBetween({ minimum: 0, maximum: 1 }))),
  speedPriority: optional(Schema.Finite.check(Schema.isBetween({ minimum: 0, maximum: 1 }))),
  intelligencePriority: optional(Schema.Finite.check(Schema.isBetween({ minimum: 0, maximum: 1 })))
})

/**
 * @internal
 * @unstable
 */
export const SamplingMessage = Schema.Struct({
  role: Role,
  content: SamplingContent
})

/**
 * @internal
 * @unstable
 */
export const ResourceReference = Schema.Struct({
  type: Schema.Literal("ref/resource"),
  uri: Schema.String
})

/**
 * @internal
 * @unstable
 */
export const PromptReference = Schema.Struct({
  type: Schema.Literal("ref/prompt"),
  name: Schema.String
})

/**
 * @internal
 * @unstable
 */
export const Root = Schema.Struct({
  uri: Schema.String,
  name: optional(Schema.String)
})

/**
 * @internal
 * @unstable
 */
export const InitializeResult = Schema.Struct({
  ...ResultMeta.fields,
  protocolVersion: Schema.String,
  capabilities: ServerCapabilities,
  serverInfo: Implementation,
  instructions: optional(Schema.String)
})

/**
 * @internal
 * @unstable
 */
export const ListResourcesResult = Schema.Struct({
  ...PaginatedResult.fields,
  resources: Schema.Array(Resource)
})

/**
 * @internal
 * @unstable
 */
export const ListResourceTemplatesResult = Schema.Struct({
  ...PaginatedResult.fields,
  resourceTemplates: Schema.Array(ResourceTemplate)
})

/**
 * @internal
 * @unstable
 */
export const ReadResourceResult = Schema.Struct({
  ...ResultMeta.fields,
  contents: Schema.Array(ResourceContents)
})

/**
 * @internal
 * @unstable
 */
export const ListPromptsResult = Schema.Struct({
  ...PaginatedResult.fields,
  prompts: Schema.Array(Prompt)
})

/**
 * @internal
 * @unstable
 */
export const GetPromptResult = Schema.Struct({
  ...ResultMeta.fields,
  description: optional(Schema.String),
  messages: Schema.Array(PromptMessage)
})

/**
 * @internal
 * @unstable
 */
export const ListToolsResult = Schema.Struct({
  ...PaginatedResult.fields,
  tools: Schema.Array(Tool)
})

/**
 * @internal
 * @unstable
 */
export const CallToolResult = Schema.Struct({
  ...ResultMeta.fields,
  content: Schema.Array(PromptOrToolContent),
  isError: optional(Schema.Boolean)
})

/**
 * @internal
 * @unstable
 */
export const CreateMessageResult = Schema.Struct({
  ...ResultMeta.fields,
  role: Role,
  content: SamplingContent,
  model: Schema.String,
  stopReason: optional(Schema.String)
})

/**
 * @internal
 * @unstable
 */
export const CompleteResult = Schema.Struct({
  ...ResultMeta.fields,
  completion: Schema.Struct({
    values: Schema.Array(Schema.String),
    total: optional(Schema.Finite),
    hasMore: optional(Schema.Boolean)
  })
})

/**
 * @internal
 * @unstable
 */
export const ListRootsResult = Schema.Struct({
  ...ResultMeta.fields,
  roots: Schema.Array(Root)
})

/**
 * @internal
 * @unstable
 */
export class Ping extends Rpc.make("ping", {
  success: ResultMeta,
  error: McpError,
  payload: Schema.UndefinedOr(RequestMeta)
}) {}

/**
 * @internal
 * @unstable
 */
export class Initialize extends Rpc.make("initialize", {
  success: InitializeResult,
  error: McpError,
  payload: {
    ...RequestMeta.fields,
    protocolVersion: Schema.String,
    capabilities: ClientCapabilities,
    clientInfo: Implementation
  }
}) {}

/**
 * @internal
 * @unstable
 */
export class Complete extends Rpc.make("completion/complete", {
  success: CompleteResult,
  error: McpError,
  payload: {
    ...RequestMeta.fields,
    ref: Schema.Union([PromptReference, ResourceReference]),
    argument: Schema.Struct({
      name: Schema.String,
      value: Schema.String
    })
  }
}) {}

/**
 * @internal
 * @unstable
 */
export class SetLevel extends Rpc.make("logging/setLevel", {
  success: ResultMeta,
  error: McpError,
  payload: {
    ...RequestMeta.fields,
    level: LoggingLevel
  }
}) {}

/**
 * @internal
 * @unstable
 */
export class GetPrompt extends Rpc.make("prompts/get", {
  success: GetPromptResult,
  error: McpError,
  payload: {
    ...RequestMeta.fields,
    name: Schema.String,
    arguments: optional(Schema.Record(Schema.String, Schema.String))
  }
}) {}

/**
 * @internal
 * @unstable
 */
export class ListPrompts extends Rpc.make("prompts/list", {
  success: ListPromptsResult,
  error: McpError,
  payload: Schema.UndefinedOr(PaginatedRequest)
}) {}

/**
 * @internal
 * @unstable
 */
export class ListResources extends Rpc.make("resources/list", {
  success: ListResourcesResult,
  error: McpError,
  payload: Schema.UndefinedOr(PaginatedRequest)
}) {}

/**
 * @internal
 * @unstable
 */
export class ListResourceTemplates extends Rpc.make("resources/templates/list", {
  success: ListResourceTemplatesResult,
  error: McpError,
  payload: Schema.UndefinedOr(PaginatedRequest)
}) {}

/**
 * @internal
 * @unstable
 */
export class ReadResource extends Rpc.make("resources/read", {
  success: ReadResourceResult,
  error: McpError,
  payload: {
    ...RequestMeta.fields,
    uri: Schema.String
  }
}) {}

/**
 * @internal
 * @unstable
 */
export class Subscribe extends Rpc.make("resources/subscribe", {
  success: ResultMeta,
  error: McpError,
  payload: {
    ...RequestMeta.fields,
    uri: Schema.String
  }
}) {}

/**
 * @internal
 * @unstable
 */
export class Unsubscribe extends Rpc.make("resources/unsubscribe", {
  success: ResultMeta,
  error: McpError,
  payload: {
    ...RequestMeta.fields,
    uri: Schema.String
  }
}) {}

/**
 * @internal
 * @unstable
 */
export class CallTool extends Rpc.make("tools/call", {
  success: CallToolResult,
  error: McpError,
  payload: {
    ...RequestMeta.fields,
    name: Schema.String,
    arguments: optional(JsonObject)
  }
}) {}

/**
 * @internal
 * @unstable
 */
export class ListTools extends Rpc.make("tools/list", {
  success: ListToolsResult,
  error: McpError,
  payload: Schema.UndefinedOr(PaginatedRequest)
}) {}

/**
 * @internal
 * @unstable
 */
export class CreateMessage extends Rpc.make("sampling/createMessage", {
  success: CreateMessageResult,
  error: McpError,
  payload: {
    ...RequestMeta.fields,
    messages: Schema.Array(SamplingMessage),
    modelPreferences: optional(ModelPreferences),
    systemPrompt: optional(Schema.String),
    includeContext: optional(Schema.Literals(["none", "thisServer", "allServers"])),
    temperature: optional(Schema.Finite),
    maxTokens: Schema.Finite,
    stopSequences: optional(Schema.Array(Schema.String)),
    metadata: optional(JsonObject)
  }
}) {}

/**
 * @internal
 * @unstable
 */
export class ListRoots extends Rpc.make("roots/list", {
  success: ListRootsResult,
  error: McpError,
  payload: Schema.UndefinedOr(RequestMeta)
}) {}

/**
 * @internal
 * @unstable
 */
export class CancelledNotification extends Rpc.make("notifications/cancelled", {
  payload: {
    ...NotificationMeta.fields,
    requestId: RequestId,
    reason: optional(Schema.String)
  }
}) {}

/**
 * @internal
 * @unstable
 */
export class ProgressNotification extends Rpc.make("notifications/progress", {
  payload: {
    ...NotificationMeta.fields,
    progressToken: ProgressToken,
    progress: Schema.Finite,
    total: optional(Schema.Finite)
  }
}) {}

/**
 * @internal
 * @unstable
 */
export class InitializedNotification extends Rpc.make("notifications/initialized", {
  payload: Schema.UndefinedOr(NotificationMeta)
}) {}

/**
 * @internal
 * @unstable
 */
export class RootsListChangedNotification extends Rpc.make("notifications/roots/list_changed", {
  payload: Schema.UndefinedOr(NotificationMeta)
}) {}

/**
 * @internal
 * @unstable
 */
export class LoggingMessageNotification extends Rpc.make("notifications/message", {
  payload: {
    ...NotificationMeta.fields,
    level: LoggingLevel,
    logger: optional(Schema.String),
    data: Schema.Any
  }
}) {}

/**
 * @internal
 * @unstable
 */
export class ResourceUpdatedNotification extends Rpc.make("notifications/resources/updated", {
  payload: {
    ...NotificationMeta.fields,
    uri: Schema.String
  }
}) {}

/**
 * @internal
 * @unstable
 */
export class ResourceListChangedNotification extends Rpc.make("notifications/resources/list_changed", {
  payload: Schema.UndefinedOr(NotificationMeta)
}) {}

/**
 * @internal
 * @unstable
 */
export class ToolListChangedNotification extends Rpc.make("notifications/tools/list_changed", {
  payload: Schema.UndefinedOr(NotificationMeta)
}) {}

/**
 * @internal
 * @unstable
 */
export class PromptListChangedNotification extends Rpc.make("notifications/prompts/list_changed", {
  payload: Schema.UndefinedOr(NotificationMeta)
}) {}

/**
 * @internal
 * @unstable
 */
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

/**
 * @internal
 * @unstable
 */
export class ClientNotificationRpcs extends RpcGroup.make(
  CancelledNotification,
  ProgressNotification,
  InitializedNotification,
  RootsListChangedNotification
) {}

/**
 * @internal
 * @unstable
 */
export class ServerRequestRpcs extends RpcGroup.make(
  Ping,
  CreateMessage,
  ListRoots
) {}

/**
 * @internal
 * @unstable
 */
export class ServerNotificationRpcs extends RpcGroup.make(
  CancelledNotification,
  ProgressNotification,
  LoggingMessageNotification,
  ResourceUpdatedNotification,
  ResourceListChangedNotification,
  ToolListChangedNotification,
  PromptListChangedNotification
) {}
