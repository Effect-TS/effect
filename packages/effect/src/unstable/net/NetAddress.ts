/**
 * Pure, platform-neutral values for MAC, IP, internet socket, and Unix path addresses.
 *
 * @since 4.0.0
 */
import * as Data from "../../Data.ts"
import * as Equal from "../../Equal.ts"
import { dual } from "../../Function.ts"
import * as Hash from "../../Hash.ts"
import { NodeInspectSymbol } from "../../Inspectable.ts"
import * as Option from "../../Option.ts"
import { hasProperty } from "../../Predicate.ts"
import * as Result from "../../Result.ts"

const TypeId = "~effect/net/NetAddress" as const

/**
 * A checked hostname, host, authority, or authority-port failure.
 *
 * @category errors
 * @since 4.0.0
 */
export class HostError extends Data.TaggedError("NetHostError")<{
  readonly input: unknown
  readonly kind: "Hostname" | "Host" | "Authority" | "Port"
  readonly reason: "InvalidSyntax" | "InvalidLength" | "InvalidIpv4" | "InvalidPort"
  readonly detail: string
}> {
  override get message(): string {
    return `${this.kind}: ${this.detail}`
  }
}

/**
 * An immutable 32-bit IPv4 address.
 *
 * @category models
 * @since 4.0.0
 */
export interface Ipv4Address extends Equal.Equal, Hash.Hash {
  readonly _tag: "Ipv4Address"
  readonly [TypeId]: typeof TypeId
  readonly bytes: Uint8Array
  toString(): string
}

/**
 * An immutable 128-bit IPv6 address without socket scope metadata.
 *
 * @category models
 * @since 4.0.0
 */
export interface Ipv6Address extends Equal.Equal, Hash.Hash {
  readonly _tag: "Ipv6Address"
  readonly [TypeId]: typeof TypeId
  readonly bytes: Uint8Array
  toString(): string
}

/**
 * A numeric IPv4 or IPv6 address.
 *
 * @category models
 * @since 4.0.0
 */
export type IpAddress = Ipv4Address | Ipv6Address

/**
 * An immutable 48-bit IEEE 802 MAC address.
 *
 * @category models
 * @since 4.0.0
 */
export interface MacAddress extends Equal.Equal, Hash.Hash {
  readonly _tag: "MacAddress"
  readonly [TypeId]: typeof TypeId
  readonly bytes: Uint8Array
  toString(): string
}

/**
 * An immutable ASCII Internet hostname stored in lowercase.
 *
 * **Details**
 *
 * A terminal dot is preserved to distinguish absolute names from names subject
 * to resolver search policy.
 *
 * @category models
 * @since 4.0.0
 */
export interface Hostname extends Equal.Equal, Hash.Hash {
  readonly _tag: "Hostname"
  readonly ascii: string
  readonly [TypeId]: typeof TypeId
  toString(): string
}

/**
 * An unresolved Internet hostname or a numeric IP address.
 *
 * @category models
 * @since 4.0.0
 */
export type Host = Hostname | IpAddress

/**
 * An immutable host and optional port without user information or a leading `//`.
 *
 * **Gotchas**
 *
 * An authority containing a hostname is unresolved and is not a socket address.
 *
 * @category models
 * @since 4.0.0
 */
export interface Authority extends Equal.Equal, Hash.Hash {
  readonly _tag: "Authority"
  readonly host: Host
  readonly port: number | undefined
  readonly [TypeId]: typeof TypeId
  toString(): string
}
/**
 * A resolved IPv4 internet address and port.
 *
 * @category models
 * @since 4.0.0
 */
export interface InetAddressV4 extends Equal.Equal, Hash.Hash {
  readonly _tag: "InetAddressV4"
  readonly address: Ipv4Address
  readonly port: number
  readonly [TypeId]: typeof TypeId
  toString(): string
}

/**
 * A resolved IPv6 internet address, port, flow information, and scope identifier.
 *
 * @category models
 * @since 4.0.0
 */
export interface InetAddressV6 extends Equal.Equal, Hash.Hash {
  readonly _tag: "InetAddressV6"
  readonly address: Ipv6Address
  readonly port: number
  readonly flowInfo: number
  readonly scopeId: number
  readonly [TypeId]: typeof TypeId
  toString(): string
}

/**
 * A resolved IPv4 or IPv6 internet address and port.
 *
 * @category models
 * @since 4.0.0
 */
export type InetAddress = InetAddressV4 | InetAddressV6

/**
 * An opaque Unix-domain filesystem socket path.
 *
 * @category models
 * @since 4.0.0
 */
export interface UnixPathAddress extends Equal.Equal, Hash.Hash {
  readonly _tag: "UnixPathAddress"
  readonly path: string
  readonly [TypeId]: typeof TypeId
  toString(): string
}

/**
 * A portable concrete internet or Unix-domain filesystem address.
 *
 * @category models
 * @since 4.0.0
 */
export type SocketAddress = InetAddress | UnixPathAddress

/**
 * A checked network-address operation failure.
 *
 * @category errors
 * @since 4.0.0
 */
export class NetAddressError extends Data.TaggedError("NetAddressError")<{
  readonly input: unknown
  readonly kind: "Ipv4Address" | "Ipv6Address" | "IpAddress" | "MacAddress" | "InetAddress" | "Port"
  readonly reason: string
}> {
  override get message(): string {
    return `${this.kind}: ${this.reason}`
  }
}

type Address = IpAddress | MacAddress | SocketAddress | Hostname | Authority

const isAddress = (u: unknown): u is Address => hasProperty(u, TypeId)

/**
 * Returns `true` when a value is an IPv4 address.
 *
 * @category guards
 * @since 4.0.0
 */
export const isIpv4Address = (u: unknown): u is Ipv4Address => isAddress(u) && u._tag === "Ipv4Address"

/**
 * Returns `true` when a value is an IPv6 address.
 *
 * @category guards
 * @since 4.0.0
 */
export const isIpv6Address = (u: unknown): u is Ipv6Address => isAddress(u) && u._tag === "Ipv6Address"

/**
 * Returns `true` when a value is an IPv4 or IPv6 address.
 *
 * @category guards
 * @since 4.0.0
 */
export const isIpAddress = (u: unknown): u is IpAddress => isIpv4Address(u) || isIpv6Address(u)

/**
 * Returns `true` when a value is a MAC address.
 *
 * @category guards
 * @since 4.0.0
 */
