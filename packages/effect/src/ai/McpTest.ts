/**
 * In-memory test client for `McpServer` registrations, and an in-memory host
 * for `McpAppView` pages.
 *
 * `McpTest.makeClient` runs the MCP server over an in-memory
 * `RpcServer.Protocol`, performs the handshake for the selected protocol
 * version, and returns a typed client. Requests travel through the same
 * JSON-RPC encoding, routing, middleware, and response encoding as the stdio
 * and HTTP transports, so tests reach protocol encoding, list methods,
 * sessions, and notifications without opening a transport.
 *
 * `McpTest.makeAppHost` plays the host of an MCP App page: it answers
 * `ui/initialize`, records what the page sends, lets a test push tool input,
 * results and context changes, and can proxy the page's `tools/call` and
 * `resources/read` to a `Client`.
 *
 * @stability unstable
 * @since 4.0.0
 */
import type * as Arr from "../Array.ts"
import * as Cause from "../Cause.ts"
import * as Context from "../Context.ts"
import * as Deferred from "../Deferred.ts"
import * as Effect from "../Effect.ts"
import { identity } from "../Function.ts"
import * as Layer from "../Layer.ts"
import * as Predicate from "../Predicate.ts"
import * as Queue from "../Queue.ts"
import * as RpcClient from "../rpc/RpcClient.ts"
import type * as RpcClientError from "../rpc/RpcClientError.ts"
import * as RpcMessage from "../rpc/RpcMessage.ts"
import * as RpcSerialization from "../rpc/RpcSerialization.ts"
import * as RpcServer from "../rpc/RpcServer.ts"
import * as Schema from "../Schema.ts"
import type * as Scope from "../Scope.ts"
import type * as McpAppView from "./McpAppView.ts"
import type * as McpProtocol from "./McpProtocol.ts"
import * as McpSchema from "./McpSchema.ts"
import * as McpServer from "./McpServer.ts"

/**
 * A typed in-memory MCP client connected to a running `McpServer`.
 *
 * **Details**
 *
 * Each request method mirrors one entry of `McpSchema.ClientRequestRpcs`,
 * except `initialize`, which `makeClient` sends during the handshake. Requests
 * are encoded with the client schemas and decoded with the server's selected
 * protocol adapter, so results and errors match what a wire client observes.
 *
 * Server-to-client notifications are queued on `notifications` in their wire
 * encoding, in delivery order. Server-to-client requests (elicitation, sampling, roots) are
 * rejected with a method-not-found error.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface Client {
  /**
   * The protocol version negotiated during the handshake.
   */
  readonly protocolVersion: McpProtocol.ProtocolVersion
  /**
   * The `McpServer` service the client is connected to, for registering
   * capabilities or emitting notifications from a test.
   */
  readonly server: McpServer.McpServer["Service"]
  /**
   * Notifications the server sent to this client, in delivery order.
   */
  readonly notifications: Queue.Dequeue<McpSchema.ServerNotificationEncoded>
  readonly ping: Effect.Effect<void, McpSchema.McpError>
  readonly listTools: (
    request?: typeof McpSchema.ListTools.payloadSchema.Type
  ) => Effect.Effect<McpSchema.ListToolsResult, McpSchema.McpError>
  readonly callTool: (
    request: typeof McpSchema.CallTool.payloadSchema.Type
  ) => Effect.Effect<McpSchema.CallToolResult, McpSchema.McpError>
  readonly listResources: (
    request?: typeof McpSchema.ListResources.payloadSchema.Type
  ) => Effect.Effect<McpSchema.ListResourcesResult, McpSchema.McpError>
  readonly listResourceTemplates: (
    request?: typeof McpSchema.ListResourceTemplates.payloadSchema.Type
  ) => Effect.Effect<McpSchema.ListResourceTemplatesResult, McpSchema.McpError>
  readonly readResource: (
    request: typeof McpSchema.ReadResource.payloadSchema.Type
  ) => Effect.Effect<McpSchema.ReadResourceResult, McpSchema.McpError>
  readonly subscribe: (
    request: typeof McpSchema.Subscribe.payloadSchema.Type
  ) => Effect.Effect<void, McpSchema.McpError>
  readonly unsubscribe: (
    request: typeof McpSchema.Unsubscribe.payloadSchema.Type
  ) => Effect.Effect<void, McpSchema.McpError>
  readonly listPrompts: (
    request?: typeof McpSchema.ListPrompts.payloadSchema.Type
  ) => Effect.Effect<McpSchema.ListPromptsResult, McpSchema.McpError>
  readonly getPrompt: (
    request: typeof McpSchema.GetPrompt.payloadSchema.Type
  ) => Effect.Effect<McpSchema.GetPromptResult, McpSchema.McpError>
  readonly complete: (
    request: typeof McpSchema.Complete.payloadSchema.Type
  ) => Effect.Effect<McpSchema.CompleteResult, McpSchema.McpError>
  readonly setLevel: (
    request: typeof McpSchema.SetLevel.payloadSchema.Type
  ) => Effect.Effect<void, McpSchema.McpError>
}

