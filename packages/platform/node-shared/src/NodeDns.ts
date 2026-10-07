/**
 * Node-compatible implementation of Effect's `Dns` service.
 *
 * Address lookups use `dns.lookup`, which calls the operating system resolver
 * (`getaddrinfo`) and therefore also reads the hosts file. Record queries and
 * reverse lookups use a `dns.Resolver` per operation, so interrupting a query
 * cancels it.
 *
 * @stability unstable
 * @since 4.0.0
 */
import * as Config from "effect/Config"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Dns from "effect/net/Dns"
import * as Host from "effect/net/Host"
import * as NetAddress from "effect/net/NetAddress"
import * as NodeDns from "node:dns"

/**
 * Options for the Node.js `Dns` service.
 *
 * **Details**
 *
 * `nameServers` replaces the system name servers for record queries and
 * reverse lookups; IP addresses without a port use port 53. `timeout` is the
 * time allowed for each attempt and `tries` the number of attempts per name
 * server. Address lookups always use the operating system resolver.
 *
 * @stability unstable
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

// c-ares reports the root name, used by null MX and SRV records, as an empty string.
const rootIfEmpty = (name: string): string => name === "" ? "." : name

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
      return Dns.makeRecordUnsafe("CAA", { critical: caa.critical !== 0, tag, value: String((caa as any)[tag]) })
    }),
  CNAME: async (resolver, name) =>
    (await resolver.resolveCname(name)).map((target) => () =>
      Dns.makeRecordUnsafe("CNAME", { target: Host.domainNameFromStringUnsafe(target) })
    ),
  MX: async (resolver, name) =>
    (await resolver.resolveMx(name)).map((mx) => () =>
      Dns.makeRecordUnsafe("MX", {
        exchange: Host.domainNameFromStringUnsafe(rootIfEmpty(mx.exchange)),
        priority: mx.priority
      })
    ),
  NAPTR: async (resolver, name) =>
    (await resolver.resolveNaptr(name)).map((naptr) => () =>
      Dns.makeRecordUnsafe("NAPTR", {
        order: naptr.order,
        preference: naptr.preference,
        flags: naptr.flags,
        service: naptr.service,
        regexp: naptr.regexp,
        replacement: Host.domainNameFromStringUnsafe(rootIfEmpty(naptr.replacement))
      })
    ),
  NS: async (resolver, name) =>
    (await resolver.resolveNs(name)).map((host) => () =>
      Dns.makeRecordUnsafe("NS", { host: Host.domainNameFromStringUnsafe(host) })
    ),
  PTR: async (resolver, name) =>
    (await resolver.resolvePtr(name)).map((host) => () =>
      Dns.makeRecordUnsafe("PTR", { host: Host.domainNameFromStringUnsafe(host) })
    ),
  SOA: async (resolver, name) => {
    const soa = await resolver.resolveSoa(name)
    return [() =>
      Dns.makeRecordUnsafe("SOA", {
        primary: Host.domainNameFromStringUnsafe(soa.nsname),
        admin: Host.domainNameFromStringUnsafe(soa.hostmaster),
        serial: soa.serial,
        refresh: Duration.seconds(soa.refresh),
        retry: Duration.seconds(soa.retry),
        expire: Duration.seconds(soa.expire),
        minimum: Duration.seconds(soa.minttl)
      })]
  },
  SRV: async (resolver, name) =>
    (await resolver.resolveSrv(name)).map((srv) => () =>
      Dns.makeRecordUnsafe("SRV", {
        target: Host.domainNameFromStringUnsafe(rootIfEmpty(srv.name)),
        port: srv.port,
        priority: srv.priority,
        weight: srv.weight
      })
    ),
  TXT: async (resolver, name) =>
    (await resolver.resolveTxt(name)).map((chunks) => () =>
      Dns.makeRecordUnsafe("TXT", { chunks: chunks as unknown as readonly [string, ...Array<string>] })
    )
}

const toFamily = (family: NetAddress.IpFamily | undefined): 0 | 4 | 6 =>
  family === "IPv4" ? 4 : family === "IPv6" ? 6 : 0

const stripZone = (address: string): string => {
  const separator = address.indexOf("%")
  return separator === -1 ? address : address.slice(0, separator)
}

const convert = <A>(
  thunks: ReadonlyArray<() => A>,
  onError: (cause: unknown) => Dns.DnsError
): Effect.Effect<Array<A>, Dns.DnsError> => Effect.try({ try: () => thunks.map((thunk) => thunk()), catch: onError })

/**
 * Creates a Node.js `Dns` service.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const make = (options?: Options): Dns.Dns => {
  const resolverOptions: NodeDns.ResolverOptions = {
    ...(options?.timeout !== undefined && { timeout: Duration.toMillis(options.timeout) }),
    ...(options?.tries !== undefined && { tries: options.tries })
  }
  const servers = options?.nameServers?.map((server) =>
    NetAddress.isIpAddress(server) ? NetAddress.formatIp(server) : NetAddress.formatInet(server)
  )

  const withResolver = <A>(
    method: Dns.DnsError["method"],
    hostname: string,
    recordType: Dns.RecordType | undefined,
    query: (resolver: NodeDns.promises.Resolver) => Promise<A>
  ): Effect.Effect<A, Dns.DnsError> =>
    Effect.tryPromise({
      try: (signal) => {
        const resolver = new NodeDns.promises.Resolver(resolverOptions)
        if (servers !== undefined) resolver.setServers(servers)
        signal.addEventListener("abort", () => resolver.cancel(), { once: true })
        return query(resolver)
      },
      catch: (cause) => toDnsError(cause, method, hostname, recordType)
    })

  return Dns.make({
    lookup: (host, family) =>
      Effect.tryPromise({
        try: () => NodeDns.promises.lookup(host, { all: true, family: toFamily(family), order: "verbatim" }),
        catch: (cause) => toDnsError(cause, "lookup", host)
      }).pipe(Effect.flatMap((entries) =>
        convert(
          entries.map((entry) => () => NetAddress.ipFromStringUnsafe(stripZone(entry.address))),
          invalidResponse("lookup", host)
        )
      )),
    resolve: (name, type) =>
      withResolver("resolve", name, type, (resolver) => queries[type](resolver, name)).pipe(
        Effect.flatMap((thunks) => convert(thunks, invalidResponse("resolve", name, type)))
      ),
    reverse: (address) => {
      const hostname = NetAddress.formatIp(address)
      return withResolver("reverse", hostname, undefined, (resolver) => resolver.reverse(hostname)).pipe(
        Effect.flatMap((names) =>
          convert(
            names.map((name) => () => Host.domainNameFromStringUnsafe(name)),
            invalidResponse("reverse", hostname)
          )
        )
      )
    }
  })
}

/**
 * Layer that provides the Node.js `Dns` service using the system resolver
 * configuration.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layer: Layer.Layer<Dns.Dns> = Layer.sync(Dns.Dns, () => make())

/**
 * Layer that provides the Node.js `Dns` service with options read from
 * configuration.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layerConfig = (options: Config.Wrap<Options>): Layer.Layer<Dns.Dns, Config.ConfigError> =>
  Layer.effect(Dns.Dns, Effect.map(Config.unwrap(options), make))
