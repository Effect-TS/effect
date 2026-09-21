/**
 * Supported non-Task MCP v2025-11-25 wire schemas.
 *
 * This module is a dated delta from v2025-06-18. Experimental Tasks are not
 * part of the supported vocabulary for this adapter.
 *
 * @internal
 * @unstable
 */
import * as Rpc from "../../../rpc/Rpc.ts"
import * as RpcGroup from "../../../rpc/RpcGroup.ts"
import * as Schema from "../../../Schema.ts"
import * as Previous from "./v2025_06_18.ts"

/**
 * @unstable
 */
export * from "./v2025_06_18.ts"

/**
 * @internal
 * @unstable
 */
export const protocolVersion = "2025-11-25"

const optional = Previous.optional
const JsonObject = Schema.JsonObject
const Meta = optional(JsonObject)

/**
 * @internal
 * @unstable
 */
export const Icon = Schema.Struct({
  src: Schema.String,
  mimeType: optional(Schema.String),
  sizes: optional(Schema.Array(Schema.String)),
  theme: optional(Schema.Literals(["light", "dark"]))
})

/**
 * @internal
 * @unstable
 */
export const Implementation = Schema.Struct({
  ...Previous.Implementation.fields,
  description: optional(Schema.String),
  websiteUrl: optional(Schema.String),
  icons: optional(Schema.Array(Icon))
})

/**
 * @internal
 * @unstable
 */
export const ClientCapabilities = Schema.Struct({
  ...Previous.ClientCapabilities.fields,
  sampling: optional(Schema.Struct({
    context: optional(JsonObject),
    tools: optional(JsonObject)
  })),
  elicitation: optional(Schema.Struct({
    form: optional(JsonObject),
    url: optional(JsonObject)
  }))
})

/**
 * @internal
 * @unstable
 */
export const Annotations = Schema.Struct({
  ...Previous.Annotations.fields,
  lastModified: optional(Schema.String)
})

/**
 * @internal
 * @unstable
 */
export const Resource = Schema.Struct({
  ...Previous.Resource.fields,
  annotations: optional(Annotations),
  icons: optional(Schema.Array(Icon))
})

/**
 * @internal
 * @unstable
 */
export const ResourceTemplate = Schema.Struct({
  ...Previous.ResourceTemplate.fields,
  annotations: optional(Annotations),
  icons: optional(Schema.Array(Icon))
})

/**
 * @internal
 * @unstable
 */
export const Prompt = Schema.Struct({
  ...Previous.Prompt.fields,
  icons: optional(Schema.Array(Icon))
})

/**
 * @internal
 * @unstable
 */
export const TextContent = Schema.Struct({
  ...Previous.TextContent.fields,
  annotations: optional(Annotations)
})

/**
 * @internal
 * @unstable
 */
export const ImageContent = Schema.Struct({
  ...Previous.ImageContent.fields,
  annotations: optional(Annotations)
})

/**
 * @internal
 * @unstable
 */
export const AudioContent = Schema.Struct({
  ...Previous.AudioContent.fields,
  annotations: optional(Annotations)
})

/**
 * @internal
 * @unstable
 */
export const EmbeddedResource = Schema.Struct({
  ...Previous.EmbeddedResource.fields,
  annotations: optional(Annotations)
})

/**
 * @internal
 * @unstable
 */
export const ResourceLink = Schema.Struct({
  ...Resource.fields,
  type: Schema.Literal("resource_link")
})

/**
 * @internal
 * @unstable
 */
export const ContentBlock = Schema.Union([
  TextContent,
  ImageContent,
  AudioContent,
  ResourceLink,
  EmbeddedResource
])

/**
 * @internal
 * @unstable
 */
export const PromptMessage = Schema.Struct({
  role: Previous.Role,
  content: ContentBlock
})

/**
 * @internal
 * @unstable
 */
export const Tool = Schema.Struct({
  ...Previous.Tool.fields,
  icons: optional(Schema.Array(Icon))
})

/**
 * @internal
 * @unstable
 */
export const CallToolResult = Schema.Struct({
  ...Previous.CallToolResult.fields,
  content: Schema.Array(ContentBlock)
})

/**
 * @internal
 * @unstable
 */
