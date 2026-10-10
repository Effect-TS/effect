/**
 * The raw transport under `GraphQLClient`.
 *
 * **Details**
 *
 * A `GraphQLProtocol` takes an already-encoded request and returns the raw
 * `ExecutionResult`. It knows nothing about operations, Schemas or middleware;
 * those live in `GraphQLClient`.
 *
 * - `layerHttp({ url })` sends queries and mutations as `POST`, and
 *   subscriptions as graphql-sse distinct mode on the same URL.
 * - `layerWebSocket({ url })` sends every operation over one multiplexed
 *   graphql-ws socket.
 * - `layerHttp({ url, subscriptions: { webSocket: { url } } })` sends
 *   subscriptions over graphql-ws and everything else as `POST`.
 *
 * `makeHttp` and `makeWebSocket` build the same transports as effects.
 *
 * @stability experimental
 * @since 4.0.0
 */
import * as Cause from "../Cause.ts"
import * as Clock from "../Clock.ts"
import * as Context from "../Context.ts"
import * as Deferred from "../Deferred.ts"
import * as Duration from "../Duration.ts"
import * as Effect from "../Effect.ts"
import * as Sse from "../encoding/Sse.ts"
import * as Fiber from "../Fiber.ts"
import * as HttpClient from "../http/HttpClient.ts"
import * as HttpClientError from "../http/HttpClientError.ts"
import * as HttpClientRequest from "../http/HttpClientRequest.ts"
import * as HttpClientResponse from "../http/HttpClientResponse.ts"
import * as Layer from "../Layer.ts"
import * as Queue from "../Queue.ts"
import * as Result from "../Result.ts"
import * as Schema from "../Schema.ts"
import type * as Scope from "../Scope.ts"
import * as Socket from "../socket/Socket.ts"
import * as Stream from "../Stream.ts"
import { GraphQLError, TransportError } from "./GraphQLClientError.ts"

/**
 * The request a transport sends. Middleware sees and may rewrite it before it
 * reaches the transport.
 *
 * **Details**
 *
 * `variables` are already encoded through the operation's variables Schema.
 * `headers` are applied by the HTTP transport; a WebSocket transport ignores
 * them because graphql-ws has no per-operation headers.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface GraphQLRequest {
  readonly query: string
  readonly operationName: string
  readonly variables: unknown
  readonly extensions?: Record<string, unknown> | undefined
  readonly headers: Readonly<Record<string, string>>
}

/**
 * The raw result of executing a GraphQL operation, before `data` is decoded
 * with the result Schema. Middleware receive this from `next`, which is how
 * they read response `extensions` such as a rate-limit cost.
 *
 * @stability experimental
 * @category schemas
 * @since 4.0.0
 */
export const ExecutionResult = Schema.Struct({
  data: Schema.optional(Schema.Unknown),
  errors: Schema.optional(Schema.Array(GraphQLError)),
  extensions: Schema.optional(Schema.Record(Schema.String, Schema.Json))
})

/**
 * The decoded type of {@link ExecutionResult}.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export type ExecutionResult = typeof ExecutionResult.Type

/**
 * The transport service. `execute` answers a query or mutation with the raw
 * JSON body, and `subscribe` turns a subscription into a stream of raw events.
 * Both fail only with `TransportError`; GraphQL `errors` are left in the body
 * for the client to interpret.
 *
 * **Example** (A scripted transport for tests)
 *
 * ```ts import.meta.vitest
 * import { Effect, Layer, Schema, Stream } from "effect"
 * import { GraphQL, GraphQLClient, GraphQLGroup, GraphQLProtocol } from "effect/graphql"
 *
 * const Viewer = GraphQL.query("Viewer", {
 *   document: "query Viewer{viewer{login}}",
 *   result: Schema.Struct({ viewer: Schema.Struct({ login: Schema.String }) })
 * })
 *
 * const Scripted = Layer.succeed(GraphQLProtocol.GraphQLProtocol, {
 *   execute: () => Effect.succeed({ data: { viewer: { login: "tim" } } }),
 *   subscribe: () => Stream.empty
 * })
 *
 * const program = Effect.gen(function*() {
 *   const client = yield* GraphQLClient.make(GraphQLGroup.make(Viewer))
 *   return yield* client.Viewer()
 * })
 *
 * await Effect.runPromise(program.pipe(Effect.provide(Scripted))) // => { viewer: { login: "tim" } }
 * ```
 *
 * @stability experimental
 * @category services
 * @since 4.0.0
 */
