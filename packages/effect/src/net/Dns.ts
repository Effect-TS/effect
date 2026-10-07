/**
 * Network name resolution: the effectful path from host names to `NetAddress`
 * values, plus DNS record values and queries.
 *
 * Runtime packages provide the `Dns` service from the host platform's resolver.
 * `lookup` uses the operating system resolver (`getaddrinfo`), so it also reads
 * the hosts file and other system sources, not only DNS. `resolve` sends DNS
 * queries for a record type, and `reverse` looks up the names of an address.
 * {@link resolveInet} converts an unresolved `Host.HostPort` into concrete
 * internet addresses, skipping the lookup for numeric hosts.
 *
 * @stability unstable
 * @since 4.0.0
 */
import * as Arr from "../Array.ts"
import * as Context from "../Context.ts"
import * as Data from "../Data.ts"
import * as Duration from "../Duration.ts"
import * as Effect from "../Effect.ts"
import * as Equal from "../Equal.ts"
import * as Hash from "../Hash.ts"
import * as Inspectable from "../Inspectable.ts"
import * as Layer from "../Layer.ts"
import { hasProperty } from "../Predicate.ts"
import * as Random from "../Random.ts"
import * as Result from "../Result.ts"
import * as Host from "./Host.ts"
import * as NetAddress from "./NetAddress.ts"

const TypeId = "~effect/net/Dns" as const
const RecordTypeId = "~effect/net/Dns/DnsRecord" as const

// =============================================================================
// Records
// =============================================================================

interface RecordProto<Tag extends RecordType> extends Equal.Equal, Hash.Hash, Inspectable.Inspectable {
  readonly _tag: Tag
  readonly [RecordTypeId]: typeof RecordTypeId
}

/**
 * An IPv4 address record.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface A extends RecordProto<"A"> {
  readonly address: NetAddress.Ipv4Address
}

/**
 * An IPv6 address record.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface Aaaa extends RecordProto<"AAAA"> {
  readonly address: NetAddress.Ipv6Address
}

/**
 * A certification authority authorization record.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface Caa extends RecordProto<"CAA"> {
  readonly critical: boolean
  readonly tag: string
  readonly value: string
}

/**
 * A canonical name (alias) record.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface Cname extends RecordProto<"CNAME"> {
  readonly target: Host.DomainName
}

/**
 * A mail exchange record.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface Mx extends RecordProto<"MX"> {
  readonly exchange: Host.DomainName
  readonly priority: number
}

/**
 * A naming authority pointer record.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface Naptr extends RecordProto<"NAPTR"> {
  readonly order: number
  readonly preference: number
  readonly flags: string
  readonly service: string
  readonly regexp: string
  readonly replacement: Host.DomainName
}

/**
 * A name server record.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface Ns extends RecordProto<"NS"> {
  readonly host: Host.DomainName
}

/**
 * A pointer record, used for reverse lookups.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface Ptr extends RecordProto<"PTR"> {
  readonly host: Host.DomainName
}

/**
 * A start of authority record.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface Soa extends RecordProto<"SOA"> {
  readonly primary: Host.DomainName
  readonly admin: Host.DomainName
  readonly serial: number
  readonly refresh: Duration.Duration
  readonly retry: Duration.Duration
  readonly expire: Duration.Duration
  readonly minimum: Duration.Duration
}

/**
 * A service location record.
 *
 * @see {@link orderSrv} for ordering service records by priority and weight
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface Srv extends RecordProto<"SRV"> {
  readonly target: Host.DomainName
  readonly port: number
  readonly priority: number
  readonly weight: number
}

/**
 * A text record. DNS stores text as one or more character strings, which are
 * kept as separate chunks; protocols such as SPF read them joined, for example
 * with `record.chunks.join("")`.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface Txt extends RecordProto<"TXT"> {
  readonly chunks: Arr.NonEmptyReadonlyArray<string>
}

/**
 * Any supported DNS record value.
 *
 * **Details**
 *
 * Records are immutable values tagged by record type, compared and hashed by
 * their fields. They hold the record data only: owner names and TTLs are not
 * included because platform resolvers do not report them consistently. Names
 * returned by platform services are fully qualified and written without the
 * trailing dot.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export type DnsRecord = A | Aaaa | Caa | Cname | Mx | Naptr | Ns | Ptr | Soa | Srv | Txt

/**
 * The type of a DNS record, such as `"A"` or `"SRV"`.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export type RecordType = "A" | "AAAA" | "CAA" | "CNAME" | "MX" | "NAPTR" | "NS" | "PTR" | "SOA" | "SRV" | "TXT"

/**
 * The record value for a record type.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export type RecordFor<T extends RecordType> = Extract<DnsRecord, { readonly _tag: T }>

/**
 * The fields of a record type, without its `_tag`.
 *
 * @see {@link makeRecord}
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export type RecordFields<T extends RecordType> = Omit<RecordFor<T>, keyof RecordProto<T>>

/**
 * Every supported record type.
 *
 * @stability unstable
 * @category constants
 * @since 4.0.0
 */
