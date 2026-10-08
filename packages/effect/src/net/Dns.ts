/**
 * Name resolution and DNS queries: the effectful path from host names to
 * `NetAddress` values, plus DNS record values.
 *
 * `lookup` resolves a host name to the addresses used to connect to it,
 * `resolve` queries DNS records of one type, and `reverse` looks up the names
 * of an address. Runtime packages provide the `Dns` service from the host
 * platform's resolver, whose `lookup` uses the operating system resolver
 * (`getaddrinfo`) and therefore also reads the hosts file and other system
 * sources, not only DNS. `AddressResolver` builds on `lookup` to resolve
 * `host:port` endpoints.
 *
 * @stability experimental
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
import * as Result from "../Result.ts"
import * as Host from "./Host.ts"
import * as NetAddress from "./NetAddress.ts"

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
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface A extends RecordProto<"A"> {
  readonly address: NetAddress.Ipv4Address
}

/**
 * An IPv6 address record.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface Aaaa extends RecordProto<"AAAA"> {
  readonly address: NetAddress.Ipv6Address
}

/**
 * A certification authority authorization record.
 *
 * @stability experimental
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
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface Cname extends RecordProto<"CNAME"> {
  readonly target: Host.DomainName
}

/**
 * A mail exchange record.
 *
 * @stability experimental
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
 * @stability experimental
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
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface Ns extends RecordProto<"NS"> {
  readonly host: Host.DomainName
}

/**
 * A pointer record, used for reverse lookups.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface Ptr extends RecordProto<"PTR"> {
  readonly host: Host.DomainName
}

/**
 * A start of authority record.
 *
 * **Details**
 *
 * `admin` is the administrator mailbox written as a domain name, such as
 * `hostmaster.example.com`. A dot inside the mailbox's local part is escaped,
 * as in `john\.doe.example.com`, so `admin` is a plain string rather than a
 * `Host.DomainName`.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface Soa extends RecordProto<"SOA"> {
  readonly primary: Host.DomainName
  readonly admin: string
  readonly serial: number
  readonly refresh: Duration.Duration
  readonly retry: Duration.Duration
  readonly expire: Duration.Duration
  readonly minimum: Duration.Duration
}

/**
 * A service location record.
 *
 * @stability experimental
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
 * **Details**
 *
 * Platform services decode each character string as UTF-8, replacing bytes
 * that are not valid UTF-8 with U+FFFD, and `formatRecord` writes chunks back
 * as UTF-8 bytes.
 *
 * @stability experimental
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
 * returned by platform services are fully qualified and end with a dot, so
 * passing them back to the resolver does not apply search domains.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export type DnsRecord = A | Aaaa | Caa | Cname | Mx | Naptr | Ns | Ptr | Soa | Srv | Txt

/**
 * The type of a DNS record, such as `"A"` or `"SRV"`.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export type RecordType = "A" | "AAAA" | "CAA" | "CNAME" | "MX" | "NAPTR" | "NS" | "PTR" | "SOA" | "SRV" | "TXT"

/**
 * The record value for a record type.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export type RecordFor<T extends RecordType> = Extract<DnsRecord, { readonly _tag: T }>

/**
 * The fields of a record type, without its `_tag`.
 *
 * @see {@link makeRecord}
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export type RecordFields<T extends RecordType> = T extends RecordType ? Omit<RecordFor<T>, keyof RecordProto<T>>
  : never

const isUint16 = (u: unknown): boolean => Number.isInteger(u) && (u as number) >= 0 && (u as number) <= 0xffff

const isUint32 = (u: unknown): boolean => Number.isInteger(u) && (u as number) >= 0 && (u as number) <= 0xffffffff

const isString = (u: unknown): u is string => typeof u === "string"

// SOA timers are 32-bit unsigned counts of seconds on the wire.
const isTimer = (u: unknown): boolean =>
  Duration.isDuration(u) && Duration.isFinite(u) && isUint32(Duration.toSeconds(u))

// The fields of every record type, in canonical order, with their checks.
const recordFields: {
  readonly [K in RecordType]: { readonly [F in keyof RecordFields<K>]-?: (u: unknown) => boolean }
} = {
  A: { address: NetAddress.isIpv4Address },
  AAAA: { address: NetAddress.isIpv6Address },
  CAA: {
    critical: (u) => typeof u === "boolean",
    tag: (u) => isString(u) && /^[a-z0-9]+$/i.test(u),
    value: isString
  },
  CNAME: { target: Host.isDomainName },
  MX: { exchange: Host.isDomainName, priority: isUint16 },
  NAPTR: {
    order: isUint16,
    preference: isUint16,
    flags: isString,
    service: isString,
    regexp: isString,
    replacement: Host.isDomainName
  },
  NS: { host: Host.isDomainName },
  PTR: { host: Host.isDomainName },
  SOA: {
    primary: Host.isDomainName,
    admin: (u) => isString(u) && u.length > 0,
    serial: isUint32,
    refresh: isTimer,
    retry: isTimer,
    expire: isTimer,
    minimum: isTimer
  },
  SRV: { target: Host.isDomainName, port: isUint16, priority: isUint16, weight: isUint16 },
  TXT: { chunks: (u) => Array.isArray(u) && u.length > 0 && u.every(isString) }
}

/**
 * Every supported record type.
 *
 * @stability experimental
 * @category constants
 * @since 4.0.0
 */
