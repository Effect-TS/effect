/**
 * @since 1.0.0
 */
import * as Socket from "@effect/platform/Socket"
import * as Channel from "effect/Channel"
import type * as Chunk from "effect/Chunk"
import * as Context from "effect/Context"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as FiberSet from "effect/FiberSet"
import * as Layer from "effect/Layer"
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
          conn.removeAllListeners()
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
  Effect.withFiberRuntime<Socket.Socket, never, Exclude<RO, Scope.Scope>>((fiber) => {
    let currentSocket: Duplex | undefined
    const latch = Effect.unsafeMakeLatch(false)
    const openContext = fiber.currentContext as Context.Context<RO>
    const run = <R, E, _>(handler: (_: Uint8Array) => Effect.Effect<_, E, R> | void) =>
      Effect.scopedWith((scope) =>
        Effect.gen(function*() {
          const fiberSet = yield* FiberSet.make<any, E | Socket.SocketError>().pipe(
            Scope.extend(scope)
          )
          const conn = yield* Scope.extend(open, scope)
          const run = yield* Effect.provideService(FiberSet.runtime(fiberSet)<R>(), NetSocket, conn as Net.Socket)

          function onData(chunk: Uint8Array) {
            const result = handler(chunk)
            if (Effect.isEffect(result)) {
              run(result)
            }
          }
          function onEnd() {
            Deferred.unsafeDone(fiberSet.deferred, Effect.void)
          }
          function onError(cause: Error) {
            Deferred.unsafeDone(
              fiberSet.deferred,
              Effect.fail(new Socket.SocketGenericError({ reason: "Read", cause }))
            )
          }
          function onClose(hadError: boolean) {
            Deferred.unsafeDone(
              fiberSet.deferred,
              Effect.fail(
                new Socket.SocketCloseError({
                  reason: "Close",
                  code: hadError ? 1006 : 1000
                })
              )
            )
          }
          yield* Scope.addFinalizer(
            scope,
            Effect.sync(() => {
              conn.off("data", onData)
              conn.off("end", onEnd)
              conn.off("error", onError)
              conn.off("close", onClose)
            })
          )
          conn.on("data", onData)
          conn.on("end", onEnd)
          conn.on("error", onError)
          conn.on("close", onClose)

          currentSocket = conn
          yield* latch.open

          return yield* FiberSet.join(fiberSet)
        })
      ).pipe(
        Effect.mapInputContext((input: Context.Context<R>) => Context.merge(openContext, input)),
        Effect.ensuring(Effect.sync(() => {
          latch.unsafeClose()
          currentSocket = undefined
        })),
        Effect.interruptible
      )

    const write = (chunk: Uint8Array | string | Socket.CloseEvent) =>
      latch.whenOpen(Effect.async<void, Socket.SocketError>((resume) => {
        const conn = currentSocket!
        if (Socket.isCloseEvent(chunk)) {
          conn.destroy(chunk.code > 1000 ? new Error(`closed with code ${chunk.code}`) : undefined)
          return resume(Effect.void)
        }
        currentSocket!.write(chunk, (cause) => {
          resume(
            cause
              ? Effect.fail(new Socket.SocketGenericError({ reason: "Write", cause }))
              : Effect.void
          )
        })
      }))

    const writer = Effect.acquireRelease(
      Effect.succeed(write),
      () =>
        Effect.sync(() => {
          if (!currentSocket || currentSocket.writableEnded) return
          currentSocket.end()
        })
    )

    return Effect.succeed(Socket.Socket.of({
      [Socket.TypeId]: Socket.TypeId,
      run,
      runRaw: run,
      writer
    }))
  })

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
