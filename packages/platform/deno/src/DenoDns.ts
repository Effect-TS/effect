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
 * **Gotchas**
 *
 * IPv6 name servers with a scope ID, such as link-local addresses, are not
 * supported; record queries and reverse lookups fail with `Unsupported`.
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

type Query = (name: string, options: Deno.ResolveDnsOptions) => Promise<ReadonlyArray<() => Dns.DnsRecord>>

const absoluteName = (name: string): string => name.endsWith(".") ? name : `${name}.`

const recordName = (name: string): Host.DomainName => Host.domainNameFromStringUnsafe(absoluteName(name))

const decoder = new TextDecoder()

// Deno.resolveDns decodes each byte of a TXT character string as one Latin-1
// character; re-decoding the bytes as UTF-8 matches other runtimes.
const utf8FromLatin1 = (value: string): string =>
  // oxlint-disable-next-line no-control-regex
  /[^\x00-\x7f]/.test(value) ? decoder.decode(Uint8Array.from(value, (character) => character.charCodeAt(0))) : value

// Deno.resolveDns reports SOA refresh, retry, and expire as signed 32-bit integers.
const uint32Seconds = (value: number): Duration.Duration => Duration.seconds(value >>> 0)

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
        admin: absoluteName(soa.rname),
        serial: soa.serial,
        refresh: uint32Seconds(soa.refresh),
        retry: uint32Seconds(soa.retry),
        expire: uint32Seconds(soa.expire),
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
      Dns.makeRecordUnsafe("TXT", {
        chunks: chunks.map(utf8FromLatin1) as unknown as readonly [string, ...Array<string>]
      })
    )
}

// Converts every record that can be represented and skips the rest, failing
// only when nothing could be converted.
const convert = <A>(
  thunks: ReadonlyArray<() => A>,
  method: Dns.DnsError["method"],
  hostname: string,
  recordType?: Dns.RecordType
): Effect.Effect<Array<A>, Dns.DnsError> =>
  Effect.suspend(() => {
    const out: Array<A> = []
    let failure: { readonly cause: unknown } | undefined
    for (const thunk of thunks) {
      try {
        out.push(thunk())
      } catch (cause) {
        failure ??= { cause }
      }
    }
    return out.length === 0 && failure !== undefined
      ? Effect.fail(new Dns.DnsError({ reason: "InvalidResponse", method, hostname, recordType, cause: failure.cause }))
      : Effect.succeed(out)
  })

/**
 * Creates a Deno `Dns` service.
 *
 * @stability experimental
 * @category constructors
 * @since 4.0.0
 */
export const make = (options?: Options): Dns.Dns["Service"] => {
  const server = options?.nameServer
  const nameServer: Deno.ResolveDnsOptions["nameServer"] = server === undefined
    ? undefined
    : NetAddress.isIpAddress(server)
    ? { ipAddr: NetAddress.formatIp(server), port: 53 }
    : { ipAddr: NetAddress.formatHost(server), port: server.port }

  const scoped = server !== undefined && NetAddress.isInetAddressV6(server) && server.scopeId !== 0

  const query = (
    name: string,
    type: Dns.RecordType,
    method: Dns.DnsError["method"],
    hostname: string
  ): Effect.Effect<Array<Dns.DnsRecord>, Dns.DnsError> => {
    const recordType = method === "resolve" ? type : undefined
    if (scoped) {
      return Effect.fail(
        new Dns.DnsError({
          reason: "Unsupported",
          method,
          hostname,
          recordType,
          cause: new NetAddress.NetAddressError({
            input: server,
            message: "IPv6 name servers with a scope ID are not supported"
          })
        })
      )
    }
    return Effect.tryPromise({
      try: (signal) => queries[type](name, nameServer === undefined ? { signal } : { nameServer, signal }),
      catch: (cause) => toDnsError(cause, method, hostname, recordType)
    }).pipe(Effect.flatMap((thunks) => convert(thunks, method, hostname, recordType)))
  }

  return Dns.make({
    lookup: NodeDns.lookup,
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
 * @stability experimental
 * @category layers
 * @since 4.0.0
 */
export const layer: Layer.Layer<Dns.Dns> = Layer.sync(Dns.Dns, () => make())

/**
 * Creates a layer that provides the Deno `Dns` service with options read
 * from configuration.
 *
 * @stability experimental
 * @category layers
 * @since 4.0.0
 */
export const layerConfig = (options: Config.Wrap<Options>): Layer.Layer<Dns.Dns, Config.ConfigError> =>
  Layer.effect(Dns.Dns, Effect.map(Config.unwrap(options), make))
