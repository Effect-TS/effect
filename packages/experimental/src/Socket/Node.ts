/**
 * @since 1.0.0
 */
import * as Channel from "effect/Channel"
import type * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as Layer from "effect/Layer"
import * as Queue from "effect/Queue"
import type * as Scope from "effect/Scope"
import * as Net from "node:net"
import * as Socket from "../Socket.js"

/**
 * @since 1.0.0
 */
export * from "../Socket.js"

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
    const messagesQueue = yield* _(Queue.unbounded<Uint8Array>())

    const run = Effect.gen(function*(_) {
      const conn = yield* _(open)
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
        Queue.unsafeOffer(messagesQueue, chunk)
      })
      yield* _(
        Effect.async<never, Socket.SocketError, void>((resume) => {
          conn.on("end", () => {
            resume(Effect.unit)
          })
          conn.on("error", (error) => {
            resume(Effect.fail(new Socket.SocketError({ reason: "Read", error })))
          })
        }),
        Effect.race(Fiber.join(writeFiber))
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
      writer,
      messages: messagesQueue
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
