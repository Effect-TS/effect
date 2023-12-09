/**
 * @since 1.0.0
 */
import type { Scope } from "effect"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Queue from "effect/Queue"
import * as Schedule from "effect/Schedule"
import * as Stream from "effect/Stream"
import * as Tracer from "effect/Tracer"
import * as MsgPack from "../MsgPack.js"
import * as Socket from "../Socket.js"
import * as Domain from "./Domain.js"

/**
 * @since 1.0.0
 * @category models
 */
export interface ClientImpl {
  readonly unsafeWrite: (_: Domain.Span) => void
  readonly write: (_: Domain.Span) => Effect.Effect<never, never, void>
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
export const make: Effect.Effect<Scope.Scope | Socket.Socket, never, ClientImpl> = Effect.gen(function*(_) {
  const socket = yield* _(Socket.Socket)
  const requests = yield* _(Effect.acquireRelease(
    Queue.bounded<Domain.Request>(100),
    Queue.shutdown
  ))
  yield* _(
    Stream.fromQueue(requests),
    Stream.pipeThroughChannel(
      MsgPack.duplexSchema(Socket.toChannel(socket), {
        inputSchema: Domain.Request,
        outputSchema: Domain.Response
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
export const layer: Layer.Layer<Socket.Socket, never, Client> = Layer.scoped(Client, make)

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
    Layer.provide(layer),
    Layer.provide(Socket.layerWebSocket(url))
  )
