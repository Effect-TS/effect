/**
 * @since 1.0.0
 */
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Queue from "effect/Queue"
import type * as Scope from "effect/Scope"
import * as Net from "node:net"
import * as Socket from "../Socket/Node.js"
import * as SocketServer from "../SocketServer.js"

/**
 * @since 1.0.0
 */
export * from "../SocketServer.js"

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = (
  options: Net.ServerOpts & Net.ListenOptions
): Effect.Effect<Scope.Scope, SocketServer.SocketServerError, SocketServer.SocketServer> =>
  Effect.gen(function*(_) {
    const queue = yield* _(Effect.acquireRelease(
      Queue.unbounded<Socket.Socket>(),
      Queue.shutdown
    ))
    const errorDeferred = yield* _(Deferred.make<SocketServer.SocketServerError, never>())
    const server = yield* _(Effect.acquireRelease(
      Effect.async<never, SocketServer.SocketServerError, Net.Server>((resume) => {
        const server = Net.createServer(options)
        let connected = false
        server.on("error", (error) => {
          const err = new SocketServer.SocketServerError({ reason: "Open", error })
          if (connected === false) {
            resume(Effect.fail(err))
          }
          Deferred.unsafeDone(errorDeferred, Effect.fail(err))
        })
        server.on("listening", () => {
          connected = true
          resume(Effect.succeed(server))
        })
        server.on("connection", (conn) => {
          pipe(
            Socket.fromNetSocket(
              Effect.acquireRelease(
                Effect.succeed(conn),
                (conn) =>
                  Effect.sync(() => {
                    if (conn.closed === false) {
                      conn.destroySoon()
                    }
                    conn.removeAllListeners()
                  })
              )
            ),
            Effect.flatMap((socket) => Queue.offer(queue, socket)),
            Effect.runFork
          )
        })
        server.listen(options)
        return Effect.async<never, never, void>((resume) => {
          server.removeAllListeners()
          server.close(() => resume(Effect.unit))
        })
      }),
      (server) =>
        Effect.async<never, never, void>((resume) => {
          server.removeAllListeners()
          server.close(() => resume(Effect.unit))
        })
    ))
    const address = server.address()!

    return SocketServer.SocketServer.of({
      [SocketServer.SocketServerTypeId]: SocketServer.SocketServerTypeId,
      address: typeof address === "string" ?
        {
          _tag: "UnixAddress",
          path: address
        } :
        {
          _tag: "TcpAddress",
          hostname: address.address,
          port: address.port
        },
      join: Deferred.await(errorDeferred),
      sockets: queue
    })
  })

/**
 * @since 1.0.0
 * @category layers
 */
export const layer = (
  options: Net.ServerOpts & Net.ListenOptions
): Layer.Layer<never, SocketServer.SocketServerError, SocketServer.SocketServer> =>
  Layer.scoped(
    SocketServer.SocketServer,
    make(options)
  )
