/**
 * MCP v2026-07-28 wire schemas.
 *
 * @internal
 * @unstable
 */
import * as Rpc from "../../../rpc/Rpc.ts"
import * as RpcGroup from "../../../rpc/RpcGroup.ts"
import * as Schema from "../../../Schema.ts"
import * as Previous from "./v2025_11_25.ts"

/**
 * @unstable
 */
export * from "./v2025_11_25.ts"

/**
 * @internal
 * @unstable
 */
export const protocolVersion = "2026-07-28"

const optional = Previous.optional
const Meta = optional(Schema.JsonObject)

/**
 * @internal
 * @unstable
 */
export const RequestId = Schema.Union([Schema.String, Schema.Int])
/**
 * @internal
 * @unstable
 */
export const ProgressToken = RequestId
/**
 * @internal
 * @unstable
 */
export const Role = Previous.Role
/**
 * @internal
 * @unstable
 */
export const LoggingLevel = Previous.LoggingLevel
/**
 * @internal
 * @unstable
 */
export const Implementation = Previous.Implementation

/**
 * @internal
 * @unstable
 */
export const ClientCapabilities = Schema.StructWithRest(
  Schema.Struct({
    experimental: optional(Schema.Record(Schema.String, Schema.JsonObject)),
    roots: optional(Schema.Struct({})),
    sampling: optional(Schema.Struct({
      context: optional(Schema.JsonObject),
      tools: optional(Schema.JsonObject)
    })),
    elicitation: optional(Schema.Struct({
      form: optional(Schema.JsonObject),
      url: optional(Schema.JsonObject)
    })),
    extensions: optional(Schema.Record(Schema.String, Schema.JsonObject))
  }),
  [Schema.JsonObject]
)

/**
 * @internal
 * @unstable
 */
export const ServerCapabilities = Schema.StructWithRest(
  Schema.Struct({
    experimental: optional(Schema.Record(Schema.String, Schema.JsonObject)),
    logging: optional(Schema.JsonObject),
    completions: optional(Schema.JsonObject),
    prompts: optional(Schema.Struct({ listChanged: optional(Schema.Boolean) })),
    resources: optional(Schema.Struct({
      subscribe: optional(Schema.Boolean),
      listChanged: optional(Schema.Boolean)
    })),
    tools: optional(Schema.Struct({ listChanged: optional(Schema.Boolean) })),
    extensions: optional(Schema.Record(Schema.String, Schema.JsonObject))
  }),
  [Schema.JsonObject]
)

/**
 * @internal
 * @unstable
 */
export const RequestMetaObject = Schema.StructWithRest(
  Schema.Struct({
    progressToken: optional(ProgressToken),
    "io.modelcontextprotocol/protocolVersion": Schema.String,
    "io.modelcontextprotocol/clientInfo": optional(Implementation),
    "io.modelcontextprotocol/clientCapabilities": ClientCapabilities,
    "io.modelcontextprotocol/logLevel": optional(LoggingLevel)
  }),
  [Schema.JsonObject]
)

/**
 * @internal
 * @unstable
 */
export const RequestParams = Schema.Struct({ _meta: RequestMetaObject })

/**
 * @internal
 * @unstable
 */
export const NotificationMetaObject = Schema.StructWithRest(
  Schema.Struct({
    "io.modelcontextprotocol/subscriptionId": optional(RequestId)
  }),
  [Schema.JsonObject]
)
/**
 * @internal
 * @unstable
 */
export const NotificationParams = Schema.Struct({ _meta: optional(NotificationMetaObject) })

/**
 * @internal
 * @unstable
 */
export const ResultMetaObject = Schema.StructWithRest(
  Schema.Struct({
    "io.modelcontextprotocol/serverInfo": Implementation
  }),
  [Schema.JsonObject]
)
/**
 * @internal
 * @unstable
 */
export const ResultMeta = {
  _meta: ResultMetaObject,
  resultType: Schema.Literal("complete")
}
/**
 * @internal
 * @unstable
 */
