/**
 * Scoped IPv4 multicast endpoints backed by Deno's `node:dgram` compatibility API.
 * IPv6 is rejected because Deno does not apply multicast hop limits to IPv6.
 * Some Deno versions also reject a zero IPv4 hop limit with an open error.
 *
 * @since 4.0.0
 */

import * as NodeMulticast from "@effect/platform-node-shared/NodeMulticast"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import type * as Scope from "effect/Scope"
import * as NetAddress from "effect/unstable/net/NetAddress"
import * as Datagram from "effect/unstable/socket/DatagramSocket"
import * as Multicast from "effect/unstable/socket/Multicast"

/**
 * Acquires a scoped IPv4 multicast endpoint. IPv6 acquisition fails with a
 * datagram open error without opening a native socket.
 *
 * @category constructors
 * @since 4.0.0
 */
export const bind = (options: Multicast.BindOptions): Effect.Effect<
  Datagram.DatagramSocket,
  Datagram.DatagramSocketError,
  Scope.Scope
> =>
  NetAddress.isIpv4Address(options.localAddress.address) ?
    NodeMulticast.bind(options) :
    Multicast.fromTransport(options, () =>
      Effect.fail(
        new Datagram.DatagramSocketError({
          reason: new Datagram.DatagramSocketOpenError({
            cause: new Error("Deno does not support IPv6 multicast hop limits")
          })
        })
      ))

/**
 * Layer that provides IPv4 multicast endpoint acquisition on Deno.
 *
 * @category layers
 * @since 4.0.0
 */
export const layer: Layer.Layer<Multicast.MulticastFactory> = Layer.succeed(Multicast.MulticastFactory, { bind })
