/**
 * Native Deno UDP socket adapter. Requires --unstable-net or "net" in deno.json.
 * Broadcast is always enabled; Deno has no native connect or source-specific multicast.
 *
 * @since 4.0.0
 */
import type * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import type * as NetAddress from "effect/net/NetAddress"
import * as DatagramSocket from "effect/socket/DatagramSocket"

/** @category models @since 4.0.0 */
export interface Endpoint {
  readonly address: string | NetAddress.IpAddress
  readonly port: number
}

/** @category options @since 4.0.0 */
export interface Options {
  readonly bind?: { readonly address?: string | NetAddress.IpAddress; readonly port?: number } | undefined
  readonly family?: "ipv4" | "ipv6" | undefined
  readonly peer?: Endpoint | undefined
  readonly reuseAddress?: boolean | undefined
  readonly multicast?: { readonly loopback?: boolean | undefined } | undefined
  readonly receiveBuffer?: DatagramSocket.ReceiveBufferOptions | undefined
  readonly onError?: ((error: DatagramSocket.DatagramSocketError) => void) | undefined
}

/** @category options @since 4.0.0 */
export type AdoptOptions = Pick<Options, "peer" | "receiveBuffer" | "onError">

/** @category constructors @since 4.0.0 */
export const make = (_options: Options = {}): DatagramSocket.DatagramSocket => {
  throw new Error("not implemented")
}

/** Acquires a native connection once per reader scope and closes it on scope exit.
 * @category constructors @since 4.0.0
 */
export const fromDatagramConn = (
  _acquire: Effect.Effect<Deno.DatagramConn, DatagramSocket.DatagramSocketError>,
  _options: AdoptOptions = {}
): DatagramSocket.DatagramSocket => {
  throw new Error("not implemented")
}

/** @category layers @since 4.0.0 */
export const layer = (options: Options = {}): Layer.Layer<DatagramSocket.DatagramSocket> =>
  Layer.succeed(DatagramSocket.DatagramSocket, make(options))
