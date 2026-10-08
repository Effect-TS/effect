/**
 * Node.js implementation of Effect's `Dns` service.
 *
 * Address lookups use `dns.lookup` (exported as `lookup`), which calls the
 * operating system resolver (`getaddrinfo`) and therefore also reads the hosts
 * file. Record queries and reverse lookups use `makeResolver`, which sends DNS
 * queries with pooled `dns.Resolver` instances, each used by one operation at a
 * time, so interrupting a query cancels it. Records whose data cannot be
 * represented, such as names that are not valid `Host.DomainName` values, are
 * skipped. Node.js decodes each byte of TXT and CAA character strings as one
 * Latin-1 character; `make` decodes those bytes as UTF-8. Other runtimes that
 * implement `node:dns` reuse `lookup` or `makeResolver` and replace the rest.
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
import * as NodeDns from "node:dns"

/**
 * Options for the Node.js `Dns` service and `makeResolver`.
 *
 * **Details**
 *
 * `nameServers` replaces the system name servers; IP addresses without a port
 * use port 53, and an empty list keeps the system name servers. `timeout` is
 * the time allowed for each attempt and `tries` the number of attempts per name
 * server. Address lookups always use the operating system resolver and are not
 * affected.
 *
 * **Gotchas**
 *
 * IPv6 name servers with a scope ID, such as link-local addresses, are not
 * supported because the resolver drops the scope; record queries and reverse
 * lookups fail with `Unsupported`.
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

const toDnsError = (
  cause: unknown,
  method: Dns.DnsError["method"],
  hostname: string,
  recordType?: Dns.RecordType
): Dns.DnsError => {
  const code = typeof cause === "object" && cause !== null && "code" in cause ? String(cause.code) : undefined
  return new Dns.DnsError({
    reason: (code !== undefined ? reasons[code] : undefined) ?? "Unknown",
    method,
    hostname,
    recordType,
    cause
  })
}

const invalidResponse =
  (method: Dns.DnsError["method"], hostname: string, recordType?: Dns.RecordType) => (cause: unknown): Dns.DnsError =>
    new Dns.DnsError({ reason: "InvalidResponse", method, hostname, recordType, cause })

// c-ares writes names without the trailing dot and the root name as an empty string.
const absoluteName = (name: string): string => name === "" ? "." : name.endsWith(".") ? name : `${name}.`

const recordName = (name: string): Host.DomainName => Host.domainNameFromStringUnsafe(absoluteName(name))

// c-ares reports SOA refresh, retry, and expire as signed 32-bit integers.
const uint32Seconds = (value: number): Duration.Duration => Duration.seconds(value >>> 0)

const queries: {
  readonly [K in Dns.RecordType]: (
    resolver: NodeDns.promises.Resolver,
    name: string
  ) => Promise<ReadonlyArray<() => Dns.DnsRecord>>
} = {
  A: async (resolver, name) =>
    (await resolver.resolve4(name)).map((address) => () =>
      Dns.makeRecordUnsafe("A", { address: NetAddress.ipFromStringUnsafe(address) as NetAddress.Ipv4Address })
    ),
  AAAA: async (resolver, name) =>
    (await resolver.resolve6(name)).map((address) => () =>
      Dns.makeRecordUnsafe("AAAA", { address: NetAddress.ipFromStringUnsafe(address) as NetAddress.Ipv6Address })
    ),
  CAA: async (resolver, name) =>
    (await resolver.resolveCaa(name)).map((caa) => () => {
      const tag = Object.keys(caa).find((key) => key !== "critical" && key !== "type")
      if (tag === undefined) throw new Error("CAA record without a property tag")
      // Only the issuer critical flag (bit 7) is defined; other flag bits are reserved.
      return Dns.makeRecordUnsafe("CAA", {
        critical: (caa.critical & 0x80) !== 0,
        tag,
        value: String((caa as any)[tag])
      })
    }),
  CNAME: async (resolver, name) =>
    (await resolver.resolveCname(name)).map((target) => () =>
      Dns.makeRecordUnsafe("CNAME", { target: recordName(target) })
    ),
  MX: async (resolver, name) =>
    (await resolver.resolveMx(name)).map((mx) => () =>
      Dns.makeRecordUnsafe("MX", { exchange: recordName(mx.exchange), priority: mx.priority })
    ),
  NAPTR: async (resolver, name) =>
    (await resolver.resolveNaptr(name)).map((naptr) => () =>
      Dns.makeRecordUnsafe("NAPTR", {
        order: naptr.order,
        preference: naptr.preference,
        flags: naptr.flags,
        service: naptr.service,
        regexp: naptr.regexp,
        replacement: recordName(naptr.replacement)
      })
    ),
  NS: async (resolver, name) =>
    (await resolver.resolveNs(name)).map((host) => () => Dns.makeRecordUnsafe("NS", { host: recordName(host) })),
  PTR: async (resolver, name) =>
    (await resolver.resolvePtr(name)).map((host) => () => Dns.makeRecordUnsafe("PTR", { host: recordName(host) })),
  SOA: async (resolver, name) => {
    const soa = await resolver.resolveSoa(name)
    return [() =>
      Dns.makeRecordUnsafe("SOA", {
        primary: recordName(soa.nsname),
        admin: absoluteName(soa.hostmaster),
        serial: soa.serial,
        refresh: uint32Seconds(soa.refresh),
        retry: uint32Seconds(soa.retry),
        expire: uint32Seconds(soa.expire),
        minimum: Duration.seconds(soa.minttl)
      })]
  },
  SRV: async (resolver, name) =>
    (await resolver.resolveSrv(name)).map((srv) => () =>
      Dns.makeRecordUnsafe("SRV", {
        target: recordName(srv.name),
        port: srv.port,
        priority: srv.priority,
        weight: srv.weight
      })
    ),
  TXT: async (resolver, name) =>
    (await resolver.resolveTxt(name)).map((chunks) => () =>
      Dns.makeRecordUnsafe("TXT", { chunks: chunks as unknown as Arr.NonEmptyReadonlyArray<string> })
    )
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

// Converts every value that can be represented and skips the rest, failing only
// when nothing could be converted.
const convert = <A>(
  thunks: ReadonlyArray<() => A>,
  onError: (cause: unknown) => Dns.DnsError
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
    return out.length === 0 && failure !== undefined ? Effect.fail(onError(failure.cause)) : Effect.succeed(out)
  })

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
    catch: (cause) => toDnsError(cause, "lookup", host)
  }).pipe(Effect.flatMap((entries) =>
    convert(
      entries.map((entry) => () => NetAddress.ipFromStringUnsafe(stripZone(entry.address))),
      invalidResponse("lookup", host)
    )
  ))

const maxIdleResolvers = 8

/**
 * Creates record query and reverse lookup operations backed by the runtime's
 * `node:dns` module.
 *
 * **Details**
 *
 * Names in records are fully qualified, and TXT and CAA character strings are
 * returned as the runtime decodes them, without the UTF-8 correction that
 * `make` applies for Node.js. Pass the operations to `Dns.make`, together with
 * a lookup, to build a `Dns` service.
 *
 * @stability experimental
 * @category constructors
 * @since 4.0.0
 */
