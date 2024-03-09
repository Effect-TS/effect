/**
 * @since 1.0.0
 */
import * as Socket from "@effect/platform/Socket"
import * as Channel from "effect/Channel"
import type * as Chunk from "effect/Chunk"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as FiberSet from "effect/FiberSet"
import * as Layer from "effect/Layer"
import * as Queue from "effect/Queue"
import type * as Scope from "effect/Scope"
import * as Net from "node:net"

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
export const NetSocket: Context.Tag<NetSocket, Net.Socket> = Context.GenericTag(
  "@effect/platform-node/NodeSocket/NetSocket"
)

const EOF = Symbol.for("@effect/experimental/Socket/Node/EOF")

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeNet = (
  options: Net.NetConnectOpts
): Effect.Effect<Socket.Socket, Socket.SocketError, Scope.Scope> =>
  fromNetSocket(
    Effect.acquireRelease(
      Effect.async<Net.Socket, Socket.SocketError, never>((resume) => {
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
  open: Effect.Effect<Net.Socket, Socket.SocketError, Scope.Scope>
): Effect.Effect<Socket.Socket> =>
  Effect.gen(function*(_) {
    const sendQueue = yield* _(Queue.unbounded<Uint8Array | typeof EOF>())

    const run = <R, E, _>(handler: (_: Uint8Array) => Effect.Effect<_, E, R>) =>
      Effect.gen(function*(_) {
        const conn = yield* _(open)
        const fiberSet = yield* _(FiberSet.make<any, E | Socket.SocketError>())
        const run = yield* _(
          FiberSet.runtime(fiberSet)<R>(),
          Effect.provideService(NetSocket, conn)
        )
        const writeFiber = yield* _(
          Queue.take(sendQueue),
          Effect.tap((chunk) =>
            Effect.async<void, Socket.SocketError, never>((resume) => {
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
          run(handler(chunk))
        })
        yield* _(
          Effect.async<void, Socket.SocketError, never>((resume) => {
            conn.on("end", () => {
              resume(Effect.unit)
            })
            conn.on("error", (error) => {
              resume(Effect.fail(new Socket.SocketError({ reason: "Read", error })))
            })
          }),
          Effect.raceFirst(Fiber.join(writeFiber)),
          Effect.raceFirst(FiberSet.join(fiberSet))
        )
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
): Channel.Channel<Chunk.Chunk<Uint8Array>, Chunk.Chunk<Uint8Array>, Socket.SocketError | IE, IE, void, unknown> =>
  Channel.unwrapScoped(
    Effect.map(makeNet(options), Socket.toChannelWith<IE>())
  )

/**
 * @since 1.0.0
 * @category layers
 */
export const layerNet = (options: Net.NetConnectOpts): Layer.Layer<Socket.Socket, Socket.SocketError> =>
  Layer.scoped(
    Socket.Socket,
    makeNet(options)
  )
