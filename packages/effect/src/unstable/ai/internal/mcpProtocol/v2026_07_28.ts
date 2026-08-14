/**
 * MCP v2026-07-28 wire projections.
 *
 * @internal
 */
import * as Effect from "../../../../Effect.ts"
import * as Encoding from "../../../../Encoding.ts"
import * as Match from "../../../../Match.ts"
import * as Schema from "../../../../Schema.ts"
import * as PublicMcpSchema from "../../McpSchema.ts"
import * as McpCore from "../mcpCore.ts"
import * as McpProtocol from "../mcpProtocol.ts"
import * as McpSchema from "../mcpSchema/v2026_07_28.ts"

const JsonObject = Schema.Record(Schema.String, Schema.Json)
const InputResponses = Schema.Record(Schema.String, JsonObject)
const decodeRequestMetadata = Schema.decodeUnknownEffect(McpSchema.RequestMetaObject)

type ObjectWithUndefined = Readonly<Record<string, unknown>>

const omitUndefined = (value: ObjectWithUndefined): Record<string, unknown> => {
  const result: Record<string, unknown> = {}
  for (const key in value) {
    if (value[key] !== undefined) {
      result[key] = value[key]
    }
  }
  return result
}

/** @internal */
export interface StatelessRequestProfile {
  readonly protocolVersion: typeof McpSchema.protocolVersion
  readonly clientCapabilities: typeof McpSchema.ClientCapabilities.Type
  readonly clientInfo?: typeof McpSchema.Implementation.Type | undefined
  readonly requestMetadata: typeof McpSchema.RequestMetaObject.Type
}

export const profileFromRequestMetadata = Effect.fnUntraced(function*(metadata: unknown) {
  const requestMetadata = yield* decodeRequestMetadata(metadata)
  return {
    protocolVersion: McpSchema.protocolVersion,
    clientCapabilities: requestMetadata["io.modelcontextprotocol/clientCapabilities"],
    clientInfo: requestMetadata["io.modelcontextprotocol/clientInfo"],
    requestMetadata
  } satisfies StatelessRequestProfile
})

const resultMetadata = (
  value: ObjectWithUndefined,
  serverInfo: Schema.JsonObject
): Schema.JsonObject => {
  const metadata: unknown = value._meta
  return {
    ...(Schema.is(JsonObject)(metadata) ? metadata : {}),
    "io.modelcontextprotocol/serverInfo": serverInfo
  }
}

const decodeCallToolOutcome = Schema.decodeUnknownEffect(Schema.Union([
  McpSchema.CallToolResult,
  McpSchema.InputRequiredResult
]))

export const projectCallToolOutcome = Effect.fnUntraced(function*(
  outcome: McpCore.OperationOutcome<ObjectWithUndefined>,
  serverInfo: typeof McpSchema.Implementation.Type
) {
  const encodedServerInfo = yield* Schema.encodeEffect(McpSchema.Implementation)(serverInfo)
  if (outcome._tag === "Complete") {
    return yield* decodeCallToolOutcome({
      ...omitUndefined(outcome.value),
      _meta: resultMetadata(outcome.value, encodedServerInfo),
      resultType: "complete"
    })
  }
  return yield* decodeCallToolOutcome({
    _meta: { "io.modelcontextprotocol/serverInfo": encodedServerInfo },
    resultType: "input_required",
    ...(outcome.inputRequests === undefined ? {} : { inputRequests: outcome.inputRequests }),
    ...(outcome.requestState === undefined ? {} : { requestState: outcome.requestState })
  })
})

const projectContent = Effect.fnUntraced(function*(content: typeof PublicMcpSchema.ContentBlock.Type) {
  return Match.value(content).pipe(
    Match.when({ type: Match.is("text", "resource_link") }, (content) => content),
    Match.when({ type: Match.is("image", "audio") }, (content) =>
      omitUndefined({
        type: content.type,
        mimeType: content.mimeType,
        data: Encoding.encodeBase64(content.data),
        annotations: content.annotations,
        _meta: content._meta
      })),
    Match.when({ type: "resource" }, (content) => {
      const resource = content.resource
      if ("text" in resource) {
        return omitUndefined({
          type: "resource",
          resource: omitUndefined({
            uri: resource.uri,
            mimeType: resource.mimeType,
            _meta: resource._meta,
            text: resource.text
          }),
          annotations: content.annotations,
          _meta: content._meta
        })
      }
      return omitUndefined({
        type: "resource",
        resource: omitUndefined({
          uri: resource.uri,
          mimeType: resource.mimeType,
          _meta: resource._meta,
          blob: Encoding.encodeBase64(resource.blob)
        }),
        annotations: content.annotations,
        _meta: content._meta
      })
    }),
    Match.exhaustive
  )
})