export const recordTypes: Arr.NonEmptyReadonlyArray<RecordType> = Object.keys(recordFields) as Array<any> as any

/**
 * Returns `true` when a value is a supported record type.
 *
 * @stability experimental
 * @category guards
 * @since 4.0.0
 */
export const isRecordType = (u: unknown): u is RecordType => recordTypes.includes(u as RecordType)

/**
 * Returns `true` when a value is a DNS record.
 *
 * @stability experimental
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
 * Every field is checked at runtime: addresses must belong to the record's
 * address family, names must be normalized domain names, priorities, weights,
 * and ports must be 16-bit unsigned integers, the SOA serial and timers must be
 * 32-bit unsigned integers (the timers in whole seconds), TXT records need at
 * least one chunk, and CAA property tags must be alphanumeric. Fields that do
 * not belong to the record type are ignored.
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
 * @stability experimental
 * @category constructors
 * @since 4.0.0
 */
export const makeRecord = <T extends RecordType>(
  type: T,
  fields: RecordFields<T>
): Result.Result<RecordFor<T>, NetAddress.NetAddressError> => {
  if (!isRecordType(type)) {
    return Result.fail(new NetAddress.NetAddressError({ input: type, message: "unknown DNS record type" }))
  }
  const input: Record<string, unknown> = typeof fields === "object" && fields !== null ? fields : {}
  const self = Object.create(RecordPrototype)
  self._tag = type
  for (const [key, check] of Object.entries<(u: unknown) => boolean>(recordFields[type])) {
    const value = input[key]
    if (!check(value)) {
      return Result.fail(new NetAddress.NetAddressError({ input: fields, message: `invalid ${type} record ${key}` }))
    }
    self[key] = Array.isArray(value) ? Object.freeze([...value]) : value
  }
  return Result.succeed(Object.freeze(self))
}

/**
 * Creates a trusted DNS record of a record type from its fields, throwing on
 * failure.
 *
 * @stability experimental
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
 * @stability experimental
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
 * @stability experimental
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
 * @stability experimental
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
 * @stability experimental
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
 * Options for address lookups. Without a `family`, addresses of both families
 * are returned.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface LookupOptions {
  readonly family?: NetAddress.IpFamily | undefined
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
 * @stability experimental
 * @category services
 * @since 4.0.0
 */
export class Dns extends Context.Service<Dns, {
  /**
   * Looks up the addresses used to connect to a host name, in the
   * implementation's preferred order. Platform implementations use the
   * operating system resolver and keep the system's order.
   */
  lookup<F extends NetAddress.IpFamily>(
    host: Host.DomainName,
    options: { readonly family: F }
  ): Effect.Effect<Arr.NonEmptyReadonlyArray<NetAddress.FamilyAddress<F>>, DnsError>
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
}>()("effect/net/Dns") {}

const notFound = (method: DnsError["method"], hostname: string, recordType?: RecordType) =>
  Effect.fail(new DnsError({ reason: "NotFound", method, hostname, recordType }))

/**
 * Creates a `Dns` service from platform resolver operations.
 *
 * **Details**
 *
 * The constructor filters lookups by the requested address family, keeps only
 * records of the requested type, removes duplicates, and turns empty results
 * into `NotFound` failures.
 *
 * @stability experimental
 * @category constructors
 * @since 4.0.0
 */
