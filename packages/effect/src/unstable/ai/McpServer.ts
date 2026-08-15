/**
 * Builds Model Context Protocol (MCP) servers with Effect.
 *
 * The `McpServer` service stores the tools, resources, resource templates,
 * prompts, completions, and outgoing notifications exposed by a server. This
 * module also includes the server runner, custom protocol,
 * stdio, and HTTP layers, registration helpers, and APIs that let handlers ask
 * the connected client for structured input or read its advertised
 * capabilities.
 *
 * @since 4.0.0
 */
import * as Arr from "../../Array.ts"
import * as Cause from "../../Cause.ts"
import * as Context from "../../Context.ts"
import * as Data from "../../Data.ts"
import * as Effect from "../../Effect.ts"
import * as Exit from "../../Exit.ts"
import * as Fiber from "../../Fiber.ts"
import * as Layer from "../../Layer.ts"
import * as Option from "../../Option.ts"
import * as Predicate from "../../Predicate.ts"
import * as PubSub from "../../PubSub.ts"
import * as Queue from "../../Queue.ts"
import * as RcMap from "../../RcMap.ts"
import { CurrentLogLevel } from "../../References.ts"
import * as Result from "../../Result.ts"
import * as Schema from "../../Schema.ts"
import * as SchemaAST from "../../SchemaAST.ts"
import * as Sink from "../../Sink.ts"
import type { Stdio } from "../../Stdio.ts"
import * as Stream from "../../Stream.ts"
import * as FindMyWay from "../http/FindMyWay.ts"
import * as Headers from "../http/Headers.ts"
import { appendPreResponseHandlerUnsafe } from "../http/HttpEffect.ts"
import * as HttpRouter from "../http/HttpRouter.ts"
import * as HttpServerRequest from "../http/HttpServerRequest.ts"
import * as HttpServerResponse from "../http/HttpServerResponse.ts"
import * as Rpc from "../rpc/Rpc.ts"
import * as RpcClient from "../rpc/RpcClient.ts"
import type * as RpcGroup from "../rpc/RpcGroup.ts"
import * as RpcMessage from "../rpc/RpcMessage.ts"
import * as RpcSerialization from "../rpc/RpcSerialization.ts"
import * as RpcServer from "../rpc/RpcServer.ts"
import * as AiError from "./AiError.ts"
import * as McpCore from "./internal/mcpCore.ts"
import * as McpProtocolInternal from "./internal/mcpProtocol.ts"
import * as McpRuntime from "./internal/mcpRuntime.ts"
import type * as McpProtocol from "./McpProtocol.ts"
import * as McpSchema from "./McpSchema.ts"
import {
  CallToolResult,
  ElicitationDeclined,
  EnabledWhen,
  GetPromptResult,
  InternalError,
  InvalidParams,
  InvalidRequest,
  isParam,
  McpRequestContext,
  McpServerClient,
  McpServerClientMiddleware,
  MethodNotFound,
  Prompt,
  Resource,
  ResourceTemplate,
  ServerNotificationRpcs,
  TextContent,
  Tool as McpTool,
  ToolJsonSchema
} from "./McpSchema.ts"
import type {
  CallTool,
  ClientCapabilities,
  Complete,
  CompleteResult,
  GetPrompt,
  McpErrorBase,
  Param,
  PromptArgument,
  PromptMessage,
  ReadResourceResult,
  ServerCapabilities
} from "./McpSchema.ts"
import * as Tool from "./Tool.ts"
import type * as Toolkit from "./Toolkit.ts"

type CompletionContext = typeof Complete.payloadSchema.Type["context"]

interface QueuedServerNotification {
  readonly notification: McpCore.ServerNotification
  readonly targetClientId?: number | undefined
}

const internalState = new WeakMap<object, {
  readonly core: McpCore.McpCore
  readonly notifications: Queue.Dequeue<QueuedServerNotification>
}>()
type ServerExtensions = NonNullable<typeof ServerCapabilities.Type["extensions"]>
type ServerNotificationRequest<
  R extends Rpc.Any = RpcGroup.Rpcs<typeof BroadcastServerNotificationRpcs>
> = R extends Rpc.Any ? RpcMessage.Request<R> : never

const BroadcastServerNotificationRpcs = ServerNotificationRpcs.omit("notifications/elicitation/complete")

/**
 * MCP models `structuredContent` as a JSON object, so a `null` or array
 * encoded result must be omitted rather than sent through as-is.
 */
const toStructuredContent = (value: unknown): Schema.JsonObject | undefined =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Schema.JsonObject
    : undefined

const validateStructuredContent = (
  toolName: string,
  value: unknown
): Effect.Effect<Schema.Json, McpCore.ToolResultProjectionError> =>
  Schema.is(Schema.Json)(value)
    ? Effect.succeed(value)
    : Effect.fail(
      new McpCore.ToolResultProjectionError({
        name: toolName,
        message: `Tool '${toolName}' returned structured content that is not valid JSON`
      })
    )

const toInternalServerNotification = (
  message: ServerNotificationRequest
): McpCore.ServerNotification | undefined => {
  switch (message.tag) {
    case "notifications/cancelled":
      return McpCore.ServerNotification.Cancelled({
        requestId: message.payload.requestId,
        reason: message.payload.reason,
        metadata: message.payload._meta
      })
    case "notifications/progress":
      return McpCore.ServerNotification.Progress({
        progressToken: message.payload.progressToken,
        progress: message.payload.progress,
        total: message.payload.total,
        message: message.payload.message,
        metadata: message.payload._meta
      })
    case "notifications/message":
      return McpCore.ServerNotification.LoggingMessage({
        level: message.payload.level,
        logger: message.payload.logger,
        data: message.payload.data,
        metadata: message.payload._meta
      })
    case "notifications/resources/updated":
      return McpCore.ServerNotification.ResourceUpdated({
        uri: message.payload.uri,
        metadata: message.payload._meta
      })
    case "notifications/resources/list_changed":
      return McpCore.ServerNotification.ResourcesChanged({ metadata: message.payload?._meta })
    case "notifications/tools/list_changed":
      return McpCore.ServerNotification.ToolsChanged({ metadata: message.payload?._meta })
    case "notifications/prompts/list_changed":
      return McpCore.ServerNotification.PromptsChanged({ metadata: message.payload?._meta })
    default:
      return undefined
  }
}

const provideInvocationContext = <A, E, R>(
  effect: Effect.Effect<A, E, R>,
  invocation: McpCore.McpInvocation
): Effect.Effect<A, E, Exclude<R, McpRequestContext | McpServerClient>> => {
  const provided = Effect.provideService(effect, McpRequestContext, invocation.requestContext)
  return (invocation.serverClient === undefined
    ? provided
    : Effect.provideService(provided, McpServerClient, invocation.serverClient)) as Effect.Effect<
      A,
      E,
      Exclude<R, McpRequestContext | McpServerClient>
    >
}

/**
 * Service that stores and serves an MCP server's registered tools, resources,
 * prompts, completions, and outgoing notifications.
 *
 * **Details**
 *
 * Handlers use this service to register capabilities and resolve incoming MCP
 * requests.
 *
 * @category services
 * @since 4.0.0
 */
export class McpServer extends Context.Service<McpServer, {
  readonly notifications: RpcClient.RpcClient<RpcGroup.Rpcs<typeof BroadcastServerNotificationRpcs>>
  readonly notifyElicitationComplete: (options: {
    readonly clientId: number
    readonly elicitationId: string
  }) => Effect.Effect<void>
  readonly tools: ReadonlyArray<{
    readonly tool: McpTool
    readonly annotations: Context.Context<never>
  }>
  readonly addTool: (options: {
    readonly tool: McpTool
    readonly annotations: Context.Context<never>
    readonly handle: (
      payload: any
    ) => Effect.Effect<
      CallToolResult | McpSchema.InputRequired,
      InternalError | InvalidParams,
      McpRequestContext | McpServerClient
    >
  }) => Effect.Effect<void>
  readonly callTool: (
    requests: typeof CallTool.payloadSchema.Type
  ) => Effect.Effect<CallToolResult, InternalError | InvalidParams, McpServerClient>

  readonly resources: ReadonlyArray<{
    readonly resource: Resource
    readonly annotations: Context.Context<never>
  }>
  readonly addResource: (options: {
    readonly resource: Resource
    readonly annotations: Context.Context<never>
    readonly handle: Effect.Effect<
      typeof ReadResourceResult.Type,
      InternalError,
      McpRequestContext | McpServerClient
    >
  }) => Effect.Effect<void>

  readonly resourceTemplates: ReadonlyArray<{
    readonly template: ResourceTemplate
    readonly annotations: Context.Context<never>
  }>
  readonly addResourceTemplate: (
    options: {
      readonly template: ResourceTemplate
      readonly annotations: Context.Context<never>
      readonly routerPath: string
      readonly completions: Record<
        string,
        (
          input: string,
          context: CompletionContext
        ) => Effect.Effect<CompleteResult, InternalError>
      >
      readonly handle: (
        uri: string,
        params: Array<string>
      ) => Effect.Effect<
        typeof ReadResourceResult.Type,
        InvalidParams | InternalError,
        McpRequestContext | McpServerClient
      >
    }
  ) => Effect.Effect<void>

  readonly findResource: (
    uri: string
  ) => Effect.Effect<typeof ReadResourceResult.Type, McpErrorBase | InvalidParams | InternalError, McpServerClient>

  readonly prompts: ReadonlyArray<{
    readonly prompt: Prompt
    readonly annotations: Context.Context<never>
  }>
  readonly addPrompt: (options: {
    readonly prompt: Prompt
    readonly annotations: Context.Context<never>
    readonly completions: Record<
      string,
      (
        input: string,
        context: CompletionContext
      ) => Effect.Effect<CompleteResult, InternalError, McpRequestContext | McpServerClient>
    >
    readonly handle: (
      params: Record<string, string>
    ) => Effect.Effect<GetPromptResult, InternalError | InvalidParams, McpRequestContext | McpServerClient>
  }) => Effect.Effect<void>
  readonly getPromptResult: (
    request: typeof GetPrompt.payloadSchema.Type
  ) => Effect.Effect<GetPromptResult, InternalError | InvalidParams, McpServerClient>