export const McpError = Schema.Struct({
  code: Schema.Int,
  message: Schema.String,
  data: optional(Schema.Json)
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
export const METHOD_NOT_FOUND = -32601
/**
 * @internal
 * @unstable
 */
export const INVALID_PARAMS = -32602
/**
 * @internal
 * @unstable
 */
export const MISSING_REQUIRED_CLIENT_CAPABILITY = -32021

/**
 * @internal
 * @unstable
 */
export const Annotations = Previous.Annotations

/**
 * @internal
 * @unstable
 */
export const Resource = Schema.Struct({
  ...Previous.Resource.fields,
  size: optional(Schema.Int),
  annotations: optional(Annotations)
})

/**
 * @internal
 * @unstable
 */
export const ResourceTemplate = Previous.ResourceTemplate
/**
 * @internal
 * @unstable
 */
export const ResourceContents = Previous.ResourceContents
/**
 * @internal
 * @unstable
 */
export const TextContent = Previous.TextContent
/**
 * @internal
 * @unstable
 */
export const ImageContent = Previous.ImageContent
/**
 * @internal
 * @unstable
 */
export const AudioContent = Previous.AudioContent
/**
 * @internal
 * @unstable
 */
export const ResourceLink = Schema.Struct({ ...Resource.fields, type: Schema.Literal("resource_link") })
/**
 * @internal
 * @unstable
 */
export const EmbeddedResource = Previous.EmbeddedResource
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
export const Prompt = Previous.Prompt
/**
 * @internal
 * @unstable
 */
export const PromptMessage = Schema.Struct({ role: Role, content: ContentBlock })

const ToolInputSchema = Schema.StructWithRest(
  Schema.Struct({
    $schema: optional(Schema.String),
    type: Schema.Literal("object")
  }),
  [Schema.JsonObject]
)
const ToolOutputSchema = Schema.StructWithRest(
  Schema.Struct({ $schema: optional(Schema.String) }),
  [Schema.JsonObject]
)
/**
 * @internal
 * @unstable
 */
export const ToolAnnotations = Previous.ToolAnnotations
/**
 * @internal
 * @unstable
 */
export const Tool = Schema.Struct({
  ...Previous.Tool.fields,
  inputSchema: ToolInputSchema,
  outputSchema: optional(ToolOutputSchema),
  annotations: optional(ToolAnnotations)
})

/**
 * @internal
 * @unstable
 */
export const ToolUseContent = Previous.ToolUseContent
/**
 * @internal
 * @unstable
 */
export const ToolResultContent = Schema.Struct({
  type: Schema.Literal("tool_result"),
  toolUseId: Schema.String,
  content: Schema.Array(ContentBlock),
  structuredContent: optional(Schema.Json),
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
  role: Role,
  content: Schema.Union([SamplingMessageContentBlock, Schema.Array(SamplingMessageContentBlock)]),
  _meta: Meta
})
/**
 * @internal
 * @unstable
 */
export const ModelHint = Schema.StructWithRest(
  Schema.Struct({ name: optional(Schema.String) }),
  [Schema.JsonObject]
)
const ModelPriority = Schema.Finite.check(Schema.isBetween({ minimum: 0, maximum: 1 }))
/**
 * @internal
 * @unstable
 */
export const ModelPreferences = Schema.Struct({
  ...Previous.ModelPreferences.fields,
  hints: optional(Schema.Array(ModelHint)),
  costPriority: optional(ModelPriority),
  speedPriority: optional(ModelPriority),
  intelligencePriority: optional(ModelPriority)
})
/**
 * @internal
 * @unstable
 */
export const ToolChoice = Previous.ToolChoice

/**
 * @internal
 * @unstable
 */
export const CreateMessageRequest = Schema.Struct({
  method: Schema.Literal("sampling/createMessage"),
  params: Schema.Struct({
    messages: Schema.Array(SamplingMessage),
    modelPreferences: optional(ModelPreferences),
    systemPrompt: optional(Schema.String),
    includeContext: optional(Schema.Literals(["none", "thisServer", "allServers"])),
    temperature: optional(Schema.Finite),
    maxTokens: Schema.Int,
    stopSequences: optional(Schema.Array(Schema.String)),
    metadata: optional(Schema.JsonObject),
    tools: optional(Schema.Array(Tool)),
    toolChoice: optional(ToolChoice)
  })
})
/**
 * @internal
 * @unstable
 */
export const CreateMessageResult = Schema.Struct({
  ...SamplingMessage.fields,
  model: Schema.String,
  stopReason: optional(Schema.String)
})

/**
 * @internal
 * @unstable
 */
export const Root = Previous.Root
/**
 * @internal
 * @unstable
 */
export const ListRootsRequest = Schema.Struct({
  method: Schema.Literal("roots/list"),
  params: optional(Schema.Struct({ _meta: Meta }))
})
/**
 * @internal
 * @unstable
 */
export const ListRootsResult = Schema.Struct({ roots: Schema.Array(Root) })

/**
 * @internal
 * @unstable
 */
export const StringSchema = Previous.StringSchema
/**
 * @internal
 * @unstable
 */
export const NumberSchema = Previous.NumberSchema
/**
 * @internal
 * @unstable
 */
export const BooleanSchema = Previous.BooleanSchema
/**
 * @internal
 * @unstable
 */
export const SingleSelectEnumSchema = Previous.SingleSelectEnumSchema
/**
 * @internal
 * @unstable
 */
export const MultiSelectEnumSchema = Previous.MultiSelectEnumSchema
/**
 * @internal
 * @unstable
 */
export const LegacyTitledEnumSchema = Previous.LegacyTitledEnumSchema
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
  mode: optional(Schema.Literal("form")),
  message: Schema.String,
  requestedSchema: RequestedSchema
})
/**
 * @internal
 * @unstable
 */
