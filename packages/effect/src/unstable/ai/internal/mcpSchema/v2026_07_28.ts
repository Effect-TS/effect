/**
 * MCP v2026-07-28 wire schemas.
 *
 * @internal
 */
import * as Schema from "../../../../Schema.ts"
import * as Rpc from "../../../rpc/Rpc.ts"
import * as RpcGroup from "../../../rpc/RpcGroup.ts"
import * as Previous from "./v2025_11_25.ts"

export * from "./v2025_11_25.ts"

export const protocolVersion = "2026-07-28"

const optional = Previous.optional
const JsonObject = Schema.Record(Schema.String, Schema.Json)
const MetaObject = JsonObject
const Meta = optional(MetaObject)

export const RequestId = Schema.Union([Schema.String, Schema.Int])
export const ProgressToken = RequestId
export const Role = Previous.Role
export const LoggingLevel = Previous.LoggingLevel
export const Icon = Previous.Icon
export const Implementation = Previous.Implementation

export const ClientCapabilities = Schema.StructWithRest(
  Schema.Struct({
    experimental: optional(Schema.Record(Schema.String, JsonObject)),
    roots: optional(Schema.Struct({})),
    sampling: optional(Schema.Struct({
      context: optional(JsonObject),
      tools: optional(JsonObject)
    })),
    elicitation: optional(Schema.Struct({
      form: optional(JsonObject),
      url: optional(JsonObject)
    })),
    extensions: optional(Schema.Record(Schema.String, JsonObject))
  }),
  [Schema.Record(Schema.String, Schema.Json)]
)

export const ServerCapabilities = Schema.StructWithRest(
  Schema.Struct({
    experimental: optional(Schema.Record(Schema.String, JsonObject)),
    logging: optional(JsonObject),
    completions: optional(JsonObject),
    prompts: optional(Schema.Struct({ listChanged: optional(Schema.Boolean) })),
    resources: optional(Schema.Struct({
      subscribe: optional(Schema.Boolean),
      listChanged: optional(Schema.Boolean)
    })),
    tools: optional(Schema.Struct({ listChanged: optional(Schema.Boolean) })),
    extensions: optional(Schema.Record(Schema.String, JsonObject))
  }),
  [Schema.Record(Schema.String, Schema.Json)]
)

export const RequestMetaObject = Schema.StructWithRest(
  Schema.Struct({
    progressToken: optional(ProgressToken),
    "io.modelcontextprotocol/protocolVersion": Schema.String,
    "io.modelcontextprotocol/clientInfo": optional(Implementation),
    "io.modelcontextprotocol/clientCapabilities": ClientCapabilities,
    "io.modelcontextprotocol/logLevel": optional(LoggingLevel)
  }),
  [Schema.Record(Schema.String, Schema.Json)]
)

export const RequestParams = Schema.Struct({ _meta: RequestMetaObject })

export const NotificationMetaObject = Schema.StructWithRest(
  Schema.Struct({
    "io.modelcontextprotocol/subscriptionId": optional(RequestId)
  }),
  [Schema.Record(Schema.String, Schema.Json)]
)
export const NotificationParams = Schema.Struct({ _meta: optional(NotificationMetaObject) })

export const ResultMetaObject = Schema.StructWithRest(
  Schema.Struct({
    "io.modelcontextprotocol/serverInfo": Implementation
  }),
  [Schema.Record(Schema.String, Schema.Json)]
)
export const ResultMeta = {
  _meta: ResultMetaObject,
  resultType: Schema.Literal("complete")
}
export const Result = Schema.StructWithRest(
  Schema.Struct(ResultMeta),
  [Schema.Record(Schema.String, Schema.Json)]
)
export const EmptyResult = Result

export const McpError = Schema.Struct({
  code: Schema.Int,
  message: Schema.String,
  data: optional(Schema.Json)
})
export type McpError = typeof McpError.Type

