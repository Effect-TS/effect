/**
 * Builds Model Context Protocol (MCP) servers with Effect.
 *
 * The `McpServer` service stores the tools, resources, resource templates,
 * prompts, completions, initialized clients, and outgoing notifications exposed
 * by a server. This module also includes the server runner, custom protocol,
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
import * as LogLevel from "../../LogLevel.ts"
import * as Option from "../../Option.ts"
import * as Predicate from "../../Predicate.ts"
import * as Queue from "../../Queue.ts"
import * as RcMap from "../../RcMap.ts"
import { CurrentLogLevel } from "../../References.ts"
import * as Schema from "../../Schema.ts"
import * as SchemaAST from "../../SchemaAST.ts"
import * as Sink from "../../Sink.ts"
import type { Stdio } from "../../Stdio.ts"
import * as Stream from "../../Stream.ts"
import type * as Types from "../../Types.ts"
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
import * as McpProtocolRegistry from "./internal/mcpProtocolRegistry.ts"
import type * as McpProtocol from "./McpProtocol.ts"
import {
  CallToolResult,
  CancelledNotification,
  ClientRpcs,
  Elicit,
  ElicitationDeclined,
  EnabledWhen,
  GetPromptResult,
  InternalError,
  INVALID_REQUEST_ERROR_CODE,
  InvalidParams,
  InvalidRequest,
  isParam,
  ListPromptsResult,
  ListResourcesResult,
  ListResourceTemplatesResult,
  ListToolsResult,
  LoggingMessageNotification,
  McpErrorBase,
  McpServerClient,
  McpServerClientMiddleware,
  MethodNotFound,
  ParseError,
  Prompt,
  Resource,
  ResourceTemplate,
  ResourceUpdatedNotification,
  ServerNotificationRpcs,
  TextContent,
  Tool as McpTool
} from "./McpSchema.ts"
import type {
  CallTool,
  ClientCapabilities,
  Complete,
  CompleteResult,
  GetPrompt,
  Initialize,
  LoggingLevel,
  Param,
  PromptArgument,
  PromptMessage,
  ReadResourceResult,
  ServerCapabilities
} from "./McpSchema.ts"
import * as Tool from "./Tool.ts"
import type * as Toolkit from "./Toolkit.ts"

type CompletionContext = typeof Complete.payloadSchema.Type["context"]

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
  readonly notifications: RpcClient.RpcClient<RpcGroup.Rpcs<typeof ServerNotificationRpcs>>
  readonly notificationsQueue: Queue.Dequeue<RpcMessage.Request<any>>
  readonly initializedClients: Set<number>

  readonly tools: ReadonlyArray<{
    readonly tool: McpTool
    readonly annotations: Context.Context<never>
  }>
  readonly addTool: (options: {
    readonly tool: McpTool
    readonly annotations: Context.Context<never>
    readonly handle: (payload: any) => Effect.Effect<CallToolResult, InternalError | InvalidParams, McpServerClient>
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
    readonly handle: Effect.Effect<typeof ReadResourceResult.Type, InternalError, McpServerClient>
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
        McpServerClient
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
      ) => Effect.Effect<CompleteResult, InternalError, McpServerClient>
    >
    readonly handle: (
      params: Record<string, string>
    ) => Effect.Effect<GetPromptResult, InternalError | InvalidParams, McpServerClient>
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
    const matcher = makeUriMatcher<
      {
        readonly _tag: "ResourceTemplate"
        readonly handle: (
          uri: string,
          params: Array<string>
        ) => Effect.Effect<
          typeof ReadResourceResult.Type,
          InternalError | InvalidParams,
          McpServerClient
        >
      } | {
        readonly _tag: "Resource"
        readonly effect: Effect.Effect<typeof ReadResourceResult.Type, InternalError, McpServerClient>
      }
    >()
    const tools = Arr.empty<{
      readonly tool: McpTool
      readonly annotations: Context.Context<never>
    }>()
    const toolMap = new Map<
      string,
      (payload: any) => Effect.Effect<CallToolResult, InternalError | InvalidParams, McpServerClient>
    >()
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
    const promptMap = new Map<
      string,
      (params: Record<string, string>) => Effect.Effect<GetPromptResult, InternalError | InvalidParams, McpServerClient>
    >()
    const completionsMap = new Map<
      string,
      (
        input: string,
        context: CompletionContext
      ) => Effect.Effect<CompleteResult, InternalError, McpServerClient>
    >()
    const notificationsQueue = yield* Queue.make<RpcMessage.Request<any>>()
    const listChangedHandles = new Map<string, any>()
    const notifications = yield* RpcClient.makeNoSerialization(ServerNotificationRpcs, {
      spanPrefix: "McpServer/Notifications",
      onFromClient: (options) =>
        Effect.suspend((): Effect.Effect<void> => {
          const message = options.message
          if (message._tag !== "Request") {
            return Effect.void
          }
          if (message.tag.includes("list_changed")) {
            if (!listChangedHandles.has(message.tag)) {
              listChangedHandles.set(
                message.tag,
                setTimeout(() => {
                  Queue.offerUnsafe(notificationsQueue, message)
                  listChangedHandles.delete(message.tag)
                }, 0)
              )
            }
          } else {
            Queue.offerUnsafe(notificationsQueue, message)
          }
          return notifications.write({
            clientId: 0,
            requestId: message.id,
            _tag: "Exit",
            exit: Exit.void as any
          })
        })
    })

    return McpServer.of({
      notifications: notifications.client,
      notificationsQueue,
      initializedClients: new Set(),
      get tools() {
        return tools
      },
      addTool: (options) =>
        Effect.suspend(() => {
          tools.push(options)
          toolMap.set(options.tool.name, options.handle)
          return notifications.client["notifications/tools/list_changed"]({})
        }),
      callTool: (request) =>
        Effect.suspend((): Effect.Effect<CallToolResult, InternalError | InvalidParams, McpServerClient> => {
          const handle = toolMap.get(request.name)
          if (!handle) {
            return Effect.fail(new InvalidParams({ message: `Tool '${request.name}' not found` }))
          }
          return handle(request.arguments).pipe(
            Effect.catchDefect(() => Effect.fail(new InternalError({ message: "Internal error" })))
          )
        }),
      get resources() {
        return resources
      },
      get resourceTemplates() {
        return resourceTemplates
      },
      addResource: (options) =>
        Effect.suspend(() => {
          resources.push(options)
          matcher.add(options.resource.uri, { _tag: "Resource", effect: options.handle })
          return notifications.client["notifications/resources/list_changed"]({})
        }),
      addResourceTemplate: ({ annotations, completions, handle, routerPath, template }) =>
        Effect.suspend(() => {
          resourceTemplates.push({ template, annotations })
          matcher.add(routerPath, { _tag: "ResourceTemplate", handle })
          for (const [param, handle] of Object.entries(completions)) {
            completionsMap.set(`ref/resource/${template.uriTemplate}/${param}`, handle)
          }
          return notifications.client["notifications/resources/list_changed"]({})
        }),
      findResource: (uri) =>
        Effect.suspend(() => {
          const match = matcher.find(uri)
          if (!match) {
            return Effect.fail(new McpErrorBase({ code: -32002, message: `Resource '${uri}' not found` }))
          } else if (match.handler._tag === "Resource") {
            return match.handler.effect
          }
          const params: Array<string> = []
          for (const key of Object.keys(match.params)) {
            params[Number(key)] = match.params[key]!
          }
          return match.handler.handle(uri, params)
        }),
      get prompts() {
        return prompts
      },
      addPrompt: (options) =>
        Effect.suspend(() => {
          prompts.push(options)
          promptMap.set(options.prompt.name, options.handle)
          for (const [param, handle] of Object.entries(options.completions)) {
            completionsMap.set(`ref/prompt/${options.prompt.name}/${param}`, handle)
          }
          return notifications.client["notifications/prompts/list_changed"]({})
        }),
      getPromptResult: Effect.fnUntraced(function*({ arguments: params, name }) {
        const handler = promptMap.get(name)
        if (!handler) {
          return yield* new InvalidParams({ message: `Prompt '${name}' not found` })
        }
        return yield* handler(params ?? {})
      }),
      completion: Effect.fnUntraced(function*(complete) {
        const ref = complete.ref
        const key = ref.type === "ref/resource"
          ? `ref/resource/${ref.uri}/${complete.argument.name}`
          : `ref/prompt/${ref.name}/${complete.argument.name}`
        const handler = completionsMap.get(key)
        if (!handler) {
          return yield* new InvalidParams({ message: "Unknown completion reference or argument" })
        }
        const result = yield* handler(complete.argument.value, complete.context)
        const values = Arr.take(result.completion.values, 100)
        return {
          completion: {
            ...result.completion,
            values,
            hasMore: result.completion.hasMore === true ||
              values.length < result.completion.values.length
          }
        }
      })
    })
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
const decodeCancelledNotification = Schema.decodeUnknownEffect(
  Schema.toCodecJson(CancelledNotification.payloadSchema)
)

const requestKey = (requestId: string | number): string => `${typeof requestId}:${requestId}`

type SessionLogLevel =
  | {
    readonly _tag: "Effect"
    readonly level: LogLevel.LogLevel
  }
  | {
    readonly _tag: "Mcp"
    readonly level: LoggingLevel
  }

interface Session {
  readonly initializePayload: typeof Initialize.payloadSchema.Type
  readonly protocol: McpProtocol.ProtocolAdapter
  readonly resourceSubscriptions: Set<string> | undefined
  logLevel: SessionLogLevel
}

interface Sessions {
  readonly bySessionId: Map<string, Session>
  readonly byClientId: Map<number, Session>
}

class McpClientKey extends Data.Class<{
  readonly clientId: number
  readonly protocolVersion: string
}> {}

class McpProtocolState extends Context.Service<McpProtocolState, {
  readonly sessions: Sessions
  readonly protocolRegistry: McpProtocolRegistry.ProtocolRegistry<McpProtocol.ProtocolAdapter>
}>()("effect/ai/McpServer/McpProtocolState") {}

const makeMcpProtocolState = Effect.fnUntraced(function*(
  protocols: Arr.NonEmptyReadonlyArray<McpProtocol.ProtocolAdapter>
) {
  return McpProtocolState.of({
    sessions: {
      bySessionId: new Map(),
      byClientId: new Map()
    },
    protocolRegistry: yield* McpProtocolRegistry.make(protocols)
  })
})

const layerMcpProtocolState = (
  protocols: Arr.NonEmptyReadonlyArray<McpProtocol.ProtocolAdapter>
): Layer.Layer<McpProtocolState, Cause.IllegalArgumentError> =>
  Layer.effect(McpProtocolState)(makeMcpProtocolState(protocols))

/**
 * Runs an MCP server over the current `RpcServer.Protocol`.
 *
 * **Details**
 *
 * The server performs initialization and session handling, serves registered
 * tools, resources, and prompts, and forwards queued server notifications to
 * initialized clients.
 *
 * @category running
 * @since 4.0.0
 */
