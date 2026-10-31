/**
 * Node.js implementation of the `DnsClient` service and its UDP and TCP
 * transports, with a `Dns` service built on them.
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
import * as Result from "effect/Result"
import * as NodeDnsApi from "node:dns"
import * as NodeCrypto from "./NodeCrypto.ts"
import * as NodeDatagramSocket from "./NodeDatagramSocket.ts"
import * as NodeSocket from "./NodeSocket.ts"

/**
 * Options for the Node.js `DnsClient` service and `layerDns`.
 *
 * **Details**
 *
 * `nameServers` defaults to the system name servers reported by `node:dns`,
 * without IPv6 addresses with a scope ID, or to the loopback addresses when
 * there are none. No system files are read: spread the result of
 * `DnsClient.parseResolvConf` to use a `resolv.conf` file, and pass
 * `Host.parseHostsFile` results as `hosts`. `search`, `ndots`, `noAaaa`, and
 * `hosts` are used by `layerDns` only.
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

// Platform sockets cannot use IPv6 name servers with a scope ID.
const checkNameServers = (
  nameServers: ReadonlyArray<NetAddress.IpAddressInput | NetAddress.InetAddressInput>
): Result.Result<void, NetAddress.NetAddressError> => {
  for (const input of nameServers) {
    const server = Dns.nameServerFromInput(input)
    if (Result.isFailure(server)) return Result.fail(server.failure)
    if (NetAddress.isScoped(server.success)) {
      return Result.fail(
        new NetAddress.NetAddressError({ input, message: "IPv6 name servers with a scope ID are not supported" })
      )
    }
  }
  return Result.void
}

// Like `NodeDns`, clamp numeric options; NaN becomes the minimum.
const clamp = (value: number | undefined, min: number, max: number): number | undefined =>
  value === undefined ? undefined : value >= min ? Math.min(Math.floor(value), max) : min

const clampTimeout = (input: Duration.Input | undefined): Duration.Duration | undefined => {
  if (input === undefined) return undefined
  const millis = Duration.toMillis(input)
  return Duration.millis(millis >= 1 ? Math.min(millis, 2 ** 31 - 1) : 1)
}

const localNameServers = Arr.map(NetAddress.loopbackAddresses, (address) => NetAddress.inetAddressUnsafe(address, 53))

// The system name servers of `node:dns`, without duplicates (Deno reports
// each one twice) and without IPv6 addresses with a scope ID, or the loopback
// addresses when there are none.
const systemNameServers: Effect.Effect<Arr.NonEmptyReadonlyArray<NetAddress.InetAddress>> = Effect.sync(() => {
  const servers = Arr.dedupe(
    NodeDnsApi.getServers().flatMap((input) => {
      const server = Result.getOrUndefined(Dns.nameServerFromString(input))
      return server === undefined || NetAddress.isScoped(server) ? [] : [server]
    })
  )
  return Arr.isReadonlyArrayNonEmpty(servers) ? servers : localNameServers
})

interface NormalizedOptions {
  readonly transport: Omit<DnsClient.TransportUdpOptions, "udp" | "tcp">
  readonly client: DnsClient.MakeOptions
  readonly dns: DnsClient.DnsOptions
  readonly useTcp: boolean
}

const normalizeOptions = Effect.fnUntraced(function*(options: Options) {
  const nameServers = options.nameServers ?? []
  yield* Effect.fromResult(checkNameServers(nameServers))
  const search = options.search === undefined
    ? undefined
    : yield* Effect.forEach(options.search, (domain) => Effect.fromResult(Host.domainNameFromString(domain)))
  const normalized: NormalizedOptions = {
    transport: {
      nameServers: Arr.isReadonlyArrayNonEmpty(nameServers) ? nameServers : yield* systemNameServers,
      udpPayloadSize: clamp(options.udpPayloadSize, 512, 0xffff)
    },
    client: {
      timeout: clampTimeout(options.timeout),
      attempts: clamp(options.attempts, 1, Number.MAX_SAFE_INTEGER),
      rotate: options.rotate
    },
    dns: {
      search,
      ndots: clamp(options.ndots, 0, 15),
      noAaaa: options.noAaaa,
      hosts: options.hosts
    },
    useTcp: options.useTcp ?? false
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
    Effect.fromResult(checkNameServers(options.nameServers)),
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
    Effect.fromResult(checkNameServers(options.nameServers)),
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

const makeClient = (config: NormalizedOptions) =>
  DnsClient.make(config.client).pipe(
    Effect.provideServiceEffect(
      DnsClient.Transport,
      config.useTcp ? makeTransportTcp(config.transport) : makeTransportUdp(config.transport)
    )
  )

/**
 * Creates a Node.js `DnsClient` service, sending queries with
 * `makeTransportUdp`, or `makeTransportTcp` with `useTcp`.
 *
 * @see {@link Options} for the options and their defaults
 * @stability experimental
 * @category constructors
 * @since 4.0.0
 */
export const make = (
  options: Options = {}
): Effect.Effect<DnsClient.DnsClient["Service"], NetAddress.NetAddressError> =>
  Effect.flatMap(normalizeOptions(options), makeClient)

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

/**
 * Layer that provides the `Dns` service by querying name servers with the
 * Node.js `DnsClient`, which it provides as well.
 *
 * **Details**
 *
 * This layer speaks DNS only, to the name servers in `options`, and reads no
 * system files. `NodeDns.layer` resolves names with the operating system
 * resolver instead, so it also uses the hosts file, mDNS, and whatever else
 * the system is configured with. Use this layer to control the name servers,
 * transports, and lookup settings, and `NodeDns.layer` to resolve names the
 * way the system does.
 *
 * @see {@link Options} for the options and their defaults
 * @see {@link DnsClient.layerDns} for the lookup behavior
 * @stability experimental
 * @category layers
 * @since 4.0.0
 */
export const layerDns = (
  options: Options = {}
): Layer.Layer<Dns.Dns | DnsClient.DnsClient, NetAddress.NetAddressError> =>
  Layer.unwrap(Effect.map(normalizeOptions(options), (config) =>
    DnsClient.layerDns(config.dns).pipe(
      Layer.provideMerge(Layer.effect(DnsClient.DnsClient, makeClient(config)))
    )))