/**
 * Creates an in-memory MCP client for a registration layer.
 *
 * **Details**
 *
 * The server is built from `McpServer.layer` with the supplied `protocols`
 * and `registrations`, over an in-memory `RpcServer.Protocol`. The client
 * speaks `options.protocolVersion`, by default the first adapter's version:
 * stateful versions `initialize` and send `notifications/initialized` before
 * `makeClient` returns; the stateless version attaches request metadata to
 * every request instead.
 *
 * Because requests reach handlers through the server runner, the transport
 * built-ins are discharged the same way as on stdio: `McpRequestContext` on
 * every request, and `McpServerClient` only when every adapter in `protocols`
 * is stateful (see `McpServer.ProvidedServices`). Any other `McpRequest`
 * marker in `registrations` stays in the requirements and must be met by MCP
 * middleware; providing the service directly does not discharge it.
 *
 * The client and server live in the surrounding `Scope`.
 *
 * **Example** (Reading a resource in a test)
 *
 * ```ts import.meta.vitest
 * import { Effect } from "effect"
 * import { McpProtocol, McpServer, McpTest } from "effect/ai"
 *
 * const registrations = McpServer.resource({
 *   uri: "test://greeting",
 *   name: "greeting",
 *   content: Effect.succeed("hello")
 * })
 *
 * const program = Effect.gen(function*() {
 *   const client = yield* McpTest.makeClient(registrations, {
 *     protocols: [McpProtocol.v2025_11_25]
 *   })
 *   const result = yield* client.readResource({ uri: "test://greeting" })
 *   return result.contents.map((content) => content.uri)
 * }).pipe(Effect.scoped)
 *
 * const actual = await Effect.runPromise(program)
 * actual // => ["test://greeting"]
 * ```
 *
 * @see {@link Client} for the request methods and notifications
 * @see {@link McpServer.middleware} for discharging request-level dependencies
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const makeClient: <
  const Protocols extends Arr.NonEmptyReadonlyArray<McpProtocol.ProtocolAdapter>,
  RA = never,
  RE = never,
  RR = never
>(
  registrations: Layer.Layer<RA, RE, RR>,
  options: {
    readonly protocols: Protocols
    readonly protocolVersion?: Protocols[number]["protocolVersion"] | undefined
    readonly name?: string | undefined
    readonly version?: string | undefined
    readonly instructions?: string | undefined
    readonly extensions?: NonNullable<McpSchema.ServerCapabilities["extensions"]> | undefined
    readonly clientInfo?: McpSchema.Implementation | undefined
    readonly clientCapabilities?: McpSchema.ClientCapabilities | undefined
  }
) => Effect.Effect<
  Client,
  Cause.IllegalArgumentError | RE,
  | Scope.Scope
  | Exclude<McpServer.McpRequest.Without<RR>, McpServer.McpServer>
  | McpServer.McpRequest.From<
    "Requires",
    Exclude<McpServer.McpRequest.Only<"Requires", RR>, McpServer.ProvidedServices<Protocols>>
  >
> = Effect.fnUntraced(function*(
  registrations: Layer.Layer<any, any, any>,
  options: {
    readonly protocols: Arr.NonEmptyReadonlyArray<McpProtocol.ProtocolAdapter>
    readonly protocolVersion?: string | undefined
    readonly name?: string | undefined
    readonly version?: string | undefined
    readonly instructions?: string | undefined
    readonly extensions?: NonNullable<McpSchema.ServerCapabilities["extensions"]> | undefined
    readonly clientInfo?: McpSchema.Implementation | undefined
    readonly clientCapabilities?: McpSchema.ClientCapabilities | undefined
  }
) {
  const selected = options.protocolVersion === undefined
    ? options.protocols[0]
    : options.protocols.find((protocol) => protocol.protocolVersion === options.protocolVersion)
  if (selected === undefined) {
    return yield* new Cause.IllegalArgumentError(
      `MCP protocol ${options.protocolVersion} is not in the configured protocols`
    )
  }
  const clientInfo = options.clientInfo ?? defaultClientInfo
  const clientCapabilities = options.clientCapabilities ?? new McpSchema.ClientCapabilities({})

  // Each direction carries one serialized JSON-RPC message per element, so
  // requests and responses round-trip through the same JSON-RPC encoding as
  // the stdio and HTTP transports.
  const toServer = yield* Queue.unbounded<string>()
  const toClient = yield* Queue.unbounded<string>()
  const notifications = yield* Queue.unbounded<McpSchema.ServerNotificationEncoded>()
  const serverProtocol = RpcServer.Protocol.make(Effect.fnUntraced(function*(writeRequest) {
    const parser = serialization.makeUnsafe()
    yield* Queue.take(toServer).pipe(
      Effect.flatMap((frame) =>
        Effect.forEach(
          parser.decode(frame) as ReadonlyArray<RpcMessage.FromClientEncoded>,
          (message) => writeRequest(0, message),
          { discard: true }
        )
      ),
      Effect.forever,
      Effect.forkScoped
    )
    return {
      disconnects: yield* Queue.make<number>(),
      send(_clientId, response) {
        const encoded = parser.encode(response)
        return typeof encoded === "string" ? Effect.asVoid(Queue.offer(toClient, encoded)) : Effect.void
      },
      end: () => Effect.void,
      clientIds: Effect.succeed(new Set([0])),
      initialMessage: Effect.succeedNone,
      supportsAck: false,
      supportsTransferables: false,
      supportsSpanPropagation: false,
      supportsNotifications: true,
      codecFor: serialization.codecFor
    }
  }))
  const context = yield* Layer.build(
    McpServer.layer({
      name: options.name ?? "McpTest",
      version: options.version ?? "1.0.0",
      instructions: options.instructions,
      extensions: options.extensions,
      protocols: options.protocols,
      registrations
    }).pipe(Layer.provide(Layer.effect(RpcServer.Protocol, serverProtocol)))
  )
  const server = Context.get(context as Context.Context<McpServer.McpServer>, McpServer.McpServer)

  const write = (message: object) => Effect.asVoid(Queue.offer(toServer, JSON.stringify(message)))

  // Stateless revisions carry the client profile on every request instead of
  // negotiating it with `initialize`.
  const requestMetadata = selected.runtime._tag === "Stateless"
    ? {
      "io.modelcontextprotocol/protocolVersion": selected.protocolVersion,
      "io.modelcontextprotocol/clientCapabilities": encodeClientCapabilities(clientCapabilities),
      "io.modelcontextprotocol/clientInfo": encodeImplementation(clientInfo)
    }
    : undefined
  const params = (payload: unknown) => {
    if (requestMetadata === undefined) {
      return payload === undefined || payload === null ? {} : { params: payload }
    }
    const fields = Predicate.isReadonlyObject(payload) ? payload : {}
    return {
      params: {
        ...fields,
        _meta: { ...requestMetadata, ...(Predicate.isReadonlyObject(fields._meta) ? fields._meta : {}) }
      }
    }
  }

  const protocol = yield* RpcClient.Protocol.make(Effect.fnUntraced(function*(writeResponse) {
    const parser = serialization.makeUnsafe()
    let clientId = 0
    const route = (message: RpcMessage.FromServerEncoded | RpcMessage.FromClientEncoded): Effect.Effect<void> => {
      if (message._tag !== "Request") {
        return writeResponse(clientId, message as RpcMessage.FromServerEncoded)
      }
      if (message.isNotification === true) {
        return Effect.asVoid(Queue.offer(notifications, {
          _tag: "Notification",
          method: message.tag,
          payload: message.payload ?? undefined
        } as McpSchema.ServerNotificationEncoded))
      }
      // Server-to-client requests are not supported, so reject them instead
      // of leaving the handler waiting for a reply.
      return write({
        jsonrpc: "2.0",
        id: message.id,
        error: { code: McpSchema.METHOD_NOT_FOUND_ERROR_CODE, message: `Method not found: ${message.tag}` }
      })
    }
    yield* Queue.take(toClient).pipe(
      Effect.flatMap((frame) =>
        Effect.forEach(
          parser.decode(frame) as ReadonlyArray<RpcMessage.FromServerEncoded | RpcMessage.FromClientEncoded>,
          route,
          { discard: true }
        )
      ),
      Effect.forever,
      Effect.forkScoped
    )
    return {
      send(id, request) {
        clientId = id
        switch (request._tag) {
          case "Request":
            return write({ jsonrpc: "2.0", id: request.id, method: request.tag, ...params(request.payload) })
          case "Interrupt":
            return write({
              jsonrpc: "2.0",
              method: "notifications/cancelled",
              ...params({ requestId: request.requestId })
            })
          default:
            // Effect RPC control messages are not part of the MCP protocol.
            return Effect.void
        }
      },
      supportsAck: false,
      supportsTransferables: false,
      codecFor: serialization.codecFor
    }
  }))
  let nextRequestId = 1
  const rpc = yield* RpcClient.make(McpSchema.ClientRequestRpcs, {
    spanPrefix: "McpTest",
    generateRequestId: () => RpcMessage.RequestId(nextRequestId++)
  }).pipe(Effect.provideService(RpcClient.Protocol, protocol))

  let protocolVersion = selected.protocolVersion
  if (selected.runtime._tag === "Stateful") {
    const result = yield* rpc.initialize({
      protocolVersion: selected.protocolVersion,
      capabilities: clientCapabilities,
      clientInfo
    }).pipe(Effect.orDie)
    protocolVersion = result.protocolVersion as McpProtocol.ProtocolVersion
    yield* write({ jsonrpc: "2.0", method: "notifications/initialized" })
  }

  return identity<Client>({
    protocolVersion,
    server,
    notifications,
    ping: Effect.asVoid(orDieClientError(rpc.ping(undefined))),
    listTools: (request) => orDieClientError(rpc["tools/list"](request)),
    callTool: (request) => orDieClientError(rpc["tools/call"](request)),
    listResources: (request) => orDieClientError(rpc["resources/list"](request)),
    listResourceTemplates: (request) => orDieClientError(rpc["resources/templates/list"](request)),
    readResource: (request) => orDieClientError(rpc["resources/read"](request)),
    subscribe: (request) => Effect.asVoid(orDieClientError(rpc["resources/subscribe"](request))),
    unsubscribe: (request) => Effect.asVoid(orDieClientError(rpc["resources/unsubscribe"](request))),
    listPrompts: (request) => orDieClientError(rpc["prompts/list"](request)),
    getPrompt: (request) => orDieClientError(rpc["prompts/get"](request)),
    complete: (request) => orDieClientError(rpc["completion/complete"](request)),
    setLevel: (request) => Effect.asVoid(orDieClientError(rpc["logging/setLevel"](request)))
  })
}) as any

const serialization = RpcSerialization.jsonRpc()

const defaultClientInfo: McpSchema.Implementation = { name: "McpTest", version: "1.0.0" }

const encodeClientCapabilities = Schema.encodeSync(Schema.toCodecJson(McpSchema.ClientCapabilities))
const encodeImplementation = Schema.encodeSync(Schema.toCodecJson(McpSchema.Implementation))

// The in-memory transport never fails to send, so a client error is a defect.
const orDieClientError = <A, E>(
  effect: Effect.Effect<A, E | RpcClientError.RpcClientError>
): Effect.Effect<A, Exclude<E, RpcClientError.RpcClientError>> =>
  Effect.catchIf(
    effect,
    (error): error is RpcClientError.RpcClientError => Predicate.isTagged(error, "RpcClientError"),
    Effect.die
  ) as any

/**
 * An in-memory MCP Apps host connected to one `McpAppView` page.
 *
 * **Details**
 *
 * `transport` is what `McpAppView.layer` connects to. Every request the page
 * sends, `ui/initialize` included, is queued on `requests` in arrival order,
 * and every notification on `notifications`. The host answers `ping`,
 * `ui/open-link`, `ui/message`, `ui/update-model-context` and
 * `ui/download-file` with `{}`, echoes the mode of `ui/request-display-mode`,
 * and proxies `tools/call` and `resources/read` to the `server` given to
 * `makeAppHost`, or rejects them with method not found without one.
 *
 * @stability unstable
 * @category models
 * @since 4.1.3
 */
