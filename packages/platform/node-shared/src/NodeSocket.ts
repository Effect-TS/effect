/**
 * Node socket adapters for Effect sockets.
 *
 * This module opens `node:net` connections or wraps existing Node `Duplex`
 * streams and presents them as `Socket.Socket` values, socket channels, or
 * layers. It also exposes the `NetSocket` service tag for the underlying Node
 * socket and re-exports the `ws` package namespace.
 *
 * @since 4.0.0
 */
import type { Array } from "effect"
import * as Channel from "effect/Channel"
import * as Context from "effect/Context"
import type * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Function from "effect/Function"
import { identity } from "effect/Function"
import * as Latch from "effect/Latch"
import * as Layer from "effect/Layer"
import * as Scope from "effect/Scope"
import * as Socket from "effect/unstable/socket/Socket"
import * as Net from "node:net"
import type { Duplex } from "node:stream"

/**
 * @category re-exports
 * @since 4.0.0
 */
export * as NodeWS from "ws"

/**
 * Service tag for the underlying Node `net.Socket` associated with the current
 * socket connection.
 *
 * @category services
 * @since 4.0.0
 */
export class NetSocket extends Context.Service<NetSocket, Net.Socket>()(
  "@effect/platform-node/NodeSocket/NetSocket"
) {}

/**
 * Opens a Node TCP connection as an Effect socket.
 *
 * **When to use**
 *
 * Use to create a `Socket.Socket` whose reader acquisition dials
 * `net.createConnection`.
 *
 * **Details**
 *
 * Supports `openTimeout` and closes or destroys the underlying socket when the
 * reader scope is finalized.
 *
 * @category constructors
 * @since 4.0.0
 */
export const makeNet = (
  options: Net.NetConnectOpts & {
    readonly openTimeout?: Duration.Input | undefined
  }
): Effect.Effect<Socket.Socket> =>
  fromDuplex(
    Effect.contextWith((context: Context.Context<Scope.Scope>) => {
      let conn: Net.Socket | undefined
      return Effect.flatMap(
        Scope.addFinalizer(
          Context.get(context, Scope.Scope),
          Effect.sync(() => {
            if (!conn) return
            if (conn.closed === false) {
              if ("destroySoon" in conn) {
                conn.destroySoon()
              } else {
                ;(conn as Net.Socket).destroy()
              }
            }
          })
        ),
        () =>
          Effect.callback<Net.Socket, Socket.SocketError, never>((resume) => {
            conn = Net.createConnection(options)
            conn.once("connect", () => {
              resume(Effect.succeed(conn!))
            })
            conn.on("error", (cause: Error) => {
              resume(Effect.fail(
                new Socket.SocketError({
                  reason: new Socket.SocketOpenError({ kind: "Unknown", cause })
                })
              ))
            })
          })
      )
    }),
    options
  )

/**
 * Adapts a Node `Duplex` into a `Socket.Socket`.
 *
 * **Details**
 *
 * Reader acquisition opens the duplex and keeps it paused: each pull reads
 * Node's internal buffer via `stream.read()`, which returns the buffered data
 * as one concatenated chunk. The stream is never resumed, so once Node's
 * buffer reaches its `highWaterMark` the kernel receive window closes and the
 * peer blocks: backpressure is end-to-end with no buffering above Node's own.
 *
 * Writes use `write()` return-value backpressure, awaiting one `drain` when
 * the internal buffer is full. `writeAll` corks the stream around the batch.
 * Releasing the writer scope half-closes the stream (`end()`).
 *
 * @category constructors
 * @since 4.0.0
 */