export const PARSE_ERROR = -32700
export const INVALID_REQUEST = -32600
export const METHOD_NOT_FOUND = -32601
export const INVALID_PARAMS = -32602
export const INTERNAL_ERROR = -32603
export const HEADER_MISMATCH = -32020
export const MISSING_REQUIRED_CLIENT_CAPABILITY = -32021
export const UNSUPPORTED_PROTOCOL_VERSION = -32022

const error = (code: number) =>
  Schema.Struct({
    code: Schema.Literal(code),
    message: Schema.String,
    data: optional(Schema.Json)
  })

export const ParseError = error(PARSE_ERROR)
export const InvalidRequestError = error(INVALID_REQUEST)
export const MethodNotFoundError = error(METHOD_NOT_FOUND)
export const InvalidParamsError = error(INVALID_PARAMS)
export const InternalError = error(INTERNAL_ERROR)
export const HeaderMismatchError = error(HEADER_MISMATCH)
export const UnsupportedProtocolVersionError = Schema.Struct({
  code: Schema.Literal(UNSUPPORTED_PROTOCOL_VERSION),
  message: Schema.String,
  data: Schema.Struct({
    supported: Schema.Array(Schema.String),
    requested: Schema.String
  })
})
export const MissingRequiredClientCapabilityError = Schema.Struct({
  code: Schema.Literal(MISSING_REQUIRED_CLIENT_CAPABILITY),
  message: Schema.String,
  data: Schema.Struct({ requiredCapabilities: ClientCapabilities })
})

export const Annotations = Previous.Annotations

export const Resource = Schema.Struct({
  ...Previous.Resource.fields,
  size: optional(Schema.Int),
  annotations: optional(Annotations)
})

export const ResourceTemplate = Previous.ResourceTemplate
export const TextResourceContents = Previous.TextResourceContents
export const BlobResourceContents = Previous.BlobResourceContents
export const ResourceContents = Previous.ResourceContents
export const TextContent = Previous.TextContent
export const ImageContent = Previous.ImageContent
export const AudioContent = Previous.AudioContent
export const ResourceLink = Schema.Struct({ ...Resource.fields, type: Schema.Literal("resource_link") })
export const EmbeddedResource = Previous.EmbeddedResource
export const ContentBlock = Schema.Union([
  TextContent,
  ImageContent,
  AudioContent,
  ResourceLink,
  EmbeddedResource
])

export const PromptArgument = Previous.PromptArgument
export const Prompt = Previous.Prompt
export const PromptMessage = Schema.Struct({ role: Role, content: ContentBlock })

const ToolInputSchema = Schema.StructWithRest(
  Schema.Struct({
    $schema: optional(Schema.String),
    type: Schema.Literal("object")
  }),
  [Schema.Record(Schema.String, Schema.Json)]
)
const ToolOutputSchema = Schema.StructWithRest(
  Schema.Struct({ $schema: optional(Schema.String) }),
  [Schema.Record(Schema.String, Schema.Json)]
)
export const ToolAnnotations = Previous.ToolAnnotations
export const Tool = Schema.Struct({
  ...Previous.Tool.fields,
  inputSchema: ToolInputSchema,
  outputSchema: optional(ToolOutputSchema),
  annotations: optional(ToolAnnotations)
})

export const ToolUseContent = Previous.ToolUseContent
export const ToolResultContent = Schema.Struct({
  type: Schema.Literal("tool_result"),
  toolUseId: Schema.String,
  content: Schema.Array(ContentBlock),
  structuredContent: optional(Schema.Json),
  isError: optional(Schema.Boolean),
  _meta: Meta
})
export const SamplingMessageContentBlock = Schema.Union([
  TextContent,
  ImageContent,
  AudioContent,
  ToolUseContent,
  ToolResultContent
])
export const SamplingMessage = Schema.Struct({
  role: Role,
  content: Schema.Union([SamplingMessageContentBlock, Schema.Array(SamplingMessageContentBlock)]),
  _meta: Meta
})
export const ModelHint = Schema.StructWithRest(
  Schema.Struct({ name: optional(Schema.String) }),
  [Schema.Record(Schema.String, Schema.Json)]
)
const ModelPriority = Schema.Finite.check(Schema.isBetween({ minimum: 0, maximum: 1 }))
export const ModelPreferences = Schema.Struct({
  ...Previous.ModelPreferences.fields,
  hints: optional(Schema.Array(ModelHint)),
  costPriority: optional(ModelPriority),
  speedPriority: optional(ModelPriority),
  intelligencePriority: optional(ModelPriority)
})
export const ToolChoice = Previous.ToolChoice
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
    metadata: optional(JsonObject),
    tools: optional(Schema.Array(Tool)),
    toolChoice: optional(ToolChoice)
  })
})
export const CreateMessageResult = Schema.Struct({
  ...SamplingMessage.fields,
  model: Schema.String,
  stopReason: optional(Schema.String)
})