export const recordTypes: Arr.NonEmptyReadonlyArray<RecordType> = [
  "A",
  "AAAA",
  "CAA",
  "CNAME",
  "MX",
  "NAPTR",
  "NS",
  "PTR",
  "SOA",
  "SRV",
  "TXT"
]

/**
 * Returns `true` when a value is a supported record type.
 *
 * @stability unstable
 * @category guards
 * @since 4.0.0
 */
export const isRecordType = (u: unknown): u is RecordType => recordTypes.includes(u as RecordType)

const isUint16 = (value: number): boolean => Number.isInteger(value) && value >= 0 && value <= 0xffff

const isUint32 = (value: number): boolean => Number.isInteger(value) && value >= 0 && value <= 0xffffffff

const isTimer = (value: Duration.Duration): boolean => Duration.isFinite(value) && !Duration.isNegative(value)

// Only constraints that the field types cannot express are checked here.
const invalidField = <T extends RecordType>(type: T, fields: RecordFields<T>): string | undefined => {
  const record = fields as RecordFields<RecordType> & Record<string, any>
  switch (type) {
    case "CAA":
      return /^[a-z0-9]+$/i.test(record.tag) ? undefined : "tag"
    case "MX":
      return isUint16(record.priority) ? undefined : "priority"
    case "NAPTR":
      return !isUint16(record.order) ? "order" : !isUint16(record.preference) ? "preference" : undefined
    case "SOA":
      return !isUint32(record.serial)
        ? "serial"
        : ["refresh", "retry", "expire", "minimum"].find((key) => !isTimer(record[key]))
    case "SRV":
      return ["port", "priority", "weight"].find((key) => !isUint16(record[key]))
    default:
      return undefined
  }
}

/**
 * Returns `true` when a value is a DNS record.
 *
 * @stability unstable
 * @category guards
 * @since 4.0.0
 */
export const isDnsRecord = (u: unknown): u is DnsRecord => hasProperty(u, RecordTypeId)

const RecordPrototype = {
  ...Inspectable.BaseProto,
  [RecordTypeId]: RecordTypeId,
  [Equal.symbol](this: DnsRecord, that: Equal.Equal): boolean {
    return isDnsRecord(that) && that._tag === this._tag &&
      Object.keys(this).every((key) => Equal.equals((this as any)[key], (that as any)[key]))
  },
  [Hash.symbol](this: DnsRecord): number {
    return Hash.structureKeys(this, Object.keys(this))
  },
  toString(this: DnsRecord): string {
    return formatRecord(this)
  },
  toJSON(this: DnsRecord): unknown {
    return { ...this }
  }
}

/**
 * Creates a checked DNS record of a record type from its fields.
 *
 * **Details**
 *
 * Only constraints that the field types cannot express are checked:
 * priorities, weights, and ports must be 16-bit unsigned integers, the SOA
 * serial must be a 32-bit unsigned integer, SOA timers must be finite and
 * non-negative, and CAA property tags must be alphanumeric.
 *
 * **Example** (Creating a service record)
 *
 * ```ts import.meta.vitest
 * import { Result } from "effect"
 * import { Dns, Host } from "effect/net"
 *
 * const record = Result.getOrThrow(Dns.makeRecord("SRV", {
 *   target: Host.domainNameFromStringUnsafe("db.internal"),
 *   port: 5432,
 *   priority: 10,
 *   weight: 5
 * }))
 * Dns.formatRecord(record) // => "SRV 10 5 5432 db.internal"
 * ```
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const makeRecord = <T extends RecordType>(
  type: T,
  fields: RecordFields<T>
): Result.Result<RecordFor<T>, NetAddress.NetAddressError> => {
  const field = invalidField(type, fields)
  if (field !== undefined) {
    return Result.fail(new NetAddress.NetAddressError({ input: fields, message: `invalid ${type} record ${field}` }))
  }
  const self = Object.assign(Object.create(RecordPrototype), { _tag: type }, fields)
  if (Array.isArray(self.chunks)) self.chunks = Object.freeze([...self.chunks])
  return Result.succeed(Object.freeze(self))
}

/**
 * Creates a trusted DNS record of a record type from its fields, throwing on
 * failure.
 *
 * @stability unstable
 * @category unsafe
 * @since 4.0.0
 */
