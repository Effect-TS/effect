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
 * `Host.DomainName` values, are skipped, and a query fails with
 * `InvalidResponse` when every record is skipped. Node.js decodes each byte
 * of TXT and CAA character strings as one Latin-1 character; `make` decodes
 * those bytes as UTF-8. Other runtimes that implement `node:dns` reuse
 * `lookup`, `resolver`, and the conversions below, and assemble their own
 * service.
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
  // `getaddrinfo` reports SERVFAIL answers as `EAI_AGAIN`, and REFUSED,
  // FORMERR, and NOTIMP answers alike as `EAI_FAIL`.
  EAI_AGAIN: "Temporary",
  EAI_FAIL: "Refused",
  ESERVFAIL: "ServerFailure",
  EREFUSED: "Refused",
  ECONNREFUSED: "Refused",
  EBADNAME: "BadName",
  ENONAME: "BadName",
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
const encoder = new TextEncoder()

// A `\DDD` escape, a backslash escape of one character, or unescaped text.
const nameParts = /\\(\d{3})|\\(.)|[^\\]+|\\/gsu

/**
 * Converts a name returned by a resolver to fully qualified text, for names
 * that need not be host names, such as PTR targets and SOA mailboxes.
 *
 * **Details**
 *
 * Resolvers write bytes as `\DDD` escapes, c-ares in decimal (`radix` 10) and
 * `Deno.resolveDns` in octal (`radix` 8), and escape special characters with
 * a backslash, such as `\.` for a dot inside a label or `\(` for a
 * parenthesis. Decoding the bytes as UTF-8 and removing the escapes gives the
 * text of the name, keeping only the `\.` and `\\` escapes.
 *
 * @stability experimental
 * @category converting
 * @since 4.0.0
 */
