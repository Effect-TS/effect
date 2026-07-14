/**
 * Builds Model Context Protocol (MCP) clients with Effect.
 *
 * The `McpClient` service performs the MCP `initialize`/`initialized`
 * handshake against a server, exposes the negotiated server info,
 * capabilities, and instructions, and provides typed methods for calling
 * tools, reading resources, listing prompts, and requesting completions. This
 * module also includes stdio and Streamable HTTP transport layers, plus
 * support for registering host-side handlers for server-initiated sampling,
 * roots, and elicitation requests.
 *
 * @since 4.0.0
 */
import type * as Cause from "../../Cause.ts"
import * as Context from "../../Context.ts"
import * as Effect from "../../Effect.ts"
import * as Fiber from "../../Fiber.ts"
import { constVoid } from "../../Function.ts"
import * as Layer from "../../Layer.ts"
import * as Option from "../../Option.ts"
import type * as PlatformError from "../../PlatformError.ts"
import * as Queue from "../../Queue.ts"
import * as Schedule from "../../Schedule.ts"
import * as Schema from "../../Schema.ts"
import type * as Scope from "../../Scope.ts"
import * as Stream from "../../Stream.ts"
import * as Headers from "../http/Headers.ts"
import * as HttpBody from "../http/HttpBody.ts"
import * as HttpClient from "../http/HttpClient.ts"
import { HttpClientErrorSchema } from "../http/HttpClientError.ts"
import type { HttpClientError } from "../http/HttpClientError.ts"
import * as ChildProcess from "../process/ChildProcess.ts"
import type { ChildProcessSpawner } from "../process/ChildProcessSpawner.ts"
import * as RpcClient from "../rpc/RpcClient.ts"
import { RpcClientDefect, RpcClientError } from "../rpc/RpcClientError.ts"
import type * as RpcGroup from "../rpc/RpcGroup.ts"
import type * as RpcMessage from "../rpc/RpcMessage.ts"
import * as RpcSerialization from "../rpc/RpcSerialization.ts"
import * as RpcServer from "../rpc/RpcServer.ts"
import {
  type CallToolResult,
  type ClientCapabilities,
  type ClientRequestRpcs,
  ClientRpcs,
  type Complete,
  type CompleteResult,
  type CreateMessage,
  type CreateMessageResult,
  type Elicit,
  ElicitAcceptResult,
  ElicitDeclineResult,
  type ElicitResult,
  type GetPromptResult,
  type Implementation,
  type ListPromptsResult,
  type ListResourcesResult,
  type ListResourceTemplatesResult,
  type ListRoots,
  type ListRootsResult,
  type ListToolsResult,
  type McpError as McpErrorSchema,
  MethodNotFound,
  type ReadResourceResult,
  type ServerCapabilities,
  ServerNotificationRpcs,
  ServerRequestRpcs
} from "./McpSchema.ts"

/**
 * Type represented by `McpSchema.McpError`, the RPC-level error schema
 * carried by every MCP request's `error` channel.
 */
type McpError = typeof McpErrorSchema.Type

const LATEST_PROTOCOL_VERSION = "2025-06-18"
const SUPPORTED_PROTOCOL_VERSIONS = [
  LATEST_PROTOCOL_VERSION,
  "2025-03-26",
  "2024-11-05",
  "2024-10-07"
]
const mcpSessionIdHeader = "mcp-session-id"
const mcpProtocolVersionHeader = "mcp-protocol-version"

/**
 * RPC group combining the requests and notifications an MCP server can send
 * to a client.
 *
 * **Details**
 *
 * Built the same way `McpSchema.ClientRpcs` combines
 * `ClientRequestRpcs`/`ClientNotificationRpcs` (`McpSchema.ts`), but for the
 * opposite direction.
 */
class ServerRpcs extends ServerRequestRpcs.merge(ServerNotificationRpcs) {}

/**
 * Error raised by `McpClient` itself for handshake and protocol-version
 * failures, distinct from `McpSchema.McpError`, which is carried by every
 * RPC's `error` schema.
 *
 * @category errors
 * @since 4.0.0
 */
export class McpClientError extends Schema.ErrorClass<McpClientError>("effect/ai/McpClient/McpClientError")({
  _tag: Schema.tag("McpClientError"),
  message: Schema.String,
  cause: Schema.optionalKey(Schema.Defect())
}) {}

/**
 * The result returned by a registered elicitation handler.
 *
 * @category capabilities
 * @since 4.0.0
 */
export type ElicitationHandlerResult =
  | {
    readonly action: "accept"
    readonly content: { readonly [key: string]: string | number | boolean | ReadonlyArray<string> }
  }
  | {
    readonly action: "decline" | "cancel"
  }

