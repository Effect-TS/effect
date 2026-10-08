/**
 * Node.js implementation of Effect's `DnsClient` service.
 *
 * Queries are sent with `node:dgram` sockets connected to the name server, so
 * the kernel drops packets from other addresses, and with `node:net`
 * connections for truncated responses. The system configuration is read from
 * `/etc/resolv.conf` when the service is created, and the hosts file is read
 * again at most every 5 seconds. Provide `Dns` from the client with
 * `DnsClient.layerDns`. Other runtimes reuse `systemOptions` with their own
 * sockets.
 *
 * @stability experimental
 * @since 4.0.0
 */
import * as Arr from "effect/Array"
import * as Config from "effect/Config"
import type * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as DnsClient from "effect/net/DnsClient"
import type * as Host from "effect/net/Host"
import * as NetAddress from "effect/net/NetAddress"
import * as Fs from "node:fs/promises"
import * as NodeDatagramSocket from "./NodeDatagramSocket.ts"
import * as NodeSocket from "./NodeSocket.ts"

/**
 * Options for the Node.js `DnsClient` service, overriding the system
 * configuration.
 *
 * **Details**
 *
 * `nameServers` replaces the system name servers; IP addresses without a port
 * use port 53, and an empty list keeps the system name servers. The other
 * options replace the matching `resolv.conf` values and are described by
 * `DnsClient.MakeOptions`.
 *
 * **Gotchas**
 *
 * IPv6 name servers with a scope ID, such as link-local addresses, are not
 * supported because the sockets cannot be bound to a zone; creating the
 * service fails with a `NetAddress.NetAddressError`. Such name servers in
 * `resolv.conf` are skipped.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface Options {
  readonly nameServers?: ReadonlyArray<NetAddress.IpAddress | NetAddress.InetAddress> | undefined
  readonly search?: ReadonlyArray<Host.DomainName> | undefined
  readonly ndots?: number | undefined
  readonly timeout?: Duration.Input | undefined
  readonly attempts?: number | undefined
  readonly rotate?: boolean | undefined
  readonly udpPayloadSize?: number | undefined
}

const isScoped = (server: NetAddress.IpAddress | NetAddress.InetAddress): boolean =>
  NetAddress.isInetAddressV6(server) && server.scopeId !== 0

// Missing or unreadable files count as empty, like in glibc.
const readFile = (path: string): Effect.Effect<string> =>
  Effect.promise(() => Fs.readFile(path, "utf8").catch(() => ""))

const hostsPath = typeof process !== "undefined" && process.platform === "win32"
  ? `${process.env.SystemRoot ?? "C:\\Windows"}\\System32\\drivers\\etc\\hosts`
  : "/etc/hosts"

// Used when the system configuration lists no name servers, like Go and glibc.
const localNameServers: Arr.NonEmptyReadonlyArray<NetAddress.InetAddress> = [
  NetAddress.inetAddressUnsafe(NetAddress.ipv4Loopback, 53),
  NetAddress.inetAddressUnsafe(NetAddress.ipv6Loopback, 53)
]

/**
 * Reads the system resolver configuration and hosts file and combines them
 * with options, returning everything `DnsClient.make` needs except the socket
 * constructors.
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
  const nameServers = options?.nameServers ?? []
  const scoped = nameServers.find(isScoped)
  if (scoped !== undefined) {
    return yield* new NetAddress.NetAddressError({
      input: scoped,
      message: "IPv6 name servers with a scope ID are not supported"
    })
  }
  const config = DnsClient.parseResolvConf(yield* readFile("/etc/resolv.conf"))
  const system = config.nameServers.filter((server) => !isScoped(server))
  const hosts = yield* Effect.cachedWithTTL(Effect.map(readFile(hostsPath), DnsClient.parseHosts), "5 seconds")
  const combined: Omit<DnsClient.MakeOptions, "udp" | "tcp"> = {
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

/**
 * Creates a Node.js `DnsClient` service from the system configuration and
 * options.
 *
 * @stability experimental
 * @category constructors
 * @since 4.0.0
 */
export const make = Effect.fnUntraced(function*(options?: Options) {
  return yield* DnsClient.make({
    ...yield* systemOptions(options),
    udp: (server) => NodeDatagramSocket.make({ connect: { address: server.address, port: server.port } }),
    tcp: (server) => NodeSocket.makeNet({ host: NetAddress.formatIp(server.address), port: server.port })
  })
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