  readonly completion: (
    complete: typeof Complete.payloadSchema.Type
  ) => Effect.Effect<CompleteResult, InvalidParams | InternalError, McpServerClient>
}>()("effect/ai/McpServer") {
  /**
   * Builds an MCP server service from registered tools, prompts, resources, and completions.
   *
   * @since 4.0.0
   */
  static readonly make = Effect.gen(function*() {
    const internalCore = yield* McpCore.make
    const tools = Arr.empty<{
      readonly tool: McpTool
      readonly annotations: Context.Context<never>
    }>()
    const resources: Array<{
      readonly resource: Resource
      readonly annotations: Context.Context<never>
    }> = []
    const resourceTemplates: Array<{
      readonly template: ResourceTemplate
      readonly annotations: Context.Context<never>
    }> = []
    const prompts: Array<{
      readonly prompt: Prompt
      readonly annotations: Context.Context<never>
    }> = []
    const notificationsQueue = yield* Queue.make<QueuedServerNotification>()
    const listChangedHandles = new Map<string, any>()
    const notifications = yield* RpcClient.makeNoSerialization(BroadcastServerNotificationRpcs, {
      spanPrefix: "McpServer/Notifications",
      onFromClient: (options) =>
        Effect.suspend((): Effect.Effect<void> => {
          const message = options.message
          if (message._tag !== "Request") {
            return Effect.void
          }
          const notification = toInternalServerNotification(message)
          if (notification === undefined) {
            return Effect.void
          }
          if (message.tag.includes("list_changed")) {
            if (!listChangedHandles.has(message.tag)) {
              listChangedHandles.set(
                message.tag,
                setTimeout(() => {
                  Queue.offerUnsafe(notificationsQueue, { notification })
                  listChangedHandles.delete(message.tag)
                }, 0)
              )
            }
          } else {
            Queue.offerUnsafe(notificationsQueue, { notification })
          }
          return notifications.write({
            clientId: 0,
            requestId: message.id,
            _tag: "Exit",
            exit: Exit.void
          })
        })
    })

    const service = McpServer.of({
      notifications: notifications.client,
      notifyElicitationComplete: ({ clientId, elicitationId }) =>
        Queue.offer(notificationsQueue, {
          notification: McpCore.ServerNotification.ElicitationComplete({ elicitationId }),
          targetClientId: clientId
        }),
      get tools() {
        return tools
      },
      addTool: (options) =>
        Effect.gen(function*() {
          const existingIndex = tools.findIndex(({ tool }) => tool.name === options.tool.name)
          if (existingIndex === -1) {
            tools.push(options)
          } else {
            tools[existingIndex] = options
          }
          const enabledWhen = Context.getOrUndefined(options.annotations, EnabledWhen)
          yield* internalCore.tools.register({
            descriptor: new McpTool({
              ...options.tool,
              title: options.tool.title ?? options.tool.annotations?.title
            }),
            isVisible: (profile) =>
              enabledWhen === undefined || enabledWhen(
                {
                  protocolVersion: profile.protocolVersion,
                  capabilities: profile.clientCapabilities,
                  clientInfo: profile.clientInfo
                }
              ),
            handle: (call, invocation) =>
              provideInvocationContext(options.handle(call.arguments), invocation).pipe(
                Effect.catchTags({
                  InternalError: (error) =>
                    Effect.fail(
                      new McpCore.ToolExecutionError({
                        name: options.tool.name,
                        message: error.message
                      })
                    ),
                  InvalidParams: (error) =>
                    Effect.fail(
                      new McpCore.InvalidToolInput({
                        name: options.tool.name,
                        message: error.message
                      })
                    )
                }),
                Effect.flatMap((result) => {
                  if (Predicate.isTagged(result, "InputRequired")) {
                    return Effect.succeed(McpCore.OperationOutcome.InputRequired(result))
                  }
                  return (result.structuredContent === undefined
                    ? Effect.succeed(result)
                    : validateStructuredContent(options.tool.name, result.structuredContent).pipe(
                      Effect.as(result)
                    )).pipe(Effect.map(McpCore.OperationOutcome.Complete))
                })
              )
          })
          yield* notifications.client["notifications/tools/list_changed"]({})
        }),
      callTool: (request) =>
        Effect.gen(function*() {
          const client = yield* McpServerClient
          const result = yield* internalCore.tools.call(
            request,
            McpProtocolInternal.invocationFromClient(client)
          ).pipe(
            Effect.mapError((error) =>
              new InvalidParams({
                message: error._tag === "ToolNotFound"
                  ? `Tool '${error.name}' not found`
                  : error.message
              })
            )
          )
          if (result._tag === "InputRequired") {
            return yield* new InvalidParams({ message: "Client input is not supported by this MCP protocol" })
          }
          return result.value
        }),
      get resources() {
        return resources
      },
      get resourceTemplates() {
        return resourceTemplates
      },
      addResource: (options) =>
        Effect.gen(function*() {
          const existingIndex = resources.findIndex(({ resource }) => resource.uri === options.resource.uri)
          if (existingIndex === -1) {
            resources.push(options)
          } else {
            resources[existingIndex] = options
          }
          yield* internalCore.resources.register({
            descriptor: options.resource,
            isVisible: (profile) => {
              const enabledWhen = Context.getOrUndefined(options.annotations, EnabledWhen)
              return enabledWhen === undefined || enabledWhen({
                protocolVersion: profile.protocolVersion,
                capabilities: profile.clientCapabilities,
                clientInfo: profile.clientInfo
              })
            },
            read: (invocation) => provideInvocationContext(options.handle, invocation)
          })
          yield* notifications.client["notifications/resources/list_changed"]({})
        }),
      addResourceTemplate: ({ annotations, completions, handle, routerPath, template }) =>
        Effect.gen(function*() {
          const existingIndex = resourceTemplates.findIndex(({ template: current }) =>
            current.uriTemplate === template.uriTemplate
          )
          if (existingIndex === -1) {
            resourceTemplates.push({ template, annotations })
          } else {
            resourceTemplates[existingIndex] = { template, annotations }
          }
          const templateMatcher = makeUriMatcher<true>()
          templateMatcher.add(routerPath, true)
          yield* internalCore.resources.registerTemplate({
            descriptor: template,
            isVisible: (profile) => {
              const enabledWhen = Context.getOrUndefined(annotations, EnabledWhen)
              return enabledWhen === undefined || enabledWhen({
                protocolVersion: profile.protocolVersion,
                capabilities: profile.clientCapabilities,
                clientInfo: profile.clientInfo
              })
            },
            match: (uri) => {
              const match = templateMatcher.find(uri)
              if (match === undefined) {
                return undefined
              }
              const params: Array<string> = []
              for (const key of Object.keys(match.params)) {
                params[Number(key)] = match.params[key]!
              }
              return params
            },
            read: (uri, params, invocation) => provideInvocationContext(handle(uri, Array.from(params)), invocation)
          })
          for (const [param, handle] of Object.entries(completions)) {
            yield* internalCore.completions.register(
              `resource/${template.uriTemplate}/${param}`,
              (request) =>
                handle(request.argument.value, request.context).pipe(
                  Effect.map((result) => ({
                    values: result.completion.values,
                    total: result.completion.total,
                    hasMore: result.completion.hasMore,
                    metadata: result._meta
                  }))
                )
            )
          }
          yield* notifications.client["notifications/resources/list_changed"]({})
        }),
      findResource: (uri) =>
        Effect.gen(function*() {
          const client = yield* McpServerClient
          return yield* internalCore.resources.read(
            uri,
            McpProtocolInternal.invocationFromClient(client)
          ).pipe(
            Effect.catchTag("ResourceNotFound", (error) =>
              Effect.fail(new InvalidParams({ message: `Resource '${error.uri}' not found` })))
          )
        }),
      get prompts() {
        return prompts
      },
      addPrompt: (options) =>
        Effect.gen(function*() {
          const existingIndex = prompts.findIndex(({ prompt }) => prompt.name === options.prompt.name)
          if (existingIndex === -1) {
            prompts.push(options)
          } else {
            prompts[existingIndex] = options
          }
          yield* internalCore.prompts.register({
            descriptor: options.prompt,
            isVisible: (profile) => {
              const enabledWhen = Context.getOrUndefined(options.annotations, EnabledWhen)
              return enabledWhen === undefined || enabledWhen({
                protocolVersion: profile.protocolVersion,
                capabilities: profile.clientCapabilities,
                clientInfo: profile.clientInfo
              })
            },
            get: (params, invocation) => provideInvocationContext(options.handle(params), invocation)
          })
          for (const [param, handle] of Object.entries(options.completions)) {
            yield* internalCore.completions.register(
              `prompt/${options.prompt.name}/${param}`,
              (request, invocation) =>
                provideInvocationContext(handle(request.argument.value, request.context), invocation).pipe(
                  Effect.map((result) => ({
                    values: result.completion.values,
                    total: result.completion.total,
                    hasMore: result.completion.hasMore,
                    metadata: result._meta
                  }))
                )
            )
          }
          yield* notifications.client["notifications/prompts/list_changed"]({})
        }),
      getPromptResult: Effect.fnUntraced(function*({ arguments: params, name }) {
        const client = yield* McpServerClient
        return yield* internalCore.prompts.get(
          name,
          params ?? {},
          McpProtocolInternal.invocationFromClient(client)
        ).pipe(
          Effect.catchTag("PromptNotFound", () => new InvalidParams({ message: `Prompt '${name}' not found` }))
        )
      }),
      completion: Effect.fnUntraced(function*(complete) {
        const client = yield* McpServerClient
        const ref = complete.ref
        const result = yield* internalCore.completions.complete({
          reference: ref.type === "ref/resource"
            ? { type: "resourceTemplate", uriTemplate: ref.uri }
            : { type: "prompt", name: ref.name },
          argument: complete.argument,
          context: complete.context
        }, McpProtocolInternal.invocationFromClient(client))
        return {
          _meta: result.metadata,
          completion: {
            values: result.values,
            total: result.total,
            hasMore: result.hasMore
          }
        }
      })
    })
    internalState.set(service, { core: internalCore, notifications: notificationsQueue })
    return service
  })

  /**
   * Layer that provides the MCP server and client services.
   *
   * @since 4.0.0
   */
  static readonly layer: Layer.Layer<McpServer | McpServerClient> = Layer.effect(McpServer)(McpServer.make) as any
}

