/**
 * Deno implementation of Effect's `AddressResolver` service.
 *
 * Domain names are looked up with the `Dns` service, and IPv6 literals with a
 * named zone such as `fe80::1%eth0` get their scope ID from
 * `Deno.networkInterfaces()`. Interfaces are listed each time a named zone is
 * resolved, so interfaces added or recreated while the program runs are found.
 *
 * **Gotchas**
 *
 * Listing network interfaces requires the `--allow-sys` permission; without it,
 * resolving a named zone fails with a `NetAddress.NetAddressError`.
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

/**
 * Looks up the IPv6 scope ID of a network interface with
 * `Deno.networkInterfaces()`.
 *
 * **Details**
 *
 * Returns `None` for interfaces that do not exist or have no IPv6 address with
 * a scope ID, and fails when the interfaces cannot be listed.
 *
 * @stability experimental
 * @category resolving
 * @since 4.0.0
 */
export const scopeId = (name: string): Effect.Effect<Option.Option<number>, NetAddress.NetAddressError> =>
  Effect.try({
    try: () =>
      Option.fromUndefinedOr(
        Deno.networkInterfaces().find((info) => info.name === name && info.family === "IPv6" && (info.scopeid ?? 0) > 0)
          ?.scopeid ?? undefined
      ),
    catch: (cause) => new NetAddress.NetAddressError({ input: name, message: "cannot list network interfaces", cause })
  })

/**
 * Layer that provides the Deno `AddressResolver` service using the `Dns`
 * service.
 *
 * @stability experimental
 * @category layers
 * @since 4.0.0
 */
export const layer: Layer.Layer<AddressResolver.AddressResolver, never, Dns.Dns> = AddressResolver.layer({ scopeId })
