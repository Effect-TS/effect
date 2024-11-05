/**
 * @since 1.0.0
 */
import * as NodeSocket from "@effect/platform-node/NodeSocket"
import * as Socket from "@effect/platform/Socket"
import * as Context from "effect/Context"
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
    const server = Net.createServer(options)

    yield* Effect.async<void, SocketServer.SocketServerError>((resume) => {
      server.once("error", (cause) => {
        resume(Effect.fail(
          new SocketServer.SocketServerError({
            reason: "Open",
            cause
          })
        ))
      })
      server.listen(options, () => {
        resume(Effect.void)
      })
      return Effect.async<void>((resume) => {
        server.close(() => resume(Effect.void))
      })
    })

    const run = <R, E, _>(handler: (socket: Socket.Socket) => Effect.Effect<_, E, R>) =>
      Effect.gen(function*() {
        const run = Runtime.runFork(yield* Effect.runtime<R>())
        function onConnection(conn: Net.Socket) {
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
        }
        return yield* Effect.async<never>((_resume) => {
          server.on("connection", onConnection)
          return Effect.sync(() => {
            server.off("connection", onConnection)
          })
        })
      })

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
    const server = new WS.WebSocketServer(options)

    yield* Effect.async<void, SocketServer.SocketServerError>((resume) => {
      server.once("error", (error) => {
        resume(Effect.fail(
          new SocketServer.SocketServerError({
            reason: "Open",
            cause: error
          })
        ))
      })
      server.once("listening", () => {
        resume(Effect.void)
      })
      return Effect.async<void>((resume) => {
        server.close(() => resume(Effect.void))
      })
    })

    const run = <R, E, _>(handler: (socket: Socket.Socket) => Effect.Effect<_, E, R>) =>
      Effect.gen(function*() {
        const run = Runtime.runFork(yield* Effect.runtime<R>())
        function onConnection(conn: Net.Socket, req: Http.IncomingMessage) {
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
        }
        return yield* Effect.async<never>((_resume) => {
          server.on("connection", onConnection)
          return Effect.sync(() => {
            server.off("connection", onConnection)
          })
        })
      })

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