export const Root = Previous.Root
export const ListRootsRequest = Schema.Struct({
  method: Schema.Literal("roots/list"),
  params: optional(Schema.Struct({ _meta: Meta }))
})
export const ListRootsResult = Schema.Struct({ roots: Schema.Array(Root) })

export const StringSchema = Previous.StringSchema
export const NumberSchema = Previous.NumberSchema
export const BooleanSchema = Previous.BooleanSchema
export const UntitledSingleSelectEnumSchema = Previous.UntitledSingleSelectEnumSchema
export const TitledSingleSelectEnumSchema = Previous.TitledSingleSelectEnumSchema
export const SingleSelectEnumSchema = Previous.SingleSelectEnumSchema
export const UntitledMultiSelectEnumSchema = Previous.UntitledMultiSelectEnumSchema
export const TitledMultiSelectEnumSchema = Previous.TitledMultiSelectEnumSchema
export const MultiSelectEnumSchema = Previous.MultiSelectEnumSchema
export const LegacyTitledEnumSchema = Previous.LegacyTitledEnumSchema
export const EnumSchema = Schema.Union([
  LegacyTitledEnumSchema,
  SingleSelectEnumSchema,
  MultiSelectEnumSchema
])
export const PrimitiveSchemaDefinition = Schema.Union([
  StringSchema,
  NumberSchema,
  BooleanSchema,
  EnumSchema
])
export const RequestedSchema = Schema.Struct({
  $schema: optional(Schema.String),
  type: Schema.Literal("object"),
  properties: Schema.Record(Schema.String, PrimitiveSchemaDefinition),
  required: optional(Schema.Array(Schema.String))
})
export const ElicitRequestFormParams = Schema.Struct({
  mode: optional(Schema.Literal("form")),
  message: Schema.String,
  requestedSchema: RequestedSchema
})
export const ElicitRequestURLParams = Schema.Struct({
  mode: Schema.Literal("url"),
  message: Schema.String,
  url: Schema.String
})
export const ElicitRequestParams = Schema.Union([ElicitRequestFormParams, ElicitRequestURLParams])
export const ElicitRequest = Schema.Struct({
  method: Schema.Literal("elicitation/create"),
  params: ElicitRequestParams
})
export const ElicitResult = Schema.Struct({
  action: Schema.Literals(["accept", "decline", "cancel"]),
  content: optional(Schema.Record(
    Schema.String,
    Schema.Union([Schema.String, Schema.Finite, Schema.Boolean, Schema.Array(Schema.String)])
  ))
})

export const InputRequest = Schema.Union([CreateMessageRequest, ListRootsRequest, ElicitRequest])
export const InputResponse = Schema.Union([CreateMessageResult, ListRootsResult, ElicitResult])
export const InputRequests = Schema.Record(Schema.String, InputRequest)
export const InputResponses = Schema.Record(Schema.String, InputResponse)
const InputRequiredResultMeta = {
  _meta: ResultMetaObject,
  resultType: Schema.Literal("input_required")
}
export const InputRequiredResult = Schema.Union([
  Schema.StructWithRest(
    Schema.Struct({
      ...InputRequiredResultMeta,
      inputRequests: InputRequests,
      requestState: optional(Schema.String)
    }),
    [Schema.Record(Schema.String, Schema.Json)]
  ),
  Schema.StructWithRest(
    Schema.Struct({
      ...InputRequiredResultMeta,
      inputRequests: optional(InputRequests),
      requestState: Schema.String
    }),
    [Schema.Record(Schema.String, Schema.Json)]
  )
])
export const InputResponseRequestParams = {
  ...RequestParams.fields,
  inputResponses: optional(InputResponses),
  requestState: optional(Schema.String)
}

