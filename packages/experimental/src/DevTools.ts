/**
 * @since 1.0.0
 */
import * as Schema from "@effect/schema/Schema"
import type { Scope } from "effect"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import type { Option } from "effect/Option"
import * as Queue from "effect/Queue"
import * as Schedule from "effect/Schedule"
import * as Stream from "effect/Stream"
import * as Tracer from "effect/Tracer"
import * as MsgPack from "./MsgPack.js"
import * as Socket from "./Socket/Node.js"
import * as SocketServer from "./SocketServer/Node.js"

/**
 * @since 1.0.0
 * @category schemas
 */
export const SpanStatusStarted = Schema.struct({
  _tag: Schema.literal("Started"),
  startTime: Schema.bigint
})

/**
 * @since 1.0.0
 * @category schemas
 */
export const SpanStatusEnded = Schema.struct({
  _tag: Schema.literal("Ended"),
  startTime: Schema.bigint,
  endTime: Schema.bigint
})

/**
 * @since 1.0.0
 * @category schemas
 */
export const SpanStatus = Schema.union(SpanStatusStarted, SpanStatusEnded)

/**
 * @since 1.0.0
 * @category schemas
 */
export const ExternalSpan = Schema.struct({
  _tag: Schema.literal("ExternalSpan"),
  spanId: Schema.string,
  traceId: Schema.string,
  sampled: Schema.boolean
})

/**
 * @since 1.0.0
 * @category schemas
 */
export interface ExternalSpanFrom extends Schema.Schema.From<typeof ExternalSpan> {}

/**
 * @since 1.0.0
 * @category schemas
 */
export interface ExternalSpan extends Schema.Schema.To<typeof ExternalSpan> {}

/**
 * @since 1.0.0
 * @category schemas
 */
export const Span: Schema.Schema<SpanFrom, Span> = Schema.struct({
  _tag: Schema.literal("Span"),
  spanId: Schema.string,
  traceId: Schema.string,
  name: Schema.string,
  sampled: Schema.boolean,
  attributes: Schema.readonlyMap(Schema.string, Schema.unknown),
  status: SpanStatus,
  parent: Schema.option(Schema.lazy(() => ParentSpan))
})

/**
 * @since 1.0.0
 * @category schemas
 */
export const ParentSpan = Schema.union(Span, ExternalSpan)

/**
 * @since 1.0.0
 * @category schemas
 */
export type ParentSpanFrom = SpanFrom | ExternalSpanFrom

/**
 * @since 1.0.0
 * @category schemas
 */
export type ParentSpan = Span | ExternalSpan

/**
 * @since 1.0.0
 * @category schemas
 */
export interface SpanFrom {
  readonly _tag: "Span"
  readonly spanId: string
  readonly traceId: string
  readonly name: string
  readonly sampled: boolean
  readonly attributes: ReadonlyArray<readonly [string, unknown]>
  readonly parent: Schema.OptionFrom<ParentSpanFrom>
  readonly status: {
    readonly _tag: "Started"
    readonly startTime: string
  } | {
    readonly _tag: "Ended"
    readonly startTime: string
    readonly endTime: string
  }
}

/**
 * @since 1.0.0
 * @category schemas
 */
export interface Span {
  readonly _tag: "Span"
  readonly spanId: string
  readonly traceId: string
  readonly name: string
  readonly sampled: boolean
  readonly attributes: ReadonlyMap<string, unknown>
  readonly parent: Option<ParentSpan>
  readonly status: {
    readonly _tag: "Started"
    readonly startTime: bigint
  } | {
    readonly _tag: "Ended"
    readonly startTime: bigint
    readonly endTime: bigint
  }
}

/**
 * @since 1.0.0
 * @category schemas
 */
export const Ping = Schema.struct({
  _tag: Schema.literal("Ping")
})

/**
 * @since 1.0.0
 * @category schemas
 */
export const Pong = Schema.struct({
  _tag: Schema.literal("Pong")
})

/**
 * @since 1.0.0
 * @category schemas
 */
export const Request = Schema.union(Ping, Span)

/**
 * @since 1.0.0
 * @category schemas
 */
export type Request = Schema.Schema.To<typeof Request>

/**
 * @since 1.0.0
 * @category schemas
 */
export const Response = Pong

/**
 * @since 1.0.0
 * @category schemas
 */
export type Response = Schema.Schema.To<typeof Response>

/**
 * @since 1.0.0
 * @category models
 */
export interface ClientImpl {
  readonly unsafeWrite: (_: Span) => void
  readonly write: (_: Span) => Effect.Effect<never, never, void>
}