/**
 * Host-side handlers for server-initiated MCP capabilities.
 *
 * **When to use**
 *
 * Use when a server needs to sample an LLM, list workspace roots, or elicit
 * structured input from the user, by passing this through the `handlers`
 * option of `McpClient.layer`, `layerStdio`, or `layerHttp`.
 *
 * **Details**
 *
 * The presence of each handler key determines the `ClientCapabilities` sent
 * during `initialize`: `sampling: {}` is advertised only when `sampling` is
 * set, `roots: { listChanged }` only when `roots` is set, and
 * `elicitation: {}` only when `elicitation` is set. A client has exactly one
 * handler per capability, known up front, so there is no separate
 * layer-based registration API like there is for server tools and resources.
 *
 * @category capabilities
 * @since 4.0.0
 */
export interface ClientCapabilityHandlers {
  /**
   * Handles `sampling/createMessage` requests from the server.
   */
  readonly sampling?: (
    params: typeof CreateMessage.payloadSchema.Type
  ) => Effect.Effect<typeof CreateMessageResult.Type, McpError>
  /**
   * Handles `roots/list` requests from the server, and optionally emits
   * `notifications/roots/list_changed` notifications.
   */
  readonly roots?: {
    readonly list: (
      params: typeof ListRoots.payloadSchema.Type
    ) => Effect.Effect<typeof ListRootsResult.Type, McpError>
    /**
     * When provided, `McpClient` forks a fiber that sends
     * `notifications/roots/list_changed` on every emission from this stream.
     */
    readonly changes?: Stream.Stream<void> | undefined
  }
  /**
   * Handles `elicitation/create` requests from the server.
   */
  readonly elicitation?: (
    params: typeof Elicit.payloadSchema.Type
  ) => Effect.Effect<ElicitationHandlerResult, McpError>
}

/**
 * Service that stores the negotiated MCP session state and exposes a typed
 * RPC client for the connected server.
 *
 * **Details**
 *
 * `serverInfo`, `serverCapabilities`, `instructions`, and `protocolVersion`
 * are populated from the `initialize` response captured automatically while
 * the service is constructed; the `initialize` request and
 * `notifications/initialized` notification are never exposed as public
 * methods since the handshake always runs automatically inside `run`.
 *
 * @category models
 * @since 4.0.0
 */
export class McpClient extends Context.Service<McpClient, {
  readonly serverInfo: Implementation
  readonly serverCapabilities: ServerCapabilities
  readonly instructions: Option.Option<string>
  readonly protocolVersion: string
  readonly rpc: RpcClient.RpcClient<RpcGroup.Rpcs<typeof ClientRequestRpcs>, RpcClientError>
}>()("effect/ai/McpClient") {}

/**
 * Runs an MCP client handshake over the current `RpcClient.Protocol` and
 * `RpcServer.Protocol`, returning the connected `McpClient` service.
 *
 * **Details**
 *
 * `RpcClient.Protocol` carries outbound `ClientRequestRpcs`/
 * `ClientNotificationRpcs` messages to the server, and `RpcServer.Protocol`
 * dispatches inbound server-initiated requests
 * (`ServerRequestRpcs`/`ServerNotificationRpcs`). Both protocols are expected
 * to be built from the same physical connection (see `layerStdio`/`layerHttp`,
 * which demultiplex a single duplex into this pair at the transport level), so
 * this function simply starts the outbound `RpcClient` and the inbound
 * `RpcServer` side by side, backed by the handler layer built from
 * `options.handlers`.
 *
 * Performs the `initialize` request and sends `notifications/initialized`
 * before returning, failing with `McpClientError` if the server responds
 * with an unsupported protocol version.
 *
 * **Gotchas**
 *
 * `options.capabilities` is merged on top of the capabilities derived from
 * `options.handlers` (see `ClientCapabilityHandlers`), not validated against
 * it. Passing e.g. `capabilities: { sampling: {} }` without also setting
 * `handlers.sampling` advertises sampling support to the server, but every
 * `sampling/createMessage` request it then sends is answered with a
 * `MethodNotFound` error, since the runtime dispatcher only has a handler for
 * capabilities present in `options.handlers`. Only use `capabilities` to opt
 * into extension fields the corresponding `handlers` entry doesn't already
 * cover.
 *
 * @category constructors
 * @since 4.0.0
 */
export const run: (options: {
  readonly name: string
  readonly version: string
  readonly capabilities?: ClientCapabilities | undefined
  readonly handlers?: ClientCapabilityHandlers | undefined
}) => Effect.Effect<
  McpClient["Service"],
  McpClientError,
  RpcClient.Protocol | RpcServer.Protocol | Scope.Scope