export interface AppHost {
  /**
   * The page's end of the connection.
   */
  readonly transport: McpAppView.Transport
  /**
   * Requests the page sent, in arrival order.
   */
  readonly requests: Queue.Dequeue<McpSchema.JsonRpcRequest>
  /**
   * Notifications the page sent, in arrival order.
   */
  readonly notifications: Queue.Dequeue<McpSchema.JsonRpcNotification>
  readonly sendToolInputPartial: (args: Readonly<Record<string, unknown>>) => Effect.Effect<void>
  readonly sendToolInput: (args: Readonly<Record<string, unknown>>) => Effect.Effect<void>
  readonly sendToolResult: (result: typeof McpSchema.CallToolResult.Encoded) => Effect.Effect<void>
  readonly sendToolCancelled: (reason?: string | undefined) => Effect.Effect<void>
  readonly sendHostContextChanged: (context: Partial<McpAppView.HostContext>) => Effect.Effect<void>
  /**
   * Sends a request to the page and waits for its answer. A JSON-RPC error
   * from the page fails with its `code`, `message` and `data`.
   */
  readonly request: (method: string, params?: unknown) => Effect.Effect<unknown, McpSchema.McpErrorBase>
  /**
   * Sends `ui/resource-teardown` and waits for the page's answer.
   */
  readonly teardown: (reason?: string | undefined) => Effect.Effect<unknown, McpSchema.McpErrorBase>
}