export const makeRecordUnsafe = <T extends RecordType>(type: T, fields: RecordFields<T>): RecordFor<T> =>
  Result.getOrThrow(makeRecord(type, fields))

const encoder = new TextEncoder()

// Quotes a character string in DNS presentation format (RFC 1035, section 5.1):
// `"` and `\` are escaped, and bytes outside printable ASCII are written as `\DDD`.
const quote = (value: string): string => {
  let out = "\""
  for (const byte of encoder.encode(value)) {
    out += byte === 0x22 || byte === 0x5c
      ? `\\${String.fromCharCode(byte)}`
      : byte < 0x20 || byte > 0x7e
      ? `\\${byte.toString().padStart(3, "0")}`
      : String.fromCharCode(byte)
  }
  return out + "\""
}

/**
 * Formats a record in DNS presentation format, prefixed by its type.
 *
 * @stability unstable
 * @category encoding
 * @since 4.0.0
 */
export const formatRecord = (self: DnsRecord): string => {
  switch (self._tag) {
    case "A":
    case "AAAA":
      return `${self._tag} ${NetAddress.formatIp(self.address)}`
    case "CAA":
      return `CAA ${self.critical ? 128 : 0} ${self.tag} ${quote(self.value)}`
    case "CNAME":
      return `CNAME ${self.target}`
    case "MX":
      return `MX ${self.priority} ${self.exchange}`
    case "NAPTR":
      return `NAPTR ${self.order} ${self.preference} ${quote(self.flags)} ${quote(self.service)} ${
        quote(self.regexp)
      } ${self.replacement}`
    case "NS":
    case "PTR":
      return `${self._tag} ${self.host}`
    case "SOA":
      return `SOA ${self.primary} ${self.admin} ${self.serial} ${Duration.toSeconds(self.refresh)} ${
        Duration.toSeconds(self.retry)
      } ${Duration.toSeconds(self.expire)} ${Duration.toSeconds(self.minimum)}`
    case "SRV":
      return `SRV ${self.priority} ${self.weight} ${self.port} ${self.target}`
    case "TXT":
      return `TXT ${self.chunks.map(quote).join(" ")}`
  }
}

/**
 * Orders service records for connection attempts as described in RFC 2782.
 *
 * **Details**
 *
 * Records are sorted by ascending priority. Records with the same priority are
 * ordered by weighted random selection using the `Random` service, so records
 * with a higher weight tend to come first.
 *
 * @stability unstable
 * @category ordering
 * @since 4.0.0
 */
export const orderSrv = (
  records: Arr.NonEmptyReadonlyArray<Srv>
): Effect.Effect<Arr.NonEmptyReadonlyArray<Srv>> =>
  Effect.gen(function*() {
    const groups = new Map<number, Array<Srv>>()
    for (const record of records) {
      const group = groups.get(record.priority)
      if (group === undefined) groups.set(record.priority, [record])
      else group.push(record)
    }
    const ordered: Array<Srv> = []
    for (const priority of [...groups.keys()].sort((a, b) => a - b)) {
      const group = groups.get(priority)!
      const remaining = [
        ...group.filter((record) => record.weight === 0),
        ...group.filter((record) => record.weight > 0)
      ]
      while (remaining.length > 0) {
        const total = remaining.reduce((sum, record) => sum + record.weight, 0)
        const selected = yield* Random.nextIntBetween(0, total)
        let running = 0
        let index = 0
        for (; index < remaining.length - 1; index++) {
          running += remaining[index].weight
          if (running >= selected) break
        }
        ordered.push(remaining.splice(index, 1)[0])
      }
    }
    return ordered as unknown as Arr.NonEmptyReadonlyArray<Srv>
  })

