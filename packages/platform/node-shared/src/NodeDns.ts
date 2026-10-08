/**
 * Node.js implementation of Effect's `Dns` service.
 *
 * Address lookups use `lookup`, which calls the operating system resolver
 * (`getaddrinfo`) through `dns.lookup` and therefore also reads the hosts file.
 * Record queries and reverse lookups use the `resolve` function created by
 * `resolver`, which sends DNS queries with one shared `dns.Resolver`.
 * Node.js cannot cancel a single query, so an interrupted query keeps running
 * until it is answered or times out, and its result is discarded; closing the
 * service's scope cancels the queries that are still running. Records whose
 * data cannot be represented, such as names that are not valid
 * `Host.DomainName` values, are skipped. Node.js decodes each byte of TXT and
 * CAA character strings as one Latin-1 character; `make` decodes those bytes as
 * UTF-8. Other runtimes that implement `node:dns` reuse `lookup` or
 * `resolver` and assemble their own service.
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
import * as Host from "effect/net/Host"
import * as NetAddress from "effect/net/NetAddress"
import * as Result from "effect/Result"
import * as NodeDns from "node:dns"

/**
 * Options for the Node.js `Dns` service and `resolver`.
 *
 * **Details**
 *
 * `nameServers` replaces the system name servers; IP addresses without a port
 * use port 53, and an empty list keeps the system name servers. `timeout` is
 * the time allowed for each attempt and `tries` the number of attempts per name
 * server. Address lookups always use the operating system resolver and are not
 * affected.
 *
 * `timeout` is rounded up to whole milliseconds and `tries` down to a whole
 * number, and both are clamped to 1 through 2^31 - 1, so `Duration.infinity`
 * uses the longest timeout the resolver supports.
 *
 * **Gotchas**
 *
 * IPv6 name servers with a scope ID, such as link-local addresses, are not
 * supported because the resolver drops the scope; creating the service fails
 * with a `NetAddress.NetAddressError`.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface Options {
  readonly nameServers?: ReadonlyArray<NetAddress.IpAddress | NetAddress.InetAddress> | undefined
  readonly timeout?: Duration.Input | undefined
  readonly tries?: number | undefined
}

const reasons: Record<string, Dns.DnsErrorReason> = {
  ENOTFOUND: "NotFound",
  ENODATA: "NotFound",
  ETIMEOUT: "Timeout",
  EAI_AGAIN: "Temporary",
  ESERVFAIL: "ServerFailure",
  EREFUSED: "Refused",
  ECONNREFUSED: "Refused",
  EBADNAME: "BadName",
  EBADFAMILY: "BadName",
  EBADQUERY: "BadName",
  EFORMERR: "InvalidResponse",
  EBADRESP: "InvalidResponse",
  ENOTIMP: "Unsupported"
}

/**
 * Converts a failure of `node:dns` or of Bun's DNS functions to a
 * `Dns.DnsError`, choosing the reason from the error's `code`.
 *
 * **Details**
 *
 * Bun prefixes c-ares codes with `DNS_`, such as `DNS_ENOTFOUND`; the prefix is
 * ignored. Errors without a known code get the reason `Unknown`.
 *
 * @stability experimental
 * @category converting
 * @since 4.0.0
 */
export const dnsErrorFromCause = (
  cause: unknown,
  method: Dns.DnsError["method"],
  hostname: string,
  recordType?: Dns.RecordType
): Dns.DnsError => {
  const code = typeof cause === "object" && cause !== null && "code" in cause
    ? String(cause.code).replace(/^DNS_/, "")
    : undefined
  return new Dns.DnsError({
    reason: (code !== undefined ? reasons[code] : undefined) ?? "Unknown",
    method,
    hostname,
    recordType,
    cause
  })
}

// Resolvers write names without the trailing dot, and c-ares writes the root
// name as an empty string.
const absoluteName = (name: string): string => name.endsWith(".") ? name : `${name}.`

/**
 * Converts a name returned by a resolver to a fully qualified
 * `Host.DomainName`, throwing when it is not a valid domain name.
 *
 * @stability experimental
 * @category converting
 * @since 4.0.0
 */
