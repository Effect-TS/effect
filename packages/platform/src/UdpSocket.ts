/**
 * @since 1.0.0
 */
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Predicate from "effect/Predicate"
import type * as Scope from "effect/Scope"
import { TypeIdError } from "./Error.js"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for("@effect/platform/UdpSocket")

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category guards
 */
export const isUdpSocket = (u: unknown): u is UdpSocket => Predicate.hasProperty(u, TypeId)

/**
 * @since 1.0.0
 * @category tags
 */
export const UdpSocket: Context.Tag<UdpSocket, UdpSocket> = Context.GenericTag<UdpSocket>(
  "@effect/platform/UdpSocket"
)

/**
 * Represents a UDP address with hostname and port.
 *
 * @since 1.0.0
 * @category models
 */
export interface UdpAddress {
  readonly _tag: "UdpAddress"
  readonly hostname: string
  readonly port: number
}

/**
 * Represents a UDP datagram message with sender information.
 *
 * Unlike TCP which provides a continuous stream, UDP delivers discrete messages.
 * Each message includes the complete data and the address of the sender.
 *
 * @since 1.0.0
 * @category models
 */
export interface UdpMessage {
  /** The message data as a byte array */
  readonly data: Uint8Array
  /** The address and port of the message sender */
  readonly remoteAddress: UdpAddress
}

/**
 * Platform-agnostic interface for UDP socket operations.
 *
 * Provides methods for sending datagrams, receiving messages, and managing
 * the socket lifecycle. Implementations handle the platform-specific details
 * while maintaining a consistent API across different runtimes.
 *
 * @since 1.0.0
 * @category models
 */
export interface UdpSocket {
  readonly [TypeId]: TypeId
  /** The local address and port the socket is bound to */
  readonly address: UdpAddress
  /** Close the socket and release resources */
  readonly close: Effect.Effect<void, UdpSocketError>
  /** Send a datagram to a specific address */
  readonly send: (data: Uint8Array, address: UdpAddress) => Effect.Effect<void, UdpSocketError>
  /** Run a message handler to process incoming datagrams */
  readonly run: <_, E = never, R = never>(
    handler: (_: UdpMessage) => Effect.Effect<_, E, R> | void
  ) => Effect.Effect<void, UdpSocketError | E, R>
}

/**
 * @since 1.0.0
 * @category type ids
 */
export const UdpSocketErrorTypeId: unique symbol = Symbol.for("@effect/platform/UdpSocket/UdpSocketError")

/**
 * @since 1.0.0
 * @category type ids
 */
export type UdpSocketErrorTypeId = typeof UdpSocketErrorTypeId

/**
 * @since 1.0.0
 * @category refinements
 */
export const isUdpSocketError = (u: unknown): u is UdpSocketError => Predicate.hasProperty(u, UdpSocketErrorTypeId)

/**
 * @since 1.0.0
 * @category errors
 */
export type UdpSocketError = UdpSocketGenericError

/**
 * Represents errors that can occur during UDP socket operations.
 *
 * @since 1.0.0
 * @category errors
 */
export class UdpSocketGenericError extends TypeIdError(UdpSocketErrorTypeId, "UdpSocketError")<{
  /** The operation that failed */
  readonly reason: "Bind" | "Send" | "Receive" | "Close"
  /** The underlying cause of the error */
  readonly cause: unknown
}> {
  get message() {
    return `An error occurred during ${this.reason}`
  }
}

/**
 * Creates a UDP socket that can send and receive datagrams.
 *
 * Unlike TCP sockets which are stream-oriented and connection-based, UDP sockets
 * are message-oriented and connectionless. Each message (datagram) is sent
 * independently and includes the sender's address information.
 *
 * @example
 * ```ts
 * import { UdpSocket } from "@effect/platform"
 * import { NodeUdpSocket } from "@effect/platform-node"
 * import { Effect } from "effect"
 *
 * const program = Effect.gen(function*() {
 *   // Create a UDP socket bound to a random port
 *   const socket = yield* NodeUdpSocket.make({ _tag: "UdpAddress", hostname: "0.0.0.0", port: 0 })
 *
 *   // Get the socket's address
 *   const address = socket.address
 *   console.log(`Socket bound to ${address.hostname}:${address.port}`)
 *
 *   // Send a message to another socket
 *   const message = new TextEncoder().encode("Hello UDP!")
 *   yield* socket.send(message, { _tag: "UdpAddress", hostname: "127.0.0.1", port: 8080 })
 *
 *   // Listen for incoming messages
 *   yield* socket.run((message) => {
 *     console.log(`Received: ${new TextDecoder().decode(message.data)}`)
 *     console.log(`From: ${message.remoteAddress.hostname}:${message.remoteAddress.port}`)
 *   })
 * })
 *
 * Effect.runPromise(Effect.scoped(program))
 * ```
 *
 * @since 1.0.0
 * @category constructors
 */
export const make = (address?: Partial<UdpAddress>): Effect.Effect<UdpSocket, UdpSocketError, Scope.Scope> =>
  Effect.fail(new UdpSocketGenericError({ reason: "Bind", cause: "UdpSocket.make not implemented" }))

/**
 * Creates a Layer that provides a UDP socket bound to the specified address.
 *
 * @since 1.0.0
 * @category layers
 */
export const layer = (address?: Partial<UdpAddress>): Layer.Layer<UdpSocket, UdpSocketError> =>
  Layer.scoped(UdpSocket, make(address))