/**
 * Creates an in-memory host for an `McpAppView` page.
 *
 * **Details**
 *
 * `hostInfo`, `hostCapabilities` and `hostContext` are what the host returns
 * from `ui/initialize`; by default it offers no capability. With `server`,
 * the page's `tools/call` and `resources/read` reach that client's server, so
 * a test covers a server tool and the page that calls it in memory.
 *
 * The host lives in the surrounding `Scope`.
 *
 * **Example** (Delivering a tool result to a page)
 *
 * ```ts
 * import { Effect } from "effect"
 * import { McpAppView, McpTest } from "effect/ai"
 *
 * const program = Effect.gen(function*() {
 *   const host = yield* McpTest.makeAppHost({ hostInfo: { name: "host", version: "1.0.0" } })
 *   const page = Effect.gen(function*() {
 *     const view = yield* McpAppView.McpAppView
 *     yield* host.sendToolResult({ content: [], structuredContent: { passed: 3 } })
 *     const result = yield* view.toolResult
 *     return result.structuredContent
 *   })
 *   return yield* page.pipe(
 *     Effect.provide(McpAppView.layer({ transport: host.transport, appInfo: { name: "page", version: "1.0.0" } }))
 *   )
 * }).pipe(Effect.scoped)
 * ```
 *
 * @see {@link AppHost} for what the host records and sends
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.3
 */
