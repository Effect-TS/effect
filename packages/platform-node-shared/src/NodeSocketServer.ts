/**
 * @since 1.0.0
 */
import * as Socket from "@effect/platform/Socket"
import * as SocketServer from "@effect/platform/SocketServer"
import type { Cause } from "effect/Cause"
import * as Context from "effect/Context"
import * as Deferred from "effect/Deferred"
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
  const errorDeferred = yield* Deferred.make<never, Error>()
  const pending: Array<Net.Socket> = []
  const defaultOnConnection = (socket: Net.Socket) => {
    pending.push(socket)
  }
  let onConnection = defaultOnConnection

  yield* Effect.addFinalizer(() =>
    Effect.async<void>((resume) => {
      server.close(() => resume(Effect.void))
    })
  )
  const server = Net.createServer(options, (conn) => onConnection(conn))
  server.on("error", (cause) => Deferred.unsafeDone(errorDeferred, Exit.fail(cause)))

  yield* Effect.async<void>((resume) => {
    server.listen(options, () => {
      resume(Effect.void)
    })
  }).pipe(
    Effect.raceFirst(Effect.mapError(Deferred.await(errorDeferred), (cause) =>
      new SocketServer.SocketServerError({
        reason: "Open",
        cause
      })))
  )

  const run = Effect.fnUntraced(function*<R, E, _>(handler: (socket: Socket.Socket) => Effect.Effect<_, E, R>) {
    const scope = yield* Scope.make()
    const fiberSet = yield* FiberSet.make().pipe(
      Scope.extend(scope)
    )
    const run = yield* FiberSet.runtime(fiberSet)<R>()
    function onConnection_(conn: Net.Socket) {
      let error: Error | undefined
      conn.on("error", (err) => {
        error = err
      })
      pipe(
        NodeSocket.fromDuplex(
          Effect.acquireRelease(
            Effect.suspend((): Effect.Effect<Net.Socket, Socket.SocketError> => {
              if (error) {
                return Effect.fail(new Socket.SocketGenericError({ reason: "Open", cause: error }))
              } else if (conn.closed) {
                return Effect.fail(
                  new Socket.SocketCloseError({
                    reason: "Close",
                    code: 1000
                  })
                )
              }
              return Effect.succeed(conn)
            }),
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
      const prev = onConnection
      onConnection = onConnection_
      pending.forEach(onConnection)
      pending.length = 0
      return Effect.suspend(() => {
        onConnection = prev
        return Scope.close(scope, Exit.void)
      })
    }).pipe(
      Effect.raceFirst(Effect.mapError(Deferred.await(errorDeferred), (cause) =>
        new SocketServer.SocketServerError({
          reason: "Unknown",
          cause
        })))
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
