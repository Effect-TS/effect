/**
 * The `BunDnsClient` module provides Bun's `DnsClient` service, which speaks
 * the DNS protocol over Bun UDP sockets connected to the name server and
 * `node:net` connections for truncated responses. The system configuration
 * is read with `NodeDnsClient.systemOptions`.
 *
 * @stability experimental
 * @since 4.0.0
 */
import * as NodeDnsClient from "@effect/platform-node-shared/NodeDnsClient"
import * as NodeSocket from "@effect/platform-node-shared/NodeSocket"
import * as Config from "effect/Config"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as DnsClient from "effect/net/DnsClient"
import * as NetAddress from "effect/net/NetAddress"
import * as BunDatagramSocket from "./BunDatagramSocket.ts"

export type {
  /**
   * Options for the Bun `DnsClient` service, overriding the system
   * configuration.
   *
   * @stability experimental
   * @category re-exports
   * @since 4.0.0
   */
  Options
} from "@effect/platform-node-shared/NodeDnsClient"

/**
 * Creates a Bun `DnsClient` service from the system configuration and
 * options.
 *
 * @stability experimental
 * @category constructors
 * @since 4.0.0
 */
export const make = Effect.fnUntraced(function*(options?: NodeDnsClient.Options) {
  return yield* DnsClient.make({
    ...yield* NodeDnsClient.systemOptions(options),
    udp: (server) => BunDatagramSocket.make({ connect: { address: server.address, port: server.port } }),
    tcp: (server) => NodeSocket.makeNet({ host: NetAddress.formatIp(server.address), port: server.port })
  })
})

/**
 * Layer that provides the Bun `DnsClient` service using the system resolver
 * configuration.
 *
 * @stability experimental
 * @category layers
 * @since 4.0.0
 */
export const layer: Layer.Layer<DnsClient.DnsClient> = Layer.effect(DnsClient.DnsClient, Effect.orDie(make()))

/**
 * Creates a layer that provides the Bun `DnsClient` service with options read
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