export class CallTool extends Rpc.make("tools/call", {
  success: CallToolResult,
  error: Previous.McpError,
  payload: Previous.CallTool.payloadSchema
}) {}

/**
 * @internal
 * @unstable
 */
export const ToolUseContent = Schema.Struct({
  type: Schema.Literal("tool_use"),
  id: Schema.String,
  name: Schema.String,
  input: JsonObject,
  _meta: Meta
})

/**
 * @internal
 * @unstable
 */
export const ToolResultContent = Schema.Struct({
  type: Schema.Literal("tool_result"),
  toolUseId: Schema.String,
  content: Schema.Array(ContentBlock),
  structuredContent: optional(JsonObject),
  isError: optional(Schema.Boolean),
  _meta: Meta
})

/**
 * @internal
 * @unstable
 */
export const SamplingMessageContentBlock = Schema.Union([
  TextContent,
  ImageContent,
  AudioContent,
  ToolUseContent,
  ToolResultContent
])

/**
 * @internal
 * @unstable
 */
export const SamplingMessage = Schema.Struct({
  role: Previous.Role,
  content: Schema.Union([
    SamplingMessageContentBlock,
    Schema.Array(SamplingMessageContentBlock)
  ]),
  _meta: Meta
})

/**
 * @internal
 * @unstable
 */
export const ToolChoice = Schema.Struct({
  mode: optional(Schema.Literals(["auto", "required", "none"]))
})

/**
 * @internal
 * @unstable
 */
export const CreateMessageResult = Schema.Struct({
  ...Previous.ResultMeta.fields,
  ...SamplingMessage.fields,
  model: Schema.String,
  stopReason: optional(Schema.String)
})

/**
 * @internal
 * @unstable
 */
export class CreateMessage extends Rpc.make("sampling/createMessage", {
  success: CreateMessageResult,
  error: Previous.McpError,
  payload: {
    ...Previous.CreateMessage.payloadSchema.fields,
    messages: Schema.Array(SamplingMessage),
    maxTokens: Schema.Int,
    tools: optional(Schema.Array(Tool)),
    toolChoice: optional(ToolChoice)
  }
}) {}

/**
 * @internal
 * @unstable
 */
export const Root = Schema.Struct({
  ...Previous.Root.fields,
  _meta: Meta
})

/**
 * @internal
 * @unstable
 */
export const ListRootsResult = Schema.Struct({
  ...Previous.ResultMeta.fields,
  roots: Schema.Array(Root)
})

/**
 * @internal
 * @unstable
 */
export class ListRoots extends Rpc.make("roots/list", {
  success: ListRootsResult,
  error: Previous.McpError,
  payload: Schema.UndefinedOr(Previous.RequestMeta)
}) {}

/**
 * @internal
 * @unstable
 */
export const StringSchema = Schema.Struct({
  type: Schema.Literal("string"),
  title: optional(Schema.String),
  description: optional(Schema.String),
  minLength: optional(Schema.Int),
  maxLength: optional(Schema.Int),
  format: optional(Schema.Literals(["email", "uri", "date", "date-time"])),
  default: optional(Schema.String)
})

/**
 * @internal
 * @unstable
 */
export const NumberSchema = Schema.Struct({
  type: Schema.Literals(["number", "integer"]),
  title: optional(Schema.String),
  description: optional(Schema.String),
  minimum: optional(Schema.Finite),
  maximum: optional(Schema.Finite),
  default: optional(Schema.Finite)
})

/**
 * @internal
 * @unstable
 */
export const BooleanSchema = Schema.Struct({
  type: Schema.Literal("boolean"),
  title: optional(Schema.String),
  description: optional(Schema.String),
  default: optional(Schema.Boolean)
})

const EnumOption = Schema.Struct({
  const: Schema.String,
  title: Schema.String
})

/**
 * @internal
 * @unstable
 */
export const UntitledSingleSelectEnumSchema = Schema.Struct({
  type: Schema.Literal("string"),
  title: optional(Schema.String),
  description: optional(Schema.String),
  enum: Schema.Array(Schema.String),
  default: optional(Schema.String)
})

/**
 * @internal
 * @unstable
 */