export class GraphQLProtocol extends Context.Service<GraphQLProtocol, {
  readonly execute: (request: GraphQLRequest) => Effect.Effect<unknown, TransportError>
  readonly subscribe: (request: GraphQLRequest) => Stream.Stream<unknown, TransportError>
}>()("effect/graphql/GraphQLProtocol") {}

const graphqlResponseContentType = "application/graphql-response+json"
const jsonContentType = "application/json"
const eventStreamContentType = "text/event-stream"

const isGraphQLBody = (body: unknown): boolean =>
  typeof body === "object" && body !== null && !Array.isArray(body) && ("data" in body || "errors" in body)

// The JSON body of a POST and the payload of a graphql-ws `subscribe`.
// `extensions` is dropped from the JSON when unset.
const requestBody = (request: GraphQLRequest) => ({
  query: request.query,
  operationName: request.operationName,
  variables: request.variables,
  extensions: request.extensions
})

const postRequest = (url: string, request: GraphQLRequest, accept: string) =>
  HttpClientRequest.post(url).pipe(
    HttpClientRequest.setHeaders(request.headers),
    HttpClientRequest.setHeader("accept", accept),
    HttpClientRequest.bodyJsonUnsafe(requestBody(request))
  )

const fromHttpClientError =
  (now: number) =>
  <A>(effect: Effect.Effect<A, TransportError | HttpClientError.HttpClientError>): Effect.Effect<A, TransportError> =>
    Effect.catch(effect, (error) =>
      Effect.fail(
        HttpClientError.isHttpClientError(error) ? TransportError.fromHttpClientError(error, { now }) : error
      ))

// Reads a single GraphQL response body, or fails when the response is not one.
const readResponse = (
  response: HttpClientResponse.HttpClientResponse
): Effect.Effect<unknown, TransportError | HttpClientError.HttpClientError> => {
  const contentType = response.headers["content-type"] ?? ""
  // The GraphQL-over-HTTP media type is authoritative, whatever the status.
  if (contentType.includes(graphqlResponseContentType)) {
    return response.json
  }
  // Legacy servers answer with application/json; only a body with the
  // GraphQL keys counts as a GraphQL response.
  if (contentType.includes(jsonContentType)) {
    return Effect.flatMap(response.json, (body) =>
      isGraphQLBody(body)
        ? Effect.succeed(body)
        : Effect.as(HttpClientResponse.filterStatusOk(response), body))
  }
  return Effect.flatMap(
    HttpClientResponse.filterStatusOk(response),
    () =>
      Effect.fail(
        new TransportError({
          description: `Expected a GraphQL response, received ${
            contentType === "" ? "no Content-Type" : `Content-Type ${contentType}`
          }`,
          status: response.status
        })
      )
  )
}

const errorMessage = (cause: unknown): string => cause instanceof Error ? cause.message : String(cause)

