/**
 * @since 1.0.0
 */
import * as NodeSocket from "@effect/platform-node/NodeSocket"
import * as Socket from "@effect/platform/Socket"
import * as Context from "effect/Context"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Runtime from "effect/Runtime"
import type * as Scope from "effect/Scope"
import type * as Http from "node:http"
import * as Net from "node:net"
import * as WS from "ws"
import * as SocketServer from "../SocketServer.js"

/**
 * @since 1.0.0
 */
export * from "../SocketServer.js"

/**
 * @since 1.0.0
 * @category tags
 */
export interface IncomingMessage {
  readonly _: unique symbol
}

/**
 * @since 1.0.0
 * @category tags
 */
export const IncomingMessage = Context.GenericTag<IncomingMessage, Http.IncomingMessage>(
  "@effect/experimental/SocketServer/Node/IncomingMessage"
)

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = (
  options: Net.ServerOpts & Net.ListenOptions
): Effect.Effect<SocketServer.SocketServer, SocketServer.SocketServerError, Scope.Scope> =>
  Effect.gen(function*() {
    const fiberId = yield* Effect.fiberId
    const semaphore = yield* Effect.makeSemaphore(1)
    let serverDeferred = yield* Deferred.make<Net.Server>()

    const run = <R, E, _>(handler: (socket: Socket.Socket) => Effect.Effect<_, E, R>) =>
      Effect.gen(function*() {
        const runtime = yield* Effect.runtime<R>()
        const run = Runtime.runFork(runtime)
        return yield* Effect.async<never, SocketServer.SocketServerError, never>((resume) => {
          const server = Net.createServer(options)
          let connected = false
          server.on("error", (error) => {
            resume(Effect.fail(
              new SocketServer.SocketServerError({
                reason: connected ? "Unknown" : "Open",
                error
              })
            ))
          })
          server.on("listening", () => {
            connected = true
            Deferred.unsafeDone(serverDeferred, Effect.succeed(server))
          })
          server.on("connection", (conn) => {
            pipe(
              NodeSocket.fromDuplex(
                Effect.acquireRelease(
                  Effect.succeed(conn),
                  (conn) =>
                    Effect.sync(() => {
                      if (conn.closed === false) {
                        conn.destroySoon()
                      }
                    })
                )
              ),
              Effect.flatMap(handler),
              Effect.catchAllCause((cause) => Effect.log(cause, "Unhandled error in SocketServer handler")),
              Effect.provideService(NodeSocket.NetSocket, conn),
              run
            )
          })
          server.listen(options)
          return Effect.sync(() => {
            serverDeferred = Deferred.unsafeMake(fiberId)
            server.close()
          })
        })
      }).pipe(semaphore.withPermits(1))

    const address = Effect.map(
      Effect.suspend(() => Deferred.await(serverDeferred)),
      (server): SocketServer.Address => {
        const address = server.address()!
        return typeof address === "string" ?
          {
            _tag: "UnixAddress",
            path: address
          } :
          {
            _tag: "TcpAddress",
            hostname: address.address,
            port: address.port
          }
      }
    )

    return SocketServer.SocketServer.of({
      [SocketServer.SocketServerTypeId]: SocketServer.SocketServerTypeId,
      address,
      run
    })
  })

/**
 * @since 1.0.0
 * @category layers
 */
export const layer = (
  options: Net.ServerOpts & Net.ListenOptions
): Layer.Layer<SocketServer.SocketServer, SocketServer.SocketServerError> =>
  Layer.scoped(
    SocketServer.SocketServer,
    make(options)
  )

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeWebSocket = (
  options: WS.ServerOptions
): Effect.Effect<SocketServer.SocketServer, SocketServer.SocketServerError, Scope.Scope> =>
  Effect.gen(function*(_) {
    const fiberId = yield* _(Effect.fiberId)
    const semaphore = yield* _(Effect.makeSemaphore(1))

    let serverDeferred = yield* _(Deferred.make<WS.WebSocketServer>())
    const run = <R, E, _>(handler: (socket: Socket.Socket) => Effect.Effect<_, E, R>) =>
      Effect.gen(function*(_) {
        const runtime = yield* _(Effect.runtime<R>())
        const run = Runtime.runFork(runtime)
        return yield* _(
          Effect.async<never, SocketServer.SocketServerError, never>((resume) => {
            const server = new WS.WebSocketServer(options)
            let connected = false
            server.on("error", (error) => {
              resume(Effect.fail(
                new SocketServer.SocketServerError({
                  reason: connected ? "Unknown" : "Open",
                  error
                })
              ))
            })
            server.on("listening", () => {
              connected = true
              Deferred.unsafeDone(serverDeferred, Effect.succeed(server))
            })
            server.on("connection", (conn, req) => {
              pipe(
                Socket.fromWebSocket(
                  Effect.acquireRelease(
                    Effect.succeed(conn as unknown as globalThis.WebSocket),
                    (conn) =>
                      Effect.sync(() => {
                        conn.close()
                      })
                  )
                ),
                Effect.flatMap(handler),
                Effect.catchAllCause((cause) => Effect.log(cause, "Unhandled error in SocketServer handler")),
                Effect.provideService(Socket.WebSocket, conn as any),
                Effect.provideService(IncomingMessage, req),
                run
              )
            })
            return Effect.sync(() => {
              serverDeferred = Deferred.unsafeMake(fiberId)
              server.removeAllListeners()
              server.close()
            })
          })
        )
      }).pipe(
        semaphore.withPermits(1)
      )

    const address = Effect.map(
      Effect.suspend(() => Deferred.await(serverDeferred)),
      (server): SocketServer.Address => {
        const address = server.address()!
        return typeof address === "string" ?
          {
            _tag: "UnixAddress",
            path: address
          } :
          {
            _tag: "TcpAddress",
            hostname: address.address,
            port: address.port
          }
      }
    )

    return SocketServer.SocketServer.of({
      [SocketServer.SocketServerTypeId]: SocketServer.SocketServerTypeId,
      address,
      run
    })
  })

/**
 * @since 1.0.0
 * @category layers
 */
export const layerWebSocket = (
  options: WS.ServerOptions
): Layer.Layer<SocketServer.SocketServer, SocketServer.SocketServerError> =>
  Layer.scoped(
    SocketServer.SocketServer,
    makeWebSocket(options)
  )