export const ElicitRequestURLParams = Schema.Struct({
  mode: Schema.Literal("url"),
  message: Schema.String,
  url: Schema.String
})
/**
 * @internal
 * @unstable
 */
export const ElicitRequestParams = Schema.Union([ElicitRequestFormParams, ElicitRequestURLParams])
/**
 * @internal
 * @unstable
 */
export const ElicitRequest = Schema.Struct({
  method: Schema.Literal("elicitation/create"),
  params: ElicitRequestParams
})
/**
 * @internal
 * @unstable
 */
export const ElicitResult = Schema.Struct({
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
export const InputRequest = Schema.Union([CreateMessageRequest, ListRootsRequest, ElicitRequest])
/**
 * @internal
 * @unstable
 */
export const InputResponse = Schema.Union([CreateMessageResult, ListRootsResult, ElicitResult])
/**
 * @internal
 * @unstable
 */
export const InputRequests = Schema.Record(Schema.String, InputRequest)
/**
 * @internal
 * @unstable
 */
export const InputResponses = Schema.Record(Schema.String, InputResponse)
const InputRequiredResultMeta = {
  _meta: ResultMetaObject,
  resultType: Schema.Literal("input_required")
}
/**
 * @internal
 * @unstable
 */
export const InputRequiredResult = Schema.Union([
  Schema.StructWithRest(
    Schema.Struct({
      ...InputRequiredResultMeta,
      inputRequests: InputRequests,
      requestState: optional(Schema.String)
    }),
    [Schema.JsonObject]
  ),
  Schema.StructWithRest(
    Schema.Struct({
      ...InputRequiredResultMeta,
      inputRequests: optional(InputRequests),
      requestState: Schema.String
    }),
    [Schema.JsonObject]
  )
])
/**
 * @internal
 * @unstable
 */
export const InputResponseRequestParams = {
  ...RequestParams.fields,
  inputResponses: optional(InputResponses),
  requestState: optional(Schema.String)
}

/**
 * @internal
 * @unstable
 */
export const CacheableResult = {
  ...ResultMeta,
  ttlMs: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  cacheScope: Schema.Literals(["public", "private"])
}
/**
 * @internal
 * @unstable
 */
export const PaginatedRequestParams = {
  ...RequestParams.fields,
  cursor: optional(Schema.String)
}
/**
 * @internal
 * @unstable
 */
export const PaginatedResult = {
  ...ResultMeta,
  nextCursor: optional(Schema.String)
}

/**
 * @internal
 * @unstable
 */
export const DiscoverResult = Schema.StructWithRest(
  Schema.Struct({
    ...CacheableResult,
    supportedVersions: Schema.Array(Schema.String),
    capabilities: ServerCapabilities,
    instructions: optional(Schema.String)
  }),
  [Schema.JsonObject]
)
/**
 * @internal
 * @unstable
 */
export class Discover extends Rpc.make("server/discover", {
  success: DiscoverResult,
  error: McpError,
  payload: RequestParams
}) {}

/**
 * @internal
 * @unstable
 */
export const ListResourcesResult = Schema.StructWithRest(
  Schema.Struct({
    ...PaginatedResult,
    ...CacheableResult,
    resources: Schema.Array(Resource)
  }),
  [Schema.JsonObject]
)
/**
 * @internal
 * @unstable
 */
export class ListResources extends Rpc.make("resources/list", {
  success: ListResourcesResult,
  error: McpError,
  payload: PaginatedRequestParams
}) {}

/**
 * @internal
 * @unstable
 */
export const ListResourceTemplatesResult = Schema.StructWithRest(
  Schema.Struct({
    ...PaginatedResult,
    ...CacheableResult,
    resourceTemplates: Schema.Array(ResourceTemplate)
  }),
  [Schema.JsonObject]
)
/**
 * @internal
 * @unstable
 */
export class ListResourceTemplates extends Rpc.make("resources/templates/list", {
  success: ListResourceTemplatesResult,
  error: McpError,
  payload: PaginatedRequestParams
}) {}

/**
 * @internal
 * @unstable
 */
export const ReadResourceResult = Schema.StructWithRest(
  Schema.Struct({
    ...CacheableResult,
    contents: Schema.Array(ResourceContents)
  }),
  [Schema.JsonObject]
)
/**
 * @internal
 * @unstable
 */
export class ReadResource extends Rpc.make("resources/read", {
  success: Schema.Union([ReadResourceResult, InputRequiredResult]),
  error: McpError,
  payload: { ...InputResponseRequestParams, uri: Schema.String }
}) {}

/**
 * @internal
 * @unstable
 */
export const ListPromptsResult = Schema.StructWithRest(
  Schema.Struct({
    ...PaginatedResult,
    ...CacheableResult,
    prompts: Schema.Array(Prompt)
  }),
  [Schema.JsonObject]
)
/**
 * @internal
 * @unstable
 */
export class ListPrompts extends Rpc.make("prompts/list", {
  success: ListPromptsResult,
  error: McpError,
  payload: PaginatedRequestParams
}) {}

/**
 * @internal
 * @unstable
 */
export const GetPromptResult = Schema.StructWithRest(
  Schema.Struct({
    ...ResultMeta,
    description: optional(Schema.String),
    messages: Schema.Array(PromptMessage)
  }),
  [Schema.JsonObject]
)
/**
 * @internal
 * @unstable
 */
export class GetPrompt extends Rpc.make("prompts/get", {
  success: Schema.Union([GetPromptResult, InputRequiredResult]),
  error: McpError,
  payload: {
    ...InputResponseRequestParams,
    name: Schema.String,
    arguments: optional(Schema.Record(Schema.String, Schema.String))
  }
}) {}

/**
 * @internal
 * @unstable
 */
export const ListToolsResult = Schema.StructWithRest(
  Schema.Struct({
    ...PaginatedResult,
    ...CacheableResult,
    tools: Schema.Array(Tool)
  }),
  [Schema.JsonObject]
)
/**
 * @internal
 * @unstable
 */
export class ListTools extends Rpc.make("tools/list", {
  success: ListToolsResult,
  error: McpError,
  payload: PaginatedRequestParams
}) {}

/**
 * @internal
 * @unstable
 */
export const CallToolResult = Schema.StructWithRest(
  Schema.Struct({
    ...ResultMeta,
    content: Schema.Array(ContentBlock),
    structuredContent: optional(Schema.Json),
    isError: optional(Schema.Boolean)
  }),
  [Schema.JsonObject]
)
/**
 * @internal
 * @unstable
 */
export class CallTool extends Rpc.make("tools/call", {
  success: Schema.Union([CallToolResult, InputRequiredResult]),
  error: McpError,
  payload: {
    ...InputResponseRequestParams,
    name: Schema.String,
    arguments: optional(Schema.JsonObject)
  }
}) {}

/**
 * @internal
 * @unstable
 */
export const PromptReference = Previous.PromptReference
/**
 * @internal
 * @unstable
 */
export const ResourceTemplateReference = Previous.ResourceTemplateReference
/**
 * @internal
 * @unstable
 */
export const CompleteResult = Schema.StructWithRest(
  Schema.Struct({
    ...ResultMeta,
    completion: Schema.Struct({
      values: Schema.Array(Schema.String).check(Schema.isMaxLength(100)),
      total: optional(Schema.Int),
      hasMore: optional(Schema.Boolean)
    })
  }),
  [Schema.JsonObject]
)
/**
 * @internal
 * @unstable
 */
export class Complete extends Rpc.make("completion/complete", {
  success: CompleteResult,
  error: McpError,
  payload: {
    ...RequestParams.fields,
    ref: Schema.Union([PromptReference, ResourceTemplateReference]),
    argument: Schema.Struct({ name: Schema.String, value: Schema.String }),
    context: optional(Schema.Struct({
      arguments: optional(Schema.Record(Schema.String, Schema.String))
    }))
  }
}) {}

/**
 * @internal
 * @unstable
 */
export const SubscriptionFilter = Schema.Struct({
  toolsListChanged: optional(Schema.Boolean),
  promptsListChanged: optional(Schema.Boolean),
  resourcesListChanged: optional(Schema.Boolean),
  resourceSubscriptions: optional(Schema.Array(Schema.String))
})
/**
 * @internal
 * @unstable
 */
export const SubscriptionsListenResultMetaObject = Schema.StructWithRest(
  Schema.Struct({
    "io.modelcontextprotocol/serverInfo": Implementation,
    "io.modelcontextprotocol/subscriptionId": RequestId
  }),
  [Schema.JsonObject]
)
/**
 * @internal
 * @unstable
 */
export const SubscriptionsListenResult = Schema.StructWithRest(
  Schema.Struct({
    _meta: SubscriptionsListenResultMetaObject,
    resultType: Schema.Literal("complete")
  }),
  [Schema.JsonObject]
)
/**
 * @internal
 * @unstable
 */
export class SubscriptionsListen extends Rpc.make("subscriptions/listen", {
  success: SubscriptionsListenResult,
  error: McpError,
  payload: { ...RequestParams.fields, notifications: SubscriptionFilter }
}) {}

/**
 * @internal
 * @unstable
 */
export class CancelledNotification extends Rpc.make("notifications/cancelled", {
  payload: {
    ...NotificationParams.fields,
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
    ...NotificationParams.fields,
    progressToken: ProgressToken,
    progress: Schema.Finite,
    total: optional(Schema.Finite),
    message: optional(Schema.String)
  }
}) {}
/**
 * @internal
 * @unstable
 */
export class LoggingMessageNotification extends Rpc.make("notifications/message", {
  payload: {
    ...NotificationParams.fields,
    level: LoggingLevel,
    logger: optional(Schema.String),
    data: Schema.Json
  }
}) {}
/**
 * @internal
 * @unstable
 */
export class ResourceUpdatedNotification extends Rpc.make("notifications/resources/updated", {
  payload: { ...NotificationParams.fields, uri: Schema.String }
}) {}
/**
 * @internal
 * @unstable
 */
export class ResourceListChangedNotification extends Rpc.make("notifications/resources/list_changed", {
  payload: Schema.UndefinedOr(NotificationParams)
}) {}
/**
 * @internal
 * @unstable
 */
export class ToolListChangedNotification extends Rpc.make("notifications/tools/list_changed", {
  payload: Schema.UndefinedOr(NotificationParams)
}) {}
/**
 * @internal
 * @unstable
 */
export class PromptListChangedNotification extends Rpc.make("notifications/prompts/list_changed", {
  payload: Schema.UndefinedOr(NotificationParams)
}) {}
/**
 * @internal
 * @unstable
 */
export class SubscriptionsAcknowledgedNotification extends Rpc.make(
  "notifications/subscriptions/acknowledged",
  { payload: { ...NotificationParams.fields, notifications: SubscriptionFilter } }
) {}

/**
 * @internal
 * @unstable
 */
export class ClientRequestRpcs extends RpcGroup.make(
  Discover,
  Complete,
  GetPrompt,
  ListPrompts,
  ListResources,
  ListResourceTemplates,
  ReadResource,
  SubscriptionsListen,
  CallTool,
  ListTools
) {}

/**
 * @internal
 * @unstable
 */
export class ClientNotificationRpcs extends RpcGroup.make(CancelledNotification) {}
/**
 * @internal
 * @unstable
 */
export class ClientRpcs extends ClientRequestRpcs.merge(ClientNotificationRpcs) {}

// In v2026-07-28 these requests are embedded in InputRequiredResult rather than
// being sent as independent JSON-RPC requests.
/**
 * @internal
 * @unstable
 */
export class ServerRequestRpcs extends RpcGroup.make() {}

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
  PromptListChangedNotification,
  SubscriptionsAcknowledgedNotification
) {}