export const CacheableResult = {
  ...ResultMeta,
  ttlMs: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  cacheScope: Schema.Literals(["public", "private"])
}
export const PaginatedRequestParams = {
  ...RequestParams.fields,
  cursor: optional(Schema.String)
}
export const PaginatedResult = {
  ...ResultMeta,
  nextCursor: optional(Schema.String)
}

export const DiscoverResult = Schema.StructWithRest(
  Schema.Struct({
    ...CacheableResult,
    supportedVersions: Schema.Array(Schema.String),
    capabilities: ServerCapabilities,
    instructions: optional(Schema.String)
  }),
  [Schema.Record(Schema.String, Schema.Json)]
)
export class Discover extends Rpc.make("server/discover", {
  success: DiscoverResult,
  error: McpError,
  payload: RequestParams
}) {}

export const ListResourcesResult = Schema.StructWithRest(
  Schema.Struct({
    ...PaginatedResult,
    ...CacheableResult,
    resources: Schema.Array(Resource)
  }),
  [Schema.Record(Schema.String, Schema.Json)]
)
export class ListResources extends Rpc.make("resources/list", {
  success: ListResourcesResult,
  error: McpError,
  payload: PaginatedRequestParams
}) {}

export const ListResourceTemplatesResult = Schema.StructWithRest(
  Schema.Struct({
    ...PaginatedResult,
    ...CacheableResult,
    resourceTemplates: Schema.Array(ResourceTemplate)
  }),
  [Schema.Record(Schema.String, Schema.Json)]
)
export class ListResourceTemplates extends Rpc.make("resources/templates/list", {
  success: ListResourceTemplatesResult,
  error: McpError,
  payload: PaginatedRequestParams
}) {}

export const ReadResourceResult = Schema.StructWithRest(
  Schema.Struct({
    ...CacheableResult,
    contents: Schema.Array(ResourceContents)
  }),
  [Schema.Record(Schema.String, Schema.Json)]
)
export class ReadResource extends Rpc.make("resources/read", {
  success: Schema.Union([ReadResourceResult, InputRequiredResult]),
  error: McpError,
  payload: { ...InputResponseRequestParams, uri: Schema.String }
}) {}

export const ListPromptsResult = Schema.StructWithRest(
  Schema.Struct({
    ...PaginatedResult,
    ...CacheableResult,
    prompts: Schema.Array(Prompt)
  }),
  [Schema.Record(Schema.String, Schema.Json)]
)
export class ListPrompts extends Rpc.make("prompts/list", {
  success: ListPromptsResult,
  error: McpError,
  payload: PaginatedRequestParams
}) {}

export const GetPromptResult = Schema.StructWithRest(
  Schema.Struct({
    ...ResultMeta,
    description: optional(Schema.String),
    messages: Schema.Array(PromptMessage)
  }),
  [Schema.Record(Schema.String, Schema.Json)]
)
export class GetPrompt extends Rpc.make("prompts/get", {
  success: Schema.Union([GetPromptResult, InputRequiredResult]),
  error: McpError,
  payload: {
    ...InputResponseRequestParams,
    name: Schema.String,
    arguments: optional(Schema.Record(Schema.String, Schema.String))
  }
}) {}

export const ListToolsResult = Schema.StructWithRest(
  Schema.Struct({
    ...PaginatedResult,
    ...CacheableResult,
    tools: Schema.Array(Tool)
  }),
  [Schema.Record(Schema.String, Schema.Json)]
)
export class ListTools extends Rpc.make("tools/list", {
  success: ListToolsResult,
  error: McpError,
  payload: PaginatedRequestParams
}) {}