export const run: (options: {
  readonly name: string
  readonly version: string
  readonly protocols: Arr.NonEmptyReadonlyArray<McpProtocol.ProtocolAdapter>
  readonly extensions?: Record<`${string}/${string}`, unknown> | undefined
}) => Effect.Effect<
  never,
  Cause.IllegalArgumentError,
  McpServer | RpcServer.Protocol
> = Effect.fnUntraced(function*(options: {
  readonly name: string
  readonly version: string
  readonly protocols: Arr.NonEmptyReadonlyArray<McpProtocol.ProtocolAdapter>
  readonly extensions?: Record<`${string}/${string}`, unknown> | undefined
}) {
  const protocolStateOption = yield* Effect.serviceOption(McpProtocolState)
  const protocolState = Option.isSome(protocolStateOption)
    ? protocolStateOption.value
    : yield* makeMcpProtocolState(options.protocols)
  return yield* runWithProtocolState(options, protocolState)
})

const runWithProtocolState = Effect.fnUntraced(function*(options: {
  readonly name: string
  readonly version: string
  readonly extensions?: Record<`${string}/${string}`, unknown> | undefined
}, protocolState: McpProtocolState["Service"]) {
  const serverScope = yield* Effect.scope
  const protocolRegistry = protocolState.protocolRegistry
  const protocol = yield* RpcServer.Protocol
  const server = yield* McpServer
  const isHttp = Option.isSome(yield* Effect.serviceOption(HttpRouter.HttpRouter))
  const sessions = protocolState.sessions
  const clientProtocols = new Map<number, McpProtocol.ProtocolAdapter>()
  const cancelledRequests = new Map<number, Set<string>>()
  const handlers = yield* Layer.build(layerHandlers(options, {
    sessions,
    protocolRegistry
  }))

  const clients = yield* RcMap.make({
    lookup: Effect.fnUntraced(function*(key: McpClientKey) {
      const selectedProtocol = protocolRegistry.select(key.protocolVersion)
      let write!: (message: RpcMessage.FromServerEncoded) => Effect.Effect<void>
      const client = yield* RpcClient.make(selectedProtocol.serverRequestRpcs, {
        spanPrefix: "McpServer/Client"
      }).pipe(
        Effect.provideServiceEffect(
          RpcClient.Protocol,
          RpcClient.Protocol.make(Effect.fnUntraced(function*(writeResponse) {
            let cid = 0
            write = (message) => writeResponse(cid, message)
            return {
              send(id, request, _transferables) {
                cid = id
                return protocol.send(key.clientId, {
                  ...request,
                  headers: undefined,
                  traceId: undefined,
                  spanId: undefined,
                  sampled: undefined
                } as any)
              },
              supportsAck: true,
              supportsTransferables: false,
              supportsStructuredClone: false
            }
          }))
        )
      )

      return { client, write } as const
    }),
    idleTimeToLive: 10000
  })

  const clientMiddleware = McpServerClientMiddleware.of((effect, { client, headers, payload, rpc }) => {
    const session = getClientSession(sessions, client.id, headers)
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
    const selectedProtocol = session?.protocol ?? protocolForInternalTag(protocolRegistry, rpc._tag)
    return effect.pipe(
      Effect.provideService(
        McpServerClient,
        McpServerClient.of({
          clientId: client.id,
          protocolVersion: selectedProtocol.protocolVersion,
          initializePayload: session?.initializePayload ?? payload as typeof Initialize.payloadSchema.Type,
          getClient: RcMap.get(
            clients,
            new McpClientKey({
              clientId: client.id,
              protocolVersion: selectedProtocol.protocolVersion
            })
          ).pipe(
            Effect.map(({ client }) => client)
          )
        })
      ),
      Effect.provideService(CurrentLogLevel, effectLogLevel(session?.logLevel))
    )
  })

  const patchedProtocol = RpcServer.Protocol.of({
    ...protocol,
    send: (clientId, response) => {
      if (response._tag === "Exit") {
        const requests = cancelledRequests.get(clientId)
        if (requests?.delete(requestKey(response.requestId)) === true) {
          if (requests.size === 0) {
            cancelledRequests.delete(clientId)
          }
          return Effect.void
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
            const session = getClientSession(sessions, clientId, headers)
            const selectedProtocol = session?.protocol ??
              (request.tag === "initialize"
                ? protocolRegistry.select(getOfferedProtocolVersion(request.payload))
                : protocolRegistry.protocols[0])
            clientProtocols.set(clientId, selectedProtocol)
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
            const routedRequest = protocolRegistry.routeClientRequest(selectedProtocol, request)
            const rpc = protocolRegistry.clientRpcs.requests.get(routedRequest.tag)
            if (rpc && selectedProtocol.clientNotificationRpcs.requests.has(request.tag)) {
              if (!session) {
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
              if (request.tag === "notifications/cancelled") {
                return decodeCancelledNotification(request.payload).pipe(
                  Effect.flatMap(({ requestId }) => {
                    const requests = cancelledRequests.get(clientId) ?? new Set<string>()
                    requests.add(requestKey(requestId))
                    cancelledRequests.set(clientId, requests)
                    return f(clientId, {
                      _tag: "Interrupt",
                      requestId: RpcMessage.RequestId(requestId)
                    })
                  }),
                  Effect.catchCause(() => Effect.void)
                )
              }
              return selectedProtocol.payloadCodecs(rpc).decode(request.payload).pipe(
                Effect.flatMap((payload) => {
                  if (
                    request.tag === "notifications/roots/list_changed" &&
                    session.initializePayload.capabilities.roots?.listChanged === true
                  ) {
                    if (httpRequest !== undefined) {
                      return Effect.void
                    }
                    return RcMap.get(
                      clients,
                      new McpClientKey({
                        clientId,
                        protocolVersion: selectedProtocol.protocolVersion
                      })
                    ).pipe(
                      Effect.flatMap(({ client }) => client["roots/list"](undefined)),
                      Effect.scoped,
                      Effect.ignoreCause,
                      Effect.forkIn(serverScope),
                      Effect.asVoid
                    )
                  }
                  const handler = handlers.mapUnsafe.get(rpc.key) as Rpc.Handler<string> | undefined
                  return handler
                    ? handler.handler(payload, {
                      rpc,
                      requestId: RpcMessage.RequestId(request.id),
                      client: new Rpc.ServerClient(clientId),
                      headers
                    }) as any as Effect.Effect<void>
                    : Effect.void
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
                  cause: [{ _tag: "Fail", error: new MethodNotFound({ message: `Method not found: ${request.tag}` }) }]
                }
              })
            }
            return selectedProtocol.payloadCodecs(rpc).decode(request.payload).pipe(
              Effect.matchEffect({
                onSuccess: () => f(clientId, routedRequest),
                onFailure: () =>
                  request.isNotification
                    ? Effect.void
                    : protocol.send(clientId, {
                      _tag: "Exit",
                      requestId: request.id,
                      exit: {
                        _tag: "Failure",
                        cause: [{ _tag: "Fail", error: new InvalidParams({ message: "Invalid method parameters" }) }]
                      }
                    })
              })
            )
          }
          case "Ping":
          case "Ack":
          case "Interrupt":
            return f(clientId, request)
          case "Eof":
            cancelledRequests.delete(clientId)
            return f(clientId, request)
          case "Pong":
          case "Exit":
          case "Chunk":
          case "ClientProtocolError":
          case "Defect":
            return RcMap.get(
              clients,
              new McpClientKey({
                clientId,
                protocolVersion: getProtocolForClient(clientProtocols, clientId, protocolRegistry).protocolVersion
              })
            ).pipe(
              Effect.flatMap(({ write }) => write(request)),
              Effect.scoped
            )
        }
      })
  })

  yield* Queue.take(server.notificationsQueue).pipe(
    Effect.flatMap(Effect.fnUntraced(function*(request) {
      const clientIds = yield* patchedProtocol.clientIds
      for (const clientId of clientProtocols.keys()) {
        if (!clientIds.has(clientId)) {
          clientProtocols.delete(clientId)
          sessions.byClientId.delete(clientId)
        }
      }
      for (const clientId of server.initializedClients.keys()) {
        if (!clientIds.has(clientId)) {
          server.initializedClients.delete(clientId)
          continue
        }
        const selectedProtocol = clientProtocols.get(clientId)
        if (!selectedProtocol) {
          continue
        }
        const rpc = selectedProtocol.serverNotificationRpcs.requests.get(request.tag)
        if (!rpc) {
          continue
        }
        if (request.tag === "notifications/message") {
          const { level } = yield* Schema.decodeUnknownEffect(
            LoggingMessageNotification.payloadSchema
          )(request.payload)
          if (!isMcpLogLevelEnabled(level, sessions.byClientId.get(clientId)?.logLevel)) {
            continue
          }
        }
        if (request.tag === "notifications/resources/updated") {
          const { uri } = yield* Schema.decodeUnknownEffect(
            ResourceUpdatedNotification.payloadSchema
          )(request.payload)
          if (sessions.byClientId.get(clientId)?.resourceSubscriptions?.has(uri) !== true) {
            continue
          }
        }
        const encoded = yield* selectedProtocol.payloadCodecs(rpc).encode(request.payload)
        // TODO: Extend RpcServer.Protocol's outbound message contract with server-originated
        // notifications so MCP does not need to treat this notification as an RPC response.
        const message: RpcMessage.RequestEncoded = {
          _tag: "Request",
          tag: request.tag,
          payload: encoded
        } as any
        yield* patchedProtocol.send(clientId, message as any)
      }
    })),
    Effect.catchCause(() => Effect.void),
    Effect.forever,
    Effect.forkScoped
  )

  return yield* RpcServer.make(protocolRegistry.clientRpcs, {
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
 * `RpcServer.Protocol` and provides the `McpServer` and `McpServerClient`
 * services.
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
  readonly protocols: Arr.NonEmptyReadonlyArray<McpProtocol.ProtocolAdapter>
  readonly extensions?: Record<`${string}/${string}`, unknown> | undefined
}): Layer.Layer<McpServer | McpServerClient, Cause.IllegalArgumentError, RpcServer.Protocol> =>
  layerWithProtocolState(options).pipe(
    Layer.provide(layerMcpProtocolState(options.protocols))
  )

const layerWithProtocolState = (options: {
  readonly name: string
  readonly version: string
  readonly extensions?: Record<`${string}/${string}`, unknown> | undefined
}): Layer.Layer<McpServer | McpServerClient, never, RpcServer.Protocol | McpProtocolState> =>
  Layer.effectDiscard(
    Effect.gen(function*() {
      const protocolState = yield* McpProtocolState
      yield* Effect.forkScoped(runWithProtocolState(options, protocolState))
    })
  ).pipe(
    Layer.provideMerge(McpServer.layer)
  )

const StdioInitializeRequest = Schema.Struct({
  method: Schema.Literal("initialize"),
  params: Schema.Struct({
    protocolVersion: Schema.String
  })
})

const StdioInvalidBatchExit = Schema.Struct({
  _tag: Schema.Literal("Exit"),
  requestId: Schema.Null,
  exit: Schema.Struct({
    cause: Schema.Unknown
  })
})

const decodeStdioInitializeRequest = Schema.decodeUnknownOption(StdioInitializeRequest)
const decodeStdioInvalidBatchExit = Schema.decodeUnknownOption(StdioInvalidBatchExit)

const makeStdioSerialization = (
  protocols: Arr.NonEmptyReadonlyArray<McpProtocol.ProtocolAdapter>
): RpcSerialization.RpcSerialization["Service"] =>
  RpcSerialization.RpcSerialization.of({
    contentType: "application/json-rpc",
    includesFraming: true,
    makeUnsafe: () => {
      const framing = RpcSerialization.ndjson.makeUnsafe()
      const jsonRpc = RpcSerialization.jsonRpc().makeUnsafe()
      const protocolsByVersion = new Map<string, McpProtocol.ProtocolAdapter>(
        protocols.map((protocol) => [protocol.protocolVersion, protocol])
      )
      let selectedProtocol = protocols[0]
      return {
        decode: (data) => {
          const frames = framing.decode(data)
          const messages: Array<unknown> = []
          for (const frame of frames) {
            const entries = Array.isArray(frame) ? frame : [frame]
            const initialize = Arr.findFirst(entries, (entry) => decodeStdioInitializeRequest(entry))
            selectedProtocol = Option.match(initialize, {
              onNone: () => selectedProtocol,
              onSome: ({ params }) => protocolsByVersion.get(params.protocolVersion) ?? protocols[0]
            })
            if (Array.isArray(frame) && !selectedProtocol.transport.acceptsJsonRpcBatches) {
              messages.push({
                _tag: "Request",
                id: null,
                tag: MCP_INVALID_BATCH_METHOD,
                payload: null,
                headers: []
              })
            } else {
              messages.push(...jsonRpc.decode(JSON.stringify(frame)))
            }
          }
          return messages
        },
        encode: (response) => {
          const invalidBatchExit = decodeStdioInvalidBatchExit(response)
          if (Option.isSome(invalidBatchExit)) {
            return framing.encode({
              jsonrpc: "2.0",
              id: null,
              error: {
                _tag: "Cause",
                code: INVALID_REQUEST_ERROR_CODE,
                message: "JSON-RPC batches are not supported",
                data: invalidBatchExit.value.exit.cause
              }
            })
          }
          const encoded = jsonRpc.encode(response)
          return encoded === undefined ? undefined : `${encoded}\n`
        }
      }
    }
  })

/**
 * Runs the McpServer, using stdio for input and output.
 *
 * **Example** (Configuring an MCP server over stdio)
 *
 * ```ts import.meta.vitest
 * import { Effect, Layer, Schema } from "effect"
 * import { McpProtocol, McpSchema, McpServer } from "effect/unstable/ai"
 *
 * const idParam = McpSchema.param("id", Schema.Number)
 *
 * const ReadmeTemplate = McpServer.resource`file://readme/${idParam}`({
 *   name: "README Template",
 *   completion: {
 *     id: () => Effect.succeed([1, 2, 3])
 *   },
 *   content: (_uri, id) => Effect.succeed(`# MCP Server Demo - ID: ${id}`)
 * })
 *
 * const TestPrompt = McpServer.prompt({
 *   name: "Test Prompt",
 *   description: "Looks up flight booking details",
 *   parameters: {
 *     flightNumber: Schema.String
 *   },
 *   completion: {
 *     flightNumber: () => Effect.succeed(["FL123", "FL456"])
 *   },
 *   content: ({ flightNumber }) =>
 *     Effect.succeed(`Get the booking details for flight number: ${flightNumber}`)
 * })
 *
 * const ServerLayer = Layer.mergeAll(ReadmeTemplate, TestPrompt).pipe(
 *   Layer.provide(McpServer.layerStdio({
 *     name: "Demo Server",
 *     version: "1.0.0",
 *     protocols: [McpProtocol.v2025_06_18]
 *   }))
 * )
 *
 * Layer.isLayer(ServerLayer) // => true
 * ```
 *
 * @category layers
 * @since 4.0.0
 */
export const layerStdio = (options: {
  readonly name: string
  readonly version: string
  readonly protocols: Arr.NonEmptyReadonlyArray<McpProtocol.ProtocolAdapter>
  readonly extensions?: Record<`${string}/${string}`, unknown> | undefined
}): Layer.Layer<McpServer | McpServerClient, Cause.IllegalArgumentError, Stdio> =>
  layer(options).pipe(
    Layer.provide(RpcServer.layerProtocolStdio),
    Layer.provide(
      Layer.succeed(RpcSerialization.RpcSerialization)(makeStdioSerialization(options.protocols))
    )
  )

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
 * Unsupported protocol versions return `400`; methods without MCP handlers
 * return `405`. Browser Origins are rejected unless listed in `allowedOrigins`.
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
  readonly path: HttpRouter.PathInput
  readonly protocols: Arr.NonEmptyReadonlyArray<McpProtocol.ProtocolAdapter>
  readonly allowedOrigins?: ReadonlyArray<string> | undefined
  readonly extensions?: Record<`${string}/${string}`, unknown> | undefined
}): Layer.Layer<McpServer | McpServerClient, Cause.IllegalArgumentError, HttpRouter.HttpRouter> => {
  const protocolState = layerMcpProtocolState(options.protocols)
  const methodNotAllowedResponse = HttpServerResponse.empty({
    status: 405,
    headers: { allow: "POST" }
  })
  const methodNotAllowed = (request: HttpServerRequest.HttpServerRequest) =>
    Effect.succeed(
      request.headers.origin !== undefined &&
        !options.allowedOrigins?.includes(request.headers.origin)
        ? HttpServerResponse.empty({ status: 403 })
        : methodNotAllowedResponse
    )
  const routes = Layer.mergeAll(
    HttpRouter.add("GET", options.path, methodNotAllowed),
    HttpRouter.add("PUT", options.path, methodNotAllowed),
    HttpRouter.add("PATCH", options.path, methodNotAllowed),
    HttpRouter.add("DELETE", options.path, methodNotAllowed),
    HttpRouter.add("OPTIONS", options.path, methodNotAllowed)
  )
  return Layer.merge(layerWithProtocolState(options), routes).pipe(
    Layer.provide(layerMcpProtocolHttp(options)),
    Layer.provide(protocolState),
    Layer.provide(RpcSerialization.layerJsonRpc())
  )
}