const MCP_SESSION_ID_HEADER = "mcp-session-id"
const MCP_PROTOCOL_VERSION_HEADER = "mcp-protocol-version"
const MCP_INVALID_BATCH_METHOD = "invalid/json-rpc-batch"
const requestKey = (requestId: string | number): string => `${typeof requestId}:${requestId}`

interface ActiveRequest {
  readonly prepared: McpRuntime.PreparedRequest
  readonly cancelled: boolean
}

class McpClientKey extends Data.Class<{
  readonly clientId: number
  readonly profile: McpCore.NegotiatedProtocolProfile<string>
}> {}

/**
 * Runs an MCP server over the current `RpcServer.Protocol`.
 *
 * **Details**
 *
 * The server serves registered tools, resources, and prompts. The selected MCP
 * runtime handles protocol lifecycle state and determines which clients receive
 * queued server notifications.
 *
 * @category running
 * @since 4.0.0
 */
export const run: (options: {
  readonly name: string
  readonly version: string
  readonly description?: string | undefined
  readonly websiteUrl?: string | undefined
  readonly icons?: ReadonlyArray<McpSchema.Icon> | undefined
  readonly protocols: Arr.NonEmptyReadonlyArray<McpProtocol.ProtocolAdapter>
  readonly extensions?: ServerExtensions | undefined
}) => Effect.Effect<
  never,
  Cause.IllegalArgumentError,
  McpServer | RpcServer.Protocol
> = Effect.fnUntraced(function*(options: {
  readonly name: string
  readonly version: string
  readonly description?: string | undefined
  readonly websiteUrl?: string | undefined
  readonly icons?: ReadonlyArray<McpSchema.Icon> | undefined
  readonly protocols: Arr.NonEmptyReadonlyArray<McpProtocol.ProtocolAdapter>
  readonly extensions?: ServerExtensions | undefined
}) {
  const runtimeOption = yield* Effect.serviceOption(McpRuntime.ServerRuntime)
  const runtime = Option.isSome(runtimeOption)
    ? runtimeOption.value
    : yield* McpRuntime.make(options.protocols)
  return yield* runWithRuntime(options, runtime)
})