> = Effect.fnUntraced(function*(options: {
  readonly name: string
  readonly version: string
  readonly capabilities?: ClientCapabilities | undefined
  readonly handlers?: ClientCapabilityHandlers | undefined
}) {
  const handlers = options.handlers ?? {}

  const client = yield* RpcClient.make(ClientRpcs, {
    spanPrefix: "McpClient"
  })

  const capabilities = computeClientCapabilities(handlers, options.capabilities)

  const handlersLayer = ServerRpcs.toLayer(
    Effect.sync(() =>
      ServerRpcs.of({
        ping: () => Effect.succeed({}),
        "sampling/createMessage": (params) =>
          handlers.sampling
            ? handlers.sampling(params)
            : Effect.fail(methodNotSupported("sampling/createMessage")),
        "roots/list": (params) =>
          handlers.roots
            ? handlers.roots.list(params)
            : Effect.fail(methodNotSupported("roots/list")),
        "elicitation/create": (params) =>
          handlers.elicitation
            ? Effect.map(handlers.elicitation(params), encodeElicitResult)
            : Effect.fail(methodNotSupported("elicitation/create")),

        // Notifications
        "notifications/cancelled": (_) => Effect.void,
        "notifications/progress": (_) => Effect.void,
        "notifications/message": (_) => Effect.void,
        "notifications/resources/updated": (_) => Effect.void,
        "notifications/resources/list_changed": (_) => Effect.void,
        "notifications/tools/list_changed": (_) => Effect.void,
        "notifications/prompts/list_changed": (_) => Effect.void
      })
    )
  )

  yield* RpcServer.make(ServerRpcs, {
    spanPrefix: "McpClient/Server",
    disableFatalDefects: true
  }).pipe(
    Effect.provide(handlersLayer),
    Effect.forkScoped
  )

  if (handlers.roots?.changes) {
    yield* handlers.roots.changes.pipe(
      // `discard: true` since notifications never receive a response - the
      // MCP server treats `notifications/*` methods as JSON-RPC
      // notifications and never sends an `Exit` back for them.
      Stream.runForEach(() => client["notifications/roots/list_changed"]({}, { discard: true })),
      Effect.forkScoped
    )
  }

  const initResult = yield* client.initialize({
    protocolVersion: LATEST_PROTOCOL_VERSION,
    capabilities,
    clientInfo: {
      name: options.name,
      version: options.version
    }
  }).pipe(
    Effect.mapError((error) => new McpClientError({ message: "MCP initialize request failed", cause: error }))
  )

  if (!SUPPORTED_PROTOCOL_VERSIONS.includes(initResult.protocolVersion)) {
    return yield* new McpClientError({
      message: `Unsupported MCP protocol version returned by server: ${initResult.protocolVersion}`
    })
  }

  // `discard: true`: see the comment above `notifications/roots/list_changed`.
  yield* client["notifications/initialized"]({}, { discard: true }).pipe(
    Effect.mapError((error) => new McpClientError({ message: "MCP notifications/initialized failed", cause: error }))
  )

  return McpClient.of({
    serverInfo: initResult.serverInfo,
    serverCapabilities: initResult.capabilities,
    instructions: Option.fromUndefinedOr(initResult.instructions),
    protocolVersion: initResult.protocolVersion,
    rpc: client
  })
})

/**
 * Creates a layer that runs an MCP client handshake over an existing pair of
 * `RpcClient.Protocol` and `RpcServer.Protocol` services, and provides the
 * `McpClient` service.
 *
 * **When to use**
 *
 * Use when you already have a custom or externally provided protocol pair
 * and want to start an MCP client as part of a layer graph.
 *
 * **Gotchas**
 *
 * Unlike `layerStdio` and `layerHttp`, this layer does not install a concrete
 * transport. The surrounding layer graph must provide both
 * `RpcClient.Protocol` and `RpcServer.Protocol`, built from the same physical
 * connection.
 *
 * @see {@link run} for the effect form used by this layer
 * @see {@link layerStdio} for a stdio-backed layer that spawns a child process and installs NDJSON-RPC serialization
 * @see {@link layerHttp} for a Streamable-HTTP-backed layer
 *
 * @category layers
 * @since 4.0.0
 */
export const layer = (options: {
  readonly name: string
  readonly version: string
  readonly capabilities?: ClientCapabilities | undefined
  readonly handlers?: ClientCapabilityHandlers | undefined
}): Layer.Layer<McpClient, McpClientError, RpcClient.Protocol | RpcServer.Protocol> =>
  Layer.effect(McpClient)(run(options))