export const CallToolResult = Schema.StructWithRest(
  Schema.Struct({
    ...ResultMeta,
    content: Schema.Array(ContentBlock),
    structuredContent: optional(Schema.Json),
    isError: optional(Schema.Boolean)
  }),
  [Schema.Record(Schema.String, Schema.Json)]
)
export class CallTool extends Rpc.make("tools/call", {
  success: Schema.Union([CallToolResult, InputRequiredResult]),
  error: McpError,
  payload: {
    ...InputResponseRequestParams,
    name: Schema.String,
    arguments: optional(JsonObject)
  }
}) {}

export const PromptReference = Previous.PromptReference
export const ResourceTemplateReference = Previous.ResourceTemplateReference
export const CompleteResult = Schema.StructWithRest(
  Schema.Struct({
    ...ResultMeta,
    completion: Schema.Struct({
      values: Schema.Array(Schema.String).check(Schema.isMaxLength(100)),
      total: optional(Schema.Int),
      hasMore: optional(Schema.Boolean)
    })
  }),
  [Schema.Record(Schema.String, Schema.Json)]
)
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

export const SubscriptionFilter = Schema.Struct({
  toolsListChanged: optional(Schema.Boolean),
  promptsListChanged: optional(Schema.Boolean),
  resourcesListChanged: optional(Schema.Boolean),
  resourceSubscriptions: optional(Schema.Array(Schema.String))
})
export const SubscriptionsListenResultMetaObject = Schema.StructWithRest(
  Schema.Struct({
    "io.modelcontextprotocol/serverInfo": Implementation,
    "io.modelcontextprotocol/subscriptionId": RequestId
  }),
  [Schema.Record(Schema.String, Schema.Json)]
)
export const SubscriptionsListenResult = Schema.StructWithRest(
  Schema.Struct({
    _meta: SubscriptionsListenResultMetaObject,
    resultType: Schema.Literal("complete")
  }),
  [Schema.Record(Schema.String, Schema.Json)]
)
export class SubscriptionsListen extends Rpc.make("subscriptions/listen", {
  success: SubscriptionsListenResult,
  error: McpError,
  payload: { ...RequestParams.fields, notifications: SubscriptionFilter }
}) {}

export class CancelledNotification extends Rpc.make("notifications/cancelled", {
  payload: {
    ...NotificationParams.fields,
    requestId: RequestId,
    reason: optional(Schema.String)
  }
}) {}
export class ProgressNotification extends Rpc.make("notifications/progress", {
  payload: {
    ...NotificationParams.fields,
    progressToken: ProgressToken,
    progress: Schema.Finite,
    total: optional(Schema.Finite),
    message: optional(Schema.String)
  }
}) {}
export class LoggingMessageNotification extends Rpc.make("notifications/message", {
  payload: {
    ...NotificationParams.fields,
    level: LoggingLevel,
    logger: optional(Schema.String),
    data: Schema.Json
  }
}) {}
export class ResourceUpdatedNotification extends Rpc.make("notifications/resources/updated", {
  payload: { ...NotificationParams.fields, uri: Schema.String }
}) {}
export class ResourceListChangedNotification extends Rpc.make("notifications/resources/list_changed", {
  payload: Schema.UndefinedOr(NotificationParams)
}) {}
export class ToolListChangedNotification extends Rpc.make("notifications/tools/list_changed", {
  payload: Schema.UndefinedOr(NotificationParams)
}) {}
export class PromptListChangedNotification extends Rpc.make("notifications/prompts/list_changed", {
  payload: Schema.UndefinedOr(NotificationParams)
}) {}
export class SubscriptionsAcknowledgedNotification extends Rpc.make(
  "notifications/subscriptions/acknowledged",
  { payload: { ...NotificationParams.fields, notifications: SubscriptionFilter } }
) {}

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

export class ClientNotificationRpcs extends RpcGroup.make(CancelledNotification) {}
export class ClientRpcs extends ClientRequestRpcs.merge(ClientNotificationRpcs) {}

// In v2026-07-28 these requests are embedded in InputRequiredResult rather than
// being sent as independent JSON-RPC requests.
export class ServerRequestRpcs extends RpcGroup.make() {}

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
