/**
 * Deno-backed implementation of Effect's `Dns` service.
 *
 * Address lookups use the operating system resolver through Deno's `node:dns`
 * compatibility layer, so they also read the hosts file. Record queries and
 * reverse lookups use `Deno.resolveDns` and can be cancelled by interruption.
 *
 * **Gotchas**
 *
 * `Deno.resolveDns` reports a query refused by the name server with the same
 * error as a missing name, so refused queries fail with `NotFound` instead of
 * `Refused`. Queries require the `--allow-net` permission.
 *
 * @since 4.0.0
 */
import * as NodeDns from "@effect/platform-node-shared/NodeDns"
import * as Config from "effect/Config"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Dns from "effect/net/Dns"
import * as Host from "effect/net/Host"
import * as NetAddress from "effect/net/NetAddress"

/**
 * Options for the Deno `Dns` service.
 *
 * **Details**
 *
 * `nameServer` replaces the system name server for record queries and reverse
 * lookups; an IP address without a port uses port 53. Address lookups always
 * use the operating system resolver.
 *
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

type Query = (name: string, options: Deno.ResolveDnsOptions) => Promise<ReadonlyArray<() => Dns.DnsRecord>>

// Deno.resolveDns returns names with a trailing dot, which record data omits.
const recordName = (name: string): Host.DomainName =>
  Host.domainNameFromStringUnsafe(name.length > 1 && name.endsWith(".") ? name.slice(0, -1) : name)

const queries: { readonly [K in Dns.RecordType]: Query } = {
  A: async (name, options) =>
    (await Deno.resolveDns(name, "A", options)).map((address) => () =>
      Dns.makeRecordUnsafe("A", { address: NetAddress.ipFromStringUnsafe(address) as NetAddress.Ipv4Address })
    ),
  AAAA: async (name, options) =>
    (await Deno.resolveDns(name, "AAAA", options)).map((address) => () =>
      Dns.makeRecordUnsafe("AAAA", { address: NetAddress.ipFromStringUnsafe(address) as NetAddress.Ipv6Address })
    ),
  CAA: async (name, options) =>
    (await Deno.resolveDns(name, "CAA", options)).map((caa) => () =>
      Dns.makeRecordUnsafe("CAA", { critical: caa.critical, tag: caa.tag, value: caa.value })
    ),
  CNAME: async (name, options) =>
    (await Deno.resolveDns(name, "CNAME", options)).map((target) => () =>
      Dns.makeRecordUnsafe("CNAME", { target: recordName(target) })
    ),
  MX: async (name, options) =>
    (await Deno.resolveDns(name, "MX", options)).map((mx) => () =>
      Dns.makeRecordUnsafe("MX", {
        exchange: recordName(mx.exchange),
        priority: mx.preference
      })
    ),
  NAPTR: async (name, options) =>
    (await Deno.resolveDns(name, "NAPTR", options)).map((naptr) => () =>
      Dns.makeRecordUnsafe("NAPTR", {
        order: naptr.order,
        preference: naptr.preference,
        flags: naptr.flags,
        service: naptr.services,
        regexp: naptr.regexp,
        replacement: recordName(naptr.replacement)
      })
    ),
  NS: async (name, options) =>
    (await Deno.resolveDns(name, "NS", options)).map((host) => () =>
      Dns.makeRecordUnsafe("NS", { host: recordName(host) })
    ),
  PTR: async (name, options) =>
    (await Deno.resolveDns(name, "PTR", options)).map((host) => () =>
      Dns.makeRecordUnsafe("PTR", { host: recordName(host) })
    ),
  SOA: async (name, options) =>
    (await Deno.resolveDns(name, "SOA", options)).map((soa) => () =>
      Dns.makeRecordUnsafe("SOA", {
        primary: recordName(soa.mname),
        admin: recordName(soa.rname),
        serial: soa.serial,
        refresh: Duration.seconds(soa.refresh),
        retry: Duration.seconds(soa.retry),
        expire: Duration.seconds(soa.expire),
        minimum: Duration.seconds(soa.minimum)
      })
    ),
  SRV: async (name, options) =>
    (await Deno.resolveDns(name, "SRV", options)).map((srv) => () =>
      Dns.makeRecordUnsafe("SRV", {
        target: recordName(srv.target),
        port: srv.port,
        priority: srv.priority,
        weight: srv.weight
      })
    ),
  TXT: async (name, options) =>
    (await Deno.resolveDns(name, "TXT", options)).map((chunks) => () =>
      Dns.makeRecordUnsafe("TXT", { chunks: chunks as unknown as readonly [string, ...Array<string>] })
    )
}

const convert = <A>(
  thunks: ReadonlyArray<() => A>,
  method: Dns.DnsError["method"],
  hostname: string,
  recordType?: Dns.RecordType
): Effect.Effect<Array<A>, Dns.DnsError> =>
  Effect.try({
    try: () => thunks.map((thunk) => thunk()),
    catch: (cause) => new Dns.DnsError({ reason: "InvalidResponse", method, hostname, recordType, cause })
  })

/**
 * Creates a Deno `Dns` service.
 *
 * @category constructors
 * @since 4.0.0
 */
export const make = (options?: Options): Dns.Dns => {
  const system = NodeDns.make()
  const server = options?.nameServer
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
  ): Effect.Effect<Array<Dns.DnsRecord>, Dns.DnsError> =>
    Effect.tryPromise({
      try: (signal) => queries[type](name, nameServer === undefined ? { signal } : { nameServer, signal }),
      catch: (cause) => toDnsError(cause, method, hostname, method === "resolve" ? type : undefined)
    }).pipe(Effect.flatMap((thunks) => convert(thunks, method, hostname, method === "resolve" ? type : undefined)))

  return Dns.make({
    lookup: (host, family) => system.lookup(host, { family }),
    resolve: (name, type) => query(name, type, "resolve", name),
    reverse: (address) =>
      query(Dns.reverseName(address), "PTR", "reverse", NetAddress.formatIp(address)).pipe(
        Effect.map((records) => records.flatMap((record) => record._tag === "PTR" ? [record.host] : []))
      )
  })
}

/**
 * Layer that provides the Deno `Dns` service using the system resolver
 * configuration.
 *
 * @category layers
 * @since 4.0.0
 */
export const layer: Layer.Layer<Dns.Dns> = Layer.sync(Dns.Dns, () => make())

/**
 * Layer that provides the Deno `Dns` service with options read from
 * configuration.
 *
 * @category layers
 * @since 4.0.0
 */
export const layerConfig = (options: Config.Wrap<Options>): Layer.Layer<Dns.Dns, Config.ConfigError> =>
  Layer.effect(Dns.Dns, Effect.map(Config.unwrap(options), make))