/**
 * Spawns a child process and runs the MCP client handshake over its stdio,
 * using newline-delimited JSON-RPC framing.
 *
 * **Example** (Connecting to an MCP server over stdio)
 *
 * ```ts
 * import { Effect } from "effect"
 * import { NodeServices } from "@effect/platform-node"
 * import { McpClient } from "effect/unstable/ai"
 *
 * const program = Effect.gen(function*() {
 *   const tools = yield* McpClient.listTools()
 *   console.log(tools)
 * }).pipe(
 *   Effect.provide(McpClient.layerStdio({
 *     name: "Demo Client",
 *     version: "1.0.0",
 *     command: "node",
 *     args: ["./server.js"]
 *   })),
 *   Effect.provide(NodeServices.layer)
 * )
 * ```
 *
 * @see {@link layer} for the transport-agnostic base layer
 * @see {@link layerHttp} for a Streamable-HTTP-backed layer
 *
 * @category layers
 * @since 4.0.0
 */
export const layerStdio = (options: {
  readonly name: string
  readonly version: string
  readonly command: string
  readonly args?: ReadonlyArray<string> | undefined
  readonly env?: Record<string, string> | undefined
  readonly cwd?: string | undefined
  readonly capabilities?: ClientCapabilities | undefined
  readonly handlers?: ClientCapabilityHandlers | undefined
}): Layer.Layer<McpClient, McpClientError | PlatformError.PlatformError, ChildProcessSpawner> =>
  layer(options).pipe(
    Layer.provide(layerProtocolPairStdio(options)),
    Layer.provide(RpcSerialization.layerNdJsonRpc())
  )

/**
 * Runs the MCP client handshake against a Streamable HTTP MCP server.
 *
 * **Details**
 *
 * Attaches the `Mcp-Session-Id` header captured from the `initialize`
 * response, and the negotiated `MCP-Protocol-Version` header, to every
 * subsequent request.
 *
 * **Gotchas**
 *
 * This client does not open a standalone GET/SSE listener, so server-initiated
 * requests and notifications are only observed while one of our own requests
 * has an open response stream. Unsolicited pushes (e.g.
 * `notifications/tools/list_changed` sent outside of any call) will be missed
 * against servers that rely on the GET channel exclusively. `Last-Event-ID`
 * resumability and the legacy HTTP+SSE (2024-11-05) transport are likewise out
 * of scope.
 *
 * @see {@link layer} for the transport-agnostic base layer
 * @see {@link layerStdio} for a stdio-backed layer
 *
 * @category layers
 * @since 4.0.0
 */
export const layerHttp = (options: {
  readonly name: string
  readonly version: string
  readonly url: string
  readonly headers?: Headers.Input | undefined
  readonly transformClient?: ((client: HttpClient.HttpClient) => HttpClient.HttpClient) | undefined
  readonly capabilities?: ClientCapabilities | undefined
  readonly handlers?: ClientCapabilityHandlers | undefined
}): Layer.Layer<McpClient, McpClientError, HttpClient.HttpClient> =>
  layer(options).pipe(
    Layer.provide(layerProtocolPairHttp(options)),
    Layer.provide(RpcSerialization.layerJsonRpc())
  )

/**
 * Sends an MCP `ping` request.
 *
 * @category client
 * @since 4.0.0
 */
export const ping: Effect.Effect<{}, McpError | RpcClientError, McpClient> = Effect.flatMap(
  McpClient,
  (client) => client.rpc.ping(undefined)
)

/**
 * Sends an MCP `tools/list` request.
 *
 * @category client
 * @since 4.0.0
 */
export const listTools = (
  params?: { readonly cursor?: string | undefined }
): Effect.Effect<ListToolsResult, McpError | RpcClientError, McpClient> =>
  Effect.flatMap(McpClient, (client) => client.rpc["tools/list"](params))

/**
 * Sends an MCP `tools/call` request.
 *
 * @category client
 * @since 4.0.0
 */
export const callTool = (
  params: { readonly name: string; readonly arguments?: Record<string, unknown> | undefined }
): Effect.Effect<CallToolResult, McpError | RpcClientError, McpClient> =>
  Effect.flatMap(
    McpClient,
    (client) => client.rpc["tools/call"]({ name: params.name, arguments: params.arguments ?? {} })
  )

/**
 * Sends an MCP `resources/list` request.
 *
 * @category client
 * @since 4.0.0
 */
export const listResources = (
  params?: { readonly cursor?: string | undefined }
): Effect.Effect<ListResourcesResult, McpError | RpcClientError, McpClient> =>
  Effect.flatMap(McpClient, (client) => client.rpc["resources/list"](params))

