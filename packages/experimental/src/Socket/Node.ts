/**
 * @since 1.0.0
 */
import * as Channel from "effect/Channel"
import type * as Chunk from "effect/Chunk"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as Layer from "effect/Layer"
import * as Queue from "effect/Queue"
import * as Runtime from "effect/Runtime"
import type * as Scope from "effect/Scope"
import * as Net from "node:net"
import * as Socket from "../Socket.js"

/**
 * @since 1.0.0
 */
export * from "../Socket.js"

/**
 * @since 1.0.0
 * @category tags
 */
export interface NetSocket {
  readonly _: unique symbol
}

/**
 * @since 1.0.0
 * @category tags
 */
export const NetSocket: Context.Tag<NetSocket, Net.Socket> = Context.Tag(
  "@effect/experimental/Socket/Node/NetSocket"
)

const EOF = Symbol.for("@effect/experimental/Socket/Node/EOF")

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeNet = (
  options: Net.NetConnectOpts
): Effect.Effect<Scope.Scope, Socket.SocketError, Socket.Socket> =>
  fromNetSocket(
    Effect.acquireRelease(
      Effect.async<never, Socket.SocketError, Net.Socket>((resume) => {
        const conn = Net.createConnection(options)
        conn.on("connect", () => {
          conn.removeAllListeners()
          resume(Effect.succeed(conn))
        })
        conn.on("error", (error) => {
          resume(Effect.fail(new Socket.SocketError({ reason: "Open", error })))
        })
        return Effect.sync(() => {
          conn.destroy()
        })
      }),
      (conn) =>
        Effect.sync(() => {
          if (conn.closed === false) {
            conn.destroySoon()
          }
          conn.removeAllListeners()
        })
    )
  )

/**
 * @since 1.0.0
 * @category constructors
 */
export const fromNetSocket = (
  open: Effect.Effect<Scope.Scope, Socket.SocketError, Net.Socket>
): Effect.Effect<never, never, Socket.Socket> =>
  Effect.gen(function*(_) {
    const sendQueue = yield* _(Queue.unbounded<Uint8Array | typeof EOF>())

    const run = <R, E, _>(handler: (_: Uint8Array) => Effect.Effect<R, E, _>) =>
      Effect.gen(function*(_) {
        const conn = yield* _(open)
        const runtime = yield* _(Effect.runtime<R>(), Effect.provideService(NetSocket, conn))
        const run = Runtime.runFork(runtime)
        const writeFiber = yield* _(
          Queue.take(sendQueue),
          Effect.tap((chunk) =>
            Effect.async<never, Socket.SocketError, void>((resume) => {
              if (chunk === EOF) {
                conn.end(() => resume(Effect.unit))
              } else {
                conn.write(chunk, (error) => {
                  resume(error ? Effect.fail(new Socket.SocketError({ reason: "Write", error })) : Effect.unit)
                })
              }
            })
          ),
          Effect.forever,
          Effect.fork
        )
        conn.on("data", (chunk) => {
          run(
            Effect.catchAllCause(
              handler(chunk),
              (cause) => Effect.log(cause, "Unhandled error in Node Socket")
            )
          )
        })
        yield* _(Effect.race(
          Effect.async<never, Socket.SocketError, void>((resume) => {
            conn.on("end", () => {
              resume(Effect.unit)
            })
            conn.on("error", (error) => {
              resume(Effect.fail(new Socket.SocketError({ reason: "Read", error })))
            })
          }),
          Fiber.join(writeFiber)
        ))
      }).pipe(Effect.scoped)

    const write = (chunk: Uint8Array) => Queue.offer(sendQueue, chunk)
    const writer = Effect.acquireRelease(
      Effect.succeed(write),
      () => Queue.offer(sendQueue, EOF)
    )

    return Socket.Socket.of({
      [Socket.SocketTypeId]: Socket.SocketTypeId,
      run,
      writer
    })
  })

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeNetChannel = <IE = never>(
  options: Net.NetConnectOpts
): Channel.Channel<
  never,
  IE,
  Chunk.Chunk<Uint8Array>,
  unknown,
  Socket.SocketError | IE,
  Chunk.Chunk<Uint8Array>,
  void
> =>
  Channel.unwrapScoped(
    Effect.map(makeNet(options), Socket.toChannelWith<IE>())
  )

/**
 * @since 1.0.0
 * @category layers
 */
export const layerNet = (options: Net.NetConnectOpts): Layer.Layer<never, Socket.SocketError, Socket.Socket> =>
  Layer.scoped(
    Socket.Socket,
    makeNet(options)
  )