export const domainNameFromResolverUnsafe = (name: string): Host.DomainName =>
  Host.domainNameFromStringUnsafe(absoluteName(name))

const decoder = new TextDecoder()

/**
 * Converts a name returned by a resolver to fully qualified text, for names
 * that need not be host names, such as PTR targets and SOA mailboxes.
 *
 * **Details**
 *
 * Resolvers escape dots and backslashes inside a label as `\.` and `\\`,
 * and write other bytes as `\DDD` escapes: c-ares in decimal (`radix` 10) and
 * `Deno.resolveDns` in octal (`radix` 8). Decoding those bytes as UTF-8 gives
 * the text of the name, keeping only the dot and backslash escapes.
 *
 * @stability experimental
 * @category converting
 * @since 4.0.0
 */
export const nameTextFromResolver = (name: string, radix: 8 | 10 = 10): string => {
  if (!/\\\d{3}/.test(name)) return absoluteName(name)
  const bytes: Array<number> = []
  for (let i = 0; i < name.length; i++) {
    const code = name.charCodeAt(i)
    if (code !== 92 || i + 1 === name.length) {
      bytes.push(code)
    } else if (/^\d{3}$/.test(name.slice(i + 1, i + 4))) {
      const byte = Number.parseInt(name.slice(i + 1, i + 4), radix)
      if (byte === 46 || byte === 92) bytes.push(92)
      bytes.push(byte)
      i += 3
    } else {
      bytes.push(code, name.charCodeAt(i + 1))
      i++
    }
  }
  return absoluteName(decoder.decode(Uint8Array.from(bytes)))
}

/**
 * Converts a number of seconds that a resolver reports as a signed 32-bit
 * integer, such as the SOA refresh, retry, and expire intervals, to a
 * `Duration`.
 *
 * @stability experimental
 * @category converting
 * @since 4.0.0
 */
export const secondsFromInt32 = (value: number): Duration.Duration => Duration.seconds(value >>> 0)

/**
 * Decodes a string that holds one byte per character as UTF-8.
 *
 * **Details**
 *
 * Node.js and `Deno.resolveDns` decode each byte of TXT and CAA character
 * strings as one Latin-1 character; decoding the bytes as UTF-8 matches other
 * runtimes. Strings with only ASCII characters are returned unchanged.
 *
 * @stability experimental
 * @category converting
 * @since 4.0.0
 */
export const utf8FromLatin1 = (value: string): string =>
  // oxlint-disable-next-line no-control-regex
  /[^\x00-\x7f]/.test(value) ? decoder.decode(Uint8Array.from(value, (character) => character.charCodeAt(0))) : value