export const fromDuplex = <RO>(
  open: Effect.Effect<Duplex, Socket.SocketError, RO>,
  options?: {
    readonly openTimeout?: Duration.Input | undefined
  }
): Effect.Effect<Socket.Socket, never, Exclude<RO, Scope.Scope>> =>
  Effect.withFiber<Socket.Socket, never, Exclude<RO, Scope.Scope>>((fiber) => {
    let currentSocket: Duplex | undefined
    const latch = Latch.makeUnsafe(false)
    const openServices = fiber.context as Context.Context<RO>

    const reader: Socket.Socket["reader"] = Effect.gen(function*() {
      const scope = yield* Effect.scope
      const conn = yield* Scope.provide(open, scope).pipe(
        options?.openTimeout !== undefined ?
          Effect.timeoutOrElse({
            duration: options.openTimeout,
            orElse: () =>
              Effect.fail(
                new Socket.SocketError({
                  reason: new Socket.SocketOpenError({ kind: "Timeout", cause: new Error("Connection timed out") })
                })
              )
          }) :
          identity
      )

      type ReadResume = (
        effect: Effect.Effect<Array.NonEmptyReadonlyArray<Uint8Array | string>, Socket.SocketError>
      ) => void

      let error: Socket.SocketError | undefined
      let waiter: ReadResume | undefined

      function fail(err: Socket.SocketError) {
        if (error === undefined) error = err
        if (waiter !== undefined) {
          const resume = waiter
          waiter = undefined
          resume(Effect.fail(error!))
        }
      }
      function onReadable() {
        if (waiter === undefined) return
        const chunk = conn.read() as Uint8Array | null
        if (chunk === null) return
        const resume = waiter
        waiter = undefined
        resume(Effect.succeed([chunk] as const))
      }
      function onEnd() {
        fail(new Socket.SocketError({ reason: new Socket.SocketCloseError({ code: 1000 }) }))
      }
      function onError(cause: Error) {
        fail(
          new Socket.SocketError({
            reason: new Socket.SocketReadError({ cause })
          })
        )
      }
      function onClose(hadError: boolean) {
        fail(
          new Socket.SocketError({
            reason: new Socket.SocketCloseError({ code: hadError ? 1006 : 1000 })
          })
        )
      }

      conn.pause()
      conn.on("readable", onReadable)
      conn.on("end", onEnd)
      conn.on("error", onError)
      conn.on("close", onClose)
      yield* Scope.addFinalizer(
        scope,
        Effect.sync(() => {
          // resume a pull blocked in another fiber before detaching
          fail(
            new Socket.SocketError({
              reason: new Socket.SocketCloseError({ code: 1006 })
            })
          )
          conn.off("readable", onReadable)
          conn.off("end", onEnd)
          conn.off("error", onError)
          conn.off("close", onClose)
          latch.closeUnsafe()
          currentSocket = undefined
        })
      )

      currentSocket = conn
      latch.openUnsafe()

      return Effect.suspend(() => {
        const chunk = conn.read() as Uint8Array | null
        if (chunk !== null) return Effect.succeed([chunk] as const)
        if (error !== undefined) return Effect.fail(error)
        return Effect.callback<Array.NonEmptyReadonlyArray<Uint8Array | string>, Socket.SocketError>((resume) => {
          waiter = resume
          return Effect.sync(() => {
            if (waiter === resume) waiter = undefined
          })
        })
      })
    }).pipe(
      Effect.updateContext((input: Context.Context<Scope.Scope>) => Context.merge(openServices, input))
    ) as Socket.Socket["reader"]

    const awaitDrain = (conn: Duplex) =>
      Effect.callback<void, Socket.SocketError>((resume) => {
        function cleanup() {
          conn.off("drain", onDrain)
          conn.off("error", onError)
          conn.off("close", onClose)
        }
        function onDrain() {
          cleanup()
          resume(Effect.void)
        }
        function onError(cause: Error) {
          cleanup()
          resume(Effect.fail(
            new Socket.SocketError({
              reason: new Socket.SocketWriteError({ cause })
            })
          ))
        }
        function onClose() {
          cleanup()
          resume(Effect.fail(
            new Socket.SocketError({
              reason: new Socket.SocketWriteError({ cause: new Error("socket closed") })
            })
          ))
        }
        conn.on("drain", onDrain)
        conn.on("error", onError)
        conn.on("close", onClose)
        return Effect.sync(cleanup)
      })

    const write = (chunk: Uint8Array | string | Socket.CloseEvent) =>
      latch.whenOpen(Effect.suspend(() => {
        const conn = currentSocket!
        if (Socket.isCloseEvent(chunk)) {
          conn.destroy(chunk.code > 1000 ? new Error(`closed with code ${chunk.code}`) : undefined)
          return Effect.void
        }
        try {
          return conn.write(chunk) ? Effect.void : awaitDrain(conn)
        } catch (cause) {
          return Effect.fail(
            new Socket.SocketError({
              reason: new Socket.SocketWriteError({ cause })
            })
          )
        }
      }))

    const writeAll = (chunks: Array.NonEmptyReadonlyArray<Uint8Array | string>) =>
      latch.whenOpen(Effect.suspend(() => {
        const conn = currentSocket!
        let needsDrain = false
        try {
          conn.cork()
          for (let i = 0; i < chunks.length; i++) {
            needsDrain = !conn.write(chunks[i]) || needsDrain
          }
        } catch (cause) {
          return Effect.fail(
            new Socket.SocketError({
              reason: new Socket.SocketWriteError({ cause })
            })
          )
        } finally {
          conn.uncork()
        }
        return needsDrain ? awaitDrain(conn) : Effect.void
      }))

    const writer: Socket.Socket["writer"] = Effect.acquireRelease(
      Effect.succeed({ write, writeAll }),
      () =>
        Effect.sync(() => {
          if (!currentSocket || currentSocket.writableEnded) return
          currentSocket.end()
        })
    )

    return Effect.succeed(Socket.make({ reader, writer }))
  })

/**
 * Creates a `Channel` over a TCP socket, reading arrays of `Uint8Array`
 * chunks and writing arrays of bytes, strings, or socket close events.
 *
 * @category constructors
 * @since 4.0.0
 */
export const makeNetChannel = <IE = never>(
  options: Net.NetConnectOpts
): Channel.Channel<
  Array.NonEmptyReadonlyArray<Uint8Array>,
  Socket.SocketError | IE,
  void,
  Array.NonEmptyReadonlyArray<Uint8Array | string | Socket.CloseEvent>,
  IE
> =>
  Channel.unwrap(
    Effect.map(makeNet(options), Socket.toChannelWith<IE>())
  )

/**
 * Provides a `Socket.Socket` by opening a TCP connection with the supplied
 * Node `net` connection options.
 *
 * @category layers
 * @since 4.0.0
 */
export const layerNet: (options: Net.NetConnectOpts) => Layer.Layer<
  Socket.Socket,
  Socket.SocketError
> = Function.flow(makeNet, Layer.effect(Socket.Socket))