/**
 * Returns the reverse-lookup domain name for an IP address, in `in-addr.arpa`
 * for IPv4 or `ip6.arpa` for IPv6.
 *
 * **Example** (Building reverse-lookup names)
 *
 * ```ts import.meta.vitest
 * import { Dns, NetAddress } from "effect/net"
 *
 * Dns.reverseName(NetAddress.ipFromStringUnsafe("192.0.2.1")) // => "1.2.0.192.in-addr.arpa"
 * ```
 *
 * @stability unstable
 * @category converting
 * @since 4.0.0
 */
export const reverseName = (address: NetAddress.IpAddress): Host.DomainName => {
  if (NetAddress.isIpv4Address(address)) {
    return `${[...NetAddress.ipv4ToOctets(address)].reverse().join(".")}.in-addr.arpa` as Host.DomainName
  }
  const nibbles: Array<string> = []
  for (const octet of NetAddress.ipv6ToOctets(address)) {
    nibbles.push((octet >> 4).toString(16), (octet & 0xf).toString(16))
  }
  return `${nibbles.reverse().join(".")}.ip6.arpa` as Host.DomainName
}

// =============================================================================
// Errors
// =============================================================================

/**
 * The normalized reason for a failed name resolution.
 *
 * **Details**
 *
 * - `NotFound`: no records were found, either because the name does not exist
 *   or because it has no records of the requested type or address family.
 *   Like Go's `DNSError.IsNotFound`, the two cases are not distinguished
 *   because not every platform resolver can tell them apart.
 * - `Timeout`, `Temporary`, and `ServerFailure`: transient failures that may
 *   succeed when retried.
 * - `Refused`: the server refused the query or could not be reached.
 * - `BadName`: the name was rejected as malformed.
 * - `InvalidResponse`: the platform returned data that could not be converted
 *   into record values.
 * - `Unsupported`: the platform does not support the operation or record type.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.0
 */
export type DnsErrorReason =
  | "NotFound"
  | "Timeout"
  | "Temporary"
  | "Refused"
  | "ServerFailure"
  | "BadName"
  | "InvalidResponse"
  | "Unsupported"
  | "Unknown"

/**
 * A failed lookup, query, or reverse lookup.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.0
 */
export class DnsError extends Data.TaggedError("DnsError")<{
  readonly reason: DnsErrorReason
  readonly method: "lookup" | "resolve" | "reverse"
  readonly hostname: string
  readonly recordType?: RecordType | undefined
  readonly cause?: unknown
}> {
  /**
   * Formats the reason, operation, and name of the failed resolution.
   *
   * @since 4.0.0
   */
  override get message(): string {
    return `${this.reason}: Dns.${this.method} (${this.hostname}${
      this.recordType === undefined ? "" : ` ${this.recordType}`
    })`
  }

  /**
   * Whether the failure is transient and the operation may succeed if retried.
   *
   * @since 4.0.0
   */
  get isTemporary(): boolean {
    return this.reason === "Timeout" || this.reason === "Temporary" || this.reason === "ServerFailure"
  }
}

// =============================================================================
// Service
// =============================================================================

/**
 * The address family requested from a lookup.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export type Family = "any" | "ipv4" | "ipv6"

/**
 * Options for address lookups.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface LookupOptions {
  readonly family?: Family | undefined
}

/**
 * Service that resolves names to addresses, queries DNS records, and looks up
 * the names of addresses.
 *
 * **Details**
 *
 * Every operation either returns at least one result or fails with a
 * {@link DnsError}.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface Dns {
  readonly [TypeId]: typeof TypeId

  /**
   * Looks up the addresses of a host name with the operating system resolver,
   * keeping the system's preferred order.
   */
  lookup(
    host: Host.DomainName,
    options: { readonly family: "ipv4" }
  ): Effect.Effect<Arr.NonEmptyReadonlyArray<NetAddress.Ipv4Address>, DnsError>
  lookup(
    host: Host.DomainName,
    options: { readonly family: "ipv6" }
  ): Effect.Effect<Arr.NonEmptyReadonlyArray<NetAddress.Ipv6Address>, DnsError>
  lookup(
    host: Host.DomainName,
    options?: LookupOptions
  ): Effect.Effect<Arr.NonEmptyReadonlyArray<NetAddress.IpAddress>, DnsError>

  /**
   * Queries DNS records of one type.
   */
  resolve<T extends RecordType>(
    name: Host.DomainName,
    type: T
  ): Effect.Effect<Arr.NonEmptyReadonlyArray<RecordFor<T>>, DnsError>

  /**
   * Looks up the host names of an address.
   */
  reverse(address: NetAddress.IpAddress): Effect.Effect<Arr.NonEmptyReadonlyArray<Host.DomainName>, DnsError>
}