export const TitledSingleSelectEnumSchema = Schema.Struct({
  type: Schema.Literal("string"),
  title: optional(Schema.String),
  description: optional(Schema.String),
  oneOf: Schema.Array(EnumOption),
  default: optional(Schema.String)
})

/**
 * @internal
 * @unstable
 */
export const SingleSelectEnumSchema = Schema.Union([
  UntitledSingleSelectEnumSchema,
  TitledSingleSelectEnumSchema
])

/**
 * @internal
 * @unstable
 */
export const UntitledMultiSelectEnumSchema = Schema.Struct({
  type: Schema.Literal("array"),
  title: optional(Schema.String),
  description: optional(Schema.String),
  minItems: optional(Schema.Int),
  maxItems: optional(Schema.Int),
  items: Schema.Struct({
    type: Schema.Literal("string"),
    enum: Schema.Array(Schema.String)
  }),
  default: optional(Schema.Array(Schema.String))
})

/**
 * @internal
 * @unstable
 */
export const TitledMultiSelectEnumSchema = Schema.Struct({
  type: Schema.Literal("array"),
  title: optional(Schema.String),
  description: optional(Schema.String),
  minItems: optional(Schema.Int),
  maxItems: optional(Schema.Int),
  items: Schema.Struct({
    anyOf: Schema.Array(EnumOption)
  }),
  default: optional(Schema.Array(Schema.String))
})

/**
 * @internal
 * @unstable
 */
export const MultiSelectEnumSchema = Schema.Union([
  UntitledMultiSelectEnumSchema,
  TitledMultiSelectEnumSchema
])

/**
 * @internal
 * @unstable
 */
export const LegacyTitledEnumSchema = Schema.Struct({
  type: Schema.Literal("string"),
  title: optional(Schema.String),
  description: optional(Schema.String),
  enum: Schema.Array(Schema.String),
  enumNames: optional(Schema.Array(Schema.String)),
  default: optional(Schema.String)
})

/**
 * @internal
 * @unstable
 */
export const EnumSchema = Schema.Union([
  LegacyTitledEnumSchema,
  SingleSelectEnumSchema,
  MultiSelectEnumSchema
])

/**
 * @internal
 * @unstable
 */
export const PrimitiveSchemaDefinition = Schema.Union([
  EnumSchema,
  StringSchema,
  NumberSchema,
  BooleanSchema
])

/**
 * @internal
 * @unstable
 */
export const RequestedSchema = Schema.Struct({
  $schema: optional(Schema.String),
  type: Schema.Literal("object"),
  properties: Schema.Record(Schema.String, PrimitiveSchemaDefinition),
  required: optional(Schema.Array(Schema.String))
})

/**
 * @internal
 * @unstable
 */
export const ElicitRequestFormParams = Schema.Struct({
  ...Previous.RequestMeta.fields,
  mode: optional(Schema.Literal("form")),
  message: Schema.String,
  requestedSchema: RequestedSchema
})

/**
 * @internal
 * @unstable
 */
export const ElicitRequestURLParams = Schema.Struct({
  ...Previous.RequestMeta.fields,
  mode: Schema.Literal("url"),
  message: Schema.String,
  elicitationId: Schema.String,
  url: Schema.String
})

/**
 * @internal
 * @unstable
 */
export const ElicitRequestParams = Schema.Union([
  ElicitRequestFormParams,
  ElicitRequestURLParams
])

/**
 * @internal
 * @unstable
 */
export const ElicitResult = Schema.Struct({
  ...Previous.ResultMeta.fields,
  action: Schema.Literals(["accept", "decline", "cancel"]),
  content: optional(Schema.Record(
    Schema.String,
    Schema.Union([Schema.String, Schema.Finite, Schema.Boolean, Schema.Array(Schema.String)])
  ))
})

/**
 * @internal
 * @unstable
 */
export class Elicit extends Rpc.make("elicitation/create", {
  success: ElicitResult,
  error: Previous.McpError,
  payload: ElicitRequestParams
}) {}

/**
 * @internal
 * @unstable
 */
export class ElicitationCompleteNotification extends Rpc.make("notifications/elicitation/complete", {
  payload: {
    elicitationId: Schema.String
  }
}) {}

/**
 * @internal
 * @unstable
 */