/**
 * Sends an MCP `resources/read` request.
 *
 * @category client
 * @since 4.0.0
 */
export const readResource = (
  params: { readonly uri: string }
): Effect.Effect<ReadResourceResult, McpError | RpcClientError, McpClient> =>
  Effect.flatMap(McpClient, (client) => client.rpc["resources/read"](params))

/**
 * Sends an MCP `resources/templates/list` request.
 *
 * @category client
 * @since 4.0.0
 */
export const listResourceTemplates = (
  params?: { readonly cursor?: string | undefined }
): Effect.Effect<ListResourceTemplatesResult, McpError | RpcClientError, McpClient> =>
  Effect.flatMap(McpClient, (client) => client.rpc["resources/templates/list"](params))

/**
 * Sends an MCP `prompts/list` request.
 *
 * @category client
 * @since 4.0.0
 */
export const listPrompts = (
  params?: { readonly cursor?: string | undefined }
): Effect.Effect<ListPromptsResult, McpError | RpcClientError, McpClient> =>
  Effect.flatMap(McpClient, (client) => client.rpc["prompts/list"](params))

/**
 * Sends an MCP `prompts/get` request.
 *
 * @category client
 * @since 4.0.0
 */
export const getPrompt = (
  params: { readonly name: string; readonly arguments?: Record<string, string> | undefined }
): Effect.Effect<GetPromptResult, McpError | RpcClientError, McpClient> =>
  Effect.flatMap(McpClient, (client) => client.rpc["prompts/get"](params))

/**
 * Sends an MCP `completion/complete` request.
 *
 * @category client
 * @since 4.0.0
 */
export const complete = (
  params: typeof Complete.payloadSchema.Type
): Effect.Effect<CompleteResult, McpError | RpcClientError, McpClient> =>
  Effect.flatMap(McpClient, (client) => client.rpc["completion/complete"](params))

// -----------------------------------------------------------------------------
// Internal
// -----------------------------------------------------------------------------

const methodNotSupported = (method: string): MethodNotFound =>
  new MethodNotFound({ message: `Method '${method}' is not supported by this client` })

// `ElicitResult` is a `Schema.Union` of `Schema.Class` members
// (`ElicitAcceptResult`/`ElicitDeclineResult`), and `RpcServer.make` encodes
// handler return values with `Schema.encodeUnknownEffect` (`RpcServer.ts`
// `encodeExit`). For a union of classes, `encodeUnknown` requires the input to
// already be an instance of one of the member classes - a plain object
// literal matching a member's shape is rejected outright - so the result must
// be constructed as a real class instance here rather than a plain object.
const encodeElicitResult = (result: ElicitationHandlerResult): typeof ElicitResult.Type =>
  result.action === "accept"
    ? new ElicitAcceptResult({ action: "accept", content: result.content })
    : new ElicitDeclineResult({ action: result.action })

const computeClientCapabilities = (
  handlers: ClientCapabilityHandlers,
  extra: ClientCapabilities | undefined
): ClientCapabilities => {
  const capabilities: Record<string, unknown> = {}
  if (handlers.sampling) {
    capabilities.sampling = {}
  }
  if (handlers.roots) {
    capabilities.roots = { listChanged: handlers.roots.changes !== undefined }
  }
  if (handlers.elicitation) {
    capabilities.elicitation = {}
  }
  // `extra` is merged on top unconditionally, without checking it against
  // `handlers` - see the "Gotchas" section on `run`'s doc comment: a caller
  // that sets e.g. `extra.sampling` without `handlers.sampling` ends up
  // advertising a capability the runtime dispatcher (`run`, `ServerRpcs.toLayer`
  // above) will actually respond to with `MethodNotFound`.
  if (extra) {
    Object.assign(capabilities, extra)
  }
  return capabilities as ClientCapabilities
}

/**
 * Builds a paired `RpcClient.Protocol` / `RpcServer.Protocol` layer over a
 * spawned child process's stdio.
 *
 * **Details**
 *
 * Mirrors `RpcServer.makeProtocolStdio` (`RpcServer.ts:1247-1299`), but
 * splits reading and writing across two protocol services instead of one,
 * sourcing/sinking from a `ChildProcessHandle` instead of the `Stdio`
 * service: the `RpcClient.Protocol` decodes `handle.stdout` into responses
 * for the outbound client, and the `RpcServer.Protocol` encodes responses
 * from the inbound handler loop onto `handle.stdin`. Both protocols share a
 * single outbound write queue so writes are serialized onto the one stdin
 * sink.
 */
