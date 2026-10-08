/**
 * Node.js implementation of Effect's `AddressResolver` service.
 *
 * Domain names are looked up with the `Dns` service, and IPv6 literals with a
 * named zone such as `fe80::1%eth0` get their scope ID from
 * `os.networkInterfaces()`. Interfaces are listed each time a named zone is
 * resolved, so interfaces added or recreated while the program runs are found.
 *
 * @stability experimental
 * @since 4.0.0
 */
import * as Effect from "effect/Effect"
import type * as Layer from "effect/Layer"
import * as AddressResolver from "effect/net/AddressResolver"
import type * as Dns from "effect/net/Dns"
import * as NetAddress from "effect/net/NetAddress"
import * as Option from "effect/Option"
import * as Os from "node:os"

/**
 * Looks up the IPv6 scope ID of a network interface with
 * `os.networkInterfaces()`.
 *
 * @stability experimental
 * @category resolving
 * @since 4.0.0
 */
export const scopeId: AddressResolver.ScopeIdLookup = (name) =>
  Effect.try({
    try: () =>
      Option.fromUndefinedOr(NetAddress.scopeIdsFromInterfaces([[name, Os.networkInterfaces()[name]]]).get(name)),
    catch: (cause) => new NetAddress.NetAddressError({ input: name, message: "cannot list network interfaces", cause })
  })

/**
 * Layer that provides the Node.js `AddressResolver` service using the `Dns`
 * service.
 *
 * @stability experimental
 * @category layers
 * @since 4.0.0
 */
export const layer: Layer.Layer<AddressResolver.AddressResolver, never, Dns.Dns> = AddressResolver.layer({ scopeId })