export const InitializeResult = Schema.Struct({
  ...Previous.InitializeResult.fields,
  serverInfo: Implementation
})

/**
 * @internal
 * @unstable
 */
export class Initialize extends Rpc.make("initialize", {
  success: InitializeResult,
  error: Previous.McpError,
  payload: {
    ...Previous.Initialize.payloadSchema.fields,
    capabilities: ClientCapabilities,
    clientInfo: Implementation
  }
}) {}

/**
 * @internal
 * @unstable
 */
export const ListResourcesResult = Schema.Struct({
  ...Previous.PaginatedResult.fields,
  resources: Schema.Array(Resource)
})

/**
 * @internal
 * @unstable
 */
export const ListResourceTemplatesResult = Schema.Struct({
  ...Previous.PaginatedResult.fields,
  resourceTemplates: Schema.Array(ResourceTemplate)
})

/**
 * @internal
 * @unstable
 */
export const ListPromptsResult = Schema.Struct({
  ...Previous.PaginatedResult.fields,
  prompts: Schema.Array(Prompt)
})

/**
 * @internal
 * @unstable
 */
export const GetPromptResult = Schema.Struct({
  ...Previous.GetPromptResult.fields,
  messages: Schema.Array(PromptMessage)
})

/**
 * @internal
 * @unstable
 */
export const ListToolsResult = Schema.Struct({
  ...Previous.PaginatedResult.fields,
  tools: Schema.Array(Tool)
})

/**
 * @internal
 * @unstable
 */
export class ListResources extends Rpc.make("resources/list", {
  success: ListResourcesResult,
  error: Previous.McpError,
  payload: Schema.UndefinedOr(Previous.PaginatedRequest)
}) {}

/**
 * @internal
 * @unstable
 */
export class ListResourceTemplates extends Rpc.make("resources/templates/list", {
  success: ListResourceTemplatesResult,
  error: Previous.McpError,
  payload: Schema.UndefinedOr(Previous.PaginatedRequest)
}) {}

/**
 * @internal
 * @unstable
 */
export class ListPrompts extends Rpc.make("prompts/list", {
  success: ListPromptsResult,
  error: Previous.McpError,
  payload: Schema.UndefinedOr(Previous.PaginatedRequest)
}) {}

/**
 * @internal
 * @unstable
 */
export class GetPrompt extends Rpc.make("prompts/get", {
  success: GetPromptResult,
  error: Previous.McpError,
  payload: {
    ...Previous.RequestMeta.fields,
    name: Schema.String,
    arguments: optional(Schema.Record(Schema.String, Schema.String))
  }
}) {}

/**
 * @internal
 * @unstable
 */
export class ListTools extends Rpc.make("tools/list", {
  success: ListToolsResult,
  error: Previous.McpError,
  payload: Schema.UndefinedOr(Previous.PaginatedRequest)
}) {}

/**
 * @internal
 * @unstable
 */
export class ClientRequestRpcs extends RpcGroup.make(
  Previous.Ping,
  Initialize,
  Previous.Complete,
  Previous.SetLevel,
  GetPrompt,
  ListPrompts,
  ListResources,
  ListResourceTemplates,
  Previous.ReadResource,
  Previous.Subscribe,
  Previous.Unsubscribe,
  CallTool,
  ListTools
) {}

/**
 * @internal
 * @unstable
 */
export class ClientNotificationRpcs extends RpcGroup.make(
  Previous.CancelledNotification,
  Previous.ProgressNotification,
  Previous.InitializedNotification,
  Previous.RootsListChangedNotification
) {}

/**
 * @internal
 * @unstable
 */
export class ServerRequestRpcs extends RpcGroup.make(
  Previous.Ping,
  CreateMessage,
  ListRoots,
  Elicit
) {}

/**
 * @internal
 * @unstable
 */
export class ServerNotificationRpcs extends RpcGroup.make(
  Previous.CancelledNotification,
  Previous.ProgressNotification,
  Previous.LoggingMessageNotification,
  Previous.ResourceUpdatedNotification,
  Previous.ResourceListChangedNotification,
  Previous.ToolListChangedNotification,
  Previous.PromptListChangedNotification,
  ElicitationCompleteNotification
) {}
