/**
 * The `BunDns` module provides Bun's `Dns` service for Effect programs.
 *
 * Address lookups use `Bun.dns.lookup` with the `system` backend, which calls
 * the operating system resolver (`getaddrinfo`) and therefore also reads the
 * hosts file. Bun's `node:dns` lookup uses c-ares instead, which bypasses the
 * system's name service configuration. Record queries and reverse lookups reuse
 * the shared Node-compatible implementation.
 *
 * **Gotchas**
 *
 * Bun returns each character string of a TXT record as a separate record, so
 * a record made of several strings arrives as several TXT records whose chunks
 * cannot be reassembled (https://github.com/oven-sh/bun/issues/44692).
 *
 * @stability unstable
 * @since 4.0.0
 */
import * as NodeDns from "@effect/platform-node-shared/NodeDns"
import * as Config from "effect/Config"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Dns from "effect/net/Dns"
import * as NetAddress from "effect/net/NetAddress"

/**
 * Options for the Bun `Dns` service.
 *
 * **Details**
 *
 * `nameServers` replaces the system name servers for record queries and
 * reverse lookups; IP addresses without a port use port 53, and an empty list
 * keeps the system name servers. `timeout` is the time allowed for each attempt
 * and `tries` the number of attempts per name server. Address lookups always
 * use the operating system resolver.
 *
 * **Gotchas**
 *
 * IPv6 name servers with a scope ID, such as link-local addresses, are not
 * supported; record queries and reverse lookups fail with `Unsupported`.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface Options extends NodeDns.Options {}

const reasons: Record<string, Dns.DnsErrorReason> = {
  DNS_ENOTFOUND: "NotFound",
  DNS_ENODATA: "NotFound",
  DNS_ETIMEOUT: "Timeout",
  DNS_ESERVFAIL: "ServerFailure",
  DNS_ECONNREFUSED: "Refused",
  DNS_EBADNAME: "BadName",
  DNS_EBADFAMILY: "BadName"
}

const toFamily = (family: NetAddress.IpFamily | undefined): 0 | 4 | 6 =>
  family === "IPv4" ? 4 : family === "IPv6" ? 6 : 0

/**
 * Creates a Bun `Dns` service.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const make = (options?: Options): Dns.Dns => {
  // Bun's `node:dns` already decodes TXT and CAA character strings as UTF-8.
  const queries = NodeDns.makeWith(options, "utf8")
  return Dns.make({
    lookup: (host, family) =>
      Effect.tryPromise({
        try: () => Bun.dns.lookup(host, { family: toFamily(family), backend: "system" }),
        catch: (cause) => {
          const code = typeof cause === "object" && cause !== null && "code" in cause ? String(cause.code) : undefined
          return new Dns.DnsError({
            reason: (code !== undefined ? reasons[code] : undefined) ?? "Unknown",
            method: "lookup",
            hostname: host,
            cause
          })
        }
      }).pipe(
        Effect.flatMap((entries) =>
          Effect.try({
            try: () => entries.map((entry) => NetAddress.ipFromStringUnsafe(entry.address)),
            catch: (cause) => new Dns.DnsError({ reason: "InvalidResponse", method: "lookup", hostname: host, cause })
          })
        )
      ),
    resolve: queries.resolve,
    reverse: queries.reverse
  })
}

/**
 * Layer that provides the Bun `Dns` service using the system resolver
 * configuration.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layer: Layer.Layer<Dns.Dns> = Layer.sync(Dns.Dns, () => make())

/**
 * Creates a layer that provides the Bun `Dns` service with options read
 * from configuration.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layerConfig = (options: Config.Wrap<Options>): Layer.Layer<Dns.Dns, Config.ConfigError> =>
  Layer.effect(Dns.Dns, Effect.map(Config.unwrap(options), make))