/**
 * @since 1.0.0
 * @category models
 */
export interface Client {
  readonly _: unique symbol
}

/**
 * @since 1.0.0
 * @category tags
 */
export const Client = Context.Tag<Client, ClientImpl>("@effect/experimental/DevTools/Client")

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeClient: Effect.Effect<Scope.Scope | Socket.Socket, never, ClientImpl> = Effect.gen(function*(_) {
  const socket = yield* _(Socket.Socket)
  const requests = yield* _(Effect.acquireRelease(
    Queue.bounded<Request>(100),
    Queue.shutdown
  ))
  yield* _(
    Stream.fromQueue(requests),
    Stream.pipeThroughChannel(
      MsgPack.duplexSchema(Socket.toChannel(socket), {
        inputSchema: Request,
        outputSchema: Response
      })
    ),
    Stream.runDrain,
    Effect.tapErrorCause(Effect.logDebug),
    Effect.retry(
      Schedule.exponential("500 millis").pipe(
        Schedule.union(Schedule.spaced("10 seconds"))
      )
    ),
    Effect.forkScoped
  )
  yield* _(
    Queue.offer(requests, { _tag: "Ping" }),
    Effect.delay("3 seconds"),
    Effect.forever,
    Effect.forkScoped
  )

  return Client.of({
    write: (request) => Queue.offer(requests, request),
    unsafeWrite: (request) => Queue.unsafeOffer(requests, request)
  })
})

/**
 * @since 1.0.0
 * @category layers
 */
export const layerClient: Layer.Layer<Socket.Socket, never, Client> = Layer.scoped(Client, makeClient)

/**
 * @since 1.0.0
 * @category models
 */
export interface ServerImpl {
  readonly run: Effect.Effect<never, SocketServer.SocketServerError, never>
  readonly clients: Queue.Dequeue<Queue.Dequeue<Span>>
}

/**
 * @since 1.0.0
 * @category tags
 */
export interface Server {
  readonly _: unique symbol
}

/**
 * @since 1.0.0
 * @category tags
 */
export const Server = Context.Tag<Server, ServerImpl>("@effect/experimental/DevTools/Server")

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeServer = Effect.gen(function*(_) {
  const server = yield* _(SocketServer.SocketServer)
  const clients = yield* _(Effect.acquireRelease(
    Queue.unbounded<Queue.Dequeue<Span>>(),
    Queue.shutdown
  ))

  const handle = (socket: Socket.Socket) =>
    Effect.gen(function*(_) {
      const responses = yield* _(Effect.acquireRelease(
        Queue.unbounded<Response>(),
        Queue.shutdown
      ))
      const requests = yield* _(Effect.acquireRelease(
        Queue.unbounded<Span>(),
        Queue.shutdown
      ))

      yield* _(clients.offer(requests))

      yield* _(
        Stream.fromQueue(responses),
        Stream.pipeThroughChannel(
          MsgPack.duplexSchema(Socket.toChannel(socket), {
            inputSchema: Response,
            outputSchema: Request
          })
        ),
        Stream.runForEach((req) =>
          req._tag === "Ping"
            ? responses.offer({ _tag: "Pong" })
            : requests.offer(req)
        )
      )
    }).pipe(
      Effect.scoped,
      Effect.catchAllCause(Effect.log),
      Effect.fork
    )

  yield* _(
    server.sockets.take,
    Effect.flatMap(handle),
    Effect.forever,
    Effect.forkScoped
  )

  return {
    run: server.run,
    clients
  } as const
})

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeTracer: Effect.Effect<Client, never, Tracer.Tracer> = Effect.gen(function*(_) {
  const client = yield* _(Client)
  const currentTracer = yield* _(Effect.tracer)

  return Tracer.make({
    span(name, parent, context, links, startTime) {
      const span = currentTracer.span(name, parent, context, links, startTime)
      client.unsafeWrite(span)
      const oldEnd = span.end
      span.end = function(this: any) {
        client.unsafeWrite(span)
        return oldEnd.apply(this, arguments as any)
      }
      return span
    },
    context: currentTracer.context
  })
}).pipe(
  Effect.annotateLogs({
    package: "@effect/experimental",
    module: "DevTools",
    service: "Tracer"
  })
)

/**
 * @since 1.0.0
 * @category layers
 */
export const layerTracer = (url = "ws://localhost:34437"): Layer.Layer<never, never, never> =>
  pipe(
    makeTracer,
    Effect.map(Layer.setTracer),
    Layer.unwrapEffect,
    Layer.provide(layerClient),
    Layer.provide(Socket.layerWebSocket(url))
  )
