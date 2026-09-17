/**
 * Scoped multicast endpoints backed by `node:dgram`. Acquired endpoints use
 * Effect's datagram buffering, packet I/O, and streaming adapters.
 *
 * @since 4.0.0
 */
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import type * as Scope from "effect/Scope"
import * as NetAddress from "effect/unstable/net/NetAddress"
import * as Datagram from "effect/unstable/socket/DatagramSocket"
import * as Multicast from "effect/unstable/socket/Multicast"
import type * as Dgram from "node:dgram"
import * as Process from "node:process"
import * as internal from "./internal/datagramSocket.ts"

/**
 * Acquires a multicast datagram endpoint owned by the current scope.
 *
 * **Details**
 *
 * Configures address reuse before binding, then multicast send settings and all
 * memberships before returning. Failed setup closes the partially acquired
 * endpoint. Closing the acquisition scope releases every membership.
 *
 * @category constructors
 * @since 4.0.0
 */
export const bind = (options: Multicast.BindOptions): Effect.Effect<
  Datagram.DatagramSocket,
  Datagram.DatagramSocketError,
  Scope.Scope
> =>
  Multicast.fromTransport(options, (options, handlers) =>
    internal.open({
      localAddress: options.localAddress,
      reuseAddress: options.reuseAddress,
      configure: (socket, scopeIds) => configure(socket, options, scopeIds)
    }, handlers))

/**
 * Layer that provides multicast endpoint acquisition through `node:dgram`.
 *
 * @category layers
 * @since 4.0.0
 */
export const layer: Layer.Layer<Multicast.MulticastFactory> = Layer.succeed(Multicast.MulticastFactory, { bind })

const formatInterface = (
  networkInterface: Multicast.NetworkInterface,
  scopeIds: ReadonlyMap<string, number>
): string => {
  if (networkInterface._tag === "Ipv4") return NetAddress.formatIp(networkInterface.address)
  if (Process.platform === "win32") return `::%${networkInterface.index}`
  // libuv resolves Unix membership zones with if_nametoindex, not as numeric IDs.
  for (const [name, index] of scopeIds) {
    if (index === networkInterface.index) return `::%${name}`
  }
  throw new Error(`Cannot resolve multicast interface index ${networkInterface.index} to a local interface name`)
}

const configure = Effect.fnUntraced(
  function*(socket: Dgram.Socket, options: Multicast.ResolvedBindOptions, scopeIds: ReadonlyMap<string, number>) {
    yield* configureOption("setMulticastTTL", options.hopLimit, () => socket.setMulticastTTL(options.hopLimit))
    yield* configureOption(
      "setMulticastLoopback",
      options.loopback,
      () => socket.setMulticastLoopback(options.loopback)
    )
    if (options.outgoingInterface !== undefined) {
      const networkInterface = options.outgoingInterface
      yield* configureOption(
        "setMulticastInterface",
        networkInterface,
        () => socket.setMulticastInterface(formatInterface(networkInterface, scopeIds))
      )
    }
    for (const membership of options.memberships) {
      yield* configureOption("addMembership", membership, () =>
        socket.addMembership(
          NetAddress.formatIp(membership.group),
          membership.interface === undefined ? undefined : formatInterface(membership.interface, scopeIds)
        ))
    }
  }
)

const configureOption = (operation: string, value: unknown, configure: () => unknown) =>
  Effect.try({
    try: configure,
    catch: (cause) =>
      new Datagram.DatagramSocketError({
        reason: new Datagram.DatagramSocketOpenError({ cause: { operation, value, cause } })
      })
  }).pipe(Effect.asVoid)