export const make = (impl: {
  readonly lookup: (
    host: Host.DomainName,
    family: NetAddress.IpFamily | undefined
  ) => Effect.Effect<ReadonlyArray<NetAddress.IpAddress>, DnsError>
  readonly resolve: (name: Host.DomainName, type: RecordType) => Effect.Effect<ReadonlyArray<DnsRecord>, DnsError>
  readonly reverse: (address: NetAddress.IpAddress) => Effect.Effect<ReadonlyArray<Host.DomainName>, DnsError>
}): Dns["Service"] => {
  const inFamily = (family: NetAddress.IpFamily | undefined) => (address: NetAddress.IpAddress): boolean =>
    family === undefined || NetAddress.isFamily(address, family)

  const lookup = (host: Host.DomainName, options?: LookupOptions) =>
    impl.lookup(host, options?.family).pipe(
      Effect.flatMap((addresses) =>
        Arr.match(Arr.dedupe(addresses.filter(inFamily(options?.family))), {
          onEmpty: () => notFound("lookup", host),
          onNonEmpty: Effect.succeed
        })
      )
    )

  return Dns.of({
    lookup,
    resolve: <T extends RecordType>(name: Host.DomainName, type: T) =>
      impl.resolve(name, type).pipe(
        Effect.flatMap((records) =>
          Arr.match(Arr.dedupe(records.filter((record): record is RecordFor<T> => record._tag === type)), {
            onEmpty: () => notFound("resolve", name, type),
            onNonEmpty: Effect.succeed
          })
        )
      ),
    reverse: (address) =>
      impl.reverse(address).pipe(
        Effect.flatMap((names) =>
          Arr.match(Arr.dedupe(names), {
            onEmpty: () => notFound("reverse", NetAddress.formatIp(address)),
            onNonEmpty: Effect.succeed
          })
        )
      )
  })
}

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
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface StaticZone {
  readonly hosts?: { readonly [name: string]: ReadonlyArray<NetAddress.IpAddress> } | undefined
  readonly records?: { readonly [name: string]: ReadonlyArray<DnsRecord> } | undefined
}

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
 * Names without matching addresses or records fail with `NotFound`. CNAME
 * records are returned by `CNAME` queries but are not followed.
 *
 * **Example** (Looking up a name with a static resolver)
 *
 * ```ts import.meta.vitest
 * import { Effect, Result } from "effect"
 * import { Dns, Host, NetAddress } from "effect/net"
 *
 * const dns = Result.getOrThrow(Dns.makeStatic({
 *   hosts: { "db.internal": [NetAddress.ipFromStringUnsafe("10.0.0.5")] }
 * }))
 *
 * const program = dns.lookup(Host.domainNameFromStringUnsafe("db.internal")).pipe(
 *   Effect.map((addresses) => addresses.map(NetAddress.formatIp))
 * )
 *
 * await Effect.runPromise(program) // => ["10.0.0.5"]
 * ```
 *
 * @see {@link layerStatic}
 * @stability experimental
 * @category constructors
 * @since 4.0.0
 */
export const makeStatic = (zone: StaticZone): Result.Result<Dns["Service"], NetAddress.NetAddressError> => {
  const entries = new Map<
    string,
    { readonly addresses: Array<NetAddress.IpAddress>; readonly records: Array<DnsRecord> }
  >()
  const entry = (name: string) =>
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

  const recordsAt = (name: string): ReadonlyArray<DnsRecord> => entries.get(zoneKey(name))?.records ?? []

  return Result.succeed(make({
    lookup: (host) =>
      Effect.sync(() => [
        ...(entries.get(zoneKey(host))?.addresses ?? []),
        ...recordsAt(host).flatMap((record) => record._tag === "A" || record._tag === "AAAA" ? [record.address] : [])
      ]),
    resolve: (name) => Effect.sync(() => recordsAt(name)),
    reverse: (address) =>
      Effect.sync(() => [
        ...[...entries].flatMap(([name, current]) =>
          current.addresses.some((candidate) => Equal.equals(candidate, address)) ? [name as Host.DomainName] : []
        ),
        ...recordsAt(reverseName(address)).flatMap((record) => record._tag === "PTR" ? [record.host] : [])
      ])
  }))
}

/**
 * Creates a layer that provides a `Dns` service answering from fixed data.
 *
 * @see {@link makeStatic} for the resolution rules
 * @stability experimental
 * @category layers
 * @since 4.0.0
 */
export const layerStatic = (zone: StaticZone): Layer.Layer<Dns, NetAddress.NetAddressError> =>
  Layer.effect(Dns, Effect.fromResult(makeStatic(zone)))