const projectResource = (resource: PublicMcpSchema.Resource) => McpSchema.Resource.make(resource)
const projectResourceTemplate = (resourceTemplate: PublicMcpSchema.ResourceTemplate) =>
  McpSchema.ResourceTemplate.make(resourceTemplate)

const projectPrompt = (prompt: PublicMcpSchema.Prompt) =>
  McpProtocol.transcode(PublicMcpSchema.Prompt, McpSchema.Prompt, prompt)

const projectTool = (tool: PublicMcpSchema.Tool) => McpProtocol.transcode(PublicMcpSchema.Tool, McpSchema.Tool, tool)

const privateStaleCache = {
  ttlMs: 0,
  cacheScope: "private"
} satisfies { readonly ttlMs: number; readonly cacheScope: "private" }

const projectCompleteResult = Effect.fnUntraced(function*(
  value: ObjectWithUndefined,
  serverInfo: typeof McpSchema.Implementation.Type
) {
  const encodedServerInfo = yield* Schema.encodeEffect(McpSchema.Implementation)(serverInfo)
  return {
    ...omitUndefined(value),
    _meta: resultMetadata(value, encodedServerInfo),
    resultType: "complete"
  }
})

/** @internal */
export const projectError = (error: unknown): typeof McpSchema.McpError.Type => {
  let protocolError: McpProtocol.ProtocolError
  if (error instanceof McpCore.ResourceNotFound) {
    protocolError = new McpProtocol.ProtocolError({
      code: McpSchema.INVALID_PARAMS,
      message: `Resource '${error.uri}' not found`
    })
  } else if (error instanceof McpCore.ToolResultProjectionError) {
    protocolError = new McpProtocol.ProtocolError({
      code: McpSchema.INTERNAL_ERROR,
      message: error.message
    })
  } else if (
    error instanceof McpCore.ToolNotFound ||
    error instanceof McpCore.InvalidToolInput ||
    error instanceof McpCore.ToolExecutionError ||
    error instanceof McpCore.UnsupportedByProtocol
  ) {
    protocolError = McpProtocol.ProtocolError.fromTool(error)
  } else {
    protocolError = McpProtocol.ProtocolError.fromFeature(error)
  }
  return McpSchema.McpError.make({
    code: protocolError.code,
    message: protocolError.message,
    ...(Schema.is(Schema.Json)(protocolError.data) ? { data: protocolError.data } : {})
  })
}

export const normalizeCancellation = (payload: unknown) =>
  Schema.decodeUnknownEffect(McpSchema.CancelledNotification.payloadSchema)(payload).pipe(
    Effect.map((request) => ({
      requestId: request.requestId,
      reason: request.reason,
      metadata: request._meta
    }))
  )

const unsupported = (
  operation: PublicMcpSchema.McpReverseOperationUnsupported["operation"]
): PublicMcpSchema.McpReverseOperationUnsupported =>
  new PublicMcpSchema.McpReverseOperationUnsupported({
    operation,
    protocolVersion: McpSchema.protocolVersion,
    reason: "MCP 2026-07-28 carries server input requests in multi round-trip results"
  })

/** @internal */
export interface ServerDiscoveryContext {
  readonly supportedVersions: ReadonlyArray<string>
  readonly capabilities: typeof McpSchema.ServerCapabilities.Type
  readonly serverInfo: typeof McpSchema.Implementation.Type
}

/** @internal */
export const handlerRpcs = McpSchema.ClientRequestRpcs.merge(McpSchema.ClientNotificationRpcs)

