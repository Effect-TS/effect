/**
 * Bun UDP socket adapter. Requires Bun 1.4 or later.
 *
 * @since 4.0.0
 */
import type * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import type * as NetAddress from "effect/net/NetAddress"
import * as DatagramSocket from "effect/socket/DatagramSocket"

/** @since 4.0.0 */
export interface Endpoint {
  readonly address: string | NetAddress.IpAddress
  readonly port: number
}

/** @since 4.0.0 */
export interface AdoptOptions extends DatagramSocket.ReceiveBufferOptions {
  readonly peer?: Endpoint | undefined
  readonly onError?: (error: DatagramSocket.DatagramSocketError) => void
}

/** @since 4.0.0 */
export interface Options extends AdoptOptions {
  readonly bind?:
    | { readonly address?: string | NetAddress.IpAddress | undefined; readonly port?: number | undefined }
    | undefined
  readonly family?: "ipv4" | "ipv6" | undefined
  readonly connect?: Endpoint | undefined
  readonly reuseAddress?: boolean | undefined
  readonly reusePort?: boolean | undefined
  readonly ipv6Only?: boolean | undefined
  readonly broadcast?: boolean | undefined
  readonly ttl?: number | undefined
  readonly multicast?: {
    readonly interface?: string | NetAddress.IpAddress | undefined
    readonly loopback?: boolean | undefined
    readonly ttl?: number | undefined
  } | undefined
}

/** @since 4.0.0 */
export const make = (_options: Options = {}): DatagramSocket.DatagramSocket => {
  throw new Error("not implemented")
}

/** @since 4.0.0 */
export const fromUdpSocket = (
  _acquire: Effect.Effect<Awaited<ReturnType<typeof Bun.udpSocket>>>,
  _options?: AdoptOptions
): DatagramSocket.DatagramSocket => {
  throw new Error("not implemented")
}

/** @since 4.0.0 */
export const layer = (options: Options = {}): Layer.Layer<DatagramSocket.DatagramSocket> =>
  Layer.succeed(DatagramSocket.DatagramSocket, make(options))