export const isMacAddress = (u: unknown): u is MacAddress => isAddress(u) && u._tag === "MacAddress"

/**
 * Returns `true` when a value is a hostname.
 *
 * @category guards
 * @since 4.0.0
 */
export const isHostname = (u: unknown): u is Hostname => isAddress(u) && u._tag === "Hostname"

/**
 * Returns `true` when a value is a hostname or numeric IP address.
 *
 * @category guards
 * @since 4.0.0
 */
export const isHost = (u: unknown): u is Host => isHostname(u) || isIpAddress(u)

/**
 * Returns `true` when a value is a host and optional port authority.
 *
 * @category guards
 * @since 4.0.0
 */
export const isAuthority = (u: unknown): u is Authority => isAddress(u) && u._tag === "Authority"

/**
 * Returns `true` when a value is a resolved IPv4 internet address.
 *
 * @category guards
 * @since 4.0.0
 */
export const isInetAddressV4 = (u: unknown): u is InetAddressV4 => isAddress(u) && u._tag === "InetAddressV4"

/**
 * Returns `true` when a value is a resolved IPv6 internet address.
 *
 * @category guards
 * @since 4.0.0
 */
export const isInetAddressV6 = (u: unknown): u is InetAddressV6 => isAddress(u) && u._tag === "InetAddressV6"

/**
 * Returns `true` when a value is a resolved internet address.
 *
 * @category guards
 * @since 4.0.0
 */
export const isInetAddress = (u: unknown): u is InetAddress => isInetAddressV4(u) || isInetAddressV6(u)

/**
 * Returns `true` when a value is a Unix-domain filesystem address.
 *
 * @category guards
 * @since 4.0.0
 */
export const isUnixPathAddress = (u: unknown): u is UnixPathAddress => isAddress(u) && u._tag === "UnixPathAddress"

/**
 * Returns `true` when a value is a portable concrete socket address.
 *
 * @category guards
 * @since 4.0.0
 */
export const isSocketAddress = (u: unknown): u is SocketAddress => isInetAddress(u) || isUnixPathAddress(u)

const Ipv4Proto = {
  _tag: "Ipv4Address",
  [TypeId]: TypeId,
  [Equal.symbol](this: Ipv4Address, that: Equal.Equal): boolean {
    return isIpv4Address(that) && bytesEqual(this.bytes, that.bytes)
  },
  [Hash.symbol](this: Ipv4Address): number {
    return hashBytes("Ipv4Address", this.bytes)
  },
  toString(this: Ipv4Address): string {
    return formatIp(this)
  },
  [NodeInspectSymbol](this: Ipv4Address): string {
    return this.toString()
  }
}

const Ipv6Proto = {
  _tag: "Ipv6Address",
  [TypeId]: TypeId,
  [Equal.symbol](this: Ipv6Address, that: Equal.Equal): boolean {
    return isIpv6Address(that) && bytesEqual(this.bytes, that.bytes)
  },
  [Hash.symbol](this: Ipv6Address): number {
    return hashBytes("Ipv6Address", this.bytes)
  },
  toString(this: Ipv6Address): string {
    return formatIp(this)
  },
  [NodeInspectSymbol](this: Ipv6Address): string {
    return this.toString()
  }
}

const MacProto = {
  _tag: "MacAddress",
  [TypeId]: TypeId,
  [Equal.symbol](this: MacAddress, that: Equal.Equal): boolean {
    return isMacAddress(that) && bytesEqual(this.bytes, that.bytes)
  },
  [Hash.symbol](this: MacAddress): number {
    return hashBytes("MacAddress", this.bytes)
  },
  toString(this: MacAddress): string {
    return formatMacAddress(this)
  },
  [NodeInspectSymbol](this: MacAddress): string {
    return this.toString()
  }
}

const bytesEqual = (self: Uint8Array, that: Uint8Array): boolean => {
  if (self.length !== that.length) return false
  for (let index = 0; index < self.length; index++) {
    if (self[index] !== that[index]) return false
  }
  return true
}

const hashBytes = (tag: string, bytes: Uint8Array): number => {
  let hash = Hash.string(tag)
  for (const byte of bytes) hash = Hash.combine(hash, Hash.number(byte))
  return hash
}

const makeIpv4 = (bytes: Uint8Array): Ipv4Address => {
  const self = Object.assign(Object.create(Ipv4Proto), { bytes })
  return Object.freeze(self)
}

const makeIpv6 = (bytes: Uint8Array): Ipv6Address => {
  const self = Object.assign(Object.create(Ipv6Proto), { bytes })
  return Object.freeze(self)
}

const makeMac = (bytes: Uint8Array): MacAddress => {
  const self = Object.assign(Object.create(MacProto), { bytes })
  return Object.freeze(self)
}

/**
 * The IPv4 loopback address `127.0.0.1`.
 *
 * @category constants
 * @since 4.0.0
 */
export const ipv4Loopback: Ipv4Address = makeIpv4(new Uint8Array([127, 0, 0, 1]))

/**
 * The IPv6 loopback address `::1`.
 *
 * @category constants
 * @since 4.0.0
 */
export const ipv6Loopback: Ipv6Address = makeIpv6(new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1]))

/**
 * The unspecified IPv4 address `0.0.0.0`.
 *
 * @category constants
 * @since 4.0.0
 */
export const ipv4Unspecified: Ipv4Address = makeIpv4(new Uint8Array(4))

/**
 * The unspecified IPv6 address `::`.
 *
 * @category constants
 * @since 4.0.0
 */
export const ipv6Unspecified: Ipv6Address = makeIpv6(new Uint8Array(16))

/**
 * The IPv4 broadcast address `255.255.255.255`.
 *
 * @category constants
 * @since 4.0.0
 */
export const ipv4Broadcast: Ipv4Address = makeIpv4(new Uint8Array([255, 255, 255, 255]))

const addressError = (
  kind: NetAddressError["kind"],
  input: unknown,
  reason: string
): Result.Result<never, NetAddressError> => Result.fail(new NetAddressError({ kind, input, reason }))

/**
 * Creates an IPv4 address from four checked octets.
 *
 * @category constructors
 * @since 4.0.0
 */
