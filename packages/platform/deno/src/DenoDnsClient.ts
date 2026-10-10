/**
 * Deno implementation of the `DnsClient` service and its UDP and TCP
 * transports. Requires `--unstable-net` and `--allow-net`, and `--allow-read`
 * for the system configuration.
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
import * as DenoCrypto from "./DenoCrypto.ts"
import * as DenoDatagramSocket from "./DenoDatagramSocket.ts"
import * as DenoFileSystem from "./DenoFileSystem.ts"
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

const udp = (server: NetAddress.InetAddress) =>
  DenoDatagramSocket.make({ peer: { address: server.address, port: server.port } })

const tcp = (server: NetAddress.InetAddress) =>
  DenoSocket.makeTcp({ hostname: NetAddress.formatIp(server.address), port: server.port })

/**
 * Creates a `DnsClient.Transport` that sends queries over UDP with
 * `Deno.listenDatagram` sockets, and retries truncated responses over
 * Deno TCP connections.
 *
 * @see {@link layerTransportUdp} for a layer
 * @stability experimental
 * @category constructors
 * @since 4.0.0
 */
export const makeTransportUdp = (
  options: Omit<DnsClient.TransportUdpOptions, "udp" | "tcp">
): Effect.Effect<DnsClient.Transport["Service"], NetAddress.NetAddressError> =>
  Effect.andThen(
    NodeDnsClient.checkNameServers(options.nameServers),
    DnsClient.makeTransportUdp({ ...options, udp, tcp }).pipe(Effect.provide(DenoCrypto.layer))
  )

/**
 * Layer that provides a `DnsClient.Transport` sending queries over UDP, with
 * truncated responses retried over TCP.
 *
 * @see {@link makeTransportUdp} for the behavior
 * @stability experimental
 * @category layers
 * @since 4.0.0
 */
export const layerTransportUdp = (
  options: Omit<DnsClient.TransportUdpOptions, "udp" | "tcp">
): Layer.Layer<DnsClient.Transport, NetAddress.NetAddressError> =>
  Layer.effect(DnsClient.Transport, makeTransportUdp(options))

/**
 * Creates a `DnsClient.Transport` that sends every query over
 * Deno TCP connections.
 *
 * @see {@link layerTransportTcp} for a layer
 * @stability experimental
 * @category constructors
 * @since 4.0.0
 */
export const makeTransportTcp = (
  options: Omit<DnsClient.TransportTcpOptions, "tcp">
): Effect.Effect<DnsClient.Transport["Service"], NetAddress.NetAddressError> =>
  Effect.andThen(
    NodeDnsClient.checkNameServers(options.nameServers),
    DnsClient.makeTransportTcp({ ...options, tcp }).pipe(Effect.provide(DenoCrypto.layer))
  )

/**
 * Layer that provides a `DnsClient.Transport` sending every query over TCP.
 *
 * @see {@link makeTransportTcp} for the behavior
 * @stability experimental
 * @category layers
 * @since 4.0.0
 */
export const layerTransportTcp = (
  options: Omit<DnsClient.TransportTcpOptions, "tcp">
): Layer.Layer<DnsClient.Transport, NetAddress.NetAddressError> =>
  Layer.effect(DnsClient.Transport, makeTransportTcp(options))

/**
 * Creates a Deno `DnsClient` service from the system configuration and
 * options, sending queries with `makeTransportUdp`.
 *
 * @stability experimental
 * @category constructors
 * @since 4.0.0
 */
export const make = Effect.fnUntraced(function*(options?: NodeDnsClient.Options) {
  const config = yield* NodeDnsClient.systemOptions(options).pipe(Effect.provide(DenoFileSystem.layer))
  return yield* DnsClient.make(config).pipe(Effect.provideServiceEffect(DnsClient.Transport, makeTransportUdp(config)))
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