export const makeResolver = (options?: Options) => {
  const resolverOptions: NodeDns.ResolverOptions = {
    ...(options?.timeout !== undefined && { timeout: Duration.toMillis(options.timeout) }),
    ...(options?.tries !== undefined && { tries: options.tries })
  }
  const nameServers = options?.nameServers ?? []
  const scoped = nameServers.find((server) => NetAddress.isInetAddressV6(server) && server.scopeId !== 0)
  const servers = nameServers.length === 0 ?
    undefined :
    nameServers.map((server) =>
      NetAddress.isIpAddress(server) ? NetAddress.formatIp(server) : NetAddress.formatInet(server)
    )

  const idle: Array<NodeDns.promises.Resolver> = []
  const acquire = (): NodeDns.promises.Resolver => {
    const pooled = idle.pop()
    if (pooled !== undefined) return pooled
    const resolver = new NodeDns.promises.Resolver(resolverOptions)
    if (servers !== undefined) resolver.setServers(servers)
    return resolver
  }

  const withResolver = <A>(
    method: Dns.DnsError["method"],
    hostname: string,
    recordType: Dns.RecordType | undefined,
    query: (resolver: NodeDns.promises.Resolver) => Promise<A>
  ): Effect.Effect<A, Dns.DnsError> =>
    scoped !== undefined
      ? Effect.fail(
        new Dns.DnsError({
          reason: "Unsupported",
          method,
          hostname,
          recordType,
          cause: new NetAddress.NetAddressError({
            input: scoped,
            message: "IPv6 name servers with a scope ID are not supported"
          })
        })
      )
      : Effect.tryPromise({
        try: (signal) => {
          const resolver = acquire()
          const cancel = () => resolver.cancel()
          signal.addEventListener("abort", cancel, { once: true })
          return query(resolver).finally(() => {
            signal.removeEventListener("abort", cancel)
            if (idle.length < maxIdleResolvers) idle.push(resolver)
          })
        },
        catch: (cause) => toDnsError(cause, method, hostname, recordType)
      })

  return {
    resolve: (name: string, type: Dns.RecordType): Effect.Effect<Array<Dns.DnsRecord>, Dns.DnsError> =>
      withResolver("resolve", name, type, (resolver) => queries[type](resolver, name)).pipe(
        Effect.flatMap((thunks) => convert(thunks, invalidResponse("resolve", name, type)))
      ),
    reverse: (address: NetAddress.IpAddress): Effect.Effect<Array<Host.DomainName>, Dns.DnsError> => {
      const hostname = NetAddress.formatIp(address)
      return withResolver("reverse", hostname, undefined, (resolver) => resolver.resolvePtr(Dns.reverseName(address)))
        .pipe(
          Effect.flatMap((names) =>
            convert(names.map((name) => () => recordName(name)), invalidResponse("reverse", hostname))
          )
        )
    }
  }
}