const runWithRuntime = Effect.fnUntraced(function*(options: {
  readonly name: string
  readonly version: string
  readonly description?: string | undefined
  readonly websiteUrl?: string | undefined
  readonly icons?: ReadonlyArray<McpSchema.Icon> | undefined
  readonly extensions?: ServerExtensions | undefined
}, runtime: McpRuntime.ServerRuntimeShape) {
  const serverScope = yield* Effect.scope
  const protocol = yield* RpcServer.Protocol
  const server = yield* McpServer
  const defaultLogLevel = yield* CurrentLogLevel
  const isHttp = Option.isSome(yield* Effect.serviceOption(HttpRouter.HttpRouter))
  const clientProtocols = new Map<number, McpProtocol.AnyProtocolAdapter>()
  const activeRequests = new Map<number, Map<string, ActiveRequest>>()
  const clientProfiles = new Map<number, McpCore.NegotiatedProtocolProfile<string>>()
  // A bounded PubSub would let one slow listener block the shared worker and
  // legacy delivery. Each request scope releases its subscription on exit.
  const serverNotifications = yield* PubSub.unbounded<McpProtocolInternal.CanonicalServerNotification>()
  const sendNotification = protocol.sendNotification
  const handlers = yield* runtime.installHandlers({
    core: internalState.get(server)!.core,
    subscribeServerNotifications: PubSub.subscribe(serverNotifications),
    ...(sendNotification === undefined ? {} : {
      sendNotification: (
        protocolVersion: string,
        clientId: number,
        notification: McpProtocol.ProjectedNotification
      ) =>
        Effect.gen(function*() {
          const selectedProtocol = runtime.selectProtocol(protocolVersion)
          const rpc = selectedProtocol.serverNotificationRpcs.requests.get(notification.tag)
          if (rpc === undefined) {
            return yield* Effect.die(
              `MCP protocol ${protocolVersion} does not define server notification ${notification.tag}`
            )
          }
          const payload = yield* selectedProtocol.payloadCodecs(rpc).encode(notification.payload)
          yield* sendNotification(clientId, {
            tag: notification.tag,
            payload
          })
        }).pipe(Effect.orDie)
    }),
    defaultLogLevel,
    serverInfo: options
  })

  const clients = yield* RcMap.make({
    lookup: Effect.fnUntraced(function*(key: McpClientKey) {
      const selectedProtocol = runtime.selectProtocol(key.profile.protocolVersion)
      let write!: (message: RpcMessage.FromServerEncoded) => Effect.Effect<void>
      const reverseProtocol = yield* RpcClient.Protocol.make(Effect.fnUntraced(function*(writeResponse) {
        let cid = 0
        write = (message) => writeResponse(cid, message)
        return {
          send(id, request, _transferables) {
            cid = id
            if (request._tag === "Request") {
              return protocol.send(key.clientId, {
                _tag: "Request",
                id: request.id,
                tag: request.tag,
                payload: request.payload,
                headers: []
              })
            }
            // Ack & co are not part of FromServerEncoded, but the JSON-RPC
            // serializer encodes them symmetrically for reverse control flow
            return protocol.send(key.clientId, request as any)
          },
          supportsAck: true,
          supportsTransferables: false,
          supportsStructuredClone: false,
          codecFor: protocol.codecFor
        }
      }))
      const client = yield* selectedProtocol.makeReverseClient(key.profile).pipe(
        Effect.provideService(RpcClient.Protocol, reverseProtocol)
      )

      return { client, write } as const
    }),
    idleTimeToLive: 10000
  })

  const clientMiddleware = McpServerClientMiddleware.of((effect, { client, headers, payload, rpc }) => {
    const session = runtime.resolveRequest(client.id, headers)
    const isInitialize = rpc._tag.endsWith("/initialize")
    if (!isInitialize && !session) {
      const fiber = Fiber.getCurrent()!
      const httpRequest = Context.getOrUndefined(fiber.context, HttpServerRequest.HttpServerRequest)
      if (httpRequest) {
        appendPreResponseHandlerUnsafe(
          httpRequest,
          () =>
            Effect.succeed(
              HttpServerResponse.empty({
                status: headers[MCP_SESSION_ID_HEADER] === undefined ? 400 : 404
              })
            )
        )
      }
      return Effect.die(new Error(`Mcp-Session-Id does not exist`))
    }
    // RPC middleware erases the correlation between the initialize tag
    // and its decoded payload. Restore it once after non-initialize requests
    // without a session have been rejected above.
    const initializePayload = session?.initializePayload ?? payload as typeof McpSchema.Initialize.payloadSchema.Type
    const selectedProtocol = session?.protocol ??
      clientProtocols.get(client.id) ??
      runtime.protocolForInternalTag(rpc._tag)
    if (!isProtocolVersion(selectedProtocol.protocolVersion) || selectedProtocol.protocolVersion === "2026-07-28") {
      return Effect.die(`Unsupported selected MCP protocol version: ${selectedProtocol.protocolVersion}`)
    }
    const profile: McpCore.NegotiatedProtocolProfile = session?.negotiatedProfile ?? {
      protocolVersion: selectedProtocol.protocolVersion,
      clientCapabilities: initializePayload.capabilities,
      clientInfo: initializePayload.clientInfo
    }
    clientProfiles.set(client.id, profile)
    const requestContext = McpRequestContext.of({
      clientId: client.id,
      protocolVersion: profile.protocolVersion,
      clientCapabilities: profile.clientCapabilities,
      clientInfo: profile.clientInfo,
      requestMetadata: initializePayload._meta
    })
    return Effect.provideService(
      Effect.provideService(
        Effect.provideService(
          effect,
          McpServerClient,
          McpServerClient.of({
            clientId: client.id,
            protocolVersion: profile.protocolVersion,
            clientCapabilities: profile.clientCapabilities,
            clientInfo: profile.clientInfo,
            initializePayload,
            getClient: RcMap.get(
              clients,
              new McpClientKey({
                clientId: client.id,
                profile
              })
            ).pipe(
              Effect.map(({ client }) => client)
            )
          })
        ),
        McpRequestContext,
        requestContext
      ),
      CurrentLogLevel,
      runtime.effectLogLevel(client.id, headers, defaultLogLevel)
    )
  })

  const patchedProtocol = RpcServer.Protocol.of({
    ...protocol,
    send: (clientId, response) => {
      if (response._tag === "Exit") {
        const requests = activeRequests.get(clientId)
        const key = requestKey(response.requestId)
        const cancelled = requests?.get(key)?.cancelled
        if (requests !== undefined && requests.delete(key) && requests.size === 0) {
          activeRequests.delete(clientId)
        }
        if (cancelled === true) {
          return Effect.void
        }
        if (
          response.exit._tag === "Failure" &&
          !response.exit.cause.some((failure) => failure._tag === "Fail")
        ) {
          return protocol.send(clientId, {
            _tag: "Exit",
            requestId: response.requestId,
            exit: {
              _tag: "Failure",
              cause: [{
                _tag: "Fail",
                error: new InternalError({ message: "Internal error" })
              }]
            }
          })
        }
      }
      return protocol.send(clientId, response)
    },
    run: (f) =>
      protocol.run((clientId, request_) => {
        const fiber = Fiber.getCurrent()!
        const request = request_ as unknown as
          | RpcMessage.FromServerEncoded
          | RpcMessage.FromClientEncoded
        const httpRequest = isHttp
          ? Context.getOrUndefined(fiber.context, HttpServerRequest.HttpServerRequest)
          : undefined
        if (httpRequest !== undefined && request._tag !== "Eof") {
          appendPreResponseHandlerUnsafe(httpRequest, (_, response) =>
            Effect.succeed(
              response.status === 200 &&
                response.body._tag === "Uint8Array" &&
                response.body.contentLength === 0
                ? HttpServerResponse.empty({
                  headers: Headers.remove(response.headers, "content-type"),
                  status: 202
                })
                : response
            ))
        }
        switch (request._tag) {
          case "Request": {
            const headers = isHttp
              ? Context.getUnsafe(
                Fiber.getCurrent()!.context,
                HttpServerRequest.HttpServerRequest
              ).headers
              : Headers.fromInput(request.headers)
            const cancellationRequest = request.tag === "notifications/cancelled" &&
                typeof request.payload === "object" && request.payload !== null && "requestId" in request.payload &&
                (typeof request.payload.requestId === "string" || typeof request.payload.requestId === "number")
              ? activeRequests.get(clientId)?.get(requestKey(request.payload.requestId))
              : undefined
            const prepare = cancellationRequest === undefined
              ? runtime.prepareRequest(clientId, headers, request)
              : Effect.succeed(cancellationRequest.prepared)
            return prepare.pipe(
              Effect.flatMap((prepared) => {
                const session = prepared.binding
                const selectedProtocol = prepared.protocol
                // Selection happens before dated payload decoding. Once a
                // session exists, all later messages reuse its pinned adapter.
                clientProtocols.set(clientId, selectedProtocol)
                if (prepared.profile !== undefined) {
                  clientProfiles.set(clientId, prepared.profile)
                }
                if (request.tag === MCP_INVALID_BATCH_METHOD) {
                  return protocol.send(clientId, {
                    _tag: "Exit",
                    requestId: request.id,
                    exit: {
                      _tag: "Failure",
                      cause: [{
                        _tag: "Fail",
                        error: new InvalidRequest({ message: "JSON-RPC batches are not supported" })
                      }]
                    }
                  })
                }
                if (isHttp) {
                  const fiber = Fiber.getCurrent()!
                  const httpRequest = Context.getUnsafe(fiber.context, HttpServerRequest.HttpServerRequest)
                  if (session) {
                    appendPreResponseHandlerUnsafe(httpRequest, (_, res) =>
                      Effect.succeed(
                        HttpServerResponse.setHeader(
                          res,
                          MCP_PROTOCOL_VERSION_HEADER,
                          session.protocol.protocolVersion
                        )
                      ))
                  }
                }
                const routedRequest = runtime.routeClientRequest(selectedProtocol, request)
                const rpc = runtime.clientRpcs.requests.get(routedRequest.tag)
                if (
                  rpc &&
                  selectedProtocol.clientNotificationRpcs.requests.has(request.tag)
                ) {
                  if (!session && selectedProtocol.runtime._tag === "Stateful") {
                    if (httpRequest) {
                      appendPreResponseHandlerUnsafe(
                        httpRequest,
                        () =>
                          Effect.succeed(
                            HttpServerResponse.empty({
                              status: headers[MCP_SESSION_ID_HEADER] === undefined ? 400 : 404
                            })
                          )
                      )
                    }
                    return Effect.void
                  }
                  const decode = selectedProtocol.payloadCodecs(rpc).decode(request.payload)
                  return decode.pipe(
                    Effect.flatMap((payload) => {
                      if (
                        request.tag === "notifications/roots/list_changed" &&
                        session?.initializePayload.capabilities.roots?.listChanged === true &&
                        httpRequest === undefined
                      ) {
                        return RcMap.get(
                          clients,
                          new McpClientKey({
                            clientId,
                            profile: session.negotiatedProfile
                          })
                        ).pipe(
                          Effect.flatMap(({ client }) => client.listRoots()),
                          Effect.scoped,
                          Effect.ignoreCause,
                          Effect.forkIn(serverScope),
                          Effect.asVoid
                        )
                      }
                      if (request.tag === "notifications/cancelled") {
                        return selectedProtocol.normalizeCancellation(payload).pipe(
                          Effect.flatMap((cancellation) => {
                            const key = requestKey(cancellation.requestId)
                            const requests = activeRequests.get(clientId)
                            if (requests?.has(key) !== true) {
                              return Effect.void
                            }
                            requests.set(key, { ...requests.get(key)!, cancelled: true })
                            return f(clientId, {
                              _tag: "Interrupt",
                              requestId: cancellation.requestId
                            })
                          })
                        )
                      }
                      const handler = handlers.mapUnsafe.get(rpc.key) as Rpc.Handler<string> | undefined
                      const handled = handler
                        ? handler.handler(payload, {
                          rpc,
                          requestId: RpcMessage.RequestId(request.id),
                          client: new Rpc.ServerClient(clientId),
                          headers
                        }) as any as Effect.Effect<void>
                        : Effect.void
                      return prepared.requestContext === undefined
                        ? handled
                        : Effect.provideService(handled, McpRequestContext, prepared.requestContext)
                    }),
                    Effect.catchCause(() => Effect.void)
                  )
                }
                if (!rpc) {
                  if (request.isNotification) {
                    return Effect.void
                  }
                  return protocol.send(clientId, {
                    _tag: "Exit",
                    requestId: request.id,
                    exit: {
                      _tag: "Failure",
                      cause: [{
                        _tag: "Fail",
                        error: new MethodNotFound({ message: `Method not found: ${request.tag}` })
                      }]
                    }
                  })
                }
                return selectedProtocol.payloadCodecs(rpc).decode(request.payload).pipe(
                  Effect.matchEffect({
                    onSuccess: () => {
                      if (request.isNotification !== true) {
                        const requests = activeRequests.get(clientId) ?? new Map<string, ActiveRequest>()
                        requests.set(requestKey(request.id), { prepared, cancelled: false })
                        activeRequests.set(clientId, requests)
                      }
                      const handled = f(clientId, routedRequest)
                      return prepared.requestContext === undefined
                        ? handled
                        : Effect.provideService(handled, McpRequestContext, prepared.requestContext)
                    },
                    onFailure: () =>
                      request.isNotification
                        ? Effect.void
                        : protocol.send(clientId, {
                          _tag: "Exit",
                          requestId: request.id,
                          exit: {
                            _tag: "Failure",
                            cause: [{
                              _tag: "Fail",
                              error: new InvalidParams({ message: "Invalid method parameters" })
                            }]
                          }
                        })
                  })
                )
              }),
              Effect.catch((error) =>
                request.isNotification
                  ? Effect.void
                  : protocol.send(clientId, {
                    _tag: "Exit",
                    requestId: request.id,
                    exit: {
                      _tag: "Failure",
                      cause: [{
                        _tag: "Fail",
                        error: error instanceof McpProtocolInternal.ProtocolError
                          ? error
                          : new InvalidParams({ message: "Invalid request metadata" })
                      }]
                    }
                  })
              )
            )
          }
          case "Ping":
          case "Ack":
          case "Interrupt":
            return f(clientId, request)
          case "Eof":
            activeRequests.delete(clientId)
            clientProtocols.delete(clientId)
            clientProfiles.delete(clientId)
            runtime.disconnect(clientId)
            return f(clientId, request)
          case "Pong":
          case "Exit":
          case "Chunk":
          case "ClientProtocolError":
          case "Defect": {
            const selectedProtocol = getProtocolForClient(clientProtocols, clientId, runtime.protocols[0])
            const profile = clientProfiles.get(clientId) ?? {
              protocolVersion: selectedProtocol.protocolVersion,
              clientCapabilities: {},
              clientInfo: { name: "unknown", version: "unknown" }
            }
            return RcMap.get(
              clients,
              new McpClientKey({
                clientId,
                profile
              })
            ).pipe(
              Effect.flatMap(({ write }) => write(request)),
              Effect.scoped
            )
          }
        }
      })
  })

  yield* Queue.take(internalState.get(server)!.notifications).pipe(
    Effect.flatMap(Effect.fnUntraced(function*({ notification, targetClientId }) {
      if (McpProtocolInternal.isSubscriptionServerNotification(notification)) {
        yield* PubSub.publish(serverNotifications, { notification, targetClientId })
      }
      const clientIds = yield* patchedProtocol.clientIds
      for (const clientId of clientProtocols.keys()) {
        if (!clientIds.has(clientId)) {
          clientProtocols.delete(clientId)
          clientProfiles.delete(clientId)
          // HTTP UUID sessions are stored separately and outlive request-scoped client IDs.
          runtime.disconnect(clientId)
        }
      }
      for (const clientId of runtime.deliveryClientIds()) {
        if (targetClientId !== undefined && clientId !== targetClientId) {
          continue
        }
        if (!clientIds.has(clientId)) {
          runtime.disconnect(clientId)
          continue
        }
        // This must stay below stale-client cleanup so transports without
        // notification support still prune initializedClients.
        if (!patchedProtocol.supportsNotifications) {
          continue
        }
        const selectedProtocol = clientProtocols.get(clientId)
        if (!selectedProtocol) {
          continue
        }
        yield* Effect.gen(function*() {
          const projected = yield* selectedProtocol.projectNotification(notification)
          if (projected === undefined) {
            return
          }
          if (!runtime.canDeliver(clientId, Headers.empty, notification, defaultLogLevel)) {
            return
          }
          const rpc = selectedProtocol.serverNotificationRpcs.requests.get(projected.tag)
          if (!rpc) {
            return
          }
          const encoded = yield* selectedProtocol.payloadCodecs(rpc).encode(projected.payload)
          yield* patchedProtocol.send(clientId, {
            _tag: "Request",
            id: "",
            tag: projected.tag,
            payload: encoded,
            headers: [],
            isNotification: true
          })
        }).pipe(Effect.catchCause(() => Effect.void))
      }
    })),
    Effect.catchCause(() => Effect.void),
    Effect.forever,
    Effect.forkScoped
  )

  return yield* RpcServer.make(runtime.clientRpcs, {
    spanPrefix: "McpServer",
    disableFatalDefects: true
  }).pipe(
    Effect.provideService(RpcServer.Protocol, patchedProtocol),
    Effect.provideService(McpServerClientMiddleware, clientMiddleware),
    Effect.provide(handlers)
  )
}, Effect.scoped)

/**
 * Creates a layer that starts an MCP server over an existing
 * `RpcServer.Protocol` and provides `McpServer`. Request handlers receive
 * `McpRequestContext`; initialized legacy requests additionally receive
 * `McpServerClient`.
 *
 * **When to use**
 *
 * Use when you already have a custom or externally provided
 * `RpcServer.Protocol` and want to start an MCP server as part of a layer
 * graph.
 *
 * **Details**
 *
 * The returned layer forks `run(options)` in the layer scope and merges
 * `McpServer.layer`, so registration layers can use the `McpServer` service
 * while the server is running.
 *
 * **Gotchas**
 *
 * Unlike `layerStdio` and `layerHttp`, this layer does not install a concrete
 * transport. The surrounding layer graph must provide `RpcServer.Protocol`.
 *
 * @see {@link run} for the effect form used by this layer
 * @see {@link layerStdio} for a stdio-backed layer that installs the MCP protocol and NDJSON-RPC serialization
 * @see {@link layerHttp} for an HTTP-backed layer that registers with `HttpRouter` and installs JSON-RPC serialization
 *
 * @category layers
 * @since 4.0.0
 */