export const nameTextFromResolver = (name: string, radix: 8 | 10 = 10): string => {
  if (!name.includes("\\")) return absoluteName(name)
  const bytes: Array<number> = []
  for (const [part, digits, escaped] of name.matchAll(nameParts)) {
    if (digits !== undefined) {
      const byte = Number.parseInt(digits, radix)
      if (byte === 46 || byte === 92) bytes.push(92)
      bytes.push(byte)
    } else if (escaped !== undefined) {
      if (escaped === "." || escaped === "\\") bytes.push(92)
      bytes.push(...encoder.encode(escaped))
    } else {
      bytes.push(...encoder.encode(part))
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

/**
 * Converts the entries of a resolver's answer to a query for `name` to records
 * of a record type, skipping entries whose data cannot be represented, such as
 * names that are not valid `Host.DomainName` values.
 *
 * **Details**
 *
 * When the answer has entries but every one is skipped, the conversion fails
 * with an `InvalidResponse` error whose cause is the first entry's failure,
 * rather than returning no records, which would be reported as `NotFound`.
 *
 * @stability experimental
 * @category converting
 * @since 4.0.0
 */
export const recordsFromResolver = <T extends Dns.RecordType, A>(
  name: string,
  type: T,
  entries: ReadonlyArray<A>,
  fields: (entry: A) => Dns.RecordFields<T>
): Result.Result<Array<Dns.RecordFor<T>>, Dns.DnsError> => {
  const records: Array<Dns.RecordFor<T>> = []
  let skipped: { readonly failure: unknown } | undefined
  for (const entry of entries) {
    const result = Result.try(() => Dns.makeRecordUnsafe(type, fields(entry)))
    if (Result.isSuccess(result)) {
      records.push(result.success)
    } else {
      skipped ??= result
    }
  }
  return records.length === 0 && skipped !== undefined
    ? Result.fail(
      new Dns.DnsError({
        reason: "InvalidResponse",
        method: "resolve",
        hostname: name,
        recordType: type,
        cause: skipped.failure
      })
    )
    : Result.succeed(records)
}

const queries: {
  readonly [K in Dns.RecordType]: (
    resolver: NodeDns.promises.Resolver,
    name: string
  ) => Promise<Result.Result<Array<Dns.DnsRecord>, Dns.DnsError>>
} = {
  A: async (resolver, name) =>
    recordsFromResolver(name, "A", await resolver.resolve4(name), (address) => ({
      address: NetAddress.ipFromStringUnsafe(address) as NetAddress.Ipv4Address
    })),
  AAAA: async (resolver, name) =>
    recordsFromResolver(name, "AAAA", await resolver.resolve6(name), (address) => ({
      address: NetAddress.ipFromStringUnsafe(address) as NetAddress.Ipv6Address
    })),
  CAA: async (resolver, name) =>
    recordsFromResolver(name, "CAA", await resolver.resolveCaa(name), (caa) => {
      const tag = Object.keys(caa).find((key) => key !== "critical" && key !== "type")
      if (tag === undefined) throw new Error("CAA record without a property tag")
      // Only the issuer critical flag (bit 7) is defined; other flag bits are reserved.
      return { critical: (caa.critical & 0x80) !== 0, tag, value: String((caa as any)[tag]) }
    }),
  CNAME: async (resolver, name) =>
    recordsFromResolver(name, "CNAME", await resolver.resolveCname(name), (target) => ({
      target: domainNameFromResolverUnsafe(target)
    })),
  MX: async (resolver, name) =>
    recordsFromResolver(name, "MX", await resolver.resolveMx(name), (mx) => ({
      exchange: domainNameFromResolverUnsafe(mx.exchange),
      priority: mx.priority
    })),
  NAPTR: async (resolver, name) =>
    recordsFromResolver(name, "NAPTR", await resolver.resolveNaptr(name), (naptr) => ({
      order: naptr.order,
      preference: naptr.preference,
      flags: naptr.flags,
      service: naptr.service,
      regexp: naptr.regexp,
      replacement: domainNameFromResolverUnsafe(naptr.replacement)
    })),
  NS: async (resolver, name) =>
    recordsFromResolver(name, "NS", await resolver.resolveNs(name), (host) => ({
      host: domainNameFromResolverUnsafe(host)
    })),
  PTR: async (resolver, name) =>
    recordsFromResolver(name, "PTR", await resolver.resolvePtr(name), (host) => ({
      host: nameTextFromResolver(host)
    })),
  SOA: async (resolver, name) =>
    recordsFromResolver(name, "SOA", [await resolver.resolveSoa(name)], (soa) => ({
      primary: domainNameFromResolverUnsafe(soa.nsname),
      admin: nameTextFromResolver(soa.hostmaster),
      serial: soa.serial,
      refresh: secondsFromInt32(soa.refresh),
      retry: secondsFromInt32(soa.retry),
      expire: secondsFromInt32(soa.expire),
      minimum: Duration.seconds(soa.minttl)
    })),
  SRV: async (resolver, name) =>
    recordsFromResolver(name, "SRV", await resolver.resolveSrv(name), (srv) => ({
      target: domainNameFromResolverUnsafe(srv.name),
      port: srv.port,
      priority: srv.priority,
      weight: srv.weight
    })),
  TXT: async (resolver, name) =>
    recordsFromResolver(name, "TXT", await resolver.resolveTxt(name), (chunks) => ({
      chunks: chunks as unknown as Arr.NonEmptyReadonlyArray<string>
    }))
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
 * Converts the entries returned by an address lookup, such as `dns.lookup`
 * with `all: true`, to IP addresses, keeping their order.
 *
 * **Details**
 *
 * IPv6 zones are dropped, and addresses that cannot be parsed are skipped.
 *
 * @stability experimental
 * @category converting
 * @since 4.0.0
 */
export const addressesFromLookup = (
  entries: ReadonlyArray<{ readonly address: string }>
): Array<NetAddress.IpAddress> =>
  Arr.filterMap(entries, (entry) => Result.try(() => NetAddress.ipFromStringUnsafe(stripZone(entry.address))))

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
    // `verbatim` keeps the system order on Node versions without `order`.
    try: () =>
      NodeDns.promises.lookup(host, { all: true, family: toFamily(family), order: "verbatim", verbatim: true }),
    catch: (cause) => dnsErrorFromCause(cause, "lookup", host)
  }).pipe(Effect.map(addressesFromLookup))

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
 * correction that `make` applies for Node.js. Records are converted with
 * `recordsFromResolver`.
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

  return (name: string, type: Dns.RecordType): Effect.Effect<Array<Dns.DnsRecord>, Dns.DnsError> =>
    Effect.tryPromise({
      try: () => queries[type](resolver, name),
      catch: (cause) => dnsErrorFromCause(cause, "resolve", name, type)
    }).pipe(Effect.flatMap(Effect.fromResult))
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
    resolve: (name, type) => Effect.map(resolve(name, type), Arr.map(utf8Strings))
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