// The graphql-sse distinct-mode events of a `text/event-stream` body. The
// stream ends on a `complete` event or at EOF. A `retry:` line is kept and
// reported as `retryAfter` if the body later fails.
const sseEvents = (response: HttpClientResponse.HttpClientResponse): Stream.Stream<unknown, TransportError> =>
  Stream.suspend(() => {
    let retryAfter: Duration.Duration | undefined
    let complete = false
    let invalid: TransportError | undefined
    let events: Array<unknown> = []
    const parser = Sse.makeParser((event) => {
      if (event._tag === "Retry") {
        retryAfter = event.duration
        return
      }
      if (complete || invalid !== undefined) return
      if (event.event === "complete") {
        complete = true
      } else if (event.event === "next") {
        try {
          events.push(JSON.parse(event.data))
        } catch (cause) {
          invalid = new TransportError({ description: `Invalid graphql-sse next event: ${errorMessage(cause)}`, cause })
        }
      }
    })
    return response.stream.pipe(
      Stream.decodeText(),
      Stream.mapError((cause) =>
        new TransportError({ description: `The graphql-sse stream failed: ${cause.message}`, retryAfter, cause })
      ),
      Stream.mapEffect((text) => {
        const error = parser.feed(text)
        if (error !== undefined) {
          return Effect.fail(new TransportError({ description: error.message, cause: error }))
        }
        if (invalid !== undefined) {
          return Effect.fail(invalid)
        }
        const batch = { events, complete }
        events = []
        return Effect.succeed(batch)
      }),
      Stream.takeUntil((batch) => batch.complete),
      Stream.map((batch) => batch.events),
      Stream.flattenIterable
    )
  })

/**
 * Options for {@link makeHttp} and {@link layerHttp}.
 *
 * **Details**
 *
 * Without `subscriptions`, subscriptions use graphql-sse distinct mode on
 * `url`. With `subscriptions.webSocket`, they go over graphql-ws instead,
 * and queries and mutations stay on `POST`.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface HttpOptions<R = never> {
  readonly url: string
  readonly subscriptions?: {
    readonly webSocket: WebSocketOptions<R>
  } | undefined
}

/**
 * Builds the HTTP transport as an effect, for composing transports by hand.
 * Most code uses {@link layerHttp}.
 *
 * **Details**
 *
 * With `subscriptions.webSocket` the effect also builds the graphql-ws
 * transport, so it needs a `Socket.WebSocketConstructor` and a `Scope`.
 *
 * @stability experimental
 * @category constructors
 * @since 4.0.0
 */
export const makeHttp: {
  <R = never>(
    options: HttpOptions<R> & { readonly subscriptions: NonNullable<HttpOptions<R>["subscriptions"]> }
  ): Effect.Effect<
    GraphQLProtocol["Service"],
    never,
    HttpClient.HttpClient | Socket.WebSocketConstructor | Scope.Scope | R
  >
  (options: { readonly url: string; readonly subscriptions?: undefined }): Effect.Effect<
    GraphQLProtocol["Service"],
    never,
    HttpClient.HttpClient
  >
} = (options: HttpOptions<any>) => makeHttpWith(options)

const makeHttpWith = <R>(options: HttpOptions<R>): Effect.Effect<
  GraphQLProtocol["Service"],
  never,
  HttpClient.HttpClient | Socket.WebSocketConstructor | Scope.Scope | R
> =>
  Effect.gen(function*() {
    const client = yield* HttpClient.HttpClient
    const execute = Effect.fnUntraced(function*(request: GraphQLRequest) {
      const now = yield* Clock.currentTimeMillis
      return yield* client.execute(
        postRequest(options.url, request, `${graphqlResponseContentType}, ${jsonContentType}`)
      )
        .pipe(
          Effect.flatMap(readResponse),
          fromHttpClientError(now)
        )
    })
    const subscribeSse = (request: GraphQLRequest): Stream.Stream<unknown, TransportError> =>
      Stream.unwrap(Effect.gen(function*() {
        const now = yield* Clock.currentTimeMillis
        const response = yield* client.execute(postRequest(options.url, request, eventStreamContentType)).pipe(
          fromHttpClientError(now)
        )
        const contentType = response.headers["content-type"] ?? ""
        if (contentType.includes(eventStreamContentType) && response.status >= 200 && response.status < 300) {
          return sseEvents(response)
        }
        // A server that rejects the subscription answers with a single
        // GraphQL response, which the client reads like a query's.
        return Stream.fromEffect(fromHttpClientError(now)(readResponse(response)))
      }))
    const webSocket = options.subscriptions?.webSocket
    const subscribe = webSocket === undefined ? subscribeSse : (yield* makeWebSocket(webSocket)).subscribe
    return GraphQLProtocol.of({ execute, subscribe })
  })

