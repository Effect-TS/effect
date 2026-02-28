/**
 * @since 1.0.0
 */
import * as UdpSocket from "@effect/platform/UdpSocket"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import type * as Scope from "effect/Scope"
import * as Dgram from "node:dgram"

/**
 * @since 1.0.0
 * @category tags
 */
export interface NodeUdpSocket {
  readonly _: unique symbol
}

/**
 * @since 1.0.0
 * @category tags
 */
export const NodeUdpSocket: Context.Tag<NodeUdpSocket, Dgram.Socket> = Context.GenericTag(
  "@effect/platform-node/NodeUdpSocket/NodeUdpSocket"
)

/**
 * Creates a UDP socket using Node.js dgram module.
 *
 * This is the Node.js-specific implementation of the platform-agnostic UdpSocket interface.
 * It uses the Node.js `dgram` module to create UDP4 sockets for sending and receiving datagrams.
 *
 * @example
 * ```ts
 * import { NodeUdpSocket } from "@effect/platform-node"
 * import { Effect, Queue } from "effect"
 *
 * const program = Effect.gen(function*() {
 *   // Create server socket
 *   const server = yield* NodeUdpSocket.make({ _tag: "UdpAddress", hostname: "0.0.0.0", port: 8080 })
 *
 *   // Create client socket
 *   const client = yield* NodeUdpSocket.make({ _tag: "UdpAddress", hostname: "0.0.0.0", port: 0 })
 *   const clientAddress = client.address
 *
 *   // Set up message handling on server
 *   const messages = yield* Queue.unbounded()
 *   const serverFiber = yield* Effect.fork(
 *     server.run((message) => messages.offer(message))
 *   )
 *
 *   // Send message from client to server
 *   const testMessage = new TextEncoder().encode("Hello Server!")
 *   yield* client.send(testMessage, { _tag: "UdpAddress", hostname: "127.0.0.1", port: 8080 })
 *
 *   // Receive message on server
 *   const received = yield* messages.take
 *   console.log(`Server received: ${new TextDecoder().decode(received.data)}`)
 *   console.log(`From client: ${received.remoteAddress.hostname}:${received.remoteAddress.port}`)
 *
 *   yield* Effect.fiberInterrupt(serverFiber)
 * })
 *
 * Effect.runPromise(Effect.scoped(program))
 * ```
 *
 * @param address - UDP address configuration for the socket
 * @returns Effect that creates a UDP socket with proper resource management
 *
 * @since 1.0.0
 * @category constructors
 */
export const make = (
  address?: Partial<UdpSocket.UdpAddress>
): Effect.Effect<UdpSocket.UdpSocket, UdpSocket.UdpSocketError, Scope.Scope> =>
  Effect.gen(function*() {
    const socket = yield* Effect.acquireRelease(
      Effect.async<Dgram.Socket, UdpSocket.UdpSocketError>((resume) => {
        const socket = Dgram.createSocket("udp4")
        const port = address?.port ?? 0
        const hostname = address?.hostname ?? "0.0.0.0"

        socket.on("error", (error) => {
          resume(Effect.fail(new UdpSocket.UdpSocketGenericError({ reason: "Bind", cause: error })))
        })

        socket.bind(port, hostname, () => {
          socket.removeAllListeners("error")
          resume(Effect.succeed(socket))
        })
      }),
      (socket) =>
        Effect.sync(() => {
          socket.removeAllListeners()
          try {
            socket.close()
          } catch (error) {
            // Expected for double-close, ignore silently
            if (error instanceof Error && error.message === "Not running") {
              return
            }
            // For unexpected errors during automatic cleanup, we silently ignore them
            // to prevent scope cleanup failures. Users can call socket.close() explicitly
            // if they need to handle close errors.
          }
        })
    )

    let isClosed = false

    // Get the actual bound address
    const actualAddress = socket.address()
    const boundAddress: UdpSocket.UdpAddress = {
      _tag: "UdpAddress",
      hostname: actualAddress.address,
      port: actualAddress.port
    }

    return {
      [UdpSocket.TypeId]: UdpSocket.TypeId,
      address: boundAddress,
      close: Effect.async<void, UdpSocket.UdpSocketError>((resume) => {
        isClosed = true
        try {
          socket.close(() => {
            resume(Effect.void)
          })
        } catch (error) {
          // Surface close errors to users who call close() explicitly
          resume(Effect.fail(new UdpSocket.UdpSocketGenericError({ reason: "Close", cause: error })))
        }
      }),
      send: (data: Uint8Array, address: UdpSocket.UdpAddress) =>
        Effect.async<void, UdpSocket.UdpSocketError>((resume) => {
          if (isClosed) {
            resume(Effect.fail(new UdpSocket.UdpSocketGenericError({ reason: "Send", cause: "Socket is closed" })))
            return
          }
          socket.send(data, address.port, address.hostname, (error) => {
            if (error) {
              resume(Effect.fail(new UdpSocket.UdpSocketGenericError({ reason: "Send", cause: error })))
            } else {
              resume(Effect.void)
            }
          })
        }),
      run: <_, E = never, R = never>(handler: (_: UdpSocket.UdpMessage) => Effect.Effect<_, E, R> | void) =>
        Effect.async<void, UdpSocket.UdpSocketError | E>((resume) => {
          function onMessage(msg: Buffer, rinfo: Dgram.RemoteInfo) {
            const message: UdpSocket.UdpMessage = {
              data: new Uint8Array(msg),
              remoteAddress: {
                _tag: "UdpAddress",
                hostname: rinfo.address,
                port: rinfo.port
              }
            }
            const result = handler(message)
            if (Effect.isEffect(result)) {
              // Improved error handling: don't fail the entire server on individual message errors
              Effect.runPromise(result as Effect.Effect<_, E, never>).catch((error) => {
                // Log individual message errors but don't fail the server
                console.error("Error handling UDP message:", error)
              })
            }
          }

          function onError(error: Error) {
            resume(Effect.fail(new UdpSocket.UdpSocketGenericError({ reason: "Receive", cause: error })))
          }

          socket.on("message", onMessage)
          socket.on("error", onError)

          return Effect.sync(() => {
            socket.off("message", onMessage)
            socket.off("error", onError)
          })
        })
    }
  })

/**
 * Creates a Layer that provides a UDP socket bound to the specified address.
 *
 * @since 1.0.0
 * @category layers
 */
export const layer = (
  address?: Partial<UdpSocket.UdpAddress>
): Layer.Layer<UdpSocket.UdpSocket, UdpSocket.UdpSocketError> =>
  Layer.scoped(UdpSocket.UdpSocket, make(address))