// Records whose data cannot be represented, such as names that are not valid
// `Host.DomainName` values, are skipped.
const queries: {
  readonly [K in Dns.RecordType]: (resolver: NodeDns.promises.Resolver, name: string) => Promise<Array<Dns.DnsRecord>>
} = {
  A: async (resolver, name) =>
    Arr.filterMap(await resolver.resolve4(name), (address) =>
      Result.try(() =>
        Dns.makeRecordUnsafe("A", {
          address: NetAddress.ipFromStringUnsafe(address) as NetAddress.Ipv4Address
        })
      )),
  AAAA: async (resolver, name) =>
    Arr.filterMap(await resolver.resolve6(name), (address) =>
      Result.try(() =>
        Dns.makeRecordUnsafe("AAAA", {
          address: NetAddress.ipFromStringUnsafe(address) as NetAddress.Ipv6Address
        })
      )),
  CAA: async (resolver, name) =>
    Arr.filterMap(await resolver.resolveCaa(name), (caa) =>
      Result.try(() => {
        const tag = Object.keys(caa).find((key) => key !== "critical" && key !== "type")
        if (tag === undefined) throw new Error("CAA record without a property tag")
        // Only the issuer critical flag (bit 7) is defined; other flag bits are reserved.
        return Dns.makeRecordUnsafe("CAA", {
          critical: (caa.critical & 0x80) !== 0,
          tag,
          value: String((caa as any)[tag])
        })
      })),
  CNAME: async (resolver, name) =>
    Arr.filterMap(await resolver.resolveCname(name), (target) =>
      Result.try(() =>
        Dns.makeRecordUnsafe("CNAME", {
          target: domainNameFromResolverUnsafe(target)
        })
      )),
  MX: async (resolver, name) =>
    Arr.filterMap(await resolver.resolveMx(name), (mx) =>
      Result.try(() =>
        Dns.makeRecordUnsafe("MX", {
          exchange: domainNameFromResolverUnsafe(mx.exchange),
          priority: mx.priority
        })
      )),
  NAPTR: async (resolver, name) =>
    Arr.filterMap(await resolver.resolveNaptr(name), (naptr) =>
      Result.try(() =>
        Dns.makeRecordUnsafe("NAPTR", {
          order: naptr.order,
          preference: naptr.preference,
          flags: naptr.flags,
          service: naptr.service,
          regexp: naptr.regexp,
          replacement: domainNameFromResolverUnsafe(naptr.replacement)
        })
      )),
  NS: async (resolver, name) =>
    Arr.filterMap(await resolver.resolveNs(name), (host) =>
      Result.try(() =>
        Dns.makeRecordUnsafe("NS", {
          host: domainNameFromResolverUnsafe(host)
        })
      )),
  PTR: async (resolver, name) =>
    Arr.filterMap(await resolver.resolvePtr(name), (host) =>
      Result.try(() =>
        Dns.makeRecordUnsafe("PTR", {
          host: nameTextFromResolver(host)
        })
      )),
  SOA: async (resolver, name) =>
    Arr.filterMap([await resolver.resolveSoa(name)], (soa) =>
      Result.try(() =>
        Dns.makeRecordUnsafe("SOA", {
          primary: domainNameFromResolverUnsafe(soa.nsname),
          admin: nameTextFromResolver(soa.hostmaster),
          serial: soa.serial,
          refresh: secondsFromInt32(soa.refresh),
          retry: secondsFromInt32(soa.retry),
          expire: secondsFromInt32(soa.expire),
          minimum: Duration.seconds(soa.minttl)
        })
      )),
  SRV: async (resolver, name) =>
    Arr.filterMap(await resolver.resolveSrv(name), (srv) =>
      Result.try(() =>
        Dns.makeRecordUnsafe("SRV", {
          target: domainNameFromResolverUnsafe(srv.name),
          port: srv.port,
          priority: srv.priority,
          weight: srv.weight
        })
      )),
  TXT: async (resolver, name) =>
    Arr.filterMap(await resolver.resolveTxt(name), (chunks) =>
      Result.try(() =>
        Dns.makeRecordUnsafe("TXT", {
          chunks: chunks as unknown as Arr.NonEmptyReadonlyArray<string>
        })
      ))
}

/**
 * Converts an IP family to the numeric family used by `dns.lookup`, with `0`
 * for addresses of either family.
 *
 * @stability experimental
 * @category converting
 * @since 4.0.0
 */
export const toFamily = (family: NetAddress.IpFamily | undefined): 0 | 4 | 6 =>
  family === "IPv4" ? 4 : family === "IPv6" ? 6 : 0

const stripZone = (address: string): string => {
  const separator = address.indexOf("%")
  return separator === -1 ? address : address.slice(0, separator)
}

/**
 * Looks up the addresses of a host name with `dns.lookup`, keeping the order
 * returned by the operating system resolver.
 *
 * @stability experimental
 * @category resolving
 * @since 4.0.0
 */
export const lookup = (
  host: string,
  family?: NetAddress.IpFamily | undefined
): Effect.Effect<Array<NetAddress.IpAddress>, Dns.DnsError> =>
  Effect.tryPromise({
    try: async () => {
      // `verbatim` keeps the system order on Node versions without `order`.
      const entries = await NodeDns.promises.lookup(host, {
        all: true,
        family: toFamily(family),
        order: "verbatim",
        verbatim: true
      })

      return Arr.filterMap(
        entries,
        (entry) => Result.try(() => NetAddress.ipFromStringUnsafe(stripZone(entry.address)))
      )
    },
    catch: (cause) => dnsErrorFromCause(cause, "lookup", host)
  })

// `dns.Resolver` throws for `timeout` and `tries` values that are not 32-bit
// integers, and for `tries` below 1. Values below 1, including `NaN`, become 1.
const resolverInt = (value: number): number => value >= 1 ? Math.min(value, 2 ** 31 - 1) : 1