/**
 * The HTTP transport: queries and mutations are sent as `POST` with a JSON
 * body to `url`, using the `HttpClient` in context. Subscriptions use
 * graphql-sse distinct mode on the same URL, or graphql-ws when
 * `subscriptions.webSocket` is set.
 *
 * **Details**
 *
 * A response is a GraphQL response when its `Content-Type` is
 * `application/graphql-response+json`, whatever the status, or when it is
 * `application/json` and the body has a `data` or `errors` key. Anything else
 * is a `TransportError` with the response `status`, and a `Retry-After`
 * header (numeric or HTTP-date) becomes `retryAfter`.
 *
 * A subscription is a `POST` with `Accept: text/event-stream`. Each `next`
 * event is emitted, and the stream ends on a `complete` event or when the
 * body ends. A body that fails is a retryable `TransportError`, with a
 * server `retry:` line as its `retryAfter`. A non-stream answer, such as a
 * `400` with `errors`, is read like a query's response. Interrupting the
 * stream aborts the request.
 *
 * With `subscriptions: { webSocket }`, subscriptions go over graphql-ws as in
 * {@link layerWebSocket}, and the layer needs a `Socket.WebSocketConstructor`.
 *
 * **Example** (Building a client over HTTP)
 *
 * ```ts import.meta.vitest
 * import { Effect, Layer, Schema } from "effect"
 * import { GraphQL, GraphQLClient, GraphQLGroup, GraphQLProtocol } from "effect/graphql"
 * import { HttpClient, HttpClientResponse } from "effect/http"
 *
 * const Viewer = GraphQL.query("Viewer", {
 *   document: "query Viewer{viewer{login}}",
 *   result: Schema.Struct({ viewer: Schema.Struct({ login: Schema.String }) })
 * })
 *
 * // A stand-in for a real HttpClient layer such as FetchHttpClient.layer
 * const FakeServer = Layer.succeed(
 *   HttpClient.HttpClient,
 *   HttpClient.make((request) =>
 *     Effect.succeed(HttpClientResponse.fromWeb(
 *       request,
 *       new Response(JSON.stringify({ data: { viewer: { login: "tim" } } }), {
 *         headers: { "content-type": "application/graphql-response+json" }
 *       })
 *     ))
 *   )
 * )
 *
 * const program = Effect.gen(function*() {
 *   const client = yield* GraphQLClient.make(GraphQLGroup.make(Viewer))
 *   return yield* client.Viewer()
 * }).pipe(
 *   Effect.provide(GraphQLProtocol.layerHttp({ url: "https://api.github.com/graphql" })),
 *   Effect.provide(FakeServer)
 * )
 *
 * await Effect.runPromise(program) // => { viewer: { login: "tim" } }
 * ```
 *
 * **Example** (Subscriptions over graphql-ws, everything else over POST)
 *
 * ```ts import.meta.vitest
 * import { Effect } from "effect"
 * import { GraphQLProtocol } from "effect/graphql"
 *
 * const token = Effect.succeed("secret")
 *
 * // Provide an HttpClient and a Socket.WebSocketConstructor, such as
 * // FetchHttpClient.layer and NodeSocket.layerWebSocketConstructor
 * export const Protocol = GraphQLProtocol.layerHttp({
 *   url: "https://example.com/graphql",
 *   subscriptions: {
 *     webSocket: {
 *       url: "wss://example.com/graphql",
 *       connectionParams: Effect.map(token, (token) => ({ authorization: `Bearer ${token}` }))
 *     }
 *   }
 * })
 * ```
 *
 * @stability experimental
 * @category layers
 * @since 4.0.0
 */
export const layerHttp: {
  <R = never>(
    options: HttpOptions<R> & { readonly subscriptions: NonNullable<HttpOptions<R>["subscriptions"]> }
  ): Layer.Layer<GraphQLProtocol, never, HttpClient.HttpClient | Socket.WebSocketConstructor | R>
  (options: { readonly url: string; readonly subscriptions?: undefined }): Layer.Layer<
    GraphQLProtocol,
    never,
    HttpClient.HttpClient
  >
} = <R>(
  options: HttpOptions<R>
): Layer.Layer<GraphQLProtocol, never, HttpClient.HttpClient | Socket.WebSocketConstructor | R> =>
  Layer.effect(GraphQLProtocol, makeHttpWith(options))

