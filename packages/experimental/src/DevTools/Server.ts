/**
 * @since 1.0.0
 */
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Queue from "effect/Queue"
import * as Stream from "effect/Stream"
import * as MsgPack from "../MsgPack.js"
import * as Socket from "../Socket.js"
import * as SocketServer from "../SocketServer/Node.js"
import * as Domain from "./Domain.js"

/**
 * @since 1.0.0
 * @category models
 */
export interface ServerImpl {
  readonly run: Effect.Effect<never, SocketServer.SocketServerError, never>
  readonly clients: Queue.Dequeue<Queue.Dequeue<Domain.Span>>
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
export const make = Effect.gen(function*(_) {
  const server = yield* _(SocketServer.SocketServer)
  const clients = yield* _(Effect.acquireRelease(
    Queue.unbounded<Queue.Dequeue<Domain.Span>>(),
    Queue.shutdown
  ))

  const handle = (socket: Socket.Socket) =>
    Effect.gen(function*(_) {
      const responses = yield* _(Queue.unbounded<Domain.Response>())
      const requests = yield* _(Queue.unbounded<Domain.Span>())

      yield* _(clients.offer(requests))

      yield* _(
        Stream.fromQueue(responses),
        Stream.pipeThroughChannel(
          MsgPack.duplexSchema(Socket.toChannel(socket), {
            inputSchema: Domain.Response,
            outputSchema: Domain.Request
          })
        ),
        Stream.runForEach((req) =>
          req._tag === "Ping"
            ? responses.offer({ _tag: "Pong" })
            : requests.offer(req)
        ),
        Effect.ensuring(Effect.all([
          requests.shutdown,
          responses.shutdown
        ]))
      )
    }).pipe(
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