const decoder = new TextDecoder()

const utf8FromLatin1 = (value: string): string =>
  // oxlint-disable-next-line no-control-regex
  /[^\x00-\x7f]/.test(value) ? decoder.decode(Uint8Array.from(value, (character) => character.charCodeAt(0))) : value

// Node.js decodes each byte of TXT and CAA character strings as one Latin-1
// character; decoding the bytes as UTF-8 matches other runtimes.
const utf8Strings = (record: Dns.DnsRecord): Dns.DnsRecord =>
  record._tag === "TXT"
    ? Dns.makeRecordUnsafe("TXT", { chunks: Arr.map(record.chunks, utf8FromLatin1) })
    : record._tag === "CAA"
    ? Dns.makeRecordUnsafe("CAA", { critical: record.critical, tag: record.tag, value: utf8FromLatin1(record.value) })
    : record

/**
 * Creates a Node.js `Dns` service.
 *
 * @stability experimental
 * @category constructors
 * @since 4.0.0
 */
export const make = (options?: Options): Dns.Dns["Service"] => {
  const resolver = makeResolver(options)
  return Dns.make({
    lookup,
    resolve: (name, type) => Effect.map(resolver.resolve(name, type), Arr.map(utf8Strings)),
    reverse: resolver.reverse
  })
}

/**
 * Layer that provides the Node.js `Dns` service using the system resolver
 * configuration.
 *
 * @stability experimental
 * @category layers
 * @since 4.0.0
 */
export const layer: Layer.Layer<Dns.Dns> = Layer.sync(Dns.Dns, () => make())

/**
 * Creates a layer that provides the Node.js `Dns` service with options read
 * from configuration.
 *
 * @stability experimental
 * @category layers
 * @since 4.0.0
 */
export const layerConfig = (options: Config.Wrap<Options>): Layer.Layer<Dns.Dns, Config.ConfigError> =>
  Layer.effect(Dns.Dns, Effect.map(Config.unwrap(options), make))
