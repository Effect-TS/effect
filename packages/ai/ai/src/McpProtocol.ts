import * as Rpc from "@effect/rpc/Rpc"
import * as RpcGroup from "@effect/rpc/RpcGroup"
import * as RpcSerialization from "@effect/rpc/RpcSerialization"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import * as Exit from "effect/Exit"
import type { LazyArg } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Mailbox from "effect/Mailbox"
import * as Schema from "effect/Schema"
import type { Readable, Writable } from "node:stream"

// =============================================================================
// Common
// =============================================================================

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

export class Error extends Schema.Class<Error>(
  "@effect/ai/McpProtocol/Error"
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

export class ParseError extends Schema.TaggedError<ParseError>()("ParseError", {
  ...Error.fields,
  code: Schema.tag(-32700)
}) {}

export class InvalidRequest extends Schema.TaggedError<InvalidRequest>()("InvalidRequest", {
  ...Error.fields,
  code: Schema.tag(-32600)
}) {}

export class MethodNotFound extends Schema.TaggedError<MethodNotFound>()("MethodNotFound", {
  ...Error.fields,
  code: Schema.tag(-32601)
}) {}

export class InvalidParams extends Schema.TaggedError<InvalidParams>()("InvalidParams", {
  ...Error.fields,
  code: Schema.tag(-32602)
}) {}

export class InternalError extends Schema.TaggedError<InternalError>()("InternalError", {
  ...Error.fields,
  code: Schema.tag(-32603)
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
// Ping
// =============================================================================

/**
 * A ping, issued by either the server or the client, to check that the other
 * party is still alive. The receiver must promptly respond, or else may be
 * disconnected.
 */
export class PingRequest extends Rpc.make("ping", {
  success: Schema.Struct({}),
  payload: RequestMeta
}) {}

// =============================================================================
// Protocol
// =============================================================================

export class ClientRequestRpcs extends RpcGroup.make(
  Initialize,
  InitializedNotification,
  PingRequest
) {}

export class ServerRequestRpcs extends RpcGroup.make(
  PingRequest
) {}

export type ClientRequestEncoded = RpcGroup.Rpcs<
  typeof ClientRequestRpcs
> extends infer Rpc ? Rpc extends Rpc.Rpc<
    infer _Tag,
    infer _Payload,
    infer _Success,
    infer _Error,
    infer _Middleware
  > ? {
      readonly _tag: _Tag
      readonly requestId: string | number
      readonly payload: _Payload["Encoded"]
    }
  : never
  : never

export type ServerRequestEncoded = RpcGroup.Rpcs<
  typeof ServerRequestRpcs
> extends infer Rpc ? Rpc extends Rpc.Rpc<
    infer _Tag,
    infer _Payload,
    infer _Success,
    infer _Error,
    infer _Middleware
  > ? {
      readonly _tag: _Tag
      readonly requestId?: string | number
      readonly payload: _Payload["Encoded"]
    }
  : never
  : never

export type ServerResponseEncoded = RpcGroup.Rpcs<
  typeof ClientRequestRpcs
> extends infer Rpc ? Rpc extends Rpc.Rpc<
    infer _Tag,
    infer _Payload,
    infer _Success,
    infer _Error,
    infer _Middleware
  > ? {
      readonly _tag: _Tag
      readonly requestId: string | number
      readonly response: Either.Either<_Success["Encoded"], _Error["Encoded"]>
    }
  : never
  : never

export class Protocol extends Context.Tag("@effect/ai/McpProtocol")<Protocol, {
  readonly disconnects: Mailbox.ReadonlyMailbox<number>
  readonly run: (
    f: (sessionId: string, data: ClientRequestEncoded) => Effect.Effect<void>
  ) => Effect.Effect<never>
  readonly send: (
    sessionId: string,
    response: ServerRequestEncoded | ServerResponseEncoded
  ) => Effect.Effect<void>
  readonly end: (sessionId: string) => Effect.Effect<void>
}>() {}

export const makeProtocolStdio = Effect.fnUntraced(function*(options?: {
  readonly stdin?: LazyArg<Readable>
  readonly stdout?: LazyArg<Writable>
}) {
  const stdin = options?.stdin?.() ?? process.stdin
  const stdout = options?.stdout?.() ?? process.stdout
  const serialization = yield* RpcSerialization.ndjson
  const parser = serialization.unsafeMake()
  const mailbox = yield* Mailbox.make<ClientRequestEncoded>()

  function onData(data: any) {
    const results = parser.decode(data) as ReadonlyArray<{
      readonly jsonrpc: "2.0"
      readonly id: string | number
      readonly method: string
      readonly params?: {
        [key: string]: unknown
      }
    }>
    if (results.length > 0) {
      mailbox.unsafeOfferAll(results.map(({ id, method, params }) =>
        ({
          _tag: method,
          requestId: id,
          payload: params
        }) as any
      ))
    }
  }
  function onError(error: Error) {
    mailbox.unsafeDone(Exit.die(error))
  }

  yield* Effect.addFinalizer(() =>
    Effect.sync(() => {
      // Remove our event listeners first
      stdin.off("data", onData)
      stdin.off("error", onError)

      // Check if we were the only data listener
      const listeners = stdin.listenerCount("data")
      if (listeners === 0) {
        // Only pause stdin if we were the only listener - this prevents
        // interfering with other parts of the application that might be using
        // stdin
        stdin.pause()
      }
    })
  )

  // Setup the listeners
  stdin.on("data", onData)
  stdin.on("error", onError)

  return Protocol.of({
    disconnects: yield* Mailbox.make<number>(),
    run: Effect.fnUntraced(function*(writeRequest) {
      while (true) {
        const [requests] = yield* mailbox.takeAll
        for (const request of requests) {
          yield* writeRequest("0", request)
        }
      }
    }),
    send: Effect.fnUntraced(function*(_sessionId, response) {
      let encoded: Uint8Array | string
      if ("payload" in response) {
        encoded = parser.encode({
          jsonrpc: "2.0",
          method: response._tag,
          params: response.payload
        })
      } else {
        encoded = parser.encode(Either.match(response.response as any, {
          onLeft: (_error) => ({
            jsonrpc: "2.0",
            id: response.requestId,
            // TODO: add errors
            error: {}
          }),
          onRight: (result) => ({
            jsonrpc: "2.0",
            id: response.requestId,
            result
          })
        }))
      }
      if (!stdout.write(encoded)) {
        yield* Effect.async<void>((resume) => {
          stdout.once("drain", () => resume(Effect.void))
        })
      }
    }),
    end(_sessionId) {
      return Effect.void
    }
  })
})

export const layerProtocolStdio = (options?: {
  readonly stdin?: LazyArg<Readable>
  readonly stdout?: LazyArg<Writable>
}) => Layer.scoped(Protocol, makeProtocolStdio(options))