const layerMcpProtocolHttp = (options: {
  readonly path: HttpRouter.PathInput
  readonly allowedOrigins?: ReadonlyArray<string> | undefined
}): Layer.Layer<
  RpcServer.Protocol,
  never,
  McpProtocolState | RpcSerialization.RpcSerialization | HttpRouter.HttpRouter
> =>
  Layer.effect(RpcServer.Protocol)(Effect.gen(function*() {
    const state = yield* McpProtocolState
    const { httpEffect, protocol } = yield* RpcServer.makeProtocolWithHttpEffect
    const router = yield* HttpRouter.HttpRouter
    yield* router.add("POST", options.path, (request) => {
      if (
        request.headers.origin !== undefined &&
        !options.allowedOrigins?.includes(request.headers.origin)
      ) {
        return Effect.succeed(HttpServerResponse.empty({ status: 403 }))
      }
      const contentType = request.headers["content-type"]?.split(";", 1)[0]?.trim().toLowerCase()
      if (contentType !== "application/json") {
        return Effect.succeed(HttpServerResponse.empty({ status: 415 }))
      }
      const accepted = new Set<string>()
      for (const entry of request.headers.accept?.split(",") ?? []) {
        const [mediaType, ...parameters] = entry.split(";").map((part) => part.trim().toLowerCase())
        let quality = 1
        for (const parameter of parameters) {
          const [name, value] = parameter.split("=", 2).map((part) => part.trim())
          if (name === "q") {
            quality = value === undefined ? Number.NaN : Number(value)
          }
        }
        if (mediaType !== undefined && quality > 0 && quality <= 1) {
          accepted.add(mediaType)
        }
      }
      if (!accepted.has("application/json") || !accepted.has("text/event-stream")) {
        return Effect.succeed(HttpServerResponse.empty({ status: 406 }))
      }
      const protocolVersion = request.headers[MCP_PROTOCOL_VERSION_HEADER]
      if (
        protocolVersion !== undefined &&
        !state.protocolRegistry.protocols.some((protocol) => protocol.protocolVersion === protocolVersion)
      ) {
        return Effect.succeed(HttpServerResponse.empty({ status: 400 }))
      }
      return request.text.pipe(
        Effect.matchEffect({
          onFailure: () =>
            Effect.succeed(
              HttpServerResponse.jsonUnsafe({
                jsonrpc: "2.0",
                id: null,
                error: new ParseError({
                  message: "Parse error"
                })
              })
            ),
          onSuccess: (body) => {
            return Effect.match(Schema.decodeUnknownEffect(Schema.UnknownFromJsonString)(body), {
              onFailure: () => ({
                _tag: "Error" as const,
                id: null,
                error: new ParseError({ message: "Parse error" })
              }),
              onSuccess: (input) => {
                if (Array.isArray(input)) {
                  const sessionId = request.headers[MCP_SESSION_ID_HEADER]
                  const session = sessionId === undefined ? undefined : state.sessions.bySessionId.get(sessionId)
                  let selectedProtocol = session?.protocol ?? state.protocolRegistry.protocols[0]
                  for (const entry of input) {
                    if (
                      Predicate.hasProperty(entry, "method") &&
                      entry.method === "initialize" &&
                      Predicate.hasProperty(entry, "params") &&
                      Predicate.hasProperty(entry.params, "protocolVersion") &&
                      typeof entry.params.protocolVersion === "string"
                    ) {
                      selectedProtocol = state.protocolRegistry.select(entry.params.protocolVersion)
                      break
                    }
                  }
                  if (!selectedProtocol.transport.acceptsJsonRpcBatches) {
                    return { _tag: "HttpError" as const, status: 400 }
                  }
                }
                const hasId = Predicate.hasProperty(input, "id")
                const id = hasId && (typeof input.id === "string" || typeof input.id === "number")
                  ? input.id
                  : null
                const isJsonRpc = Predicate.hasProperty(input, "jsonrpc") && input.jsonrpc === "2.0"
                const hasValidRequestId = hasId === false || typeof input.id === "string" ||
                  typeof input.id === "number"
                const isRequest = isJsonRpc && hasValidRequestId &&
                  Predicate.hasProperty(input, "method") && typeof input.method === "string"
                const hasValidResponseId = hasId &&
                  (typeof input.id === "string" || typeof input.id === "number" || input.id === null)
                const hasResult = Predicate.hasProperty(input, "result")
                const hasError = Predicate.hasProperty(input, "error")
                const isResponse = isJsonRpc && hasValidResponseId && hasResult !== hasError
                const isInitialize = isRequest && input.method === "initialize"
                const sessionId = request.headers[MCP_SESSION_ID_HEADER]
                const session = sessionId === undefined ? undefined : state.sessions.bySessionId.get(sessionId)
                if (isInitialize && sessionId !== undefined) {
                  return {
                    _tag: "HttpError" as const,
                    status: session === undefined ? 404 : 400
                  }
                }
                if (!isInitialize && isRequest && session === undefined) {
                  return {
                    _tag: "HttpError" as const,
                    status: sessionId === undefined ? 400 : 404
                  }
                }
                if (
                  session !== undefined &&
                  session.protocol.transport.requiresVersionHeader &&
                  protocolVersion !== session.protocol.protocolVersion
                ) {
                  return { _tag: "HttpError" as const, status: 400 }
                }
                return isRequest || isResponse
                  ? { _tag: "Success" as const }
                  : {
                    _tag: "Error" as const,
                    id,
                    error: new InvalidRequest({ message: "Invalid Request" })
                  }
              }
            }).pipe(
              Effect.flatMap((decoded) =>
                decoded._tag === "HttpError"
                  ? Effect.succeed(HttpServerResponse.empty({ status: decoded.status }))
                  : decoded._tag === "Error"
                  ? Effect.succeed(
                    HttpServerResponse.jsonUnsafe({
                      jsonrpc: "2.0",
                      id: decoded.id,
                      error: decoded.error
                    })
                  )
                  : httpEffect
              )
            )
          }
        })
      )
    })
    return protocol
  }))

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
  McpServer | Tool.HandlersFor<Tools> | Exclude<Tool.HandlerServices<Tools>, McpServerClient>
