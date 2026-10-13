/**
 * Node.js implementation of the `DnsClient` service and its UDP and TCP
 * transports.
 *
 * @stability experimental
 * @since 4.0.0
 */
import * as Arr from "effect/Array"
import * as Config from "effect/Config"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Dns from "effect/net/Dns"
import * as DnsClient from "effect/net/DnsClient"
import * as Host from "effect/net/Host"
import * as NetAddress from "effect/net/NetAddress"
import * as NodeCrypto from "./NodeCrypto.ts"
import * as NodeDatagramSocket from "./NodeDatagramSocket.ts"
import * as NodeSocket from "./NodeSocket.ts"

/**
 * Options for the Node.js `DnsClient` service.
 *
 * **Details**
 *
 * No system files are read: spread the result of `DnsClient.parseResolvConf`
 * to use a `resolv.conf` file, and pass `Host.parseHostsFile` results as
 * `hosts`. `nameServers` defaults to the loopback addresses, like an empty
 * `resolv.conf`.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface Options {
  readonly nameServers?: ReadonlyArray<NetAddress.IpAddressInput | NetAddress.InetAddressInput> | undefined
  readonly search?: ReadonlyArray<Host.DomainNameInput> | undefined
  readonly ndots?: number | undefined
  readonly timeout?: Duration.Input | undefined
  readonly attempts?: number | undefined
  readonly rotate?: boolean | undefined
  readonly useTcp?: boolean | undefined
  readonly noAaaa?: boolean | undefined
  readonly udpPayloadSize?: number | undefined
  readonly hosts?: Host.HostsTable | undefined
}

const isScoped = (server: NetAddress.IpAddress | NetAddress.InetAddress): boolean =>
  NetAddress.isInetAddressV6(server) && server.scopeId !== 0

// Platform sockets cannot use IPv6 name servers with a scope ID.
const checkNameServers = Effect.fnUntraced(function*(
  nameServers: ReadonlyArray<NetAddress.IpAddressInput | NetAddress.InetAddressInput>
) {
  for (const input of nameServers) {
    const server = yield* Effect.fromResult(Dns.nameServerFromInput(input))
    if (isScoped(server)) {
      return yield* new NetAddress.NetAddressError({
        input,
        message: "IPv6 name servers with a scope ID are not supported"
      })
    }
  }
})

// Like `NodeDns`, clamp numeric options; NaN becomes the minimum.
const clamp = (value: number | undefined, min: number, max: number): number | undefined =>
  value === undefined ? undefined : value >= min ? Math.min(Math.floor(value), max) : min

const clampTimeout = (input: Duration.Input | undefined): Duration.Duration | undefined => {
  if (input === undefined) return undefined
  const millis = Duration.toMillis(input)
  return Duration.millis(millis >= 1 ? Math.min(millis, 2 ** 31 - 1) : 1)
}

const localNameServers = Arr.map(NetAddress.loopbackAddresses, (address) => NetAddress.inetAddressUnsafe(address, 53))

const normalizeOptions = Effect.fnUntraced(function*(options: Options) {
  const nameServers = options.nameServers ?? []
  yield* checkNameServers(nameServers)
  const search = options.search === undefined
    ? undefined
    : yield* Effect.forEach(options.search, (domain) => Effect.fromResult(Host.domainNameFromString(domain)))
  const normalized: DnsClient.MakeOptions & Omit<DnsClient.TransportUdpOptions, "udp" | "tcp"> & {
    readonly useTcp: boolean
  } = {
    nameServers: Arr.isReadonlyArrayNonEmpty(nameServers) ? nameServers : localNameServers,
    search,
    ndots: clamp(options.ndots, 0, 15),
    timeout: clampTimeout(options.timeout),
    attempts: clamp(options.attempts, 1, Number.MAX_SAFE_INTEGER),
    rotate: options.rotate,
    useTcp: options.useTcp ?? false,
    noAaaa: options.noAaaa,
    udpPayloadSize: clamp(options.udpPayloadSize, 512, 0xffff),
    hosts: options.hosts
  }
  return normalized
})

const udp: DnsClient.TransportUdpOptions["udp"] = (server, onError) =>
  NodeDatagramSocket.make({ connect: { address: server.address, port: server.port }, onError })

const tcp = (server: NetAddress.InetAddress) =>
  NodeSocket.makeNet({ host: NetAddress.formatIp(server.address), port: server.port })

/**
 * Creates a `DnsClient.Transport` that sends queries over UDP with
 * `node:dgram` sockets connected to the name server, and retries truncated
 * responses over `node:net` connections.
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
    checkNameServers(options.nameServers),
    DnsClient.makeTransportUdp({ ...options, udp, tcp }).pipe(Effect.provide(NodeCrypto.layer))
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
 * Creates a `DnsClient.Transport` that sends every query over a `node:net`
 * connection.
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
    checkNameServers(options.nameServers),
    DnsClient.makeTransportTcp({ ...options, tcp }).pipe(Effect.provide(NodeCrypto.layer))
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
 * Creates a Node.js `DnsClient` service, sending queries with
 * `makeTransportUdp`, or `makeTransportTcp` with `useTcp`.
 *
 * @stability experimental
 * @category constructors
 * @since 4.0.0
 */
export const make = Effect.fnUntraced(function*(options: Options = {}) {
  const config = yield* normalizeOptions(options)
  return yield* DnsClient.make(config).pipe(
    Effect.provideServiceEffect(
      DnsClient.Transport,
      config.useTcp ? makeTransportTcp(config) : makeTransportUdp(config)
    )
  )
})

/**
 * Layer that provides the Node.js `DnsClient` service.
 *
 * @see {@link make} for the behavior
 * @stability experimental
 * @category layers
 * @since 4.0.0
 */
export const layer = (
  options?: Options
): Layer.Layer<DnsClient.DnsClient, NetAddress.NetAddressError> => Layer.effect(DnsClient.DnsClient, make(options))

/**
 * Creates a layer that provides the Node.js `DnsClient` service with options
 * read from configuration.
 *
 * @stability experimental
 * @category layers
 * @since 4.0.0
 */
export const layerConfig = (
  options: Config.Wrap<Options>
): Layer.Layer<DnsClient.DnsClient, Config.ConfigError | NetAddress.NetAddressError> =>
  Layer.effect(DnsClient.DnsClient, Effect.flatMap(Config.unwrap(options), make))