export const layer = (options: {
  readonly name: string
  readonly version: string
  readonly description?: string | undefined
  readonly websiteUrl?: string | undefined
  readonly icons?: ReadonlyArray<McpSchema.Icon> | undefined
  readonly protocols: Arr.NonEmptyReadonlyArray<McpProtocol.ProtocolAdapter>
  readonly extensions?: ServerExtensions | undefined
}): Layer.Layer<McpServer | McpServerClient, Cause.IllegalArgumentError, RpcServer.Protocol> =>
  layerWithRuntime(options).pipe(
    Layer.provide(McpRuntime.layer(options.protocols))
  )

const layerWithRuntime = (options: {
  readonly name: string
  readonly version: string
  readonly description?: string | undefined
  readonly websiteUrl?: string | undefined
  readonly icons?: ReadonlyArray<McpSchema.Icon> | undefined
  readonly extensions?: ServerExtensions | undefined
}): Layer.Layer<McpServer | McpServerClient, never, RpcServer.Protocol | McpRuntime.ServerRuntime> =>
  Layer.effectDiscard(
    Effect.gen(function*() {
      const runtime = yield* McpRuntime.ServerRuntime
      yield* Effect.forkScoped(runWithRuntime(options, runtime))
    })
  ).pipe(
    Layer.provideMerge(McpServer.layer)
  )

/**
 * Creates a layer that runs an MCP server over standard input and output.
 *
 * **When to use**
 *
 * Use when an MCP client launches the server as a subprocess and communicates
 * through newline-delimited JSON-RPC messages.
 *
 * **Details**
 *
 * The selected protocol adapter controls the dated RPC schemas and JSON-RPC
 * batch policy. The layer provides `McpServer`, supplies request-scoped
 * `McpRequestContext` and legacy `McpServerClient` services to handlers, and
 * requires `Stdio`.
 *
 * @see {@link layer} for running over an existing `RpcServer.Protocol`
 * @see {@link layerHttp} for the single-endpoint HTTP transport
 *
 * @category layers
 * @since 4.0.0
 */
export const layerStdio = (options: {
  readonly name: string
  readonly version: string
  readonly description?: string | undefined
  readonly websiteUrl?: string | undefined
  readonly icons?: ReadonlyArray<McpSchema.Icon> | undefined
  readonly protocols: Arr.NonEmptyReadonlyArray<McpProtocol.ProtocolAdapter>
  readonly extensions?: ServerExtensions | undefined
}): Layer.Layer<McpServer | McpServerClient, Cause.IllegalArgumentError, Stdio> =>
  layer(options).pipe(
    Layer.provide(RpcServer.layerProtocolStdio),
    Layer.provide(Layer.succeed(
      RpcSerialization.RpcSerialization,
      mcpStdioSerialization(options.protocols)
    ))
  )

const mcpStdioSerialization = (
  protocols: Arr.NonEmptyReadonlyArray<McpProtocol.ProtocolAdapter>
): RpcSerialization.RpcSerialization["Service"] => {
  const serialization = RpcSerialization.jsonRpc({
    contentType: "application/json-rpc"
  })
  const encodeNotification = serialization.encodeNotification
  return RpcSerialization.RpcSerialization.of({
    contentType: serialization.contentType,
    includesFraming: true,
    codecFor: serialization.codecFor,
    makeUnsafe: () => {
      const frames = RpcSerialization.ndjson.makeUnsafe()
      const parser = serialization.makeUnsafe()
      let selectedProtocol: McpProtocol.ProtocolAdapter | undefined
      return {
        decode: (data) => {
          const decoded: Array<unknown> = []
          for (const frame of frames.decode(data)) {
            if (Array.isArray(frame)) {
              const acceptsBatch = selectedProtocol?.runtime.transport.jsonRpc.acceptsBatches === true
              if (
                !acceptsBatch ||
                frame.length === 0 ||
                frame.some(isInitializeJsonRpcMessage)
              ) {
                decoded.push({
                  _tag: "Request",
                  id: null,
                  tag: MCP_INVALID_BATCH_METHOD,
                  payload: null,
                  headers: []
                })
                continue
              }
            } else if (isInitializeJsonRpcMessage(frame)) {
              const offered = getJsonRpcProtocolVersion(frame)
              selectedProtocol = protocols.find((protocol) => protocol.protocolVersion === offered) ??
                protocols[0]
            }
            decoded.push(...parser.decode(JSON.stringify(frame)))
          }
          return decoded
        },
        encode: (response) => {
          const invalidBatchExit = decodeInvalidBatchExit(response)
          if (Result.isSuccess(invalidBatchExit)) {
            return JSON.stringify({
              jsonrpc: "2.0",
              id: null,
              error: {
                _tag: "Cause",
                code: McpSchema.INVALID_REQUEST_ERROR_CODE,
                message: "JSON-RPC batches are not supported",
                data: invalidBatchExit.success.exit.cause
              }
            }) + "\n"
          }
          const encoded = parser.encode(response)
          return encoded === undefined ? undefined : `${encoded}\n`
        }
      }
    }
  })
}

/**
 * Registers a Streamable HTTP MCP endpoint at `options.path`.
 *
 * **When to use**
 *
 * Use to expose an MCP server through an existing `HttpRouter`.
 *
 * **Details**
 *
 * POST serves JSON-RPC and accepted notification-only requests return `202`.
 * Modern routing-header mismatches and unsupported protocol versions return
 * JSON-RPC errors with status `400`; unknown modern RPC methods return a
 * JSON-RPC method-not-found error with status `404`. Unsupported HTTP methods
 * return `405`. Requests carrying an `Origin` header are rejected unless the
 * exact origin appears in `allowedOrigins`; Origin-less non-browser clients
 * remain valid. The surrounding HTTP server remains responsible for binding
 * to an appropriate interface and installing authentication.
 *
 * `layerHttp` always implements the single-endpoint Streamable HTTP topology.
 * Using `v2024_11_05` here is a custom compatibility transport for that
 * revision's schema. It does not implement the historical two-endpoint
 * HTTP+SSE transport, GET SSE, event resumption, session expiry, or client
 * session termination.
 *
 * @see {@link layerStdio} for exposing the server over stdio
 * @see {@link layer} for the base MCP server layer without a transport protocol
 *
 * @category layers
 * @since 4.0.0
 */
export const layerHttp = (options: {
  readonly name: string
  readonly version: string
  readonly description?: string | undefined
  readonly websiteUrl?: string | undefined
  readonly icons?: ReadonlyArray<McpSchema.Icon> | undefined
  readonly path: HttpRouter.PathInput
  readonly protocols: Arr.NonEmptyReadonlyArray<McpProtocol.ProtocolAdapter>
  readonly extensions?: ServerExtensions | undefined
  readonly allowedOrigins?: ReadonlyArray<string> | undefined
}): Layer.Layer<McpServer | McpServerClient, Cause.IllegalArgumentError, HttpRouter.HttpRouter> => {
  const runtime = McpRuntime.layer(options.protocols)
  const methodNotAllowedResponse = HttpServerResponse.empty({
    status: 405,
    headers: { allow: "POST" }
  })
  const methodNotAllowed = (request: HttpServerRequest.HttpServerRequest) =>
    isAllowedMcpOrigin(request, options.allowedOrigins)
      ? Effect.succeed(methodNotAllowedResponse)
      : Effect.succeed(HttpServerResponse.empty({ status: 403 }))
  const routes = Layer.mergeAll(
    HttpRouter.add("GET", options.path, methodNotAllowed),
    HttpRouter.add("PUT", options.path, methodNotAllowed),
    HttpRouter.add("PATCH", options.path, methodNotAllowed),
    HttpRouter.add("DELETE", options.path, methodNotAllowed),
    HttpRouter.add("OPTIONS", options.path, methodNotAllowed)
  )
  return Layer.merge(layerWithRuntime(options), routes).pipe(
    Layer.provide(layerMcpProtocolHttp(options)),
    Layer.provide(runtime),
    Layer.provide(RpcSerialization.layerJsonRpc())
  )
}

const layerMcpProtocolHttp = (options: {
  readonly path: HttpRouter.PathInput
  readonly allowedOrigins?: ReadonlyArray<string> | undefined
}): Layer.Layer<
  RpcServer.Protocol,
  never,
  McpRuntime.ServerRuntime | HttpRouter.HttpRouter