export const ipv4FromOctets = (
  a: number,
  b: number,
  c: number,
  d: number
): Result.Result<Ipv4Address, NetAddressError> => {
  const octets = [a, b, c, d]
  if (!octets.every((n) => Number.isInteger(n) && n >= 0 && n <= 255)) {
    return addressError("Ipv4Address", octets, "octets must be integers from 0 through 255")
  }
  return Result.succeed(makeIpv4(new Uint8Array(octets)))
}

/**
 * Creates an IPv6 address from eight checked 16-bit segments.
 *
 * @category constructors
 * @since 4.0.0
 */
export const ipv6FromSegments = (
  a: number,
  b: number,
  c: number,
  d: number,
  e: number,
  f: number,
  g: number,
  h: number
): Result.Result<Ipv6Address, NetAddressError> => {
  const segments = [a, b, c, d, e, f, g, h]
  if (!segments.every((n) => Number.isInteger(n) && n >= 0 && n <= 0xffff)) {
    return addressError("Ipv6Address", segments, "segments must be integers from 0 through 65535")
  }
  const bytes = new Uint8Array(16)
  for (let index = 0; index < 8; index++) {
    bytes[index * 2] = segments[index] >> 8
    bytes[index * 2 + 1] = segments[index]
  }
  return Result.succeed(makeIpv6(bytes))
}

/**
 * Creates a MAC address from six checked octets.
 *
 * @category constructors
 * @since 4.0.0
 */
export const macAddressFromOctets = (
  a: number,
  b: number,
  c: number,
  d: number,
  e: number,
  f: number
): Result.Result<MacAddress, NetAddressError> => {
  const octets = [a, b, c, d, e, f]
  if (!octets.every((n) => Number.isInteger(n) && n >= 0 && n <= 255)) {
    return addressError("MacAddress", octets, "octets must be integers from 0 through 255")
  }
  return Result.succeed(makeMac(new Uint8Array(octets)))
}

/**
 * Parses a colon-separated MAC address containing six two-digit hexadecimal octets.
 *
 * @category decoding
 * @since 4.0.0
 */
export const macAddressFromString = (input: string): Result.Result<MacAddress, NetAddressError> => {
  if (!/^(?:[0-9a-fA-F]{2}:){5}[0-9a-fA-F]{2}$/.test(input)) {
    return addressError("MacAddress", input, "expected six two-digit hexadecimal octets separated by colons")
  }
  return Result.succeed(makeMac(new Uint8Array(input.split(":").map((part) => Number.parseInt(part, 16)))))
}

/**
 * Parses a trusted colon-separated MAC address, throwing on failure.
 *
 * @category unsafe
 * @since 4.0.0
 */
export const macAddressFromStringUnsafe = (input: string): MacAddress => Result.getOrThrow(macAddressFromString(input))

/**
 * Parses a strict dotted-decimal IPv4 address.
 *
 * **Details**
 *
 * Multi-digit octets with a leading zero are rejected to avoid octal ambiguity.
 *
 * @category decoding
 * @since 4.0.0
 */
export const ipv4FromString = (input: string): Result.Result<Ipv4Address, NetAddressError> => {
  const parts = input.split(".")
  if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part))) {
    return addressError("Ipv4Address", input, "expected exactly four decimal octets")
  }
  if (parts.some((part) => part.length > 1 && part[0] === "0")) {
    return addressError("Ipv4Address", input, "leading zeroes are not allowed")
  }
  const octets = parts.map(Number)
  if (octets.some((part) => part > 255)) {
    return addressError("Ipv4Address", input, "octets must be at most 255")
  }
  return ipv4FromOctets(octets[0], octets[1], octets[2], octets[3])
}

const parseIpv6Segments = (input: string): Result.Result<ReadonlyArray<number>, NetAddressError> => {
  if (input.includes("[") || input.includes("]") || input.includes("%")) {
    return addressError("Ipv6Address", input, "brackets and zone identifiers are not valid in a bare IPv6 address")
  }
  const halves = input.split("::")
  if (halves.length > 2) return addressError("Ipv6Address", input, "only one compression marker is allowed")
  const head = halves[0] === "" ? [] : halves[0].split(":")
  const tail = halves.length === 2 && halves[1] !== "" ? halves[1].split(":") : []
  if (head.some((part) => part === "") || tail.some((part) => part === "")) {
    return addressError("Ipv6Address", input, "empty segments are only valid in the compression marker")
  }
  const trailing = tail.length > 0 ? tail[tail.length - 1] : head.length > 0 ? head[head.length - 1] : ""
  let embedded: ReadonlyArray<number> | undefined
  if (trailing.includes(".")) {
    if (halves.length === 2 && tail.length === 0) {
      return addressError("Ipv6Address", input, "embedded IPv4 syntax must be trailing")
    }
    const parsed = ipv4FromString(trailing)
    if (Result.isFailure(parsed)) return addressError("Ipv6Address", input, "invalid embedded IPv4 address")
    const octets = ipv4ToOctets(parsed.success)
    embedded = [octets[0] * 256 + octets[1], octets[2] * 256 + octets[3]]
    if (tail.length > 0) tail.pop()
    else head.pop()
  }
  const explicit = head.length + tail.length + (embedded ? 2 : 0)
  if (halves.length === 1 ? explicit !== 8 : explicit >= 8) {
    return addressError(
      "Ipv6Address",
      input,
      halves.length === 1 ? "expected eight segments" : "compression must replace at least one segment"
    )
  }
  const parse = (part: string): number | undefined =>
    /^[0-9a-fA-F]{1,4}$/.test(part) ? Number.parseInt(part, 16) : undefined
  const parsedHead = head.map(parse)
  const parsedTail = tail.map(parse)
  if (parsedHead.some((part) => part === undefined) || parsedTail.some((part) => part === undefined)) {
    return addressError("Ipv6Address", input, "segments must contain one through four hexadecimal digits")
  }
  return Result.succeed([
    ...parsedHead as ReadonlyArray<number>,
    ...Array(8 - explicit).fill(0),
    ...parsedTail as ReadonlyArray<number>,
    ...(embedded ?? [])
  ])
}

/**
 * Parses an IPv6 address with optional compression and trailing embedded IPv4.
 *
 * @category decoding
 * @since 4.0.0
 */
export const ipv6FromString = (input: string): Result.Result<Ipv6Address, NetAddressError> => {
  const parsed = parseIpv6Segments(input)
  return Result.isFailure(parsed)
    ? Result.fail(parsed.failure)
    : ipv6FromSegments(...parsed.success as [number, number, number, number, number, number, number, number])
}

