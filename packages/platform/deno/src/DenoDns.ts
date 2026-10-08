/**
 * Deno-backed implementation of Effect's `Dns` service.
 *
 * Address lookups use the operating system resolver through Deno's `node:dns`
 * compatibility layer, so they also read the hosts file. Record queries and
 * reverse lookups use `Deno.resolveDns` and can be cancelled by interruption.
 * Records whose data cannot be represented, such as names that are not valid
 * `Host.DomainName` values, are skipped.
 *
 * **Gotchas**
 *
 * `Deno.resolveDns` reports every error response from the name server with the
 * same error as a missing name, so refused queries and server failures
 * (`REFUSED`, `SERVFAIL`, `FORMERR`, `NOTIMP`) fail with `NotFound` instead of
 * `Refused`, `ServerFailure`, `InvalidResponse`, or `Unsupported`. Server
 * failures are therefore not reported as temporary. Queries require the
 * `--allow-net` permission.
 *
 * @stability experimental
 * @since 4.0.0
 */
import * as NodeDns from "@effect/platform-node-shared/NodeDns"
import * as Arr from "effect/Array"
import * as Config from "effect/Config"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Dns from "effect/net/Dns"
import * as NetAddress from "effect/net/NetAddress"
import * as Result from "effect/Result"

/**
 * Options for the Deno `Dns` service.
 *
 * **Details**
 *
 * `nameServer` replaces the system name server for record queries and reverse
 * lookups; an IP address without a port uses port 53. Address lookups always
 * use the operating system resolver.
 *
 * **Gotchas**
 *
 * IPv6 name servers with a scope ID, such as link-local addresses, are not
 * supported; creating the service fails with a `NetAddress.NetAddressError`.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface Options {
  readonly nameServer?: NetAddress.IpAddress | NetAddress.InetAddress | undefined
}

const reasons: Record<string, Dns.DnsErrorReason> = {
  NotFound: "NotFound",
  TimedOut: "Timeout",
  ConnectionRefused: "Refused",
  InvalidData: "InvalidResponse",
  NotSupported: "Unsupported"
}

const toDnsError = (
  cause: unknown,
  method: Dns.DnsError["method"],
  hostname: string,
  recordType?: Dns.RecordType
): Dns.DnsError =>
  new Dns.DnsError({
    reason: (cause instanceof Error ? reasons[cause.name] : undefined) ?? "Unknown",
    method,
    hostname,
    recordType,
    cause
  })

// Records whose data cannot be represented, such as names that are not valid
// `Host.DomainName` values, are skipped.
const queries: {
  readonly [K in Dns.RecordType]: (
    name: string,
    options: Deno.ResolveDnsOptions
  ) => Promise<Array<Dns.DnsRecord>>
} = {
  A: async (name, options) =>
    Arr.filterMap(await Deno.resolveDns(name, "A", options), (address) =>
      Result.try(() =>
        Dns.makeRecordUnsafe("A", {
          address: NetAddress.ipFromStringUnsafe(address) as NetAddress.Ipv4Address
        })
      )),
  AAAA: async (name, options) =>
    Arr.filterMap(
      await Deno.resolveDns(name, "AAAA", options),
      (address) =>
        Result.try(() =>
          Dns.makeRecordUnsafe("AAAA", {
            address: NetAddress.ipFromStringUnsafe(address) as NetAddress.Ipv6Address
          })
        )
    ),
  CAA: async (name, options) =>
    Arr.filterMap(await Deno.resolveDns(name, "CAA", options), (caa) =>
      Result.try(() =>
        Dns.makeRecordUnsafe("CAA", {
          critical: caa.critical,
          tag: caa.tag,
          value: caa.value
        })
      )),
  CNAME: async (name, options) =>
    Arr.filterMap(
      await Deno.resolveDns(name, "CNAME", options),
      (target) =>
        Result.try(() =>
          Dns.makeRecordUnsafe("CNAME", {
            target: NodeDns.domainNameFromResolverUnsafe(target)
          })
        )
    ),
  MX: async (name, options) =>
    Arr.filterMap(await Deno.resolveDns(name, "MX", options), (mx) =>
      Result.try(() =>
        Dns.makeRecordUnsafe("MX", {
          exchange: NodeDns.domainNameFromResolverUnsafe(mx.exchange),
          priority: mx.preference
        })
      )),
  NAPTR: async (name, options) =>
    Arr.filterMap(
      await Deno.resolveDns(name, "NAPTR", options),
      (naptr) =>
        Result.try(() =>
          Dns.makeRecordUnsafe("NAPTR", {
            order: naptr.order,
            preference: naptr.preference,
            flags: naptr.flags,
            service: naptr.services,
            regexp: naptr.regexp,
            replacement: NodeDns.domainNameFromResolverUnsafe(naptr.replacement)
          })
        )
    ),
  NS: async (name, options) =>
    Arr.filterMap(await Deno.resolveDns(name, "NS", options), (host) =>
      Result.try(() =>
        Dns.makeRecordUnsafe("NS", {
          host: NodeDns.domainNameFromResolverUnsafe(host)
        })
      )),
  PTR: async (name, options) =>
    Arr.filterMap(await Deno.resolveDns(name, "PTR", options), (host) =>
      Result.try(() =>
        Dns.makeRecordUnsafe("PTR", {
          host: NodeDns.nameTextFromResolver(host, 8)
        })
      )),
  SOA: async (name, options) =>
    Arr.filterMap(await Deno.resolveDns(name, "SOA", options), (soa) =>
      Result.try(() =>
        Dns.makeRecordUnsafe("SOA", {
          primary: NodeDns.domainNameFromResolverUnsafe(soa.mname),
          admin: NodeDns.nameTextFromResolver(soa.rname, 8),
          serial: soa.serial,
          refresh: NodeDns.secondsFromInt32(soa.refresh),
          retry: NodeDns.secondsFromInt32(soa.retry),
          expire: NodeDns.secondsFromInt32(soa.expire),
          minimum: Duration.seconds(soa.minimum)
        })
      )),
  SRV: async (name, options) =>
    Arr.filterMap(await Deno.resolveDns(name, "SRV", options), (srv) =>
      Result.try(() =>
        Dns.makeRecordUnsafe("SRV", {
          target: NodeDns.domainNameFromResolverUnsafe(srv.target),
          port: srv.port,
          priority: srv.priority,
          weight: srv.weight
        })
      )),
  TXT: async (name, options) =>
    Arr.filterMap(
      await Deno.resolveDns(name, "TXT", options),
      (chunks) =>
        Result.try(() =>
          Dns.makeRecordUnsafe("TXT", {
            chunks: chunks.map(NodeDns.utf8FromLatin1) as unknown as readonly [string, ...Array<string>]
          })
        )
    )
}

/**
 * Creates a Deno `Dns` service.
 *
 * @stability experimental
 * @category constructors
 * @since 4.0.0
 */
