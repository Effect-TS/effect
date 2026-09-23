/**
 * Node UDP adapter for `effect/socket/DatagramSocket`, built on `node:dgram`.
 *
 * `make` opens a new `dgram.Socket` for each reader acquisition, `fromSocket`
 * adopts a socket the caller creates, and `layer` provides the
 * `DatagramSocket` service.
 *
 * @stability unstable
 * @since 4.0.0
 */
import type * as Effect from "effect/Effect"
import type * as Layer from "effect/Layer"
import type * as NetAddress from "effect/net/NetAddress"
import type * as Scope from "effect/Scope"
import type * as DatagramSocket from "effect/socket/DatagramSocket"
import type * as Dgram from "node:dgram"

/**
 * An endpoint given in open-time options.
 *
 * **Details**
 *
 * Hostnames are allowed here, and are resolved once per reader acquisition
 * with `node:dns` `lookup`. An `InetAddress` satisfies this type, so it can be
 * passed as is.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface Endpoint {
  readonly address: string | NetAddress.IpAddress
  readonly port: number
}

/**
 * The local address and port to bind. Defaults to `0.0.0.0` (or `::` for
 * `family: "ipv6"`) and an ephemeral port.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface BindOptions {
  readonly address?: string | NetAddress.IpAddress | undefined
  readonly port?: number | undefined
}

/**
 * Options for `make` and `layer`.
 *
 * **Details**
 *
 * `peer` is a default destination and doesn't filter senders. `connect` calls
 * `connect(2)` after binding, so the kernel filters senders and ICMP errors
 * reach `onError`. The two can't be combined.
 *
 * The family is the explicit `family`, else the family of an IP literal in
 * `bind`, else the family of the `peer` or `connect` address, else `"ipv4"`.
 *
 * `reuseAddress` means `SO_REUSEADDR` on Linux and `SO_REUSEPORT` on BSD and
 * macOS. `kernelReceiveBufferSize` and `kernelSendBufferSize` are in bytes;
 * Linux doubles the value and caps it at `rmem_max` / `wmem_max`.
 *
 * `multicast.interface` is the egress interface for datagrams sent to a group,
 * which is a different socket option from the ingress `interface` of
 * `Reader.joinMulticast`.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export type Options =
  & {
    readonly bind?: BindOptions | undefined
    readonly family?: "ipv4" | "ipv6" | undefined
    readonly reuseAddress?: boolean | undefined
    readonly reusePort?: boolean | undefined
    readonly ipv6Only?: boolean | undefined
    readonly kernelReceiveBufferSize?: number | undefined
    readonly kernelSendBufferSize?: number | undefined
    readonly broadcast?: boolean | undefined
    readonly ttl?: number | undefined
    readonly multicast?: {
      readonly interface?: NetAddress.MulticastInterface | undefined
      readonly loopback?: boolean | undefined
      readonly ttl?: number | undefined
    } | undefined
    readonly receiveBuffer?: DatagramSocket.ReceiveBufferOptions | undefined
    readonly onError?: ((error: DatagramSocket.DatagramSocketError) => void) | undefined
  }
  & (
    | { readonly peer?: Endpoint | undefined; readonly connect?: undefined }
    | { readonly connect: Endpoint; readonly peer?: undefined }
  )

/**
 * Options for `fromSocket`. The caller configures the adopted socket, so only
 * the options that live in JavaScript apply.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface FromSocketOptions {
  readonly peer?: Endpoint | undefined
  readonly receiveBuffer?: DatagramSocket.ReceiveBufferOptions | undefined
  readonly onError?: ((error: DatagramSocket.DatagramSocketError) => void) | undefined
}

/**
 * Creates a `DatagramSocket` that opens and binds a new `dgram.Socket` for
 * each reader acquisition.
 *
 * **Details**
 *
 * Creating the socket never fails. Binding, applying options and resolving
 * names happen when a reader is acquired, and fail that acquisition with a
 * `DatagramSocketError`.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const make = (_options?: Options): Effect.Effect<DatagramSocket.DatagramSocket> => {
  throw new Error("not implemented")
}

/**
 * Adopts a `dgram.Socket`.
 *
 * **Details**
 *
 * `acquire` runs once per reader acquisition, inside the reader's scope, and
 * the adapter closes the socket when that scope ends. The socket must be bound
 * by the time `acquire` completes. Whether it is connected is checked once at
 * open.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const fromSocket = <R>(
  _acquire: Effect.Effect<Dgram.Socket, DatagramSocket.DatagramSocketError, R>,
  _options?: FromSocketOptions
): Effect.Effect<DatagramSocket.DatagramSocket, never, Exclude<R, Scope.Scope>> => {
  throw new Error("not implemented")
}

/**
 * Provides a `DatagramSocket` built with `make`.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layer = (_options?: Options): Layer.Layer<DatagramSocket.DatagramSocket> => {
  throw new Error("not implemented")
}