/**
 * Parses a bare numeric IPv4 or IPv6 address.
 *
 * @category decoding
 * @since 4.0.0
 */
export const ipFromString = (input: string): Result.Result<IpAddress, NetAddressError> => {
  const result: Result.Result<IpAddress, NetAddressError> = input.includes(":")
    ? ipv6FromString(input)
    : ipv4FromString(input)
  return Result.isFailure(result)
    ? addressError("IpAddress", input, result.failure.reason)
    : result
}

/**
 * Parses a trusted bare numeric IPv4 or IPv6 address, throwing on failure.
 *
 * @category unsafe
 * @since 4.0.0
 */
export const ipFromStringUnsafe = (input: string): IpAddress => Result.getOrThrow(ipFromString(input))

const hostError = (
  kind: HostError["kind"],
  input: unknown,
  reason: HostError["reason"],
  detail: string
): Result.Result<never, HostError> => Result.fail(new HostError({ kind, input, reason, detail }))

const HostnameProto = {
  _tag: "Hostname",
  [TypeId]: TypeId,
  [Equal.symbol](this: Hostname, that: Equal.Equal): boolean {
    return isHostname(that) && this.ascii === that.ascii
  },
  [Hash.symbol](this: Hostname): number {
    return Hash.combine(Hash.string("Hostname"))(Hash.string(this.ascii))
  },
  toString(this: Hostname): string {
    return this.ascii
  },
  [NodeInspectSymbol](this: Hostname): string {
    return this.toString()
  }
}

const makeHostname = (ascii: string): Hostname => {
  const self = Object.create(HostnameProto)
  self.ascii = ascii
  return Object.freeze(self)
}

/**
 * Parses an ASCII Internet hostname.
 *
 * **Details**
 *
 * Labels use the RFC 1123 letters, digits, and hyphen syntax and are stored in
 * lowercase. Unicode names and IDNA A-labels are not supported.
 *
 * @category decoding
 * @since 4.0.0
 */
export const hostnameFromString = (input: string): Result.Result<Hostname, HostError> => {
  if (input.length === 0) return hostError("Hostname", input, "InvalidSyntax", "hostname must not be empty")
  for (let index = 0; index < input.length; index++) {
    if (input.charCodeAt(index) > 0x7f) {
      return hostError("Hostname", input, "InvalidSyntax", "hostname must contain only ASCII characters")
    }
  }
  const absolute = input.endsWith(".")
  const domain = absolute ? input.slice(0, -1) : input
  if (domain.length === 0) return hostError("Hostname", input, "InvalidSyntax", "the DNS root is not a hostname")
  const labels = domain.split(".")
  if (labels.some((label) => label.length === 0)) {
    return hostError("Hostname", input, "InvalidSyntax", "hostname labels must not be empty")
  }
  if (labels.some((label) => label.length > 63)) {
    return hostError("Hostname", input, "InvalidLength", "hostname labels must contain at most 63 characters")
  }
  if (labels.some((label) => !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label))) {
    return hostError(
      "Hostname",
      input,
      "InvalidSyntax",
      "hostname labels may contain only letters, digits, and interior hyphens"
    )
  }
  if (labels.some((label) => label.toLowerCase().startsWith("xn--"))) {
    return hostError("Hostname", input, "InvalidSyntax", "IDNA A-labels are not supported")
  }
  const canonical = `${domain.toLowerCase()}${absolute ? "." : ""}`
  if (canonical.length > (absolute ? 254 : 253)) {
    return hostError("Hostname", input, "InvalidLength", "hostname exceeds the 255-octet DNS wire limit")
  }
  return Result.succeed(makeHostname(canonical))
}

/**
 * Parses a trusted Internet hostname, throwing on failure.
 *
 * @category unsafe
 * @since 4.0.0
 */
export const hostnameFromStringUnsafe = (input: string): Hostname => Result.getOrThrow(hostnameFromString(input))

/**
 * Formats a hostname in canonical lowercase ASCII form.
 *
 * @category encoding
 * @since 4.0.0
 */
export const formatHostname = (hostname: Hostname): string => hostname.ascii

const isLegacyIpv4Candidate = (input: string): boolean => {
  const parts = input.split(".")
  return parts.length <= 4 && parts.every((part) => /^\d+$/.test(part) || /^0x[0-9a-f]+$/i.test(part))
}

const hostErrorFromAddress = (
  input: string,
  reason: HostError["reason"],
  detail: string
): Result.Result<never, HostError> => hostError("Host", input, reason, detail)

/**
 * Parses a hostname, strict IPv4 address, or IPv6 address without resolution.
 *
 * **Details**
 *
 * Brackets are accepted only around IPv6. Legacy shortened, hexadecimal,
 * octal-like, and out-of-range IPv4 spellings are rejected.
 *
 * @category decoding
 * @since 4.0.0
 */
export const hostFromString = (input: string): Result.Result<Host, HostError> => {
  if (input.startsWith("[") || input.endsWith("]")) {
    if (!input.startsWith("[") || !input.endsWith("]") || input.length < 3) {
      return hostErrorFromAddress(input, "InvalidSyntax", "IPv6 brackets must enclose the entire host")
    }
    const parsed = ipv6FromString(input.slice(1, -1))
    return Result.isSuccess(parsed)
      ? Result.succeed(parsed.success)
      : hostErrorFromAddress(input, "InvalidSyntax", parsed.failure.reason)
  }
  if (input.includes("[") || input.includes("]")) {
    return hostErrorFromAddress(input, "InvalidSyntax", "brackets are valid only around IPv6")
  }
  if (input.includes(":")) {
    const parsed = ipv6FromString(input)
    return Result.isSuccess(parsed)
      ? Result.succeed(parsed.success)
      : hostErrorFromAddress(input, "InvalidSyntax", parsed.failure.reason)
  }
  const ipv4 = ipv4FromString(input)
  if (Result.isSuccess(ipv4)) return Result.succeed(ipv4.success)
  if (isLegacyIpv4Candidate(input.replace(/\.$/, ""))) {
    return hostErrorFromAddress(input, "InvalidIpv4", "numeric host is not a strict dotted-decimal IPv4 address")
  }
  const hostname = hostnameFromString(input)
  return Result.isSuccess(hostname)
    ? hostname
    : hostErrorFromAddress(input, hostname.failure.reason, hostname.failure.detail)
}