export const make = Effect.fnUntraced(function*(options?: Options) {
  const server = options?.nameServer
  if (server !== undefined && NetAddress.isInetAddressV6(server) && server.scopeId !== 0) {
    return yield* new NetAddress.NetAddressError({
      input: server,
      message: "IPv6 name servers with a scope ID are not supported"
    })
  }
  const nameServer: Deno.ResolveDnsOptions["nameServer"] = server === undefined
    ? undefined
    : NetAddress.isIpAddress(server)
    ? { ipAddr: NetAddress.formatIp(server), port: 53 }
    : { ipAddr: NetAddress.formatHost(server), port: server.port }

  const query = (
    name: string,
    type: Dns.RecordType,
    method: Dns.DnsError["method"],
    hostname: string
  ): Effect.Effect<Array<Dns.DnsRecord>, Dns.DnsError> => {
    const recordType = method === "resolve" ? type : undefined
    return Effect.tryPromise({
      try: (signal) => queries[type](name, nameServer === undefined ? { signal } : { nameServer, signal }),
      catch: (cause) => toDnsError(cause, method, hostname, recordType)
    })
  }

  return Dns.make({
    lookup: NodeDns.lookup,
    resolve: (name, type) => query(name, type, "resolve", name),
    reverse: (address) =>
      query(Dns.reverseName(address), "PTR", "reverse", NetAddress.formatIp(address)).pipe(
        Effect.map((records) => records.flatMap((record) => record._tag === "PTR" ? [record.host] : []))
      )
  })
})

/**
 * Layer that provides the Deno `Dns` service using the system resolver
 * configuration.
 *
 * @stability experimental
 * @category layers
 * @since 4.0.0
 */
export const layer: Layer.Layer<Dns.Dns> = Layer.effect(Dns.Dns, Effect.orDie(make()))

/**
 * Creates a layer that provides the Deno `Dns` service with options read
 * from configuration.
 *
 * @stability experimental
 * @category layers
 * @since 4.0.0
 */
export const layerConfig = (
  options: Config.Wrap<Options>
): Layer.Layer<Dns.Dns, Config.ConfigError | NetAddress.NetAddressError> =>
  Layer.effect(Dns.Dns, Effect.flatMap(Config.unwrap(options), make))
