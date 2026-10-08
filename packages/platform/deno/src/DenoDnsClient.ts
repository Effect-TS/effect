/**
 * The `DenoDnsClient` module provides Deno's `DnsClient` service, which speaks
 * the DNS protocol over `Deno.listenDatagram` sockets and TCP connections for
 * truncated responses. The system configuration is read with
 * `NodeDnsClient.systemOptions`.
 *
 * **Gotchas**
 *
 * Deno cannot connect UDP sockets, so packets from other addresses reach the
 * socket and are discarded by the client. Datagram sockets need the
 * `--unstable-net` flag, and queries need the `--allow-net` permission.
 * Reading the system configuration needs `--allow-read`.
 *
 * @stability experimental
 * @since 4.0.0
 */
import * as NodeDnsClient from "@effect/platform-node-shared/NodeDnsClient"
import * as Config from "effect/Config"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as DnsClient from "effect/net/DnsClient"
import * as NetAddress from "effect/net/NetAddress"
import * as DenoDatagramSocket from "./DenoDatagramSocket.ts"
import * as DenoSocket from "./DenoSocket.ts"

export type {
  /**
   * Options for the Deno `DnsClient` service, overriding the system
   * configuration.
   *
   * @stability experimental
   * @category re-exports
   * @since 4.0.0
   */
  Options
} from "@effect/platform-node-shared/NodeDnsClient"

/**
 * Creates a Deno `DnsClient` service from the system configuration and
 * options.
 *
 * @stability experimental
 * @category constructors
 * @since 4.0.0
 */
export const make = Effect.fnUntraced(function*(options?: NodeDnsClient.Options) {
  return yield* DnsClient.make({
    ...yield* NodeDnsClient.systemOptions(options),
    udp: (server) => DenoDatagramSocket.make({ peer: { address: server.address, port: server.port } }),
    tcp: (server) => DenoSocket.makeTcp({ hostname: NetAddress.formatIp(server.address), port: server.port })
  })
})

/**
 * Layer that provides the Deno `DnsClient` service using the system resolver
 * configuration.
 *
 * @stability experimental
 * @category layers
 * @since 4.0.0
 */
export const layer: Layer.Layer<DnsClient.DnsClient> = Layer.effect(DnsClient.DnsClient, Effect.orDie(make()))

/**
 * Creates a layer that provides the Deno `DnsClient` service with options read
 * from configuration.
 *
 * @stability experimental
 * @category layers
 * @since 4.0.0
 */
export const layerConfig = (
  options: Config.Wrap<NodeDnsClient.Options>
): Layer.Layer<DnsClient.DnsClient, Config.ConfigError | NetAddress.NetAddressError> =>
  Layer.effect(DnsClient.DnsClient, Effect.flatMap(Config.unwrap(options), make))