/**
 * Service tag for the {@link Dns} service.
 *
 * @stability unstable
 * @category services
 * @since 4.0.0
 */
export const Dns: Context.Service<Dns, Dns> = Context.Service("effect/net/Dns")

const matchesFamily = (address: NetAddress.IpAddress, family: Family): boolean =>
  family === "any" || (family === "ipv4" ? NetAddress.isIpv4Address(address) : NetAddress.isIpv6Address(address))

const dedupe = <A>(values: ReadonlyArray<A>): Array<A> => {
  const out: Array<A> = []
  for (const value of values) {
    if (!out.some((existing) => Equal.equals(existing, value))) out.push(value)
  }
  return out
}

const nonEmptyOrNotFound = <A>(
  values: ReadonlyArray<A>,
  error: () => DnsError
): Effect.Effect<Arr.NonEmptyReadonlyArray<A>, DnsError> =>
  Arr.isReadonlyArrayNonEmpty(values) ? Effect.succeed(values) : Effect.fail(error())

/**
 * Creates a `Dns` service from platform resolver operations.
 *
 * **Details**
 *
 * The constructor filters lookups by the requested address family, keeps only
 * records of the requested type, removes duplicates, and turns empty results
 * into `NotFound` failures.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const make = (impl: {
  readonly lookup: (
    host: Host.DomainName,
    family: Family
  ) => Effect.Effect<ReadonlyArray<NetAddress.IpAddress>, DnsError>
  readonly resolve: (name: Host.DomainName, type: RecordType) => Effect.Effect<ReadonlyArray<DnsRecord>, DnsError>
  readonly reverse: (address: NetAddress.IpAddress) => Effect.Effect<ReadonlyArray<Host.DomainName>, DnsError>
}): Dns => ({
  [TypeId]: TypeId,
  lookup: (host, options) => {
    const family = options?.family ?? "any"
    return Effect.flatMap(
      impl.lookup(host, family),
      (addresses) =>
        nonEmptyOrNotFound(
          dedupe(addresses.filter((address) => matchesFamily(address, family))),
          () => new DnsError({ reason: "NotFound", method: "lookup", hostname: host })
        )
    ) as any
  },
  resolve: (name, type) =>
    Effect.flatMap(
      impl.resolve(name, type),
      (records) =>
        nonEmptyOrNotFound(
          dedupe(records.filter((record) => record._tag === type)),
          () => new DnsError({ reason: "NotFound", method: "resolve", hostname: name, recordType: type })
        )
    ) as any,
  reverse: (address) =>
    Effect.flatMap(
      impl.reverse(address),
      (names) =>
        nonEmptyOrNotFound(
          dedupe(names),
          () => new DnsError({ reason: "NotFound", method: "reverse", hostname: NetAddress.formatIp(address) })
        )
    )
})

// =============================================================================
// Conversion to NetAddress
// =============================================================================

/**
 * Options for resolving endpoints to internet addresses.
 *
 * **Details**
 *
 * `scopeIds` maps network interface names to IPv6 scope IDs for hosts with a
 * named zone such as `fe80::1%eth0`. It can be built with
 * `NetAddress.scopeIdsFromInterfaces`. Numeric zones need no map.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface ResolveOptions extends LookupOptions {
  readonly scopeIds?: ReadonlyMap<string, number> | undefined
}

const literalInet = <A extends NetAddress.InetAddress>(
  address: A,
  family: Family
): Effect.Effect<Arr.NonEmptyReadonlyArray<A>, DnsError> =>
  matchesFamily(address.address, family)
    ? Effect.succeed([address])
    : Effect.fail(new DnsError({ reason: "NotFound", method: "lookup", hostname: NetAddress.formatHost(address) }))

/**
 * Resolves an endpoint to every matching internet address.
 *
 * **Details**
 *
 * - An `InetAddress` is returned as-is.
 * - A `Host.HostPort` with a numeric IP host is converted without a lookup.
 * - A `Host.HostPort` with a scoped IPv6 literal is converted without a
 *   lookup, mapping a named zone through the `scopeIds` option.
 * - A `Host.HostPort` with a domain name is looked up with `Dns.lookup`, and the
 *   port is attached to every address.
 *
 * Results keep the resolver's order and are filtered by the requested family.
 *
 * **Example** (Resolving an endpoint with a static resolver)
 *
 * ```ts import.meta.vitest
 * import { Effect } from "effect"
 * import { Dns, Host, NetAddress } from "effect/net"
 *
 * const program = Dns.resolveInet(Host.hostPortFromStringUnsafe("db.internal:5432")).pipe(
 *   Effect.map((addresses) => addresses.map(NetAddress.formatInet)),
 *   Effect.provide(Dns.layerStatic({
 *     hosts: { "db.internal": [NetAddress.ipFromStringUnsafe("10.0.0.5")] }
 *   }))
 * )
 *
 * await Effect.runPromise(program) // => ["10.0.0.5:5432"]
 * ```
 *
 * @stability unstable
 * @category converting
 * @since 4.0.0
 */
