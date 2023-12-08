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
import * as PubSub from "effect/PubSub"
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
export const Request = Ping

/**
 * @since 1.0.0
 * @category schemas
 */
export type Request = Schema.Schema.To<typeof Request>

/**
 * @since 1.0.0
 * @category schemas
 */
export const Response = Schema.union(Span, Pong)

/**
 * @since 1.0.0
 * @category schemas
 */
export type Response = Schema.Schema.To<typeof Response>

/**
 * @since 1.0.0
 * @category models
 */
export interface HostPortConfig {
  /** defaults to 34437 */
  readonly port?: number
  /** defaults to 127.0.0.1 */
  readonly host?: string
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeClient = ({
  host = "127.0.0.1",
  port = 34437
}: HostPortConfig = {}) =>
  Effect.gen(function*(_) {
    const requests = yield* _(Effect.acquireRelease(
      Queue.unbounded<Request>(),
      Queue.shutdown
    ))
    const responses = pipe(
      Stream.fromQueue(requests),
      Stream.pipeThroughChannel(
        MsgPack.duplexSchema(Socket.makeNetChannel({ host, port, timeout: 5000 }), {
          inputSchema: Request,
          outputSchema: Response
        })
      ),
      Stream.filter((_): _ is Span => _._tag === "Span")
    )
    yield* _(
      Queue.offer(requests, { _tag: "Ping" }),
      Effect.delay("3 seconds"),
      Effect.forever,
      Effect.forkScoped
    )
    return responses
  }).pipe(Stream.unwrapScoped)

/**
 * @since 1.0.0
 * @category models
 */
export interface ServerImpl {
  readonly run: Effect.Effect<never, SocketServer.SocketServerError, never>
  readonly responses: Queue.Enqueue<Response>
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
export const makeServer = ({
  host = "127.0.0.1",
  port = 34437
}: HostPortConfig = {}): Effect.Effect<Scope.Scope, SocketServer.SocketServerError, ServerImpl> =>
  Effect.gen(function*(_) {
    const server = yield* _(SocketServer.make({ host, port }))
    const hub = yield* _(Effect.acquireRelease(
      PubSub.unbounded<Response>(),
      PubSub.shutdown
    ))
    const buffer = yield* _(Queue.dropping<Response>(100))
    yield* _(
      Effect.gen(function*(_) {
        const queue = yield* _(hub.subscribe)
        yield* _(
          queue.take,
          Effect.flatMap((_) => buffer.offer(_)),
          Effect.forever
        )
      }),
      Effect.forkScoped
    )

    const handle = (socket: Socket.Socket) =>
      Effect.gen(function*(_) {
        const sub = yield* _(PubSub.subscribe(hub))
        const responses = yield* _(Effect.acquireRelease(
          Queue.unbounded<Response>(),
          Queue.shutdown
        ))
        yield* _(responses.offerAll(yield* _(buffer.takeAll)))

        yield* _(
          sub.take,
          Effect.flatMap((_) => responses.offer(_)),
          Effect.forever,
          Effect.fork
        )

        yield* _(
          Stream.fromQueue(responses),
          Stream.pipeThroughChannel(
            MsgPack.duplexSchema(Socket.toChannel(socket), {
              inputSchema: Response,
              outputSchema: Request
            })
          ),
          Stream.runForEach((_req) => responses.offer({ _tag: "Pong" }))
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
      responses: hub
    } as const
  })

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeTracer: Effect.Effect<Server | Scope.Scope, never, Tracer.Tracer> = Effect.gen(function*(_) {
  const server = yield* _(Server)

  yield* _(
    server.run,
    Effect.tapErrorCause(Effect.logError),
    Effect.retry(
      Schedule.exponential("500 millis").pipe(
        Schedule.union(Schedule.spaced("10 seconds"))
      )
    ),
    Effect.forkScoped
  )

  const currentTracer = yield* _(Effect.tracer)

  return Tracer.make({
    span(name, parent, context, links, startTime) {
      const span = currentTracer.span(name, parent, context, links, startTime)
      server.responses.unsafeOffer(span)
      const oldEnd = span.end
      span.end = function(this: any) {
        server.responses.unsafeOffer(span)
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
export const layerTracer = (hostPortConfig?: HostPortConfig): Layer.Layer<never, never, never> =>
  pipe(
    makeTracer,
    Effect.map(Layer.setTracer),
    Effect.provideServiceEffect(Server, makeServer(hostPortConfig)),
    Effect.orDie,
    Layer.unwrapScoped
  )