> = Effect.fnUntraced(function*<Tools extends Record<string, Tool.Any>>(
  toolkit: Toolkit.Toolkit<Tools>
) {
  const registry = yield* McpServer
  const built = yield* (toolkit as any as Effect.Effect<
    Toolkit.WithHandler<Tools>,
    never,
    Exclude<Tool.HandlersFor<Tools>, McpServerClient>
  >)
  const services = yield* Effect.context<never>()
  for (const tool of Object.values(built.tools)) {
    const annotations = tool.annotations
    const toolMeta = Context.getOrUndefined(annotations, Tool.Meta)
    const isDeclaredFailure = Schema.is(tool.failureSchema)
    const outputSchema = Tool.getJsonSchemaFromSchema(tool.successSchema)
    const mcpTool = new McpTool({
      name: tool.name,
      description: Tool.getDescription(tool),
      inputSchema: Tool.getJsonSchema(tool),
      ...(outputSchema.type === "object" ? { outputSchema } : {}),
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
        return built.handle(tool.name as keyof Tools, payload).pipe(
          Stream.unwrap,
          Stream.run(Sink.last()),
          Effect.flatMap(Effect.fromOption),
          Effect.provideContext(
            services as Context.Context<Tool.HandlerServices<Tools[keyof Tools]>>
          ),
          Effect.map((result) =>
            new CallToolResult({
              isError: false,
              structuredContent: typeof result.encodedResult === "object" ? result.encodedResult : undefined,
              content: [{
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
  Tool.HandlersFor<Tools> | Exclude<Tool.HandlerServices<Tools>, McpServerClient>
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
  }): Effect.Effect<void, never, Exclude<R, McpServerClient> | McpServer>
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
      McpServerClient
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
  }): Layer.Layer<never, never, Exclude<R, McpServerClient>>
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
      McpServerClient
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
    ) => Effect.Effect<Array<Params[K]>, any, any>
  } = {}
>(
  options: {
    readonly name: string
    readonly description?: string | undefined
    readonly parameters?: Params | undefined
    readonly completion?: ValidateCompletions<Completions, Extract<keyof Params, string>> | undefined
    readonly content: (params: Params) => Effect.Effect<Array<typeof PromptMessage.Type> | string, E, R>
    readonly annotations?: Context.Context<never> | undefined
  }
): Effect.Effect<void, never, Exclude<Schema.Struct.DecodingServices<Params> | R, McpServerClient> | McpServer> => {
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
    const services = yield* Effect.context<Exclude<R | Schema.Struct.DecodingServices<Params>, McpServerClient>>()
    const completions: Record<
      string,
      (
        input: string,
        context: CompletionContext
      ) => Effect.Effect<CompleteResult, InternalError, McpServerClient>
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
              Effect.map((messages) => {
                messages = typeof messages === "string" ?
                  [{
                    role: "user",
                    content: TextContent.make({ text: messages })
                  }] :
                  messages
                return new GetPromptResult({ messages, description: prompt.description })
              }),
              Effect.catchCause((cause) => {
                const prettyError = Cause.prettyErrors(cause)[0]
                return Effect.fail(new InternalError({ message: prettyError.message }))
              })
            )
          ),
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
): Layer.Layer<never, never, Exclude<Schema.Struct.DecodingServices<Params> | R, McpServerClient>> =>
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
  const request = Elicit.payloadSchema.make({
    message: options.message,
    requestedSchema: Tool.getJsonSchemaFromSchema(schema)
  })
  const res = yield* client["elicitation/create"](request).pipe(
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
  McpServerClient
> = McpServerClient.useSync((_) => _.initializePayload.capabilities)

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
    router.on("GET", uri as any, value)
  }
  const find = (uri: string) => router.find("GET", uri)

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

const layerHandlers = (serverInfo: {
  readonly name: string
  readonly version: string
  readonly extensions?: Record<`${string}/${string}`, unknown> | undefined
}, options: {
  readonly sessions: Sessions
  readonly protocolRegistry: McpProtocolRegistry.ProtocolRegistry<McpProtocol.ProtocolAdapter>
}) =>
  Layer.effectContext(
    Effect.gen(function*() {
      const server = yield* McpServer
      const currentLogLevel = yield* CurrentLogLevel
      const contextMap = new Map<string, unknown>()

      for (const protocol of options.protocolRegistry.protocols) {
        const selectedProtocol = protocol
        const wireHandlers = ClientRpcs.of({
          // Requests
          ping: () => Effect.succeed({}),
          initialize(params, { client }) {
            const capabilities: Types.DeepMutable<typeof ServerCapabilities.Type> = {
              completions: {},
              logging: {}
            }
            if (server.tools.length > 0) {
              capabilities.tools = { listChanged: true }
            }
            if (server.resources.length > 0 || server.resourceTemplates.length > 0) {
              capabilities.resources = {
                listChanged: true,
                subscribe: true
              }
            }
            if (server.prompts.length > 0) {
              capabilities.prompts = { listChanged: true }
            }
            if (serverInfo.extensions) {
              capabilities.extensions = serverInfo.extensions as any
            }
            return Effect.withFiber((fiber) => {
              const httpRequest = Context.getOrUndefined(fiber.context, HttpServerRequest.HttpServerRequest)
              if (httpRequest !== undefined && capabilities.resources !== undefined) {
                capabilities.resources.subscribe = false
              }
              const session: Session = {
                initializePayload: params,
                protocol: selectedProtocol,
                resourceSubscriptions: capabilities.resources?.subscribe === true ? new Set() : undefined,
                logLevel: { _tag: "Effect", level: currentLogLevel }
              }
              if (httpRequest) {
                const sessionId = crypto.randomUUID()
                options.sessions.bySessionId.set(sessionId, session)
                appendPreResponseHandlerUnsafe(httpRequest, (_req, res) =>
                  Effect.succeed(HttpServerResponse.setHeaders(res, {
                    [MCP_SESSION_ID_HEADER]: sessionId,
                    [MCP_PROTOCOL_VERSION_HEADER]: selectedProtocol.protocolVersion
                  })))
              } else {
                options.sessions.byClientId.set(client.id, session)
              }
              return Effect.succeed({
                capabilities,
                serverInfo,
                protocolVersion: selectedProtocol.protocolVersion
              })
            })
          },
          "completion/complete": (r) =>
            server.completion(r),
          "logging/setLevel": ({ level }, { client, headers }) =>
            Effect.sync(() => {
              const session = getClientSession(options.sessions, client.id, headers)
              if (session) {
                session.logLevel = { _tag: "Mcp", level }
              }
              return {}
            }),
          "prompts/get": (r) =>
            server.getPromptResult(r),
          "prompts/list": (_, { client, headers }) =>
            Effect.sync(() => {
              const initialized = getClientSession(options.sessions, client.id, headers)?.initializePayload
              return new ListPromptsResult({ prompts: filterByClient(initialized, server.prompts, "prompt") })
            }),
          "resources/list": (_, { client, headers }) =>
            Effect.sync(() => {
              const initialized = getClientSession(options.sessions, client.id, headers)?.initializePayload
              return new ListResourcesResult({ resources: filterByClient(initialized, server.resources, "resource") })
            }),
          "resources/read": ({ uri }) => server.findResource(uri),
          "resources/subscribe": ({ uri }, { client, headers }) =>
            Effect.gen(function*() {
              const subscriptions = getClientSession(
                options.sessions,
                client.id,
                headers
              )?.resourceSubscriptions
              if (subscriptions === undefined) {
                return yield* new MethodNotFound({
                  message: "Resource subscriptions are not supported"
                })
              }
              subscriptions.add(uri)
              return {}
            }),
          "resources/unsubscribe": ({ uri }, { client, headers }) =>
            Effect.gen(function*() {
              const subscriptions = getClientSession(
                options.sessions,
                client.id,
                headers
              )?.resourceSubscriptions
              if (subscriptions === undefined) {
                return yield* new MethodNotFound({
                  message: "Resource subscriptions are not supported"
                })
              }
              subscriptions.delete(uri)
              return {}
            }),
          "resources/templates/list": (_, { client, headers }) =>
            Effect.sync(() => {
              const initialized = getClientSession(options.sessions, client.id, headers)?.initializePayload
              return new ListResourceTemplatesResult({
                resourceTemplates: filterByClient(initialized, server.resourceTemplates, "template")
              })
            }),
          "tools/call": (r) => server.callTool(r),
          "tools/list": (_, { client, headers }) =>
            Effect.sync(() => {
              const initialized = getClientSession(options.sessions, client.id, headers)?.initializePayload
              return new ListToolsResult({
                tools: filterByClient(initialized, server.tools, "tool")
              })
            }),

          // Notifications
          "notifications/cancelled": (_) => Effect.void,
          "notifications/initialized": (_, { client, headers }) =>
            Effect.sync(() => {
              server.initializedClients.add(client.id)
              const session = getClientSession(options.sessions, client.id, headers)
              if (session) {
                options.sessions.byClientId.set(client.id, session)
              }
            }),
          "notifications/progress": (_) => Effect.void,
          "notifications/roots/list_changed": (_) => Effect.void
        })
        yield* addProtocolHandlers(
          options.protocolRegistry,
          selectedProtocol,
          selectedProtocol.clientRpcs,
          wireHandlers,
          contextMap
        )
      }
      return Context.makeUnsafe(contextMap)
    })
  )

const addProtocolHandlers = Effect.fnUntraced(function*<
  ClientRpcs extends Rpc.Any
>(
  registry: McpProtocolRegistry.ProtocolRegistry<McpProtocol.ProtocolAdapter>,
  protocol: McpProtocol.ProtocolAdapter,
  clientRpcs: RpcGroup.RpcGroup<ClientRpcs>,
  handlers: RpcGroup.HandlersFrom<ClientRpcs>,
  contextMap: Map<string, unknown>
) {
  const handlerContext = yield* clientRpcs.toHandlers(handlers)
  for (const rpcDefinition of clientRpcs.requests.values()) {
    const routed = registry.routeClientRequest(protocol, {
      _tag: "Request",
      id: 0,
      tag: rpcDefinition._tag,
      payload: undefined,
      headers: []
    })
    const namespacedRpc = registry.clientRpcs.requests.get(routed.tag)
    const handler = handlerContext.mapUnsafe.get(rpcDefinition.key)
    if (namespacedRpc === undefined || handler === undefined) {
      return yield* Effect.die(`MCP handler registration invariant failed for ${routed.tag}`)
    }
    contextMap.set(namespacedRpc.key, handler)
  }
})

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

const filterByClient = <
  A extends {
    readonly annotations: Context.Context<never>
  },
  P extends keyof A
>(
  client: typeof Initialize.payloadSchema.Type | undefined,
  items: ReadonlyArray<A>,
  prop: P
): Array<A[P]> => {
  if (!client) {
    return items.map((item) => item[prop])
  }
  const out = Arr.empty<A[P]>()
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const enabledWhen = Context.getOrUndefined(item.annotations, EnabledWhen)
    if (!enabledWhen || enabledWhen(client)) {
      out.push(item[prop])
    }
  }
  return out
}

const getClientSession = (
  sessions: Sessions,
  clientId: number,
  headers: Headers.Headers
) => {
  const sessionId = headers[MCP_SESSION_ID_HEADER]
  if (sessionId === undefined) {
    return sessions.byClientId.get(clientId)
  }
  return sessions.bySessionId.get(sessionId)
}

const mcpLogLevels: Record<LoggingLevel, {
  readonly effect: LogLevel.LogLevel
  readonly order: number
}> = {
  debug: { effect: "Debug", order: 0 },
  info: { effect: "Info", order: 1 },
  notice: { effect: "Info", order: 2 },
  warning: { effect: "Warn", order: 3 },
  error: { effect: "Error", order: 4 },
  critical: { effect: "Fatal", order: 5 },
  alert: { effect: "Fatal", order: 6 },
  emergency: { effect: "Fatal", order: 7 }
}

const effectLogLevel = (logLevel: SessionLogLevel | undefined): LogLevel.LogLevel =>
  logLevel?._tag === "Mcp" ? mcpLogLevels[logLevel.level].effect : logLevel?.level ?? "Info"

const isMcpLogLevelEnabled = (
  level: LoggingLevel,
  minimum: SessionLogLevel | undefined
): boolean =>
  minimum?._tag === "Mcp"
    ? mcpLogLevels[level].order >= mcpLogLevels[minimum.level].order
    : LogLevel.isGreaterThanOrEqualTo(mcpLogLevels[level].effect, minimum?.level ?? "Info")

const getOfferedProtocolVersion = (payload: unknown): string =>
  typeof payload === "object" &&
    payload !== null &&
    "protocolVersion" in payload &&
    typeof payload.protocolVersion === "string"
    ? payload.protocolVersion
    : ""

const protocolForInternalTag = (
  registry: McpProtocolRegistry.ProtocolRegistry<McpProtocol.ProtocolAdapter>,
  tag: string
): McpProtocol.ProtocolAdapter => {
  for (const protocol of registry.protocols) {
    const routed = registry.routeClientRequest(protocol, {
      _tag: "Request",
      id: 0,
      tag: "",
      payload: undefined,
      headers: []
    })
    if (tag.startsWith(routed.tag)) {
      return protocol
    }
  }
  return registry.protocols[0]
}

const getProtocolForClient = (
  clientProtocols: Map<number, McpProtocol.ProtocolAdapter>,
  clientId: number,
  registry: McpProtocolRegistry.ProtocolRegistry<McpProtocol.ProtocolAdapter>
): McpProtocol.ProtocolAdapter =>
  clientProtocols.get(clientId) ??
    registry.protocols[0]