const layerProtocolPairStdio = (options: {
  readonly command: string
  readonly args?: ReadonlyArray<string> | undefined
  readonly env?: Record<string, string> | undefined
  readonly cwd?: string | undefined
}): Layer.Layer<
  RpcClient.Protocol | RpcServer.Protocol,
  PlatformError.PlatformError,
  ChildProcessSpawner | RpcSerialization.RpcSerialization
> =>
  Layer.unwrap(Effect.gen(function*() {
    const handle = yield* ChildProcess.make(options.command, options.args ?? [], {
      env: options.env,
      cwd: options.cwd
    })
    const serialization = yield* RpcSerialization.RpcSerialization
    const parser = serialization.makeUnsafe()

    // A single outbound write queue serializes both the client's requests
    // and the server's responses onto the one stdin sink, mirroring
    // `RpcServer.makeProtocolStdio`'s single forked
    // `Stream.fromQueue(queue).pipe(Stream.run(stdio.stdout()), ...)`.
    const textEncoder = new TextEncoder()
    const outboundQueue = yield* Queue.make<Uint8Array, Cause.Done>()
    const offerEncoded = (encoded: Uint8Array | string) =>
      Queue.offer(outboundQueue, typeof encoded === "string" ? textEncoder.encode(encoded) : encoded)
    yield* Stream.fromQueue(outboundQueue).pipe(
      Stream.run(handle.stdin),
      Effect.retry(Schedule.spaced(500)),
      Effect.forkScoped
    )

    let writeResponse!: (clientId: number, response: RpcMessage.FromServerEncoded) => Effect.Effect<void>
    let writeRequest!: (clientId: number, request: RpcMessage.FromClientEncoded) => Effect.Effect<void>
    // `RpcClient.make` assigns its own client ID from a process-wide counter
    // (`RpcClient.ts`'s `clientIdCounter`), which will not generally be `0`.
    // Captured from `send`'s first argument the same way `McpServer.run`'s
    // per-client `RpcClient.make(ServerRequestRpcs, ...)` block captures `cid`
    // (`McpServer.ts:385-389`), so that decoded responses are routed back to
    // the client ID `RpcClient.make` is actually using.
    let outboundClientId = 0

    // Captures this fiber (the top-level fiber the whole layer is being built
    // on) so that the stdout-reading fiber below can self-interrupt it once
    // its retries are exhausted, mirroring `RpcServer.makeProtocolStdio`
    // (`RpcServer.ts:1247-1272`), which interrupts the same fiber it captured
    // `Fiber.getCurrent()` from at the top of its `Effect.gen`. Without this,
    // a persistent decode error (e.g. a malformed line from the child
    // process) would retry forever while silently dropping all subsequent
    // stdout bytes instead of failing the connection loudly.
    const layerFiber = Fiber.getCurrent()!

    const stdoutFiber = yield* handle.stdout.pipe(
      Stream.runForEach((data) => {
        const decoded = parser.decode(data) as ReadonlyArray<
          RpcMessage.FromServerEncoded | RpcMessage.FromClientEncoded
        >
        if (decoded.length === 0) return Effect.void
        let i = 0
        return Effect.whileLoop({
          while: () => i < decoded.length,
          body: () => {
            const message = decoded[i++]
            // Request-shaped messages (server-initiated requests/notifications)
            // are routed to the inbound server dispatcher; everything else is a
            // response to one of our own outbound requests.
            return message._tag === "Request" || message._tag === "Ping" ||
                message._tag === "Ack" || message._tag === "Interrupt" || message._tag === "Eof"
              ? writeRequest(0, message as RpcMessage.FromClientEncoded)
              : writeResponse(outboundClientId, message as RpcMessage.FromServerEncoded)
          },
          step: constVoid
        })
      }),
      Effect.sandbox,
      Effect.tapError(Effect.logError),
      Effect.retry(Schedule.spaced(500)),
      Effect.ensuring(Effect.forkDetach(Fiber.interrupt(layerFiber), { startImmediately: true })),
      Effect.forkScoped
    )

    const clientProtocol = yield* RpcClient.Protocol.make(Effect.fnUntraced(function*(writeResponse_) {
      writeResponse = writeResponse_
      return {
        send(clientId, request) {
          outboundClientId = clientId
          const encoded = parser.encode(request)
          if (encoded === undefined) return Effect.void
          return Effect.orDie(offerEncoded(encoded))
        },
        supportsAck: true,
        supportsTransferables: false
      }
    }))

    const disconnects = yield* Queue.make<number>()
    const serverProtocol = yield* RpcServer.Protocol.make(Effect.fnUntraced(function*(writeRequest_) {
      writeRequest = writeRequest_
      return {
        disconnects,
        send(_clientId, response) {
          const encoded = parser.encode(response)
          if (encoded === undefined) return Effect.void
          return Effect.orDie(offerEncoded(encoded))
        },
        end(_clientId) {
          return Effect.void
        },
        clientIds: Effect.succeed(new Set([0])),
        initialMessage: Effect.succeedNone,
        supportsAck: true,
        supportsTransferables: false,
        supportsSpanPropagation: true
      }
    }))

    // If the child process exits, there is no further way to deliver
    // responses to pending outbound requests, so end the queue to unblock any
    // writer, and interrupt the stdout-reading fiber so a crashed/exited
    // server produces a clear "connection closed" failure for any in-flight
    // `RpcClient` request instead of leaving callers hanging forever waiting
    // on a response that will never arrive.
    yield* handle.exitCode.pipe(
      Effect.ignore,
      Effect.andThen(Effect.all([
        Queue.end(outboundQueue),
        Fiber.interrupt(stdoutFiber)
      ], { concurrency: "unbounded", discard: true })),
      Effect.forkScoped
    )

    return Layer.mergeAll(
      Layer.succeed(RpcClient.Protocol)(clientProtocol),
      Layer.succeed(RpcServer.Protocol)(serverProtocol)
    )
  }))