> =>
  Layer.effect(RpcServer.Protocol)(Effect.gen(function*() {
    const runtime = yield* McpRuntime.ServerRuntime
    const { httpEffect, protocol } = yield* RpcServer.makeProtocolWithHttpEffect().pipe(
      Effect.provideService(RpcSerialization.RpcSerialization, mcpHttpSerialization)
    )
    const router = yield* HttpRouter.HttpRouter
    yield* router.add("POST", options.path, (request) => {
      if (!isAllowedMcpOrigin(request, options.allowedOrigins)) {
        return Effect.succeed(HttpServerResponse.empty({ status: 403 }))
      }
      if (mcpMediaTypes(request.headers["content-type"])[0] !== "application/json") {
        return Effect.succeed(HttpServerResponse.empty({ status: 415 }))
      }
      const accepted = mcpMediaTypes(request.headers["accept"])
      if (!accepted.includes("application/json") || !accepted.includes("text/event-stream")) {
        return Effect.succeed(HttpServerResponse.empty({ status: 406 }))
      }
      const sessionId = request.headers[MCP_SESSION_ID_HEADER]
      return request.text.pipe(
        Effect.matchEffect({
          onFailure: () => {
            const admission = runtime.admitHttp(request.headers, undefined)
            return Effect.succeed(
              admission._tag === "Rejected"
                ? HttpServerResponse.empty({ status: admission.status })
                : HttpServerResponse.jsonUnsafe({
                  jsonrpc: "2.0",
                  id: null,
                  error: new McpSchema.ParseError({ message: "Parse error" })
                })
            )
          },
          onSuccess: (body) =>
            Effect.matchEffect(Schema.decodeUnknownEffect(Schema.UnknownFromJsonString)(body), {
              onFailure: () => {
                const admission = runtime.admitHttp(request.headers, undefined)
                return Effect.succeed(
                  admission._tag === "Rejected"
                    ? HttpServerResponse.empty({ status: admission.status })
                    : HttpServerResponse.jsonUnsafe({
                      jsonrpc: "2.0",
                      id: null,
                      error: new McpSchema.ParseError({ message: "Parse error" })
                    })
                )
              },
              onSuccess: (input) => {
                if (!Array.isArray(input)) {
                  const hasId = Predicate.hasProperty(input, "id")
                  const id = hasId && (typeof input.id === "string" || typeof input.id === "number")
                    ? input.id
                    : null
                  const isJsonRpc = Predicate.hasProperty(input, "jsonrpc") && input.jsonrpc === "2.0"
                  const hasValidRequestId = !hasId || typeof input.id === "string" || typeof input.id === "number"
                  const isRequest = isJsonRpc && hasValidRequestId &&
                    Predicate.hasProperty(input, "method") && typeof input.method === "string"
                  const hasValidResponseId = hasId &&
                    (typeof input.id === "string" || typeof input.id === "number" || input.id === null)
                  const hasResult = Predicate.hasProperty(input, "result")
                  const hasError = Predicate.hasProperty(input, "error")
                  const isResponse = isJsonRpc && hasValidResponseId && hasResult !== hasError
                  if (!isRequest && !isResponse) {
                    return Effect.succeed(HttpServerResponse.jsonUnsafe({
                      jsonrpc: "2.0",
                      id,
                      error: new InvalidRequest({ message: "Invalid Request" })
                    }))
                  }
                  const admission = runtime.admitHttp(request.headers, input)
                  if (admission._tag === "Rejected") {
                    return Effect.succeed(
                      admission.error === undefined
                        ? HttpServerResponse.empty({ status: admission.status })
                        : HttpServerResponse.jsonUnsafe({
                          jsonrpc: "2.0",
                          id,
                          error: admission.error
                        }, { status: admission.status })
                    )
                  }
                  const isInitialize = isInitializeJsonRpcMessage(input)
                  if (isInitialize && sessionId !== undefined) {
                    return Effect.succeed(HttpServerResponse.empty({ status: 400 }))
                  }
                  if (
                    !isInitialize &&
                    isRequest &&
                    admission.protocol?.runtime._tag !== "Stateless" &&
                    sessionId === undefined
                  ) {
                    return Effect.succeed(HttpServerResponse.empty({ status: 400 }))
                  }
                  if (
                    isRequest &&
                    admission.protocol?.runtime._tag === "Stateless" &&
                    !(
                      (admission.protocol as unknown as McpProtocolInternal.ProtocolAdapter).handlerRpcs?.requests.has(
                        input.method as string
                      ) ?? admission.protocol.clientRpcs.requests.has(input.method as string)
                    )
                  ) {
                    return Effect.succeed(HttpServerResponse.jsonUnsafe({
                      jsonrpc: "2.0",
                      id,
                      error: new MethodNotFound({ message: `Method not found: ${input.method}` })
                    }, { status: 404 }))
                  }
                  const response = Predicate.hasProperty(input, "method") && input.method === "subscriptions/listen"
                    ? Effect.map(httpEffect, toServerSentEvents)
                    : httpEffect
                  return !isRequest || !hasId
                    ? Effect.catchCause(response, () => Effect.succeed(HttpServerResponse.empty({ status: 202 })))
                    : response
                }
                if (input.length === 0) {
                  return Effect.succeed(HttpServerResponse.jsonUnsafe({
                    jsonrpc: "2.0",
                    id: null,
                    error: new InvalidRequest({ message: "Invalid Request" })
                  }, { status: 400 }))
                }
                const admission = runtime.admitHttp(request.headers, input)
                if (
                  admission._tag === "Rejected" ||
                  input.some(isInitializeJsonRpcMessage) ||
                  admission.binding === undefined
                ) {
                  return Effect.succeed(HttpServerResponse.empty({ status: 400 }))
                }
                const selectedProtocol = admission.binding.protocol
                if (!selectedProtocol.runtime.transport.jsonRpc.acceptsBatches) {
                  return Effect.succeed(HttpServerResponse.empty({ status: 400 }))
                }
                const expectsResponse = input.some((message) =>
                  Predicate.hasProperty(message, "method") && Predicate.hasProperty(message, "id")
                )
                return expectsResponse
                  ? httpEffect
                  : Effect.catchCause(httpEffect, () => Effect.succeed(HttpServerResponse.empty({ status: 202 })))
              }
            })
        })
      )
    })
    return protocol
  }))

const mcpHttpSerialization: RpcSerialization.RpcSerialization["Service"] = (() => {
  const serialization = RpcSerialization.jsonRpc()
  return RpcSerialization.RpcSerialization.of({
    contentType: serialization.contentType,
    includesFraming: true,
    makeUnsafe: serialization.makeUnsafe
  })
})()

const toServerSentEvents = (response: HttpServerResponse.HttpServerResponse) => {
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()
  const frame = (data: Uint8Array) => encoder.encode(`data: ${decoder.decode(data)}\n\n`)
  const options = {
    status: response.status,
    statusText: response.statusText,
    headers: Headers.remove(response.headers, "content-type"),
    cookies: response.cookies,
    contentType: "text/event-stream"
  }
  if (response.body._tag === "Stream") {
    return HttpServerResponse.stream(response.body.stream.pipe(Stream.map(frame)), options)
  }
  if (response.body._tag === "Uint8Array") {
    return HttpServerResponse.uint8Array(frame(response.body.body), options)
  }
  return HttpServerResponse.setHeader(response, "content-type", "text/event-stream")
}

const isAllowedMcpOrigin = (
  request: HttpServerRequest.HttpServerRequest,
  allowedOrigins: ReadonlyArray<string> | undefined
): boolean => {
  const origin = request.headers["origin"]
  return origin === undefined || (allowedOrigins ?? []).includes(origin)
}

const mcpMediaTypes = (header: string | undefined): ReadonlyArray<string> =>
  header === undefined
    ? []
    : header.split(",").flatMap((part) => {
      const [mediaType, ...parameters] = part.split(";")
      const quality = parameters
        .map((parameter) => parameter.trim().toLowerCase())
        .find((parameter) => parameter.startsWith("q="))
      if (quality !== undefined) {
        const value = Number(quality.slice(2))
        if (!Number.isFinite(value) || value <= 0 || value > 1) {
          return []
        }
      }
      return [mediaType.trim().toLowerCase()]
    })

const InitializeJsonRpcMessage = Schema.Struct({
  method: Schema.Literal("initialize")
})

const isInitializeJsonRpcMessage = (message: unknown): boolean =>
  Result.isSuccess(Schema.decodeUnknownResult(InitializeJsonRpcMessage)(message))

const JsonRpcProtocolVersion = Schema.Struct({
  params: Schema.Struct({
    protocolVersion: Schema.String
  })
})

const getJsonRpcProtocolVersion = (message: unknown): string | undefined => {
  const decoded = Schema.decodeUnknownResult(JsonRpcProtocolVersion)(message)
  return Result.isSuccess(decoded) ? decoded.success.params.protocolVersion : undefined
}

const INTERNAL_TOOL_ERROR_MESSAGE = "Tool execution failed due to an internal server error."

const toolErrorResult = (message: string): CallToolResult =>
  new CallToolResult({
    isError: true,
    content: [{ type: "text", text: message }]
  })

/**
 * Registers a `Toolkit` with the `McpServer`.
 *
 * @category handlers
 * @since 4.0.0
 */
export const registerToolkit: <Tools extends Record<string, Tool.Any>>(
  toolkit: Toolkit.Toolkit<Tools>
) => Effect.Effect<
  void,
  never,
  McpServer | Tool.HandlersFor<Tools> | Exclude<Tool.HandlerServices<Tools>, McpRequestContext | McpServerClient>
> = Effect.fnUntraced(function*<Tools extends Record<string, Tool.Any>>(
  toolkit: Toolkit.Toolkit<Tools>
) {
  const registry = yield* McpServer
  const built = yield* (toolkit as any as Effect.Effect<
    Toolkit.WithHandler<Tools>,
    never,
    Exclude<Tool.HandlersFor<Tools>, McpRequestContext | McpServerClient>
  >)
  const services = yield* Effect.context<never>()
  for (const tool of Object.values(built.tools)) {
    const annotations = tool.annotations
    const toolMeta = Context.getOrUndefined(annotations, Tool.Meta)
    const isDeclaredFailure = Schema.is(tool.failureSchema)
    const outputJsonSchema = Tool.getJsonSchemaFromSchema(tool.successSchema)
    const outputSchema = outputJsonSchema.type === "object"
      ? yield* Schema.decodeUnknownEffect(ToolJsonSchema)(outputJsonSchema).pipe(Effect.orDie)
      : undefined
    const inputSchema = yield* Schema.decodeUnknownEffect(ToolJsonSchema)(
      Tool.getJsonSchema(tool)
    ).pipe(Effect.orDie)
    const mcpTool = new McpTool({
      name: tool.name,
      description: Tool.getDescription(tool),
      inputSchema,
      ...(outputSchema === undefined ? {} : { outputSchema }),
      annotations: {
        ...(Context.getOption(tool.annotations, Tool.Title).pipe(
          Option.map((title) => ({ title })),
          Option.getOrUndefined
        )),
        readOnlyHint: Context.get(tool.annotations, Tool.Readonly),
        destructiveHint: Context.get(tool.annotations, Tool.Destructive),
        idempotentHint: Context.get(tool.annotations, Tool.Idempotent),
        openWorldHint: Context.get(tool.annotations, Tool.OpenWorld)
      },
      _meta: toolMeta
    })
    yield* registry.addTool({
      tool: mcpTool,
      annotations,
      handle(payload) {
        return built.handle(tool.name as keyof Tools, payload ?? {}).pipe(
          Stream.unwrap,
          Stream.run(Sink.last()),
          Effect.flatMap(Effect.fromOption),
          Effect.provideContext(
            services as Context.Context<Tool.HandlerServices<Tools[keyof Tools]>>
          ),
          Effect.map((result) =>
            new CallToolResult({
              isError: false,
              structuredContent: toStructuredContent(result.encodedResult),
              content: result.encodedResult === undefined ? [] : [{
                type: "text",
                text: JSON.stringify(result.encodedResult)
              }]
            })
          ),
          Effect.tapCause(Effect.logError),
          Effect.catch((error) => {
            if (AiError.isAiError(error)) {
              const reason = (error as AiError.AiError).reason
              return reason._tag === "ToolParameterValidationError"
                ? Effect.fail(new InvalidParams({ message: reason.message }))
                : Effect.succeed(toolErrorResult(INTERNAL_TOOL_ERROR_MESSAGE))
            }
            if (isDeclaredFailure(error)) {
              const message = error instanceof Error
                ? error.message
                : INTERNAL_TOOL_ERROR_MESSAGE
              return Effect.succeed(toolErrorResult(message))
            }
            return Effect.succeed(toolErrorResult(INTERNAL_TOOL_ERROR_MESSAGE))
          }),
          Effect.catchDefect(() => Effect.succeed(toolErrorResult(INTERNAL_TOOL_ERROR_MESSAGE)))
        )
      }
    })
  }
})

