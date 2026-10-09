/**
 * Node.js implementation of Effect's `DnsClient` service and its UDP and TCP
 * transports.
 *
 * Queries are sent with `node:dgram` sockets connected to the name server, so
 * the kernel drops packets from other addresses, and with `node:net`
 * connections for truncated responses or TCP-only transports. The system
 * configuration is read from `/etc/resolv.conf` when the service is created,
 * and the hosts file is read again at most every 5 seconds. Provide `Dns` from
 * the client with `DnsClient.layerDns`. Other runtimes reuse `systemOptions`
 * with their own transports.
 *
 * @stability experimental
 * @since 4.0.0
 */
import * as Arr from "effect/Array"
import * as Config from "effect/Config"
import type * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as Layer from "effect/Layer"
import * as DnsClient from "effect/net/DnsClient"
import type * as Host from "effect/net/Host"
import * as NetAddress from "effect/net/NetAddress"
import * as NodeCrypto from "./NodeCrypto.ts"
import * as NodeDatagramSocket from "./NodeDatagramSocket.ts"
import * as NodeFileSystem from "./NodeFileSystem.ts"
import * as NodeSocket from "./NodeSocket.ts"

/**
 * Options for the Node.js `DnsClient` service, overriding the system
 * configuration.
 *
 * **Details**
 *
 * `nameServers` replaces the system name servers; strings are parsed like
 * `DnsClient.nameServerFromString`, IP addresses without a port use port 53,
 * and an empty list keeps the system name servers. The other
 * options replace the matching `resolv.conf` values and are described by
 * `DnsClient.MakeOptions` and `DnsClient.TransportUdpOptions`.
 *
 * **Gotchas**
 *
 * Invalid name servers, and IPv6 name servers with a scope ID such as
 * link-local addresses, which the sockets cannot be bound to, fail with a
 * `NetAddress.NetAddressError` when the service is created. Name servers with
 * a scope ID in `resolv.conf` are skipped.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface Options {
  readonly nameServers?: ReadonlyArray<NetAddress.IpAddressInput | NetAddress.InetAddressInput> | undefined
  readonly search?: ReadonlyArray<Host.DomainName> | undefined
  readonly ndots?: number | undefined
  readonly timeout?: Duration.Input | undefined
  readonly attempts?: number | undefined
  readonly rotate?: boolean | undefined
  readonly udpPayloadSize?: number | undefined
}

const isScoped = (server: NetAddress.IpAddress | NetAddress.InetAddress): boolean =>
  NetAddress.isInetAddressV6(server) && server.scopeId !== 0

/**
 * Checks the name servers of a platform transport, failing for strings that
 * are not name server addresses and for IPv6 addresses with a scope ID, which
 * the sockets cannot be bound to.
 *
 * **Details**
 *
 * Strings are parsed like `DnsClient.nameServerFromString`. The transports of
 * other runtimes reuse this check.
 *
 * @stability experimental
 * @category validation
 * @since 4.0.0
 */
export const checkNameServers = Effect.fnUntraced(function*(
  nameServers: ReadonlyArray<NetAddress.IpAddressInput | NetAddress.InetAddressInput>
) {
  for (const input of nameServers) {
    const server = typeof input === "string" ? yield* Effect.fromResult(DnsClient.nameServerFromString(input)) : input
    if (isScoped(server)) {
      return yield* new NetAddress.NetAddressError({
        input,
        message: "IPv6 name servers with a scope ID are not supported"
      })
    }
  }
})

const hostsPath = typeof process !== "undefined" && process.platform === "win32"
  ? `${process.env.SystemRoot ?? "C:\\Windows"}\\System32\\drivers\\etc\\hosts`
  : "/etc/hosts"

// Used when the system configuration lists no name servers, like Go and glibc.
const localNameServers: Arr.NonEmptyReadonlyArray<NetAddress.InetAddress> = [
  NetAddress.inetAddressUnsafe(NetAddress.ipv4Loopback, 53),
  NetAddress.inetAddressUnsafe(NetAddress.ipv6Loopback, 53)
]

/**
 * Reads the system resolver configuration and hosts file with the
 * `FileSystem` service and combines them with options, returning the options
 * of `DnsClient.make` and the name servers and UDP payload size of a UDP
 * transport.
 *
 * **Details**
 *
 * `/etc/resolv.conf` is read once. Without name servers in the options or
 * the file, the local name servers `127.0.0.1` and `::1` are used. The
 * returned `hosts` effect reads the hosts file again when its last read is
 * more than 5 seconds old. Missing or unreadable files count as empty.
 *
 * **Gotchas**
 *
 * Windows has no `resolv.conf`; pass `nameServers` explicitly there.
 *
 * @stability experimental
 * @category constructors
 * @since 4.0.0
 */
export const systemOptions = Effect.fnUntraced(function*(options?: Options) {
  const fs = yield* FileSystem.FileSystem
  // Missing or unreadable files count as empty, like in glibc.
  const readFile = (path: string) => fs.readFileString(path).pipe(Effect.orElseSucceed(() => ""))
  const nameServers = options?.nameServers ?? []
  yield* checkNameServers(nameServers)
  const config = DnsClient.parseResolvConf(yield* readFile("/etc/resolv.conf"))
  const system = config.nameServers.filter((server) => !isScoped(server))
  const hosts = yield* Effect.cachedWithTTL(Effect.map(readFile(hostsPath), DnsClient.parseHosts), "5 seconds")
  const combined: DnsClient.MakeOptions & Omit<DnsClient.TransportUdpOptions, "udp" | "tcp"> = {
    nameServers: Arr.isReadonlyArrayNonEmpty(nameServers)
      ? nameServers
      : Arr.isReadonlyArrayNonEmpty(system)
      ? system
      : localNameServers,
    search: options?.search ?? config.search,
    ndots: options?.ndots ?? config.ndots,
    timeout: options?.timeout ?? config.timeout,
    attempts: options?.attempts ?? config.attempts,
    rotate: options?.rotate ?? config.rotate,
    udpPayloadSize: options?.udpPayloadSize,
    hosts
  }
  return combined
})

const udp = (server: NetAddress.InetAddress) =>
  NodeDatagramSocket.make({ connect: { address: server.address, port: server.port } })

const tcp = (server: NetAddress.InetAddress) =>
  NodeSocket.makeNet({ host: NetAddress.formatIp(server.address), port: server.port })

/**
 * Creates a `DnsClient.Transport` that sends queries over UDP with
 * `node:dgram` sockets connected to the name server, and retries truncated
 * responses over `node:net` connections.
 *
 * **Gotchas**
 *
 * IPv6 name servers with a scope ID fail with a `NetAddress.NetAddressError`.
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
 * **Gotchas**
 *
 * IPv6 name servers with a scope ID fail with a `NetAddress.NetAddressError`.
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
 * Creates a Node.js `DnsClient` service from the system configuration and
 * options, sending queries with `makeTransportUdp`.
 *
 * @stability experimental
 * @category constructors
 * @since 4.0.0
 */
export const make = Effect.fnUntraced(function*(options?: Options) {
  const config = yield* systemOptions(options).pipe(Effect.provide(NodeFileSystem.layer))
  return yield* DnsClient.make(config).pipe(Effect.provideServiceEffect(DnsClient.Transport, makeTransportUdp(config)))
})

/**
 * Layer that provides the Node.js `DnsClient` service using the system
 * resolver configuration.
 *
 * @stability experimental
 * @category layers
 * @since 4.0.0
 */
export const layer: Layer.Layer<DnsClient.DnsClient> = Layer.effect(DnsClient.DnsClient, Effect.orDie(make()))

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