/**
 * Parses a trusted hostname or numeric IP address, throwing on failure.
 *
 * @category unsafe
 * @since 4.0.0
 */
export const hostFromStringUnsafe = (input: string): Host => Result.getOrThrow(hostFromString(input))

/**
 * Formats a host for native APIs, leaving IPv6 unbracketed.
 *
 * @category encoding
 * @since 4.0.0
 */
export const formatHost = (host: Host): string => isHostname(host) ? host.ascii : formatIp(host)

/**
 * Formats a host for authority syntax, bracketing IPv6.
 *
 * @category encoding
 * @since 4.0.0
 */
export const formatAuthorityHost = (host: Host): string =>
  isIpv6Address(host) ? `[${formatIp(host)}]` : formatHost(host)

const AuthorityProto = {
  _tag: "Authority",
  [TypeId]: TypeId,
  [Equal.symbol](this: Authority, that: Equal.Equal): boolean {
    return isAuthority(that) && this.port === that.port && Equal.equals(this.host, that.host)
  },
  [Hash.symbol](this: Authority): number {
    return Hash.combine(Hash.hash(this.host))(Hash.hash(this.port))
  },
  toString(this: Authority): string {
    return formatAuthority(this)
  },
  [NodeInspectSymbol](this: Authority): string {
    return this.toString()
  }
}

const checkAuthorityPort = (port: number): Result.Result<number, HostError> =>
  Number.isInteger(port) && port >= 0 && port <= 0xffff
    ? Result.succeed(port)
    : hostError("Port", port, "InvalidPort", "port must be an integer from 0 through 65535")

/**
 * Creates a checked host and optional port authority.
 *
 * @category constructors
 * @since 4.0.0
 */
export const authority = (host: Host, port?: number): Result.Result<Authority, HostError> => {
  if (!isHost(host)) return hostError("Authority", host, "InvalidSyntax", "host must be a constructed Host value")
  if (port !== undefined) {
    const checked = checkAuthorityPort(port)
    if (Result.isFailure(checked)) return Result.fail(checked.failure)
  }
  const self = Object.create(AuthorityProto)
  self.host = host
  self.port = port
  return Result.succeed(Object.freeze(self))
}

/**
 * Creates a trusted host and optional port authority, throwing on failure.
 *
 * @category unsafe
 * @since 4.0.0
 */
export const authorityUnsafe = (host: Host, port?: number): Authority => Result.getOrThrow(authority(host, port))

const parseAuthorityPort = (input: string, text: string): Result.Result<number, HostError> => {
  if (!/^\d+$/.test(text)) {
    return hostError("Authority", input, "InvalidPort", "port must contain one or more decimal digits")
  }
  const checked = checkAuthorityPort(Number(text))
  return Result.isSuccess(checked)
    ? checked
    : hostError("Authority", input, checked.failure.reason, checked.failure.detail)
}

/**
 * Parses a host and optional numeric port without resolution.
 *
 * **Details**
 *
 * IPv6 must be bracketed in authority syntax, including when no port is present.
 * User information, paths, queries, fragments, and empty ports are rejected.
 *
 * @category decoding
 * @since 4.0.0
 */
