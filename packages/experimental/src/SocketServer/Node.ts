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
import * as WS from "ws"
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
    const fiberId = yield* _(Effect.fiberId)
    const semaphore = yield* _(Effect.makeSemaphore(1))
    const queue = yield* _(Effect.acquireRelease(
      Queue.unbounded<Socket.Socket>(),
      Queue.shutdown
    ))
    let serverDeferred = yield* _(Deferred.make<never, Net.Server>())

    const run = Effect.async<never, SocketServer.SocketServerError, never>((resume) => {
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
          Effect.flatMap((socket) => {
            ;(socket as any).source = conn
            return Queue.offer(queue, socket)
          }),
          Effect.runFork
        )
      })
      server.listen(options)
      return Effect.sync(() => {
        serverDeferred = Deferred.unsafeMake(fiberId)
        server.removeAllListeners()
        server.close()
      })
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
      run,
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

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeWebSocket = (
  options: WS.ServerOptions
): Effect.Effect<Scope.Scope, SocketServer.SocketServerError, SocketServer.SocketServer> =>
  Effect.gen(function*(_) {
    const fiberId = yield* _(Effect.fiberId)
    const semaphore = yield* _(Effect.makeSemaphore(1))
    const queue = yield* _(Effect.acquireRelease(
      Queue.unbounded<Socket.Socket>(),
      Queue.shutdown
    ))

    let serverDeferred = yield* _(Deferred.make<never, WS.WebSocketServer>())
    const run = Effect.async<never, SocketServer.SocketServerError, never>((resume) => {
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
      server.on("connection", (conn) => {
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
          Effect.flatMap((socket) => {
            ;(socket as any).source = conn
            return Queue.offer(queue, socket)
          }),
          Effect.runFork
        )
      })
      return Effect.sync(() => {
        serverDeferred = Deferred.unsafeMake(fiberId)
        server.removeAllListeners()
        server.close()
      })
    }).pipe(
      semaphore.withPermits(1)
    )

    const address = Effect.map(
      Effect.suspend(() => Deferred.await(serverDeferred)),
      (server): SocketServer.Address => {
        const address = server.address()
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
      run,
      sockets: queue
    })
  })

/**
 * @since 1.0.0
 * @category layers
 */
export const layerWebSocket = (
  options: WS.ServerOptions
): Layer.Layer<never, SocketServer.SocketServerError, SocketServer.SocketServer> =>
  Layer.scoped(
    SocketServer.SocketServer,
    makeWebSocket(options)
  )