/**
 * Options for {@link makeWebSocket} and {@link layerWebSocket}.
 *
 * **Details**
 *
 * - `headers` are sent on the opening handshake together with the
 *   `graphql-transport-ws` subprotocol. Browsers cannot set them; use them
 *   with a Node or Bun `Socket.WebSocketConstructor`.
 * - `connectionParams` is the `connection_init` payload. It runs again on
 *   every connect, so a token can be refreshed. A failure is a
 *   `TransportError`, and so is the socket closing while it runs.
 * - `connectionAckTimeout` (default 10 seconds) bounds the wait for
 *   `connection_ack`, starting once `connection_init` is sent.
 * - `keepAlive` (default 10 seconds) is how often the client sends `ping`.
 *   No frame from the server for a whole interval after a `ping` drops the
 *   connection with a retryable `TransportError`. `false` turns it off.
 * - `idleTimeout` (default 0) is how long the socket stays open after the
 *   last operation ends.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface WebSocketOptions<R = never> {
  readonly url: string
  readonly headers?: Readonly<Record<string, string>> | undefined
  readonly connectionParams?: Effect.Effect<Record<string, unknown> | undefined, unknown, R> | undefined
  readonly connectionAckTimeout?: Duration.Input | undefined
  readonly keepAlive?: Duration.Input | false | undefined
  readonly idleTimeout?: Duration.Input | undefined
}

interface WsMessage {
  readonly type: string
  readonly id?: string | undefined
  readonly payload?: unknown
}

// One WebSocket connection. Operations attached to it fail with `error` when
// it is lost.
interface Connection {
  readonly ack: Deferred.Deferred<void, TransportError>
  alive: boolean
  error: TransportError | undefined
  receivedFrame: boolean
  fiber: Fiber.Fiber<void> | undefined
}

interface Operation {
  readonly queue: Queue.Queue<unknown, TransportError | Cause.Done>
  readonly connection: Connection
  sent: boolean
}

const textDecoder = new TextDecoder()

// The message checks follow graphql-ws's own `validateMessage`: an object is
// neither `null` nor an array, and `error` carries at least one entry with a
// `message`.
const isObject = (u: unknown): u is Record<string, unknown> => typeof u === "object" && u !== null && !Array.isArray(u)

const isFormattedErrors = (u: unknown): boolean =>
  Array.isArray(u) && u.length > 0 && u.every((error) => isObject(error) && "message" in error)

const connectionError = (cause: Cause.Cause<unknown>): TransportError => {
  const found = Cause.findError(cause)
  if (Result.isFailure(found)) {
    return new TransportError({ description: "The graphql-ws connection was closed" })
  }
  const error = found.success
  if (error instanceof TransportError) {
    return error
  }
  if (Socket.isSocketError(error) && error.reason._tag === "SocketCloseError") {
    return new TransportError({
      description: `The graphql-ws connection closed with ${error.reason.message}`,
      closeCode: error.reason.code,
      cause: error
    })
  }
  return new TransportError({ description: `The graphql-ws connection failed: ${errorMessage(error)}`, cause: error })
}

/**
 * Builds the graphql-ws transport as an effect, for composing transports by
 * hand. Most code uses {@link layerWebSocket}.
 *
 * @stability experimental
 * @category constructors
 * @since 4.0.0
 */
export const makeWebSocket: {
  <R = never>(options: WebSocketOptions<R>): Effect.Effect<
    GraphQLProtocol["Service"],
    never,
    Socket.WebSocketConstructor | Scope.Scope | R
  >
  // Last, so `Parameters<typeof makeWebSocket>` reads `WebSocketOptions<never>`
  // rather than the generic signature with `R` widened to `unknown`.
  (options: WebSocketOptions): Effect.Effect<
    GraphQLProtocol["Service"],
    never,
    Socket.WebSocketConstructor | Scope.Scope
  >
} = <R>(options: WebSocketOptions<R>): Effect.Effect<
  GraphQLProtocol["Service"],
  never,
  Socket.WebSocketConstructor | Scope.Scope | R