/**
 * Builds a paired `RpcClient.Protocol` / `RpcServer.Protocol` layer over a
 * Streamable HTTP MCP server.
 *
 * **Details**
 *
 * Each outbound request is sent as its own POST, and each decoded response
 * chunk is inspected before the usual terminal-response bookkeeping
 * (`RpcClient.makeProtocolHttp`, `RpcClient.ts:893-969`): chunks whose `_tag`
 * matches a `ServerRequestRpcs`/`ServerNotificationRpcs` method are routed to
 * the inbound `RpcServer.Protocol` dispatcher instead of the outbound
 * client's response handler, and any reply built by the inbound handler loop
 * is sent as a separate POST to the same URL, per the Streamable HTTP
 * requirement that client responses to server-initiated requests ride their
 * own POST body.
 */
const layerProtocolPairHttp = (options: {
  readonly url: string
  readonly headers?: Headers.Input | undefined
  readonly transformClient?: ((client: HttpClient.HttpClient) => HttpClient.HttpClient) | undefined
}): Layer.Layer<
  RpcClient.Protocol | RpcServer.Protocol,
  never,
  HttpClient.HttpClient | RpcSerialization.RpcSerialization
> =>
  Layer.unwrap(Effect.gen(function*() {
    const httpClient = yield* HttpClient.HttpClient
    const serialization = yield* RpcSerialization.RpcSerialization
    const isFramed = serialization.includesFraming
    const baseHeaders = Headers.fromInput(options.headers)

    let sessionId: string | undefined
    let negotiatedProtocolVersion: string | undefined

    const client = options.transformClient
      ? options.transformClient(httpClient)
      : httpClient

    const httpClientError = (cause: HttpClientError) =>
      new RpcClientError({ reason: HttpClientErrorSchema.fromHttpClientError(cause) })
    const protocolDefect = (message: string, cause: unknown) =>
      new RpcClientError({ reason: new RpcClientDefect({ message, cause }) })

    const requestHeaders = (): Headers.Input => {
      let headers = baseHeaders
      if (sessionId !== undefined) {
        headers = Headers.set(headers, mcpSessionIdHeader, sessionId)
      }
      if (negotiatedProtocolVersion !== undefined) {
        headers = Headers.set(headers, mcpProtocolVersionHeader, negotiatedProtocolVersion)
      }
      return headers
    }

    // Captures the writer installed by `RpcServer.Protocol.make` below, so
    // that decoded chunks matching an inbound method can be dispatched there
    // instead of to the outbound response handler.
    let writeInboundRequest!: (clientId: number, message: RpcMessage.FromClientEncoded) => Effect.Effect<void>

    const sendRaw = (body: Uint8Array | string) =>
      client.post(options.url, {
        headers: requestHeaders(),
        body: typeof body === "string"
          ? HttpBody.text(body, serialization.contentType)
          : HttpBody.uint8Array(body, serialization.contentType)
      }).pipe(Effect.mapError(httpClientError))

    const dispatch = (
      clientId: number,
      message: RpcMessage.FromServerEncoded | RpcMessage.FromClientEncoded,
      writeResponse: (clientId: number, response: RpcMessage.FromServerEncoded) => Effect.Effect<void>
    ) => {
      switch (message._tag) {
        case "Request": {
          const rpc = ServerRequestRpcs.requests.get(message.tag) ?? ServerNotificationRpcs.requests.get(message.tag)
          if (rpc) {
            return writeInboundRequest(0, message as RpcMessage.FromClientEncoded)
          }
          // A `Request`-shaped chunk whose method tag matches neither
          // `ServerRequestRpcs` nor `ServerNotificationRpcs` is either
          // malformed or an as-yet-unsupported inbound method: log it rather
          // than silently dropping it, mirroring `McpServer`'s exhaustive
          // dispatch switch (`RpcServer.ts:445-492`), which never falls
          // through unrecognized messages without at least routing them
          // somewhere meaningful.
          Effect.runFork(Effect.logWarning("Received unrecognized MCP inbound method", { tag: message.tag }))
          return Effect.void
        }
        case "Ack":
        case "Interrupt":
        case "Ping":
        case "Eof":
          return writeInboundRequest(0, message as RpcMessage.FromClientEncoded)
        case "Chunk":
        case "Exit":
        case "ClientProtocolError":
        case "Defect":
        case "Pong":
          return writeResponse(clientId, message as RpcMessage.FromServerEncoded)
      }
    }

    const send = Effect.fnUntraced(function*(
      clientId: number,
      request: RpcMessage.FromClientEncoded,
      writeResponse: (clientId: number, response: RpcMessage.FromServerEncoded) => Effect.Effect<void>
    ) {
      if (request._tag !== "Request") {
        return
      }

      const parser = serialization.makeUnsafe()
      const encoded = parser.encode(request)!
      const response = yield* client.post(options.url, {
        headers: requestHeaders(),
        body: typeof encoded === "string"
          ? HttpBody.text(encoded, serialization.contentType)
          : HttpBody.uint8Array(encoded, serialization.contentType)
      }).pipe(Effect.mapError(httpClientError))

      if (response.headers[mcpSessionIdHeader]) {
        sessionId = response.headers[mcpSessionIdHeader]
      }
      if (response.headers[mcpProtocolVersionHeader]) {
        negotiatedProtocolVersion = response.headers[mcpProtocolVersionHeader]
      }

      if (!isFramed) {
        const text = yield* response.text.pipe(Effect.mapError(httpClientError))
        if (text.length === 0) return
        const responses = yield* Effect.try({
          try: () => parser.decode(text),
          catch: (cause) => protocolDefect("Error decoding HTTP response", cause)
        })
        if (!Array.isArray(responses)) {
          return yield* protocolDefect("Expected an array of responses", responses)
        }
        let i = 0
        yield* Effect.whileLoop({
          while: () => i < responses.length,
          body: () => dispatch(clientId, responses[i++], writeResponse),
          step: constVoid
        })
        return
      }

      yield* Stream.runForEachArray(response.stream, (chunk) =>
        Effect.try({
          try: () => chunk.flatMap(parser.decode) as Array<RpcMessage.FromServerEncoded | RpcMessage.FromClientEncoded>,
          catch: (cause) => protocolDefect("Error decoding HTTP response", cause)
        }).pipe(
          Effect.flatMap((responses) => {
            if (responses.length === 0) return Effect.void
            let i = 0
            return Effect.whileLoop({
              while: () => i < responses.length,
              body: () => dispatch(clientId, responses[i++], writeResponse),
              step: constVoid
            })
          })
        )).pipe(
          Effect.mapError((cause) => cause instanceof RpcClientError ? cause : httpClientError(cause))
        )
    })

    const clientProtocol = yield* RpcClient.Protocol.make(Effect.fnUntraced(function*(writeResponse) {
      return {
        send: (clientId, request) => send(clientId, request, writeResponse),
        supportsAck: false,
        supportsTransferables: false
      }
    }))

    const disconnects = yield* Queue.make<number>()
    const serverProtocol = yield* RpcServer.Protocol.make(Effect.fnUntraced(function*(writeRequest) {
      writeInboundRequest = writeRequest
      return {
        disconnects,
        send(_clientId, response) {
          // Client responses to server-initiated requests ride their own
          // POST body, per the Streamable HTTP transport requirement.
          const parser = serialization.makeUnsafe()
          const encoded = parser.encode(response)
          if (encoded === undefined) return Effect.void
          return Effect.ignore(sendRaw(encoded))
        },
        end(_clientId) {
          return Effect.void
        },
        clientIds: Effect.succeed(new Set([0])),
        initialMessage: Effect.succeedNone,
        supportsAck: false,
        supportsTransferables: false,
        supportsSpanPropagation: false
      }
    }))

    return Layer.mergeAll(
      Layer.succeed(RpcClient.Protocol)(clientProtocol),
      Layer.succeed(RpcServer.Protocol)(serverProtocol)
    )
  }))
