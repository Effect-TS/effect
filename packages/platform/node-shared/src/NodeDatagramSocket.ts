/**
 * Node.js UDP sockets for Effect's datagram socket API.
 *
 * Socket acquisition scopes own native sockets. Calling fibers own receive and send
 * operations; interrupting one leaves the endpoint open.
 * Incoming packets are buffered within the configured packet and byte limits,
 * including while no receive is waiting. Overflow and oversized incoming packets
 * are dropped. A native receive error terminates reading until the socket is
 * released. Outgoing payloads are copied before submission so interrupted writes
 * cannot retain the caller's mutable storage. Successful writes do not confirm
 * remote delivery.
 *
 * @since 4.0.0
 */
import type * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import type * as Scope from "effect/Scope"
import * as Datagram from "effect/unstable/socket/DatagramSocket"
import * as internal from "./internal/datagramSocket.ts"

/**
 * Acquires a bound Node.js UDP socket owned by the current scope.
 *
 * @see {@link connect} for sockets associated with one peer
 * @category constructors
 * @since 4.0.0
 */
export const bind = (options: Datagram.BindOptions): Effect.Effect<
  Datagram.DatagramSocket,
  Datagram.DatagramSocketError,
  Scope.Scope
> => Datagram.fromTransport(options, (handlers) => internal.open({ localAddress: options.localAddress }, handlers))

/**
 * Acquires a bound, peer-associated Node.js UDP socket owned by the current scope.
 *
 * **Details**
 *
 * The peer must have a nonzero port and a specified IP address. Association
 * filters incoming packets to that peer without performing a handshake.
 *
 * @see {@link bind} for sockets that send to multiple destinations
 * @category constructors
 * @since 4.0.0
 */
export const connect = (options: Datagram.ConnectOptions): Effect.Effect<
  Datagram.ConnectedDatagramSocket,
  Datagram.DatagramSocketError,
  Scope.Scope
> =>
  Datagram.fromConnectedTransport(
    options,
    (handlers) => internal.open({ localAddress: options.localAddress, remote: options.remote }, handlers)
  )

/**
 * Layer that provides Node.js UDP binding and peer association through the
 * datagram socket factory.
 *
 * @category layers
 * @since 4.0.0
 */
export const layer: Layer.Layer<Datagram.DatagramSocketFactory> = Layer.succeed(Datagram.DatagramSocketFactory, {
  bind,
  connect
})
