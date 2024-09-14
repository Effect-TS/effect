/**
 * @since 1.0.0
 */
import * as Socket from "@effect/platform/Socket"
import * as Channel from "effect/Channel"
import type * as Chunk from "effect/Chunk"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as FiberRef from "effect/FiberRef"
import * as FiberSet from "effect/FiberSet"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Queue from "effect/Queue"
import * as Scope from "effect/Scope"
import * as Net from "node:net"
import type { Duplex } from "node:stream"

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
): Effect.Effect<Socket.Socket, Socket.SocketError> =>
  fromDuplex(
    Effect.acquireRelease(
      Effect.async<Net.Socket, Socket.SocketError, never>((resume) => {
        const conn = Net.createConnection(options)
        conn.on("connect", () => {
          conn.removeAllListeners()
          resume(Effect.succeed(conn))
        })
        conn.on("error", (cause) => {
          resume(Effect.fail(new Socket.SocketGenericError({ reason: "Open", cause })))
        })
        return Effect.sync(() => {
          conn.destroy()
        })
      }),
      (conn) =>
        Effect.sync(() => {
          if (conn.closed === false) {
            if ("destroySoon" in conn) {
              conn.destroySoon()
            } else {
              ;(conn as Net.Socket).destroy()
            }
          }
          conn.removeAllListeners()
        })
    )
  )

/**
 * @since 1.0.0
 * @category constructors
 */
export const fromDuplex = <RO>(
  open: Effect.Effect<Duplex, Socket.SocketError, RO>
): Effect.Effect<Socket.Socket, never, Exclude<RO, Scope.Scope>> =>
  FiberRef.get(Socket.currentSendQueueCapacity).pipe(
    Effect.flatMap((sendQueueCapacity) =>
      Queue.dropping<Uint8Array | string | Socket.CloseEvent | typeof EOF>(
        sendQueueCapacity
      )
    ),
    Effect.bindTo("sendQueue"),
    Effect.bind("openContext", () => Effect.context<Exclude<RO, Scope.Scope>>()),
    Effect.map(({ openContext, sendQueue }) => {
      const run = <R, E, _>(handler: (_: Uint8Array) => Effect.Effect<_, E, R> | void) =>
        Effect.scope.pipe(
          Effect.bindTo("scope"),
          Effect.bind("conn", ({ scope }) =>
            open.pipe(
              Effect.provide(Context.add(openContext, Scope.Scope, scope))
            ) as Effect.Effect<Net.Socket>),
          Effect.bind("fiberSet", (_) => FiberSet.make<any, E | Socket.SocketError>()),
          Effect.bind("run", ({ conn, fiberSet }) =>
            FiberSet.runtime(fiberSet)<R>().pipe(
              Effect.provideService(NetSocket, conn)
            )),
          Effect.tap(({ conn, fiberSet }) =>
            Queue.take(sendQueue).pipe(
              Effect.tap((chunk) =>
                Effect.async<void, Socket.SocketError, never>((resume) => {
                  if (Socket.isCloseEvent(chunk)) {
                    conn.destroy(chunk.code > 1000 ? new Error(`closed with code ${chunk.code}`) : undefined)
                  } else if (chunk === EOF) {
                    conn.end(() => resume(Effect.void))
                  } else {
                    conn.write(chunk, (cause) => {
                      resume(
                        cause ? Effect.fail(new Socket.SocketGenericError({ reason: "Write", cause })) : Effect.void
                      )
                    })
                  }
                  return Effect.void
                })
              ),
              Effect.forever,
              Effect.withUnhandledErrorLogLevel(Option.none()),
              FiberSet.run(fiberSet)
            )
          ),
          Effect.tap(({ conn, fiberSet, run }) => {
            conn.on("data", (chunk) => {
              const result = handler(chunk)
              if (Effect.isEffect(result)) {
                run(result)
              }
            })

            return Effect.async<void, Socket.SocketError, never>((resume) => {
              function onEnd() {
                resume(Effect.void)
              }
              function onError(cause: Error) {
                resume(Effect.fail(new Socket.SocketGenericError({ reason: "Read", cause })))
              }
              function onClose(hadError: boolean) {
                resume(
                  Effect.fail(
                    new Socket.SocketCloseError({
                      reason: "Close",
                      code: hadError ? 1006 : 1000
                    })
                  )
                )
              }
              conn.on("end", onEnd)
              conn.on("error", onError)
              conn.on("close", onClose)
              return Effect.sync(() => {
                conn.off("end", onEnd)
                conn.off("error", onError)
                conn.off("close", onClose)
              })
            }).pipe(
              Effect.raceFirst(FiberSet.join(fiberSet))
            )
          }),
          Effect.scoped,
          Effect.interruptible
        )

      const write = (chunk: Uint8Array | string | Socket.CloseEvent) => Queue.offer(sendQueue, chunk)
      const writer = Effect.acquireRelease(
        Effect.succeed(write),
        () => Queue.offer(sendQueue, EOF)
      )

      return Socket.Socket.of({
        [Socket.TypeId]: Socket.TypeId,
        run,
        runRaw: run,
        writer
      })
    })
  )

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeNetChannel = <IE = never>(
  options: Net.NetConnectOpts
): Channel.Channel<
  Chunk.Chunk<Uint8Array>,
  Chunk.Chunk<Uint8Array | string | Socket.CloseEvent>,
  Socket.SocketError | IE,
  IE,
  void,
  unknown
> =>
  Channel.unwrapScoped(
    Effect.map(makeNet(options), Socket.toChannelWith<IE>())
  )

/**
 * @since 1.0.0
 * @category layers
 */
export const layerNet = (options: Net.NetConnectOpts): Layer.Layer<Socket.Socket, Socket.SocketError> =>
  Layer.effect(Socket.Socket, makeNet(options))