export const authorityFromString = (input: string): Result.Result<Authority, HostError> => {
  if (input.length === 0 || /[\s@/?#]/.test(input)) {
    return hostError("Authority", input, "InvalidSyntax", "expected only a host and optional numeric port")
  }
  if (input.startsWith("[")) {
    const end = input.indexOf("]")
    if (end < 0 || input.indexOf("]", end + 1) !== -1) {
      return hostError("Authority", input, "InvalidSyntax", "expected [IPv6] or [IPv6]:port")
    }
    const parsedHost = ipv6FromString(input.slice(1, end))
    if (Result.isFailure(parsedHost)) {
      return hostError("Authority", input, "InvalidSyntax", parsedHost.failure.reason)
    }
    const suffix = input.slice(end + 1)
    if (suffix === "") return authority(parsedHost.success)
    if (!suffix.startsWith(":")) {
      return hostError("Authority", input, "InvalidSyntax", "unexpected text after IPv6 brackets")
    }
    const port = parseAuthorityPort(input, suffix.slice(1))
    return Result.isFailure(port) ? Result.fail(port.failure) : authority(parsedHost.success, port.success)
  }
  if (input.includes("[") || input.includes("]")) {
    return hostError("Authority", input, "InvalidSyntax", "brackets are valid only around IPv6")
  }
  const firstColon = input.indexOf(":")
  if (firstColon !== input.lastIndexOf(":")) {
    return hostError("Authority", input, "InvalidSyntax", "IPv6 must be bracketed in authority syntax")
  }
  const hostText = firstColon === -1 ? input : input.slice(0, firstColon)
  const parsedHost = hostFromString(hostText)
  if (Result.isFailure(parsedHost)) {
    return hostError("Authority", input, parsedHost.failure.reason, parsedHost.failure.detail)
  }
  if (isIpv6Address(parsedHost.success)) {
    return hostError("Authority", input, "InvalidSyntax", "IPv6 must be bracketed in authority syntax")
  }
  if (firstColon === -1) return authority(parsedHost.success)
  const port = parseAuthorityPort(input, input.slice(firstColon + 1))
  return Result.isFailure(port) ? Result.fail(port.failure) : authority(parsedHost.success, port.success)
}

/**
 * Parses a trusted host and optional port authority, throwing on failure.
 *
 * @category unsafe
 * @since 4.0.0
 */
export const authorityFromStringUnsafe = (input: string): Authority => Result.getOrThrow(authorityFromString(input))

/**
 * Formats an authority as canonical ASCII with brackets around IPv6.
 *
 * @category encoding
 * @since 4.0.0
 */
export const formatAuthority = (self: Authority): string =>
  self.port === undefined ? formatAuthorityHost(self.host) : `${formatAuthorityHost(self.host)}:${self.port}`

/**
 * Returns the four numeric octets of an IPv4 address in a fresh tuple.
 *
 * @category getters
 * @since 4.0.0
 */
export const ipv4ToOctets = (self: Ipv4Address): readonly [number, number, number, number] => {
  const bytes = self.bytes
  return [bytes[0], bytes[1], bytes[2], bytes[3]]
}

/**
 * Returns the eight numeric segments of an IPv6 address in a fresh tuple.
 *
 * @category getters
 * @since 4.0.0
 */
export const ipv6ToSegments = (
  self: Ipv6Address
): readonly [number, number, number, number, number, number, number, number] => {
  const bytes = self.bytes
  const output = Array<number>(8)
  for (let index = 0; index < 8; index++) {
    output[index] = bytes[index * 2] * 256 + bytes[index * 2 + 1]
  }
  return output as any
}

/**
 * Returns the sixteen numeric octets of an IPv6 address in a fresh tuple.
 *
 * @category getters
 * @since 4.0.0
 */
export const ipv6ToOctets = (
  self: Ipv6Address
): readonly [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number
] => {
  return Array.from(self.bytes) as any
}

/**
 * Returns the six numeric octets of a MAC address in a fresh tuple.
 *
 * @category getters
 * @since 4.0.0
 */
export const macAddressToOctets = (
  self: MacAddress
): readonly [number, number, number, number, number, number] => {
  const bytes = self.bytes
  return [bytes[0], bytes[1], bytes[2], bytes[3], bytes[4], bytes[5]]
}

/**
 * Formats a MAC address as six lowercase hexadecimal octets separated by colons.
 *
 * @category encoding
 * @since 4.0.0
 */
export const formatMacAddress = (self: MacAddress): string =>
  Array.from(self.bytes, (byte) => byte.toString(16).padStart(2, "0")).join(":")

/**
 * Returns `true` when the MAC address is the all-ones broadcast address.
 *
 * @category predicates
 * @since 4.0.0
 */
export const isMacBroadcast = (self: MacAddress): boolean => self.bytes.every((byte) => byte === 0xff)

/**
 * Returns `true` when the MAC address has the IEEE group-address bit set.
 *
 * @category predicates
 * @since 4.0.0
 */
export const isMacMulticast = (self: MacAddress): boolean => (self.bytes[0] & 1) !== 0

/**
 * Returns `true` when the MAC address has the IEEE group-address bit clear.
 *
 * @category predicates
 * @since 4.0.0
 */
export const isMacUnicast = (self: MacAddress): boolean => (self.bytes[0] & 1) === 0

/**
 * Returns `true` when the MAC address has the IEEE local-administration bit set.
 *
 * @category predicates
 * @since 4.0.0
 */
export const isMacLocallyAdministered = (self: MacAddress): boolean => (self.bytes[0] & 2) !== 0

/**
 * Returns `true` when the MAC address has the IEEE local-administration bit clear.
 *
 * @category predicates
 * @since 4.0.0
 */
export const isMacUniversallyAdministered = (self: MacAddress): boolean => (self.bytes[0] & 2) === 0

/**
 * Folds an IP address by its numeric version.
 *
 * @category pattern matching
 * @since 4.0.0
 */
export const match: {
  <A, B>(options: {
    readonly onIpv4: (address: Ipv4Address) => A
    readonly onIpv6: (address: Ipv6Address) => B
  }): (self: IpAddress) => A | B
  <A, B>(self: IpAddress, options: {
    readonly onIpv4: (address: Ipv4Address) => A
    readonly onIpv6: (address: Ipv6Address) => B
  }): A | B
} = dual(2, <A, B>(self: IpAddress, options: {
  readonly onIpv4: (address: Ipv4Address) => A
  readonly onIpv6: (address: Ipv6Address) => B
}): A | B => isIpv4Address(self) ? options.onIpv4(self) : options.onIpv6(self))

/**
 * Formats an IP address in canonical numeric form.
 *
 * @category encoding
 * @since 4.0.0
 */
export const formatIp = (self: IpAddress): string => {
  if (isIpv4Address(self)) return ipv4ToOctets(self).join(".")
  const segments = ipv6ToSegments(self)
  if (
    segments[0] === 0 && segments[1] === 0 && segments[2] === 0 && segments[3] === 0 && segments[4] === 0 &&
    segments[5] === 0xffff
  ) {
    return `::ffff:${segments[6] >> 8}.${segments[6] & 0xff}.${segments[7] >> 8}.${segments[7] & 0xff}`
  }
  let bestStart = -1
  let bestLength = 0
  let start = -1
  for (let index = 0; index <= 8; index++) {
    if (index < 8 && segments[index] === 0) {
      if (start === -1) start = index
    } else if (start !== -1) {
      if (index - start > bestLength) {
        bestStart = start
        bestLength = index - start
      }
      start = -1
    }
  }
  if (bestLength < 2) return segments.map((segment) => segment.toString(16)).join(":")
  const head = segments.slice(0, bestStart).map((segment) => segment.toString(16)).join(":")
  const tail = segments.slice(bestStart + bestLength).map((segment) => segment.toString(16)).join(":")
  return `${head}::${tail}`
}

/**
 * Returns `true` for the all-zero address of either IP version.
 *
 * @category predicates
 * @since 4.0.0
 */
export const isUnspecified = (self: IpAddress): boolean => {
  const bytes = isIpv4Address(self) ? self.bytes : self.bytes
  return bytes.every((byte) => byte === 0)
}

/**
 * Returns `true` for IPv4 `127.0.0.0/8` or IPv6 `::1`.
 *
 * @category predicates
 * @since 4.0.0
 */
export const isLoopback = (self: IpAddress): boolean => {
  if (isIpv4Address(self)) return self.bytes[0] === 127
  const bytes = self.bytes
  for (let index = 0; index < 15; index++) {
    if (bytes[index] !== 0) return false
  }
  return bytes[15] === 1
}

/**
 * Returns `true` for IPv4 `224.0.0.0/4` or IPv6 `ff00::/8`.
 *
 * @category predicates
 * @since 4.0.0
 */
export const isMulticast = (self: IpAddress): boolean => {
  if (isIpv4Address(self)) return (self.bytes[0] >> 4) === 0xe
  return self.bytes[0] === 0xff
}

/**
 * Returns `true` for the IPv4 broadcast address `255.255.255.255`.
 *
 * @category predicates
 * @since 4.0.0
 */
export const isBroadcast = (self: Ipv4Address): boolean => self.bytes.every((byte) => byte === 0xff)

/**
 * Returns `true` for IPv4 `169.254.0.0/16` or IPv6 `fe80::/10`.
 *
 * @category predicates
 * @since 4.0.0
 */
export const isLinkLocal = (self: IpAddress): boolean => {
  if (isIpv4Address(self)) {
    const bytes = self.bytes
    return bytes[0] === 0xa9 && bytes[1] === 0xfe
  }
  const bytes = self.bytes
  return bytes[0] === 0xfe && (bytes[1] & 0xc0) === 0x80
}

/**
 * Returns `true` for IPv4 private-use ranges defined by RFC 1918.
 *
 * @category predicates
 * @since 4.0.0
 */
export const isPrivate = (self: Ipv4Address): boolean => {
  const bytes = self.bytes
  return bytes[0] === 10 || (bytes[0] === 172 && (bytes[1] & 0xf0) === 16) ||
    (bytes[0] === 192 && bytes[1] === 168)
}

/**
 * Returns `true` for IPv6 unique-local addresses in `fc00::/7`.
 *
 * @category predicates
 * @since 4.0.0
 */
export const isUniqueLocal = (self: Ipv6Address): boolean => (self.bytes[0] & 0xfe) === 0xfc

/**
 * Returns `true` when an IPv6 address is in the `::ffff:0:0/96` mapped range.
 *
 * @category predicates
 * @since 4.0.0
 */
export const isIpv4Mapped = (self: Ipv6Address): boolean => {
  const bytes = self.bytes
  for (let index = 0; index < 10; index++) {
    if (bytes[index] !== 0) return false
  }
  return bytes[10] === 0xff && bytes[11] === 0xff
}

/**
 * Converts an IPv4 address to its IPv4-mapped IPv6 representation.
 *
 * @category converting
 * @since 4.0.0
 */
export const toIpv4Mapped = (self: Ipv4Address): Ipv6Address => {
  const bytes = new Uint8Array(16)
  bytes[10] = 0xff
  bytes[11] = 0xff
  bytes.set(self.bytes, 12)
  return makeIpv6(bytes)
}

/**
 * Extracts the IPv4 value from an IPv4-mapped IPv6 address.
 *
 * @category converting
 * @since 4.0.0
 */
export const fromIpv4Mapped = (self: Ipv6Address): Option.Option<Ipv4Address> =>
  isIpv4Mapped(self) ? Option.some(makeIpv4(self.bytes.slice(12))) : Option.none()

/**
 * Converts an IPv4-mapped IPv6 address to IPv4, leaving all other addresses unchanged.
 *
 * @category converting
 * @since 4.0.0
 */
export const toCanonical = (self: IpAddress): IpAddress =>
  isIpv6Address(self) && isIpv4Mapped(self)
    ? makeIpv4(self.bytes.slice(12))
    : self

const InetV4Proto = {
  _tag: "InetAddressV4",
  [TypeId]: TypeId,
  [Equal.symbol](this: InetAddressV4, that: Equal.Equal): boolean {
    return isInetAddressV4(that) && this.port === that.port && Equal.equals(this.address, that.address)
  },
  [Hash.symbol](this: InetAddressV4): number {
    return Hash.combine(Hash.hash(this.address))(Hash.number(this.port))
  },
  toString(this: InetAddressV4): string {
    return formatInet(this)
  },
  [NodeInspectSymbol](this: InetAddressV4): string {
    return this.toString()
  }
}

const InetV6Proto = {
  _tag: "InetAddressV6",
  [TypeId]: TypeId,
  [Equal.symbol](this: InetAddressV6, that: Equal.Equal): boolean {
    return isInetAddressV6(that) && this.port === that.port && this.flowInfo === that.flowInfo &&
      this.scopeId === that.scopeId && Equal.equals(this.address, that.address)
  },
  [Hash.symbol](this: InetAddressV6): number {
    return Hash.combine(
      Hash.combine(Hash.combine(Hash.hash(this.address))(Hash.number(this.port)))(Hash.number(this.flowInfo))
    )(Hash.number(this.scopeId))
  },
  toString(this: InetAddressV6): string {
    return formatInet(this)
  },
  [NodeInspectSymbol](this: InetAddressV6): string {
    return this.toString()
  }
}

const checkPort = (port: number): Result.Result<number, NetAddressError> =>
  Number.isInteger(port) && port >= 0 && port <= 0xffff
    ? Result.succeed(port)
    : addressError("Port", port, "port must be an integer from 0 through 65535")

/**
 * Creates a checked IPv4 internet address.
 *
 * @category constructors
 * @since 4.0.0
 */
export const inetAddressV4 = (address: Ipv4Address, port: number): Result.Result<InetAddressV4, NetAddressError> => {
  const checked = checkPort(port)
  if (Result.isFailure(checked)) return Result.fail(checked.failure)
  const self = Object.create(InetV4Proto)
  self.address = address
  self.port = port
  return Result.succeed(Object.freeze(self))
}

/**
 * Creates a checked IPv6 internet address with optional flow and scope metadata.
 *
 * @category constructors
 * @since 4.0.0
 */
export const inetAddressV6 = (
  address: Ipv6Address,
  port: number,
  options?: { readonly flowInfo?: number | undefined; readonly scopeId?: number | undefined }
): Result.Result<InetAddressV6, NetAddressError> => {
  const checked = checkPort(port)
  if (Result.isFailure(checked)) return Result.fail(checked.failure)
  const flowInfo = options?.flowInfo ?? 0
  const scopeId = options?.scopeId ?? 0
  if (
    !Number.isInteger(flowInfo) || flowInfo < 0 || flowInfo > 0xffffffff || !Number.isInteger(scopeId) || scopeId < 0 ||
    scopeId > 0xffffffff
  ) {
    return addressError("InetAddress", options, "flowInfo and scopeId must be unsigned 32-bit integers")
  }
  const self = Object.create(InetV6Proto)
  self.address = address
  self.port = port
  self.flowInfo = flowInfo
  self.scopeId = scopeId
  return Result.succeed(Object.freeze(self))
}

/**
 * Creates a checked internet address for an IP address and port.
 *
 * @category constructors
 * @since 4.0.0
 */
export const inetAddress = (address: IpAddress, port: number): Result.Result<InetAddress, NetAddressError> =>
  isIpv4Address(address) ? inetAddressV4(address, port) : inetAddressV6(address, port)

/**
 * Creates an internet address from a trusted IP address and port, throwing on failure.
 *
 * @category unsafe
 * @since 4.0.0
 */
export const inetAddressUnsafe = (address: IpAddress, port: number): InetAddress =>
  Result.getOrThrow(inetAddress(address, port))

/**
 * Creates a checked internet address from a numeric IP string and port.
 *
 * **Gotchas**
 *
 * The address must be a numeric IPv4 or IPv6 literal. This function does not
 * resolve hostnames or accept IPv6 brackets.
 *
 * @category constructors
 * @since 4.0.0
 */
export const inetAddressFromIpString = (
  address: string,
  port: number
): Result.Result<InetAddress, NetAddressError> => {
  const parsed = ipFromString(address)
  return Result.isFailure(parsed) ? Result.fail(parsed.failure) : inetAddress(parsed.success, port)
}

/**
 * Creates an internet address from a trusted numeric IP string and port.
 *
 * **Gotchas**
 *
 * This function throws when either input is invalid. Use only when both values
 * are already known to satisfy the checked constructor's requirements.
 *
 * @category unsafe
 * @since 4.0.0
 */
export const inetAddressFromIpStringUnsafe = (address: string, port: number): InetAddress =>
  Result.getOrThrow(inetAddressFromIpString(address, port))

/**
 * Parses `IPv4:port` or `[IPv6]:port` without DNS resolution.
 *
 * @category decoding
 * @since 4.0.0
 */
export const inetAddressFromString = (input: string): Result.Result<InetAddress, NetAddressError> => {
  let host: string
  let portText: string
  let scopeId = 0
  const bracketed = input.startsWith("[")
  if (bracketed) {
    const end = input.indexOf("]")
    if (end < 0 || input[end + 1] !== ":" || input.indexOf("]", end + 1) !== -1) {
      return addressError("InetAddress", input, "expected [IPv6]:port")
    }
    host = input.slice(1, end)
    portText = input.slice(end + 2)
    const scopeSeparator = host.indexOf("%")
    if (scopeSeparator !== -1) {
      const scopeText = host.slice(scopeSeparator + 1)
      if (host.indexOf("%", scopeSeparator + 1) !== -1 || !/^\d+$/.test(scopeText)) {
        return addressError("InetAddress", input, "scope identifier must be decimal")
      }
      scopeId = Number(scopeText)
      if (!Number.isInteger(scopeId) || scopeId > 0xffffffff) {
        return addressError("InetAddress", input, "scope identifier must be an unsigned 32-bit integer")
      }
      host = host.slice(0, scopeSeparator)
    }
  } else {
    const separator = input.lastIndexOf(":")
    if (separator < 0 || input.indexOf(":") !== separator) {
      return addressError("InetAddress", input, "IPv6 addresses must be bracketed")
    }
    host = input.slice(0, separator)
    portText = input.slice(separator + 1)
  }
  if (!/^\d+$/.test(portText)) return addressError("InetAddress", input, "port must be decimal")
  const parsedIp = ipFromString(host)
  if (Result.isFailure(parsedIp)) return addressError("InetAddress", input, parsedIp.failure.reason)
  if (bracketed !== isIpv6Address(parsedIp.success)) {
    return addressError("InetAddress", input, "only IPv6 addresses use brackets")
  }
  return isIpv6Address(parsedIp.success)
    ? inetAddressV6(parsedIp.success, Number(portText), { scopeId })
    : inetAddressV4(parsedIp.success, Number(portText))
}

/**
 * Parses a trusted numeric internet address and port, throwing on failure.
 *
 * @category unsafe
 * @since 4.0.0
 */
export const inetAddressFromStringUnsafe = (input: string): InetAddress =>
  Result.getOrThrow(inetAddressFromString(input))

/**
 * Formats a resolved internet address, bracketing IPv6 around its port.
 *
 * @category encoding
 * @since 4.0.0
 */
export const formatInet = (self: InetAddress): string => {
  if (self._tag === "InetAddressV4") return `${formatIp(self.address)}:${self.port}`
  const scope = self.scopeId === 0 ? "" : `%${self.scopeId}`
  return `[${formatIp(self.address)}${scope}]:${self.port}`
}

/**
 * Converts a resolved internet address to an authority.
 *
 * **Details**
 *
 * IPv6 flow and scope metadata are not represented by `Authority`.
 *
 * @category converting
 * @since 4.0.0
 */
export const authorityFromInetAddress = (self: InetAddress): Authority => authorityUnsafe(self.address, self.port)

/**
 * Converts an authority with a numeric host and present port to an internet address.
 *
 * **Gotchas**
 *
 * Hostnames fail instead of being resolved.
 *
 * @category converting
 * @since 4.0.0
 */
export const inetAddressFromAuthority = (self: Authority): Result.Result<InetAddress, HostError> => {
  if (self.port === undefined) {
    return hostError("Authority", self, "InvalidPort", "a port is required to construct an internet address")
  }
  if (isHostname(self.host)) {
    return hostError(
      "Authority",
      self,
      "InvalidSyntax",
      "a hostname must be resolved before constructing an internet address"
    )
  }
  return Result.succeed(inetAddressUnsafe(self.host, self.port))
}

/**
 * Formats an IP address for use as a URL authority host.
 *
 * @category encoding
 * @since 4.0.0
 */
export const formatUrlHost = (self: IpAddress): string => isIpv4Address(self) ? formatIp(self) : `[${formatIp(self)}]`

const UnixPathProto = {
  _tag: "UnixPathAddress",
  [TypeId]: TypeId,
  [Equal.symbol](this: UnixPathAddress, that: Equal.Equal): boolean {
    return isUnixPathAddress(that) && this.path === that.path
  },
  [Hash.symbol](this: UnixPathAddress): number {
    return Hash.combine(Hash.string("UnixPathAddress"))(Hash.string(this.path))
  },
  toString(this: UnixPathAddress): string {
    return this.path
  },
  [NodeInspectSymbol](this: UnixPathAddress): string {
    return this.toString()
  }
}

/**
 * Creates a Unix-domain filesystem address without normalizing its opaque path.
 *
 * @category constructors
 * @since 4.0.0
 */
export const unixPathAddress = (path: string): UnixPathAddress => {
  const self = Object.create(UnixPathProto)
  self.path = path
  return Object.freeze(self)
}

/**
 * Formats a portable socket address for human-readable output.
 *
 * @category encoding
 * @since 4.0.0
 */
export const formatSocketAddress = (self: SocketAddress): string =>
  self._tag === "UnixPathAddress" ? self.path : formatInet(self)
