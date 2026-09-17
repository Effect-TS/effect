/**
 * Acquires scoped multicast endpoints with the packet I/O and streaming adapters
 * of `DatagramSocket`. Memberships and multicast send settings are fixed for the
 * lifetime of each endpoint.
 *
 * @since 4.0.0
 */
import * as Context from "../../Context.ts"
import * as Effect from "../../Effect.ts"
import type * as Scope from "../../Scope.ts"
import * as NetAddress from "../net/NetAddress.ts"
import * as DatagramSocket from "./DatagramSocket.ts"

/**
 * A local IPv4 interface selected by its assigned unicast address.
 *
 * @category models
 * @since 4.0.0
 */
export interface Ipv4Interface {
  readonly _tag: "Ipv4"
  readonly address: NetAddress.Ipv4Address
}

/**
 * A local IPv6 interface selected by its positive, unsigned 32-bit index.
 *
 * @category models
 * @since 4.0.0
 */
export interface Ipv6Interface {
  readonly _tag: "Ipv6"
  readonly index: number
}

/**
 * An interface selector for multicast reception or transmission.
 *
 * @category models
 * @since 4.0.0
 */
export type NetworkInterface = Ipv4Interface | Ipv6Interface

/**
 * A multicast group subscription on one local interface.
 *
 * **Details**
 *
 * IPv4 may omit the interface to let the operating system choose one. IPv6
 * requires an explicit interface index. The group's receiving port comes from
 * the socket's local binding. Membership does not select the outgoing interface.
 *
 * @category models
 * @since 4.0.0
 */
export type Membership =
  | {
    readonly group: NetAddress.Ipv4Address
    readonly interface?: Ipv4Interface | undefined
  }
  | {
    readonly group: NetAddress.Ipv6Address
    readonly interface: Ipv6Interface
  }

/**
 * Binding, buffering, membership, and multicast transmission settings.
 *
 * **Details**
 *
 * Defaults are no memberships, a multicast hop limit of 1, enabled multicast
 * loopback, disabled address reuse, and operating-system outgoing interface
 * selection. Empty memberships permit send-only multicast sockets. Bind to an
 * unspecified local address to receive multicast on the selected interfaces.
 * All groups and interfaces must match the local binding's address family.
 * Duplicate memberships are joined once.
 *
 * **Gotchas**
 *
 * Address reuse depends on the operating system and the other sockets bound to
 * the port. It does not promise load balancing. Reception may include unicast
 * packets; incoming packets identify their source, not their destination group.
 * Hop limits are integers from 0 through 255. Native runtime limitations (including
 * unsupported hop limits) surface as open errors without substituting settings.
 *
 * @category models
 * @since 4.0.0
 */
export interface BindOptions extends DatagramSocket.BindOptions {
  readonly memberships?: ReadonlyArray<Membership> | undefined
  readonly outgoingInterface?: NetworkInterface | undefined
  readonly hopLimit?: number | undefined
  readonly loopback?: boolean | undefined
  readonly reuseAddress?: boolean | undefined
}

/**
 * Validated multicast settings with defaults applied and memberships deduplicated.
 *
 * @category models
 * @since 4.0.0
 */
export interface ResolvedBindOptions extends BindOptions {
  readonly memberships: ReadonlyArray<Membership>
  readonly hopLimit: number
  readonly loopback: boolean
  readonly reuseAddress: boolean
}

/**
 * Transport service that acquires scoped multicast datagram endpoints.
 *
 * @category services
 * @since 4.0.0
 */
export class MulticastFactory extends Context.Service<MulticastFactory, {
  readonly bind: (
    options: BindOptions
  ) => Effect.Effect<DatagramSocket.DatagramSocket, DatagramSocket.DatagramSocketError, Scope.Scope>
}>()("effect/socket/MulticastFactory") {}

/**
 * Acquires a multicast endpoint using the platform factory and current scope.
 *
 * **Details**
 *
 * Acquisition succeeds after every membership and send setting is configured.
 * Memberships last until the socket's acquisition scope closes. The returned
 * unconnected socket uses ordinary datagram readers, writers, and stream adapters.
 *
 * **Example** (Configuring a multicast receiver)
 *
 * ```ts import.meta.vitest
 * import { Effect, Result, Stream } from "effect"
 * import { NetAddress } from "effect/unstable/net"
 * import { DatagramSocket, Multicast } from "effect/unstable/socket"
 *
 * const receive = Effect.gen(function*() {
 *   const socket = yield* Multicast.bind({
 *     localAddress: NetAddress.inetAddressFromIpStringUnsafe("0.0.0.0", 5353),
 *     memberships: [{ group: Result.getOrThrow(NetAddress.ipv4FromString("224.0.0.251")) }],
 *     reuseAddress: true
 *   })
 *   return yield* Stream.runHead(DatagramSocket.toStream(socket))
 * })
 * // Provide a platform MulticastFactory and run within Effect.scoped.
 * ```
 *
 * @see {@link DatagramSocket.bind} for ordinary datagram acquisition
 * @category constructors
 * @since 4.0.0
 */