> =>
  Effect.gen(function*() {
    const socket = yield* Socket.makeWebSocket(options.url, {
      protocols: "graphql-transport-ws",
      headers: options.headers
    })
    const writer = yield* socket.writer
    const scope = yield* Effect.scope
    const context = yield* Effect.context<R>()
    const connectionParams = options.connectionParams === undefined
      ? Effect.succeed(undefined)
      : options.connectionParams.pipe(
        Effect.provideContext(context),
        Effect.mapError((cause) =>
          new TransportError({ description: `graphql-ws connectionParams failed: ${errorMessage(cause)}`, cause })
        )
      )
    const ackTimeout = options.connectionAckTimeout ?? Duration.seconds(10)
    const keepAlive = options.keepAlive ?? Duration.seconds(10)
    const idleTimeout = Duration.fromInputUnsafe(options.idleTimeout ?? 0)

    const operations = new Map<string, Operation>()
    let connection: Connection | undefined
    let nextId = 0
    let active = 0
    let idleGeneration = 0

    const send = (message: WsMessage) =>
      writer.write(JSON.stringify(message)).pipe(
        Effect.mapError((cause) => connectionError(Cause.fail(cause)))
      )

    // Marks `conn` as lost and fails every operation still attached to it.
    const lose = (conn: Connection, error: TransportError) => {
      if (!conn.alive) return
      conn.alive = false
      conn.error = error
      if (connection === conn) connection = undefined
      Deferred.doneUnsafe(conn.ack, Effect.fail(error))
      for (const [id, operation] of operations) {
        if (operation.connection !== conn) continue
        operations.delete(id)
        Queue.failCauseUnsafe(operation.queue, Cause.fail(error))
      }
    }

    // An invalid server message closes the connection with 4400, which is
    // fatal for every operation on it.
    const invalid = (reason: string, cause?: unknown) =>
      Effect.andThen(
        Effect.ignore(writer.write(new Socket.CloseEvent(4400, "Invalid message"))),
        Effect.fail(
          new TransportError({ description: `Invalid graphql-ws message: ${reason}`, closeCode: 4400, cause })
        )
      )

    const handle = (conn: Connection, frame: string | Uint8Array): Effect.Effect<void, TransportError> => {
      let message: WsMessage
      try {
        message = JSON.parse(typeof frame === "string" ? frame : textDecoder.decode(frame))
      } catch (cause) {
        return invalid(errorMessage(cause), cause)
      }
      if (!isObject(message)) {
        return invalid("expected an object")
      }
      switch (message.type) {
        case "connection_ack":
        case "ping":
        case "pong": {
          if (message.payload != null && !isObject(message.payload)) {
            return invalid(`${message.type} with a payload that is not an object`)
          }
          conn.receivedFrame = true
          if (message.type === "connection_ack") {
            Deferred.doneUnsafe(conn.ack, Effect.void)
          }
          return message.type === "ping" ? send({ type: "pong" }) : Effect.void
        }
        case "next":
        case "error":
        case "complete": {
          const id = message.id
          if (typeof id !== "string" || id === "") {
            return invalid(`${message.type} without an id`)
          }
          if (message.type === "next" && !isObject(message.payload)) {
            return invalid("next with a payload that is not an object")
          }
          if (message.type === "error" && !isFormattedErrors(message.payload)) {
            return invalid("error with a payload that is not a list of GraphQL errors")
          }
          conn.receivedFrame = true
          const operation = operations.get(id)
          // Unknown ids, including operations this client already completed, are dropped.
          if (operation === undefined || operation.connection !== conn) return Effect.void
          if (message.type === "next") {
            Queue.offerUnsafe(operation.queue, message.payload)
            return Effect.void
          }
          operations.delete(id)
          if (message.type === "error") {
            // The server rejected the operation; the client fails it with a ResponseError.
            Queue.offerUnsafe(operation.queue, { errors: message.payload })
          }
          Queue.endUnsafe(operation.queue)
          return Effect.void
        }
        default: {
          return invalid(`unknown type ${JSON.stringify(message.type)}`)
        }
      }
    }

    const pinger = (conn: Connection): Effect.Effect<void, TransportError> =>
      keepAlive === false ? Effect.never : Effect.gen(function*() {
        conn.receivedFrame = true
        while (true) {
          yield* Effect.sleep(keepAlive)
          if (!conn.receivedFrame) {
            return yield* Effect.fail(
              new TransportError({ description: "The graphql-ws server did not answer the keep-alive ping" })
            )
          }
          conn.receivedFrame = false
          yield* send({ type: "ping" })
        }
      })

    const run = (conn: Connection): Effect.Effect<void> =>
      Effect.gen(function*() {
        const { pull } = yield* socket.reader
        const init = Effect.flatMap(
          connectionParams,
          (payload) => send(payload === undefined ? { type: "connection_init" } : { type: "connection_init", payload })
        )
        const read = Effect.forever(
          Effect.flatMap(pull, (frames) => Effect.forEach(frames, (frame) => handle(conn, frame), { discard: true }))
        )
        const acknowledged = Deferred.await(conn.ack).pipe(
          Effect.timeoutOrElse({
            duration: ackTimeout,
            orElse: () =>
              Effect.fail(new TransportError({ description: "The graphql-ws server did not send connection_ack" }))
          })
        )
        // Reading starts with `connectionParams`, so a close while it runs still
        // fails the waiting operations. The ack timeout starts once
        // `connection_init` is sent.
        yield* Effect.all([read, init.pipe(Effect.andThen(acknowledged), Effect.andThen(pinger(conn)))], {
          concurrency: 2,
          discard: true
        })
      }).pipe(
        // Runs before the socket closes, so no write waits on a dead socket.
        Effect.onError((cause) => Effect.sync(() => lose(conn, connectionError(cause)))),
        Effect.scoped,
        Effect.ignore
      )

    const close = (conn: Connection) => {
      lose(conn, new TransportError({ description: "The graphql-ws connection was closed" }))
      return conn.fiber === undefined ? Effect.void : Fiber.interrupt(conn.fiber)
    }

    const acquireConnection = Effect.suspend(() => {
      if (connection !== undefined) return Effect.succeed(connection)
      const conn: Connection = {
        ack: Deferred.makeUnsafe(),
        alive: true,
        error: undefined,
        receivedFrame: true,
        fiber: undefined
      }
      connection = conn
      return Effect.forkIn(run(conn), scope).pipe(
        Effect.map((fiber) => {
          conn.fiber = fiber
          return conn
        })
      )
    })

    const register = (queue: Operation["queue"]) =>
      Effect.suspend(() => {
        active++
        idleGeneration++
        return Effect.map(acquireConnection, (conn) => {
          const id = String(++nextId)
          const operation: Operation = { queue, connection: conn, sent: false }
          operations.set(id, operation)
          return [id, operation] as const
        })
      })

    const release = (id: string, operation: Operation) =>
      Effect.suspend(() => {
        const open = operations.delete(id)
        const complete = open && operation.sent && operation.connection.alive
          ? Effect.ignore(send({ id, type: "complete" }))
          : Effect.void
        return Effect.andThen(
          complete,
          Effect.suspend(() => {
            if (--active > 0 || connection === undefined) return Effect.void
            const conn = connection
            if (Duration.isZero(idleTimeout)) return close(conn)
            const generation = ++idleGeneration
            return Effect.asVoid(Effect.forkIn(
              Effect.suspend(() =>
                generation === idleGeneration && active === 0 && connection === conn ? close(conn) : Effect.void
              ).pipe(Effect.delay(idleTimeout)),
              scope
            ))
          })
        )
      })

    const operation = (request: GraphQLRequest): Stream.Stream<unknown, TransportError> =>
      Stream.unwrap(Effect.gen(function*() {
        const queue = yield* Queue.unbounded<unknown, TransportError | Cause.Done>()
        const [id, operation] = yield* Effect.acquireRelease(
          register(queue),
          ([id, operation]) => release(id, operation)
        )
        const conn = operation.connection
        yield* Deferred.await(conn.ack)
        if (!conn.alive) {
          return yield* Effect.fail(conn.error!)
        }
        if (operations.has(id)) {
          operation.sent = true
          // Per-call `request.headers` are ignored: graphql-ws has no per-operation headers.
          yield* send({ id, type: "subscribe", payload: requestBody(request) })
        }
        return Stream.fromQueue(queue)
      }))

    const execute = (request: GraphQLRequest): Effect.Effect<unknown, TransportError> =>
      Effect.flatMap(Stream.runHead(operation(request)), (result) =>
        result._tag === "Some"
          ? Effect.succeed(result.value)
          : Effect.fail(new TransportError({ description: "The graphql-ws operation completed without a result" })))

    return GraphQLProtocol.of({ execute, subscribe: operation })
  })