export const makeAppHost: (options?: {
  readonly hostInfo?: McpSchema.Implementation | undefined
  readonly hostCapabilities?: McpAppView.HostCapabilities | undefined
  readonly hostContext?: McpAppView.HostContext | undefined
  readonly server?: Client | undefined
}) => Effect.Effect<AppHost, never, Scope.Scope> = Effect.fnUntraced(function*(options = {}) {
  const hostInfo = options.hostInfo ?? defaultHostInfo
  const hostCapabilities = options.hostCapabilities ?? {}
  const hostContext = options.hostContext ?? {}
  const server = options.server

  const listeners = new Set<(message: unknown) => void>()
  const toPage = (message: object) => Effect.sync(() => listeners.forEach((listener) => listener(message)))
  const notifyPage = (method: string, params: unknown) => toPage({ jsonrpc: "2.0", method, params })

  const inbox = yield* Queue.unbounded<unknown>()
  const requests = yield* Queue.unbounded<McpSchema.JsonRpcRequest>()
  const notifications = yield* Queue.unbounded<McpSchema.JsonRpcNotification>()
  const pending = new Map<number, Deferred.Deferred<unknown, McpSchema.McpErrorBase>>()
  let nextId = 1

  const proxy = <A>(
    call: Effect.Effect<A, McpSchema.McpError> | undefined,
    encode: (value: A) => unknown
  ): Effect.Effect<{ readonly result: unknown } | { readonly error: object }> =>
    call === undefined
      ? Effect.succeed({ error: { code: McpSchema.METHOD_NOT_FOUND_ERROR_CODE, message: "No server is connected" } })
      : call.pipe(
        Effect.map((value) => ({ result: encode(value) })),
        Effect.catch((error) => Effect.succeed({ error: { code: error.code, message: error.message } }))
      )
  const answer = (request: McpSchema.JsonRpcRequest) => {
    const params = request.params ?? {}
    switch (request.method) {
      case "ui/initialize":
        return Effect.succeed({
          result: { protocolVersion: "2026-01-26", hostInfo, hostCapabilities, hostContext }
        })
      case "tools/call":
        return proxy(server?.callTool(params as any), encodeCallToolResult)
      case "resources/read":
        return proxy(server?.readResource(params as any), encodeReadResourceResult)
      case "ui/request-display-mode":
        return Effect.succeed({ result: { mode: params.mode } })
      case "ping":
      case "ui/open-link":
      case "ui/message":
      case "ui/update-model-context":
      case "ui/download-file":
        return Effect.succeed({ result: {} })
      default:
        return Effect.succeed({
          error: { code: McpSchema.METHOD_NOT_FOUND_ERROR_CODE, message: `Method not found: ${request.method}` }
        })
    }
  }
  const handle = Effect.fnUntraced(function*(message: unknown) {
    const decoded = yield* decodeJsonRpcMessage(message).pipe(Effect.orDie)
    if ("method" in decoded) {
      if (!("id" in decoded)) {
        yield* Queue.offer(notifications, decoded)
        return
      }
      yield* Queue.offer(requests, decoded)
      const outcome = yield* answer(decoded)
      yield* toPage({ jsonrpc: "2.0", id: decoded.id, ...outcome })
      return
    }
    if (typeof decoded.id !== "number") return
    const deferred = pending.get(decoded.id)
    if (deferred === undefined) return
    pending.delete(decoded.id)
    yield* "error" in decoded
      ? Deferred.fail(deferred, new McpSchema.McpErrorBase(decoded.error))
      : Deferred.succeed(deferred, decoded.result)
  })
  yield* Queue.take(inbox).pipe(Effect.flatMap(handle), Effect.forever, Effect.forkScoped)

  const request = (method: string, params?: unknown) =>
    Effect.suspend(() => {
      const id = nextId++
      const deferred = Deferred.makeUnsafe<unknown, McpSchema.McpErrorBase>()
      pending.set(id, deferred)
      return Effect.andThen(toPage({ jsonrpc: "2.0", id, method, params: params ?? {} }), Deferred.await(deferred))
    })

  return identity<AppHost>({
    transport: {
      postMessage: (message) => {
        Queue.offerUnsafe(inbox, message)
      },
      onMessage: (listener) => {
        listeners.add(listener)
        return () => {
          listeners.delete(listener)
        }
      }
    },
    requests,
    notifications,
    sendToolInputPartial: (args) => notifyPage("ui/notifications/tool-input-partial", { arguments: args }),
    sendToolInput: (args) => notifyPage("ui/notifications/tool-input", { arguments: args }),
    sendToolResult: (result) => notifyPage("ui/notifications/tool-result", result),
    sendToolCancelled: (reason) =>
      notifyPage("ui/notifications/tool-cancelled", reason === undefined ? {} : { reason }),
    sendHostContextChanged: (context) => notifyPage("ui/notifications/host-context-changed", context),
    request,
    teardown: (reason) => request("ui/resource-teardown", reason === undefined ? {} : { reason })
  })
})

const defaultHostInfo: McpSchema.Implementation = { name: "McpTest", version: "1.0.0" }

const decodeJsonRpcMessage = Schema.decodeUnknownEffect(McpSchema.JsonRpcMessage)
const encodeCallToolResult = Schema.encodeSync(McpSchema.CallToolResult)
const encodeReadResourceResult = Schema.encodeSync(McpSchema.ReadResourceResult)