/**
 * Registers an `AiToolkit` with the `McpServer`.
 *
 * @category layers
 * @since 4.0.0
 */
export const toolkit = <Tools extends Record<string, Tool.Any>>(
  toolkit: Toolkit.Toolkit<Tools>
): Layer.Layer<
  never,
  never,
  Tool.HandlersFor<Tools> | Exclude<Tool.HandlerServices<Tools>, McpRequestContext | McpServerClient>
> =>
  Layer.effectDiscard(registerToolkit(toolkit)).pipe(
    Layer.provide(McpServer.layer)
  )

/**
 * Utility type that validates a completion-handler record against the allowed
 * parameter keys.
 *
 * @category utility types
 * @since 4.0.0
 */
export type ValidateCompletions<Completions, Keys extends string> =
  & Completions
  & {
    readonly [K in keyof Completions]: K extends Keys ? (
        input: string,
        context: CompletionContext
      ) => any
      : never
  }

/**
 * Completion-handler map for a resource URI template.
 *
 * **Details**
 *
 * Each schema interpolation contributes a parameter key, using an explicit
 * `Param` name when present or `paramN` otherwise, and each handler returns
 * candidate values for that parameter.
 *
 * @category models
 * @since 4.0.0
 */
export type ResourceCompletions<Schemas extends ReadonlyArray<Schema.Constraint>> = {
  readonly [
    K in Extract<keyof Schemas, `${number}`> as Schemas[K] extends Param<infer Id, infer _S> ? Id
      : `param${K}`
  ]: (
    input: string,
    context: CompletionContext
  ) => Effect.Effect<Array<Schemas[K]["Type"]>, any, any>
}

/**
 * Registers an MCP resource or resource template from an Effect program.
 *
 * **When to use**
 *
 * Use when you are already inside an Effect program with an `McpServer`
 * service and need to add a concrete resource or URI-template resource
 * directly.
 *
 * @see {@link resource} for the layer-based resource registration wrapper
 *
 * @category handlers
 * @since 4.0.0
 */
export const registerResource: {
  <E, R>(options: {
    readonly uri: string
    readonly name: string
    readonly description?: string | undefined
    readonly mimeType?: string | undefined
    readonly audience?: ReadonlyArray<"user" | "assistant"> | undefined
    readonly priority?: number | undefined
    readonly content: Effect.Effect<
      typeof ReadResourceResult.Type | string | Uint8Array,
      E,
      R
    >
    readonly annotations?: Context.Context<never> | undefined
  }): Effect.Effect<void, never, Exclude<R, McpRequestContext | McpServerClient> | McpServer>
  <const Schemas extends ReadonlyArray<Schema.Constraint>>(segments: TemplateStringsArray, ...schemas: Schemas): <
    E,
    R,
    const Completions extends Partial<ResourceCompletions<Schemas>> = {}
  >(options: {
    readonly name: string
    readonly description?: string | undefined
    readonly mimeType?: string | undefined
    readonly audience?: ReadonlyArray<"user" | "assistant"> | undefined
    readonly priority?: number | undefined
    readonly completion?: ValidateCompletions<Completions, keyof ResourceCompletions<Schemas>> | undefined
    readonly content: (uri: string, ...params: { readonly [K in keyof Schemas]: Schemas[K]["Type"] }) => Effect.Effect<
      typeof ReadResourceResult.Type | string | Uint8Array,
      E,
      R
    >
    readonly annotations?: Context.Context<never> | undefined
  }) => Effect.Effect<
    void,
    never,
    | Exclude<
      | Schemas[number]["DecodingServices"]
      | Schemas[number]["EncodingServices"]
      | R
      | (Completions[keyof Completions] extends (input: string) => infer Ret ?
        Ret extends Effect.Effect<infer _A, infer _E, infer _R> ? _R : never
        : never),
      McpRequestContext | McpServerClient
    >
    | McpServer
  >
} = function() {
  if (arguments.length === 1) {
    const options = arguments[0] as {
      readonly uri: string
      readonly name: string
      readonly description?: string | undefined
      readonly mimeType?: string | undefined
      readonly audience?: ReadonlyArray<"user" | "assistant"> | undefined
      readonly priority?: number | undefined
      readonly content: Effect.Effect<typeof ReadResourceResult.Type | string | Uint8Array, any, any>
      readonly annotations?: Context.Context<never> | undefined
    }
    return Effect.gen(function*() {
      const services = yield* Effect.context<any>()
      const registry = yield* McpServer
      yield* registry.addResource({
        resource: new Resource({
          ...options,
          annotations: options
        }),
        handle: options.content.pipe(
          Effect.provideContext(services),
          Effect.map((content) => resolveResourceContent(options.uri, content)),
          Effect.catchCause((cause) => {
            const prettyError = Cause.prettyErrors(cause)[0]
            return Effect.fail(new InternalError({ message: prettyError.message }))
          })
        ),
        annotations: options.annotations ?? Context.empty()
      })
    })
  }
  const {
    params,
    routerPath,
    schema,
    uriPath
  } = compileUriTemplate(...(arguments as any as [any, any]))
  return Effect.fnUntraced(function*<E, R>(options: {
    readonly name: string
    readonly description?: string | undefined
    readonly mimeType?: string | undefined
    readonly audience?: ReadonlyArray<"user" | "assistant"> | undefined
    readonly priority?: number | undefined
    readonly completion?:
      | Record<
        string,
        (
          input: string,
          context: CompletionContext
        ) => Effect.Effect<any>
      >
      | undefined
    readonly content: (uri: string, ...params: Array<any>) => Effect.Effect<
      typeof ReadResourceResult.Type | string | Uint8Array,
      E,
      R
    >
    readonly annotations?: Context.Context<never> | undefined
  }) {
    const services = yield* Effect.context<any>()
    const registry = yield* McpServer
    const decode = Schema.decodeUnknownEffect(schema)
    const template = new ResourceTemplate({
      ...options,
      uriTemplate: uriPath,
      annotations: options!
    })
    const completions: Record<
      string,
      (
        input: string,
        context: CompletionContext
      ) => Effect.Effect<CompleteResult, InternalError>
    > = Object.create(null)
    for (const [param, handle] of Object.entries(options.completion ?? {})) {
      const encodeArray = Schema.encodeUnknownEffect(Schema.Array(params[param]))
      const handler = (
        input: string,
        context: CompletionContext
      ) =>
        handle(input, context).pipe(
          Effect.flatMap(encodeArray),
          Effect.map((values) => ({
            completion: {
              values: values as Array<string>,
              total: values.length,
              hasMore: false
            }
          })),
          Effect.catchCause((cause) => {
            const prettyError = Cause.prettyErrors(cause)[0]
            return Effect.fail(new InternalError({ message: prettyError.message }))
          }),
          Effect.provideContext(services)
        )
      completions[param] = handler
    }
    yield* registry.addResourceTemplate({
      template,
      routerPath,
      completions,
      annotations: options.annotations ?? Context.empty(),
      handle: (uri, params) =>
        decode(params).pipe(
          Effect.mapError((error) => new InvalidParams({ message: error.message })),
          Effect.flatMap((params: any) =>
            options.content(uri, ...params).pipe(
              Effect.map((content) => resolveResourceContent(uri, content)),
              Effect.catchCause((cause) => {
                const prettyError = Cause.prettyErrors(cause)[0]
                return Effect.fail(new InternalError({ message: prettyError.message }))
              })
            )
          ),
          Effect.provideContext(services)
        )
    })
  })
} as any

/**
 * Creates a layer that registers an MCP resource or resource template.
 *
 * **When to use**
 *
 * Use to compose resource registration into an MCP server layer.
 *
 * @see {@link registerResource} for the Effect-level resource registration API
 *
 * @category layers
 * @since 4.0.0
 */
export const resource: {
  <E, R>(options: {
    readonly uri: string
    readonly name: string
    readonly description?: string | undefined
    readonly mimeType?: string | undefined
    readonly audience?: ReadonlyArray<"user" | "assistant"> | undefined
    readonly priority?: number | undefined
    readonly content: Effect.Effect<
      typeof ReadResourceResult.Type | string | Uint8Array,
      E,
      R
    >
  }): Layer.Layer<never, never, Exclude<R, McpRequestContext | McpServerClient>>
  <const Schemas extends ReadonlyArray<Schema.Constraint>>(segments: TemplateStringsArray, ...schemas: Schemas): <
    E,
    R,
    const Completions extends Partial<ResourceCompletions<Schemas>> = {}
  >(options: {
    readonly name: string
    readonly description?: string | undefined
    readonly mimeType?: string | undefined
    readonly audience?: ReadonlyArray<"user" | "assistant"> | undefined
    readonly priority?: number | undefined
    readonly completion?: ValidateCompletions<Completions, keyof ResourceCompletions<Schemas>> | undefined
    readonly content: (uri: string, ...params: { readonly [K in keyof Schemas]: Schemas[K]["Type"] }) => Effect.Effect<
      typeof ReadResourceResult.Type | string | Uint8Array,
      E,
      R
    >
  }) => Layer.Layer<
    never,
    never,
    Exclude<
      | R
      | (Completions[keyof Completions] extends (input: string) => infer Ret ?
        Ret extends Effect.Effect<infer _A, infer _E, infer _R> ? _R : never
        : never),
      McpRequestContext | McpServerClient
    >
  >
} = function() {
  if (arguments.length === 1) {
    return Layer.effectDiscard(registerResource(arguments[0])).pipe(
      Layer.provide(McpServer.layer)
    )
  }
  const register = registerResource(...(arguments as any as [any, any]))
  return (options: any) =>
    Layer.effectDiscard(register(options)).pipe(
      Layer.provide(McpServer.layer)
    )
} as any