export const makeHandlers = (
  core: McpCore.McpCore,
  _lifecycle: McpProtocol.LifecycleRuntime | undefined,
  context: McpProtocol.HandlerInstallationContext
) => {
  const discovery: ServerDiscoveryContext = {
    supportedVersions: context.supportedVersions,
    capabilities: {
      completions: {},
      logging: {},
      ...(context.registrationPresence.tools ? { tools: { listChanged: false } } : {}),
      ...(context.registrationPresence.resources ? { resources: { listChanged: false, subscribe: false } } : {}),
      ...(context.registrationPresence.prompts ? { prompts: { listChanged: false } } : {})
    },
    serverInfo: context.serverInfo
  }
  const getInvocation = PublicMcpSchema.McpRequestContext.useSync(
    McpProtocol.invocationFromRequestContext
  )
  const getInputInvocation = Effect.fnUntraced(function*(
    request: Pick<typeof McpSchema.CallTool.payloadSchema.Type, "inputResponses" | "requestState">
  ) {
    const context = yield* PublicMcpSchema.McpRequestContext
    const inputResponses = request.inputResponses === undefined
      ? undefined
      // The RPC payload already validated the dated response union; this decode only erases it into canonical JSON.
      : yield* Schema.decodeUnknownEffect(InputResponses)(request.inputResponses).pipe(Effect.orDie)
    return McpProtocol.invocationFromRequestContext(PublicMcpSchema.McpRequestContext.of({
      ...context,
      inputResponses,
      requestState: request.requestState
    }))
  })
  return ({
    "server/discover": Effect.fnUntraced(function*(
      _request: typeof McpSchema.Discover.payloadSchema.Type
    ) {
      const result = yield* projectCompleteResult({
        ...privateStaleCache,
        supportedVersions: Array.from(discovery.supportedVersions),
        capabilities: discovery.capabilities
      }, discovery.serverInfo)
      return yield* Schema.decodeUnknownEffect(McpSchema.DiscoverResult)(result)
    }, Effect.mapError(projectError)),
    "resources/list": Effect.fnUntraced(function*(
      _request: typeof McpSchema.ListResources.payloadSchema.Type
    ) {
      const invocation = yield* getInvocation
      const resources = yield* core.resources.list(invocation.protocol)
      const result = yield* projectCompleteResult({
        ...privateStaleCache,
        resources: resources.map(projectResource)
      }, discovery.serverInfo)
      return yield* Schema.decodeUnknownEffect(McpSchema.ListResourcesResult)(result)
    }, Effect.mapError(projectError)),
    "resources/templates/list": Effect.fnUntraced(function*(
      _request: typeof McpSchema.ListResourceTemplates.payloadSchema.Type
    ) {
      const invocation = yield* getInvocation
      const resourceTemplates = yield* core.resources.listTemplates(invocation.protocol)
      const result = yield* projectCompleteResult({
        ...privateStaleCache,
        resourceTemplates: resourceTemplates.map(projectResourceTemplate)
      }, discovery.serverInfo)
      return yield* Schema.decodeUnknownEffect(McpSchema.ListResourceTemplatesResult)(result)
    }, Effect.mapError(projectError)),
    "resources/read": Effect.fnUntraced(function*(
      { uri }: typeof McpSchema.ReadResource.payloadSchema.Type
    ) {
      const invocation = yield* getInvocation
      const read = yield* core.resources.read(uri, invocation)
      const contents = read.contents.map((content) =>
        "text" in content
          ? omitUndefined({
            uri: content.uri,
            mimeType: content.mimeType,
            _meta: content._meta,
            text: content.text
          })
          : omitUndefined({
            uri: content.uri,
            mimeType: content.mimeType,
            _meta: content._meta,
            blob: Encoding.encodeBase64(content.blob)
          })
      )
      const result = yield* projectCompleteResult({
        ...privateStaleCache,
        contents,
        _meta: read._meta
      }, discovery.serverInfo)
      return yield* Schema.decodeUnknownEffect(McpSchema.ReadResourceResult)(result)
    }, Effect.mapError(projectError)),
    "prompts/list": Effect.fnUntraced(function*(
      _request: typeof McpSchema.ListPrompts.payloadSchema.Type
    ) {
      const invocation = yield* getInvocation
      const prompts = yield* core.prompts.list(invocation.protocol)
      const projectedPrompts = yield* Effect.forEach(prompts, projectPrompt)
      const result = yield* projectCompleteResult({
        ...privateStaleCache,
        prompts: projectedPrompts
      }, discovery.serverInfo)
      return yield* Schema.decodeUnknownEffect(McpSchema.ListPromptsResult)(result)
    }, Effect.mapError(projectError)),
    "prompts/get": Effect.fnUntraced(function*(
      { arguments: args, name }: typeof McpSchema.GetPrompt.payloadSchema.Type
    ) {
      const invocation = yield* getInvocation
      const prompt = yield* core.prompts.get(name, args ?? {}, invocation)
      const messages = yield* Effect.forEach(prompt.messages, (message) =>
        projectContent(message.content).pipe(
          Effect.map((content) => ({ role: message.role, content }))
        ))
      const result = yield* projectCompleteResult({
        description: prompt.description,
        messages,
        _meta: prompt._meta
      }, discovery.serverInfo)
      return yield* Schema.decodeUnknownEffect(McpSchema.GetPromptResult)(result)
    }, Effect.mapError(projectError)),
    "completion/complete": Effect.fnUntraced(function*(
      request: typeof McpSchema.Complete.payloadSchema.Type
    ) {
      const invocation = yield* getInvocation
      const completion = yield* core.completions.complete({
        reference: request.ref.type === "ref/prompt"
          ? { type: "prompt", name: request.ref.name, title: request.ref.title }
          : { type: "resourceTemplate", uriTemplate: request.ref.uri },
        argument: request.argument,
        context: request.context?.arguments === undefined
          ? undefined
          : { arguments: request.context.arguments },
        metadata: request._meta
      }, invocation)
      const result = yield* projectCompleteResult({
        completion: omitUndefined({
          values: Array.from(completion.values),
          total: completion.total,
          hasMore: completion.hasMore
        }),
        _meta: completion.metadata
      }, discovery.serverInfo)
      return yield* Schema.decodeUnknownEffect(McpSchema.CompleteResult)(result)
    }, Effect.mapError(projectError)),
    "tools/list": Effect.fnUntraced(function*(
      _request: typeof McpSchema.ListTools.payloadSchema.Type
    ) {
      const invocation = yield* getInvocation
      const tools = yield* core.tools.list(invocation.protocol)
      const projectedTools = yield* Effect.forEach(tools, projectTool)
      const result = yield* projectCompleteResult({
        ...privateStaleCache,
        tools: projectedTools
      }, discovery.serverInfo)
      return yield* Schema.decodeUnknownEffect(McpSchema.ListToolsResult)(result)
    }, Effect.mapError(projectError)),
    "tools/call": Effect.fnUntraced(function*(request: typeof McpSchema.CallTool.payloadSchema.Type) {
      const invocation = yield* getInputInvocation(request)
      const outcome = yield* core.tools.call({ name: request.name, arguments: request.arguments ?? {} }, invocation)
        .pipe(
          Effect.catchTags({
            InvalidToolInput: (error) =>
              Effect.succeed(McpCore.OperationOutcome.Complete(PublicMcpSchema.CallToolResult.make({
                content: [PublicMcpSchema.TextContent.make({ type: "text", text: error.message })],
                isError: true
              }))),
            ToolExecutionError: (error) =>
              Effect.succeed(McpCore.OperationOutcome.Complete(PublicMcpSchema.CallToolResult.make({
                content: [PublicMcpSchema.TextContent.make({ type: "text", text: error.message })],
                isError: true
              })))
          })
        )
      if (outcome._tag === "InputRequired") {
        return yield* projectCallToolOutcome(outcome, discovery.serverInfo)
      }
      const toolResult = outcome.value
      const content = yield* Effect.forEach(toolResult.content, projectContent)
      return yield* projectCallToolOutcome(
        McpCore.OperationOutcome.Complete({
          content,
          structuredContent: toolResult.structuredContent,
          isError: toolResult.isError,
          _meta: toolResult._meta
        }),
        discovery.serverInfo
      )
    }, Effect.mapError(projectError)),
    "notifications/cancelled": Effect.fnUntraced(function*(
      _request: typeof McpSchema.CancelledNotification.payloadSchema.Type
    ) {
      return yield* Effect.void
    })
  })
}

const runtime = {
  _tag: "Stateless",
  transport: {
    jsonRpc: { acceptsBatches: false },
    http: {}
  },
  profileFromRequestMetadata
} as const

export const protocol = McpProtocol.make({
  protocolVersion: McpSchema.protocolVersion,
  runtime,
  clientRpcs: McpSchema.ClientRpcs,
  clientNotificationRpcs: McpSchema.ClientNotificationRpcs,
  serverRequestRpcs: McpSchema.ServerRequestRpcs,
  serverNotificationRpcs: McpSchema.ServerNotificationRpcs,
  handlerRpcs,
  makeHandlers,
  toReverseClient: () => ({
    listRoots: () => Effect.fail(unsupported("roots/list")),
    createMessage: () => Effect.fail(unsupported("sampling/createMessage")),
    elicit: () => Effect.fail(unsupported("elicitation/create"))
  }),
  // TODO: Route change notifications through subscriptions/listen before
  // advertising them. The runtime must filter each subscription and add its
  // subscription ID to notification _meta before transport delivery.
  projectNotification: (notification) =>
    McpProtocol.makeNotificationProjector({
      supportsProgressMessage: true
    }, notification),
  normalizeCancellation
})