/**
 * Creates a function that queries DNS records with the runtime's `node:dns`
 * module.
 *
 * **Details**
 *
 * All queries share one `dns.Resolver`, which is cancelled when the scope
 * closes. Names in records are fully qualified, and TXT and CAA character
 * strings are returned as the runtime decodes them, without the UTF-8
 * correction that `make` applies for Node.js. Failures are reported for
 * `method` and `hostname`, which default to a `resolve` of `name`; pass
 * `"reverse"` and the address when querying the PTR records of a reverse
 * lookup.
 *
 * @stability experimental
 * @category constructors
 * @since 4.0.0
 */
export const resolver = Effect.fnUntraced(function*(options?: Options) {
  const resolverOptions: NodeDns.ResolverOptions = {
    ...(options?.timeout !== undefined && { timeout: resolverInt(Math.ceil(Duration.toMillis(options.timeout))) }),
    ...(options?.tries !== undefined && { tries: resolverInt(Math.floor(options.tries)) })
  }
  const nameServers = options?.nameServers ?? []
  const scoped = nameServers.find((server) => NetAddress.isInetAddressV6(server) && server.scopeId !== 0)

  if (scoped !== undefined) {
    return yield* new NetAddress.NetAddressError({
      input: scoped,
      message: "IPv6 name servers with a scope ID are not supported"
    })
  }

  // Node.js can only cancel every query of a resolver, so all queries share one
  // resolver and closing the scope cancels those still running.
  const resolver = yield* Effect.acquireRelease(
    Effect.sync(() => {
      const resolver = new NodeDns.promises.Resolver(resolverOptions)
      if (nameServers.length > 0) {
        resolver.setServers(
          nameServers.map((server) =>
            NetAddress.isIpAddress(server) ? NetAddress.formatIp(server) : NetAddress.formatInet(server)
          )
        )
      }
      return resolver
    }),
    (resolver) => Effect.sync(() => resolver.cancel())
  )

  return (
    name: string,
    type: Dns.RecordType,
    method: "resolve" | "reverse" = "resolve",
    hostname: string = name
  ): Effect.Effect<Array<Dns.DnsRecord>, Dns.DnsError> =>
    Effect.tryPromise({
      try: () => queries[type](resolver, name),
      catch: (cause) => dnsErrorFromCause(cause, method, hostname, method === "resolve" ? type : undefined)
    })
})

// Node.js decodes each byte of TXT and CAA character strings as one Latin-1
// character; decoding the bytes as UTF-8 matches other runtimes.
const utf8Strings = (record: Dns.DnsRecord): Dns.DnsRecord => {
  switch (record._tag) {
    case "TXT":
      return Dns.makeRecordUnsafe("TXT", {
        chunks: Arr.map(record.chunks, utf8FromLatin1)
      })
    case "CAA":
      return Dns.makeRecordUnsafe("CAA", {
        critical: record.critical,
        tag: record.tag,
        value: utf8FromLatin1(record.value)
      })
    default:
      return record
  }
}

/**
 * Creates a Node.js `Dns` service whose resolver lives as long as the scope.
 *
 * @stability experimental
 * @category constructors
 * @since 4.0.0
 */
export const make = Effect.fnUntraced(function*(options?: Options) {
  const resolve = yield* resolver(options)
  return Dns.make({
    lookup,
    resolve: (name, type) => Effect.map(resolve(name, type), Arr.map(utf8Strings)),
    reverse: (address) =>
      resolve(Dns.reverseName(address), "PTR", "reverse", NetAddress.formatIp(address)).pipe(
        Effect.map(Arr.flatMap((record) => record._tag === "PTR" ? [record.host] : []))
      )
  })
})

/**
 * Layer that provides the Node.js `Dns` service using the system resolver
 * configuration.
 *
 * @stability experimental
 * @category layers
 * @since 4.0.0
 */
export const layer: Layer.Layer<Dns.Dns> = Layer.effect(Dns.Dns, Effect.orDie(make()))

/**
 * Creates a layer that provides the Node.js `Dns` service with options read
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