/**
 * Registers an MCP prompt from an Effect program.
 *
 * **When to use**
 *
 * Use when you are already inside an Effect program with an `McpServer`
 * service and need to add a prompt handler directly.
 *
 * **Details**
 *
 * Parameters are decoded with the supplied schema, completion handlers encode
 * per-parameter suggestions, and string prompt content is converted into a user
 * text message.
 *
 * @see {@link prompt} for the layer-based prompt registration wrapper
 *
 * @category handlers
 * @since 4.0.0
 */
export const registerPrompt = <
  E,
  R,
  Params extends Schema.Struct.Fields = {},
  const Completions extends {
    readonly [K in keyof Params]?: (
      input: string,
      context: CompletionContext
    ) => Effect.Effect<Array<Params[K]["Type"]>, any, any>
  } = {}
>(
  options: {
    readonly name: string
    readonly description?: string | undefined
    readonly parameters?: Params | undefined
    readonly completion?: ValidateCompletions<Completions, Extract<keyof Params, string>> | undefined
    readonly content: (
      params: Schema.Struct.Type<Params>
    ) => Effect.Effect<Array<typeof PromptMessage.Type> | string, E, R>
    readonly annotations?: Context.Context<never> | undefined
  }
): Effect.Effect<
  void,
  never,
  Exclude<Schema.Struct.DecodingServices<Params> | R, McpRequestContext | McpServerClient> | McpServer
> => {
  const args = Arr.empty<typeof PromptArgument.Type>()
  const props: Record<string, Schema.Constraint> = options.parameters ?? {}
  for (const [name, prop] of Object.entries(props)) {
    args.push({
      name,
      description: SchemaAST.resolveDescription(prop.ast),
      required: !SchemaAST.isOptional(prop.ast)
    })
  }
  const prompt = new Prompt({
    name: options.name,
    description: options.description,
    arguments: args
  })
  const decode = options.parameters
    ? Schema.decodeEffect(Schema.Struct(props))
    : () => Effect.succeed({} as Params)
  const completion: Record<
    string,
    (
      input: string,
      context: CompletionContext
    ) => Effect.Effect<any>
  > = options.completion ?? {}
  return Effect.gen(function*() {
    const registry = yield* McpServer
    const services = yield* Effect.context<
      Exclude<R | Schema.Struct.DecodingServices<Params>, McpRequestContext | McpServerClient>
    >()
    const completions: Record<
      string,
      (
        input: string,
        context: CompletionContext
      ) => Effect.Effect<CompleteResult, InternalError, McpRequestContext | McpServerClient>
    > = Object.create(null)
    for (const [param, handle] of Object.entries(completion)) {
      const encodeArray = Schema.encodeEffect(Schema.Array(props[param]))
      const handler = (
        input: string,
        context: CompletionContext
      ) =>
        handle(input, context).pipe(
          Effect.flatMap(encodeArray),
          Effect.map((values) => ({
            completion: {
              values: values as Array<string>,
              total: values.length,
              hasMore: false
            }
          })),
          Effect.catchCause((cause) => {
            const prettyError = Cause.prettyErrors(cause)[0]
            return Effect.fail(new InternalError({ message: prettyError.message }))
          }),
          Effect.provide(services)
        )
      completions[param] = handler as any
    }
    yield* registry.addPrompt({
      prompt,
      completions,
      annotations: options.annotations ?? Context.empty(),
      handle: (params) =>
        decode(params).pipe(
          Effect.mapError((error) => new InvalidParams({ message: error.message })),
          Effect.flatMap((params) =>
            options.content(params as any).pipe(
              Effect.catchCause((cause) => {
                const prettyError = Cause.prettyErrors(cause)[0]
                return Effect.fail(new InternalError({ message: prettyError.message }))
              })
            )
          ),
          Effect.map((messages) => {
            messages = typeof messages === "string" ?
              [{
                role: "user",
                content: TextContent.make({ text: messages })
              }] :
              messages
            return new GetPromptResult({ messages, description: prompt.description })
          }),
          Effect.provideContext(services as Context.Context<unknown>)
        )
    })
  })
}

/**
 * Creates a layer that registers an MCP prompt.
 *
 * **When to use**
 *
 * Use to compose prompt registration into an MCP server layer.
 *
 * **Details**
 *
 * Parameters are decoded with the supplied schema, completion handlers encode
 * per-parameter suggestions, and string prompt content is converted into a user
 * text message.
 *
 * @see {@link registerPrompt} for the Effect-level prompt registration API
 *
 * @category layers
 * @since 4.0.0
 */
export const prompt = <
  E,
  R,
  Params extends Schema.Struct.Fields = {},
  const Completions extends {
    readonly [K in keyof Params]?: (
      input: string,
      context: CompletionContext
    ) => Effect.Effect<Array<Params[K]["Type"]>, any, any>
  } = {}
>(
  options: {
    readonly name: string
    readonly description?: string | undefined
    readonly parameters?: Params | undefined
    readonly completion?: ValidateCompletions<Completions, Extract<keyof Params, string>> | undefined
    readonly content: (
      params: Schema.Struct.Type<Params>
    ) => Effect.Effect<Array<typeof PromptMessage.Type> | string, E, R>
    readonly annotations?: Context.Context<never> | undefined
  }
): Layer.Layer<
  never,
  never,
  Exclude<Schema.Struct.DecodingServices<Params> | R, McpRequestContext | McpServerClient>
> =>
  Layer.effectDiscard(registerPrompt(options)).pipe(
    Layer.provide(McpServer.layer)
  )

/**
 * Collects structured input from the current MCP client and decodes the
 * accepted response with `schema`.
 *
 * **Details**
 *
 * Accepted content is decoded with the supplied schema, declined requests fail
 * with `ElicitationDeclined`, and canceled requests interrupt the effect.
 *
 * @category accessors
 * @since 4.0.0
 */
export const elicit: <S extends Schema.ConstraintEncoder<Record<string, unknown>, unknown>>(options: {
  readonly message: string
  readonly schema: S
}) => Effect.Effect<
  S["Type"],
  ElicitationDeclined,
  McpServerClient | S["DecodingServices"]
> = Effect.fnUntraced(function*<S extends Schema.ConstraintEncoder<Record<string, unknown>, unknown>>(options: {
  readonly message: string
  readonly schema: S
}) {
  const { getClient } = yield* McpServerClient
  const client = yield* getClient
  const schema = options.schema
  const request = yield* Schema.decodeUnknownEffect(McpSchema.ElicitRequestFormParams)({
    mode: "form",
    message: options.message,
    requestedSchema: Tool.getJsonSchemaFromSchema(schema)
  }).pipe(Effect.orDie)
  const res = yield* client.elicit(request).pipe(
    Effect.catchCause((cause) => Effect.fail(new ElicitationDeclined({ cause: Cause.squash(cause), request })))
  )
  switch (res.action) {
    case "accept":
      return yield* Effect.orDie(Schema.decodeUnknownEffect(schema)(res.content))
    case "cancel":
      return yield* Effect.interrupt
    case "decline":
      return yield* new ElicitationDeclined({ request })
  }
}, Effect.scoped)

/**
 * Accesses the current client's capabilities.
 *
 * @category accessors
 * @since 4.0.0
 */
export const clientCapabilities: Effect.Effect<
  ClientCapabilities,
  never,
  McpRequestContext
> = McpRequestContext.useSync((_) => _.clientCapabilities)

// -----------------------------------------------------------------------------
// Internal
// -----------------------------------------------------------------------------

const makeUriMatcher = <A>() => {
  const router = FindMyWay.make<A>({
    ignoreTrailingSlash: true,
    ignoreDuplicateSlashes: true,
    caseSensitive: true
  })
  const add = (uri: string, value: A) => {
    router.on("GET", `/${uri}`, value)
  }
  const find = (uri: string) => router.find("GET", `/${uri}`)

  return { add, find } as const
}

const compileUriTemplate = (segments: TemplateStringsArray, ...schemas: ReadonlyArray<Schema.Constraint>) => {
  let routerPath = segments[0].replace(":", "::")
  let uriPath = segments[0]
  const params: Record<string, Schema.Top> = Object.create(null)
  let pathSchema = Schema.Tuple([]) as Schema.Top
  if (schemas.length > 0) {
    const arr: Array<Schema.Top> = []
    for (let i = 0; i < schemas.length; i++) {
      const toCodecStringTree = Schema.toCodecStringTree(schemas[i])
      const segment = segments[i + 1]
      const key = String(i)
      arr.push(toCodecStringTree)
      routerPath += `:${key}${segment.replace(":", "::")}`
      const schema = schemas[i]
      const paramName = isParam(schema) ? (schema as Param<string, Schema.Top>).name : `param${key}`
      params[paramName] = toCodecStringTree
      uriPath += `{${paramName}}${segment}`
    }
    pathSchema = Schema.Tuple(arr)
  }
  return {
    routerPath,
    uriPath,
    schema: pathSchema,
    params
  } as const
}

const resolveResourceContent = (
  uri: string,
  content: typeof ReadResourceResult.Type | string | Uint8Array
): typeof ReadResourceResult.Type => {
  if (typeof content === "string") {
    return {
      contents: [{
        uri,
        text: content
      }]
    }
  } else if (content instanceof Uint8Array) {
    return {
      contents: [{
        uri,
        blob: content
      }]
    }
  }
  return content
}

const InvalidBatchExit = Schema.Struct({
  _tag: Schema.Literal("Exit"),
  requestId: Schema.Null,
  exit: Schema.Struct({
    _tag: Schema.Literal("Failure"),
    cause: Schema.Unknown
  })
})

const decodeInvalidBatchExit = Schema.decodeUnknownResult(InvalidBatchExit)

const getProtocolForClient = (
  clientProtocols: Map<number, McpProtocol.AnyProtocolAdapter>,
  clientId: number,
  fallback: McpProtocol.AnyProtocolAdapter
): McpProtocol.AnyProtocolAdapter =>
  clientProtocols.get(clientId) ??
    fallback

const isProtocolVersion = (version: string): version is McpProtocol.ProtocolVersion =>
  version === "2024-11-05" ||
  version === "2025-03-26" ||
  version === "2025-06-18" ||
  version === "2025-11-25" ||
  version === "2026-07-28"