export const bind = (options: BindOptions): Effect.Effect<
  DatagramSocket.DatagramSocket,
  DatagramSocket.DatagramSocketError,
  MulticastFactory | Scope.Scope
> => MulticastFactory.use((factory) => factory.bind(options))

/**
 * Acquires a multicast endpoint from a scoped transport using validated settings.
 *
 * **Details**
 *
 * Validates multicast options before calling `acquire`. The adapter must bind,
 * apply send settings, and join all memberships before returning its binding.
 * It registers native cleanup in the supplied scope. Failed or interrupted
 * acquisition closes that scope, including partially configured memberships.
 * Datagram buffering, packet ownership, and I/O closure follow `DatagramSocket`.
 *
 * @see {@link DatagramSocket.fromTransport} for transport lifetime requirements
 * @category constructors
 * @since 4.0.0
 */
export const fromTransport = (
  options: BindOptions,
  acquire: (
    options: ResolvedBindOptions,
    handlers: DatagramSocket.Handlers
  ) => Effect.Effect<DatagramSocket.Binding, DatagramSocket.DatagramSocketError, Scope.Scope>
): Effect.Effect<DatagramSocket.DatagramSocket, DatagramSocket.DatagramSocketError, Scope.Scope> =>
  DatagramSocket.fromTransport(
    options,
    (handlers) => Effect.flatMap(resolveOptions(options), (resolved) => acquire(resolved, handlers))
  )

const invalidOptions = (message: string) =>
  new DatagramSocket.DatagramSocketError({
    reason: new DatagramSocket.DatagramSocketInvalidOptionsError({ message })
  })

const resolveOptions = Effect.fnUntraced(function*(
  options: BindOptions
): Effect.fn.Return<ResolvedBindOptions, DatagramSocket.DatagramSocketError> {
  const ipv4 = NetAddress.isIpv4Address(options.localAddress.address)
  const hopLimit = options.hopLimit ?? 1
  if (!Number.isInteger(hopLimit) || hopLimit < 0 || hopLimit > 255) {
    return yield* invalidOptions("Multicast hopLimit must be an integer from 0 through 255")
  }
  if (options.outgoingInterface !== undefined) {
    yield* validateInterface(options.outgoingInterface, ipv4)
  }
  const memberships: Array<Membership> = []
  const seen = new Set<string>()
  for (const membership of options.memberships ?? []) {
    if (!NetAddress.isMulticast(membership.group)) {
      return yield* invalidOptions("Membership group must be a multicast address")
    }
    if (NetAddress.isIpv4Address(membership.group) !== ipv4) {
      return yield* invalidOptions("Membership group must match the local address family")
    }
    if (membership.interface !== undefined) {
      yield* validateInterface(membership.interface, ipv4)
    } else if (!ipv4) {
      return yield* invalidOptions("IPv6 memberships require an explicit interface index")
    }
    const networkInterface = membership.interface
    const key = `${membership.group}/${
      networkInterface === undefined ?
        "default" :
        networkInterface._tag === "Ipv4"
        ? networkInterface.address
        : networkInterface.index
    }`
    if (!seen.has(key)) {
      seen.add(key)
      memberships.push(membership)
    }
  }
  return {
    ...options,
    memberships,
    hopLimit,
    loopback: options.loopback ?? true,
    reuseAddress: options.reuseAddress ?? false
  }
})

const validateInterface = Effect.fnUntraced(function*(
  networkInterface: NetworkInterface,
  ipv4: boolean
): Effect.fn.Return<void, DatagramSocket.DatagramSocketError> {
  if ((networkInterface._tag === "Ipv4") !== ipv4) {
    return yield* invalidOptions("Multicast interface must match the local address family")
  }
  if (networkInterface._tag === "Ipv6") {
    if (
      !Number.isInteger(networkInterface.index) || networkInterface.index < 1 || networkInterface.index > 0xffffffff
    ) {
      return yield* invalidOptions("Multicast interface index must be a positive unsigned 32-bit integer")
    }
  } else if (
    NetAddress.isUnspecified(networkInterface.address) || NetAddress.isMulticast(networkInterface.address) ||
    NetAddress.isBroadcast(networkInterface.address)
  ) {
    return yield* invalidOptions("IPv4 multicast interface must be a specified unicast address")
  }
})