export const resolveInet: {
  (
    target: NetAddress.InetAddress | Host.HostPort,
    options: ResolveOptions & { readonly family: "ipv4" }
  ): Effect.Effect<
    Arr.NonEmptyReadonlyArray<NetAddress.InetAddressV4>,
    DnsError | NetAddress.NetAddressError,
    Dns
  >
  (
    target: NetAddress.InetAddress | Host.HostPort,
    options: ResolveOptions & { readonly family: "ipv6" }
  ): Effect.Effect<
    Arr.NonEmptyReadonlyArray<NetAddress.InetAddressV6>,
    DnsError | NetAddress.NetAddressError,
    Dns
  >
  (
    target: NetAddress.InetAddress | Host.HostPort,
    options?: ResolveOptions
  ): Effect.Effect<
    Arr.NonEmptyReadonlyArray<NetAddress.InetAddress>,
    DnsError | NetAddress.NetAddressError,
    Dns
  >
} = (target: NetAddress.InetAddress | Host.HostPort, options?: ResolveOptions) =>
  Effect.gen(function*() {
    const family = options?.family ?? "any"
    if (NetAddress.isInetAddress(target)) {
      return yield* literalInet(target, family)
    }
    const { host, port } = target
    if (NetAddress.isIpAddress(host)) {
      return yield* literalInet(yield* Effect.fromResult(NetAddress.inetAddress(host, port)), family)
    }
    if (host.includes("%")) {
      return yield* literalInet(
        yield* Effect.fromResult(NetAddress.inetAddressFromHostString(host, port, options?.scopeIds)),
        family
      )
    }
    const dns = yield* Dns
    const addresses = yield* dns.lookup(host as Host.DomainName, { family })
    return Arr.map(addresses, (address) => NetAddress.inetAddressUnsafe(address, port))
  }) as any

/**
 * Resolves an endpoint to every matching socket address, passing Unix-domain
 * addresses through unchanged.
 *
 * @see {@link resolveInet} for the internet address rules
 * @stability unstable
 * @category converting
 * @since 4.0.0
 */
export const resolveSocketAddress = (
  target: NetAddress.SocketAddress | Host.HostPort,
  options?: ResolveOptions
): Effect.Effect<
  Arr.NonEmptyReadonlyArray<NetAddress.SocketAddress>,
  DnsError | NetAddress.NetAddressError,
  Dns
> => NetAddress.isUnixPathAddress(target) ? Effect.succeed([target]) : resolveInet(target, options)

// =============================================================================
// Static resolver
// =============================================================================