/**
 * The graphql-ws transport: every operation goes over one WebSocket using the
 * `graphql-transport-ws` subprotocol, with the `Socket.WebSocketConstructor`
 * in context.
 *
 * **Details**
 *
 * - The socket connects on the first operation, and operations are
 *   multiplexed over it by id. It closes `idleTimeout` after the last
 *   operation ends, and with code `1000` when the layer's scope closes.
 * - `subscribe` frames wait for `connection_ack`. A missing ack is a
 *   `TransportError`.
 * - Server `ping` is answered with `pong`. See {@link WebSocketOptions} for
 *   the client keep-alive.
 * - A lost connection fails every active operation, queries included, with a
 *   `TransportError` carrying the `closeCode`. The fatal close codes
 *   (`1002`, `4400`, `4401`, `4403`, `4406`, `4409`, `4429`) are not retryable;
 *   others, `1006` and `4500` among them, are. The transport never replays
 *   an operation: the client resubscribes on its `subscriptionRetry`
 *   schedule, and the socket reconnects on the next operation.
 * - Server messages are validated as graphql-ws does: a known `type`, a
 *   non-empty `id` on `next`, `error` and `complete`, an object payload on
 *   `next`, a non-empty list of errors with a `message` on `error`, and an
 *   object or no payload on `connection_ack`, `ping` and `pong`. An invalid
 *   message closes the socket with `4400` and fails every operation on it.
 *   Valid messages for unknown ids are dropped.
 * - A server `error` message fails the operation with a `ResponseError`.
 *   Interrupting a subscription sends `complete`.
 * - Per-call `request.headers` are ignored, because graphql-ws has no
 *   per-operation headers. Authenticate with `connectionParams` or handshake
 *   `headers`.
 *
 * **Example** (A client over graphql-ws)
 *
 * ```ts import.meta.vitest
 * import { Effect, Layer } from "effect"
 * import { GraphQLProtocol } from "effect/graphql"
 * import type { Socket } from "effect/socket"
 *
 * // Provide a Socket.WebSocketConstructor, such as
 * // Socket.layerWebSocketConstructorGlobal in a browser
 * export const Protocol: Layer.Layer<GraphQLProtocol.GraphQLProtocol, never, Socket.WebSocketConstructor> =
 *   GraphQLProtocol.layerWebSocket({
 *     url: "wss://example.com/graphql",
 *     connectionParams: Effect.succeed({ authorization: "Bearer secret" }),
 *     idleTimeout: "30 seconds"
 *   })
 * ```
 *
 * @stability experimental
 * @category layers
 * @since 4.0.0
 */
export const layerWebSocket = <R = never>(
  options: WebSocketOptions<R>
): Layer.Layer<GraphQLProtocol, never, Socket.WebSocketConstructor | R> =>
  Layer.effect(GraphQLProtocol, makeWebSocket(options))
