/**
 * Opens scoped physical socket connections to dynamically selected endpoints.
 *
 * @stability unstable
 * @since 4.0.0
 */
import * as Context from "../Context.ts"
import type * as Duration from "../Duration.ts"
import * as Effect from "../Effect.ts"
import * as Exit from "../Exit.ts"
import * as Latch from "../Latch.ts"
import * as Scope from "../Scope.ts"
import * as Semaphore from "../Semaphore.ts"
import * as Socket from "./Socket.ts"

/**
 * Address and TLS settings for a physical socket connection.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface Endpoint {
  readonly host: string
  readonly port: number
  readonly path?: string | undefined
  readonly tls?: boolean | TlsOptions | undefined
  readonly connectTimeout?: Duration.Input | undefined
}

/**
 * Portable TLS settings for new connections and in-place upgrades.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export type TlsOptions = Socket.TlsUpgradeOptions

/**
 * Reader and writer belonging to one physical socket session.
 *
 * **Details**
 *
 * Closing the connection terminates suspended reads and writes. Writes after
 * closure fail and cannot be replayed on a subsequent connection. Writes are
 * serialized through native backpressure; interrupted waiting writes are
 * withdrawn before reaching the transport.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface Connection extends Socket.Reader, Socket.Writer {
  readonly close: Effect.Effect<void>
}

/**
 * Service that opens independent scoped socket sessions.
 *
 * @stability unstable
 * @category services
 * @since 4.0.0
 */
export class SocketConnector extends Context.Service<SocketConnector, {
  readonly connect: (endpoint: Endpoint) => Effect.Effect<Connection, Socket.SocketError, Scope.Scope>
}>()("effect/socket/SocketConnector") {}

/**
 * Acquires one reader and writer from a socket as a physical connection.
 *
 * **Details**
 *
 * The socket must be fresh for this acquisition. Its reader is acquired once,
 * and this connection never reconnects or acquires a replacement reader.
 * Releasing the reader scope must close the physical transport and terminate
 * pending writes; a socket that only waits for buffered writes to drain is
 * unsuitable when the peer can stop reading.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const fromSocket = Effect.fnUntraced(function*(socket: Socket.Socket): Effect.fn.Return<
  Connection,
  Socket.SocketError,
  Scope.Scope
> {
  const scope = yield* Scope.fork(yield* Effect.scope)
  let closed = false
  const closedSignal = Latch.makeUnsafe(false)
  const close = Effect.suspend(() => {
    closed = true
    closedSignal.openUnsafe()
    return Scope.close(scope, Exit.void)
  })
  const [reader, writer] = yield* Effect.uninterruptibleMask((restore) =>
    Effect.gen(function*() {
      const reader = yield* restore(Scope.provide(socket.reader, scope)).pipe(Effect.onError(() => close))
      const writer = yield* Scope.provide(socket.writer, scope)
      yield* Scope.addFinalizer(
        scope,
        Effect.sync(() => {
          closed = true
          closedSignal.openUnsafe()
        })
      )
      return [reader, writer] as const
    })
  )
  const semaphore = Semaphore.makeUnsafe(1)
  const closedError = new Socket.SocketError({ reason: new Socket.SocketCloseError({ code: 1006 }) })
  const guard = <A>(effect: Effect.Effect<A, Socket.SocketError>): Effect.Effect<A, Socket.SocketError> =>
    Effect.suspend(() => closed ? Effect.fail(closedError) : effect).pipe(Effect.tapError(() => close))
  return {
    pull: guard(reader.pull),
    run: (onChunk) => guard(Effect.raceFirst(reader.run(onChunk), closedSignal.whenOpen(Effect.fail(closedError)))),
    upgrade: (options) => semaphore.withPermit(guard(reader.upgrade(options))),
    write: (chunk) => semaphore.withPermit(guard(writer.write(chunk))),
    writeAll: (chunks) => semaphore.withPermit(guard(writer.writeAll(chunks))),
    close
  }
})