/**
 * Fixed names, addresses, and records for a static resolver.
 *
 * **Details**
 *
 * `hosts` works like a hosts file: its entries are used by `lookup` and
 * `reverse`, but not by `resolve`. `records` holds DNS records by owner name and
 * is used by all three operations. Names are normalized like
 * `Host.domainNameFromString`, and a trailing dot is ignored.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface StaticZone {
  readonly hosts?: { readonly [name: string]: ReadonlyArray<NetAddress.IpAddress> } | undefined
  readonly records?: { readonly [name: string]: ReadonlyArray<DnsRecord> } | undefined
}

interface StaticEntry {
  readonly addresses: Array<NetAddress.IpAddress>
  readonly records: Array<DnsRecord>
}

const maxAliasDepth = 8

const zoneKey = (name: string): string => name.length > 1 && name.endsWith(".") ? name.slice(0, -1) : name

/**
 * Creates a `Dns` service that answers from fixed data.
 *
 * **When to use**
 *
 * Use to test code that depends on `Dns`, or to provide fixed names on
 * platforms without a resolver.
 *
 * **Details**
 *
 * Lookups and A or AAAA queries follow CNAME records up to eight times. Unknown
 * names fail with `NotFound`.
 *
 * @see {@link layerStatic}
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const makeStatic = (zone: StaticZone): Result.Result<Dns, NetAddress.NetAddressError> => {
  const entries = new Map<string, StaticEntry>()
  const entry = (name: string): Result.Result<StaticEntry, NetAddress.NetAddressError> =>
    Result.map(Host.domainNameFromString(name), (domain) => {
      const key = zoneKey(domain)
      let current = entries.get(key)
      if (current === undefined) {
        current = { addresses: [], records: [] }
        entries.set(key, current)
      }
      return current
    })

  for (const [name, addresses] of Object.entries(zone.hosts ?? {})) {
    const result = entry(name)
    if (Result.isFailure(result)) return Result.fail(result.failure)
    for (const address of addresses) {
      if (!NetAddress.isIpAddress(address)) {
        return Result.fail(new NetAddress.NetAddressError({ input: address, message: "expected an IP address" }))
      }
      result.success.addresses.push(address)
    }
  }
  for (const [name, records] of Object.entries(zone.records ?? {})) {
    const result = entry(name)
    if (Result.isFailure(result)) return Result.fail(result.failure)
    for (const record of records) {
      if (!isDnsRecord(record)) {
        return Result.fail(new NetAddress.NetAddressError({ input: record, message: "expected a DNS record" }))
      }
      result.success.records.push(record)
    }
  }

  const notFound = (method: DnsError["method"], hostname: string, recordType?: RecordType) =>
    Effect.fail(new DnsError({ reason: "NotFound", method, hostname, recordType }))

  const follow = <A>(
    name: string,
    collect: (entry: StaticEntry) => ReadonlyArray<A>,
    onMissing: () => Effect.Effect<never, DnsError>
  ): Effect.Effect<ReadonlyArray<A>, DnsError> => {
    let key = zoneKey(name)
    for (let depth = 0; depth <= maxAliasDepth; depth++) {
      const current = entries.get(key)
      if (current === undefined) return onMissing()
      const values = collect(current)
      if (values.length > 0) return Effect.succeed(values)
      const alias = current.records.find((record): record is Cname => record._tag === "CNAME")
      if (alias === undefined) return Effect.succeed([])
      key = zoneKey(alias.target)
    }
    return Effect.succeed([])
  }

  return Result.succeed(make({
    lookup: (host) =>
      follow(
        host,
        (entry) => [
          ...entry.addresses,
          ...entry.records.flatMap((record) => record._tag === "A" || record._tag === "AAAA" ? [record.address] : [])
        ],
        () => notFound("lookup", host)
      ),
    resolve: (name, type) =>
      type === "A" || type === "AAAA"
        ? follow(name, (entry) =>
          entry.records.filter((record) => record._tag === type), () =>
          notFound("resolve", name, type))
        : Effect.suspend(() => {
          const current = entries.get(zoneKey(name))
          return current === undefined
            ? notFound("resolve", name, type)
            : Effect.succeed(current.records.filter((record) =>
              record._tag === type
            ))
        }),
    reverse: (address) =>
      Effect.suspend(() => {
        const names: Array<Host.DomainName> = []
        for (const [name, current] of entries) {
          if (current.addresses.some((candidate) => Equal.equals(candidate, address))) {
            names.push(name as Host.DomainName)
          }
        }
        const pointers = entries.get(reverseName(address))
        if (pointers !== undefined) {
          for (const record of pointers.records) {
            if (record._tag === "PTR") names.push(record.host)
          }
        }
        return names.length === 0 ? notFound("reverse", NetAddress.formatIp(address)) : Effect.succeed(names)
      })
  }))
}

/**
 * Layer that provides a `Dns` service answering from fixed data.
 *
 * @see {@link makeStatic} for the resolution rules
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layerStatic = (zone: StaticZone): Layer.Layer<Dns, NetAddress.NetAddressError> =>
  Layer.effect(Dns, Effect.fromResult(makeStatic(zone)))
