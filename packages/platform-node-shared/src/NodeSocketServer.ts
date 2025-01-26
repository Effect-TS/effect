/**
 * @since 1.0.0
 */
import * as Socket from "@effect/platform/Socket"
import * as SocketServer from "@effect/platform/SocketServer"
import type { Cause } from "effect/Cause"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as FiberRef from "effect/FiberRef"
import * as FiberSet from "effect/FiberSet"
import { pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Scope from "effect/Scope"
import type * as Http from "node:http"
import * as Net from "node:net"
import * as WS from "ws"
import * as NodeSocket from "./NodeSocket.js"

/**
 * @since 1.0.0
 * @category tags
 */
export class IncomingMessage extends Context.Tag("@effect/platform-node-shared/NodeSocketServer/IncomingMessage")<
  IncomingMessage,
  Http.IncomingMessage
>() {}

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = Effect.fnUntraced(function*(
  options: Net.ServerOpts & Net.ListenOptions
) {
  const server = yield* Effect.acquireRelease(
    Effect.sync(() => Net.createServer(options)),
    (server) =>
      Effect.async<void>((resume) => {
        server.close(() => resume(Effect.void))
      })
  )

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
  })

  const run = Effect.fnUntraced(function*<R, E, _>(handler: (socket: Socket.Socket) => Effect.Effect<_, E, R>) {
    const scope = yield* Scope.make()
    const fiberSet = yield* FiberSet.make().pipe(
      Scope.extend(scope)
    )
    const run = yield* FiberSet.runtime(fiberSet)<R>()
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
        Effect.catchAllCause(reportUnhandledError),
        Effect.provideService(NodeSocket.NetSocket, conn),
        run
      )
    }
    return yield* Effect.async<never>((_resume) => {
      server.on("connection", onConnection)
      return Effect.sync(() => {
        server.off("connection", onConnection)
      })
    }).pipe(
      Effect.ensuring(Scope.close(scope, Exit.void))
    )
  })

  const address = server.address()!
  return SocketServer.SocketServer.of({
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
export const makeWebSocket: (
  options: WS.ServerOptions<typeof WS.WebSocket, typeof Http.IncomingMessage>
) => Effect.Effect<
  SocketServer.SocketServer["Type"],
  SocketServer.SocketServerError,
  Scope.Scope
> = Effect.fnUntraced(function*(
  options: WS.ServerOptions
) {
  const server = yield* Effect.acquireRelease(
    Effect.sync(() => new WS.WebSocketServer(options)),
    (server) =>
      Effect.async<void>((resume) => {
        server.close(() => resume(Effect.void))
      })
  )

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
  })

  const run = Effect.fnUntraced(function*<R, E, _>(handler: (socket: Socket.Socket) => Effect.Effect<_, E, R>) {
    const scope = yield* Scope.make()
    const fiberSet = yield* FiberSet.make().pipe(
      Scope.extend(scope)
    )
    const run = yield* FiberSet.runtime(fiberSet)<R>()
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
        Effect.catchAllCause(reportUnhandledError),
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
    }).pipe(
      Effect.ensuring(Scope.close(scope, Exit.void))
    )
  })

  const address = server.address()!
  return SocketServer.SocketServer.of({
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

const reportUnhandledError = <E>(cause: Cause<E>) =>
  Effect.withFiberRuntime<void>((fiber) => {
    const unhandledLogLevel = fiber.getFiberRef(FiberRef.unhandledErrorLogLevel)
    if (unhandledLogLevel._tag === "Some") {
      return Effect.logWithLevel(unhandledLogLevel.value, cause, "Unhandled error in SocketServer")
    }
    return Effect.void
  })
