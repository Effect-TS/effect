/**
 * Pure, platform-neutral values for MAC, IP, internet socket, and Unix path addresses.
 *
 * @since 4.0.0
 */
import type * as Equal from "../../Equal.ts"
import type * as Hash from "../../Hash.ts"
import * as internal from "../../internal/netAddress.ts"
import type * as Option from "../../Option.ts"
import * as Result from "../../Result.ts"
import * as Schema from "../../Schema.ts"

const TypeId = internal.TypeId

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
 * Returns `true` when a value is an IPv4 address.
 *
 * @category guards
 * @since 4.0.0
 */
export const isIpv4Address: (u: unknown) => u is Ipv4Address = internal.isIpv4Address

/**
 * Returns `true` when a value is an IPv6 address.
 *
 * @category guards
 * @since 4.0.0
 */
export const isIpv6Address: (u: unknown) => u is Ipv6Address = internal.isIpv6Address

/**
 * Returns `true` when a value is an IPv4 or IPv6 address.
 *
 * @category guards
 * @since 4.0.0
 */
export const isIpAddress: (u: unknown) => u is IpAddress = internal.isIpAddress

/**
 * Returns `true` when a value is a MAC address.
 *
 * @category guards
 * @since 4.0.0
 */
export const isMacAddress: (u: unknown) => u is MacAddress = internal.isMacAddress

/**
 * Returns `true` when a value is a resolved IPv4 internet address.
 *
 * @category guards
 * @since 4.0.0
 */
export const isInetAddressV4: (u: unknown) => u is InetAddressV4 = internal.isInetAddressV4

/**
 * Returns `true` when a value is a resolved IPv6 internet address.
 *
 * @category guards
 * @since 4.0.0
 */
export const isInetAddressV6: (u: unknown) => u is InetAddressV6 = internal.isInetAddressV6

/**
 * Returns `true` when a value is a resolved internet address.
 *
 * @category guards
 * @since 4.0.0
 */
export const isInetAddress: (u: unknown) => u is InetAddress = internal.isInetAddress

/**
 * Returns `true` when a value is a Unix-domain filesystem address.
 *
 * @category guards
 * @since 4.0.0
 */
export const isUnixPathAddress: (u: unknown) => u is UnixPathAddress = internal.isUnixPathAddress

/**
 * Returns `true` when a value is a portable concrete socket address.
 *
 * @category guards
 * @since 4.0.0
 */
export const isSocketAddress: (u: unknown) => u is SocketAddress = internal.isSocketAddress

/**
 * The IPv4 loopback address `127.0.0.1`.
 *
 * @category constants
 * @since 4.0.0
 */
export const ipv4Loopback: Ipv4Address = internal.ipv4Loopback

/**
 * The IPv6 loopback address `::1`.
 *
 * @category constants
 * @since 4.0.0
 */
export const ipv6Loopback: Ipv6Address = internal.ipv6Loopback

/**
 * The unspecified IPv4 address `0.0.0.0`.
 *
 * @category constants
 * @since 4.0.0
 */
export const ipv4Unspecified: Ipv4Address = internal.ipv4Unspecified

/**
 * The unspecified IPv6 address `::`.
 *
 * @category constants
 * @since 4.0.0
 */
export const ipv6Unspecified: Ipv6Address = internal.ipv6Unspecified

/**
 * The IPv4 broadcast address `255.255.255.255`.
 *
 * @category constants
 * @since 4.0.0
 */
export const ipv4Broadcast: Ipv4Address = internal.ipv4Broadcast

/**
 * Returns the four numeric octets of an IPv4 address in a fresh tuple.
 *
 * @category getters
 * @since 4.0.0
 */
export const ipv4ToOctets: (self: Ipv4Address) => readonly [number, number, number, number] = internal.ipv4ToOctets

/**
 * Returns the eight numeric segments of an IPv6 address in a fresh tuple.
 *
 * @category getters
 * @since 4.0.0
 */
export const ipv6ToSegments: (
  self: Ipv6Address
) => readonly [number, number, number, number, number, number, number, number] = internal.ipv6ToSegments

/**
 * Returns the sixteen numeric octets of an IPv6 address in a fresh tuple.
 *
 * @category getters
 * @since 4.0.0
 */
export const ipv6ToOctets: (
  self: Ipv6Address
) => readonly [
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
] = internal.ipv6ToOctets

/**
 * Returns the six numeric octets of a MAC address in a fresh tuple.
 *
 * @category getters
 * @since 4.0.0
 */
export const macAddressToOctets: (
  self: MacAddress
) => readonly [number, number, number, number, number, number] = internal.macAddressToOctets

/**
 * Formats a MAC address as six lowercase hexadecimal octets separated by colons.
 *
 * @category encoding
 * @since 4.0.0
 */
export const formatMacAddress: (self: MacAddress) => string = internal.formatMacAddress

/**
 * Returns `true` when the MAC address is the all-ones broadcast address.
 *
 * @category predicates
 * @since 4.0.0
 */
export const isMacBroadcast: (self: MacAddress) => boolean = internal.isMacBroadcast

/**
 * Returns `true` when the MAC address has the IEEE group-address bit set.
 *
 * @category predicates
 * @since 4.0.0
 */
export const isMacMulticast: (self: MacAddress) => boolean = internal.isMacMulticast

/**
 * Returns `true` when the MAC address has the IEEE group-address bit clear.
 *
 * @category predicates
 * @since 4.0.0
 */
export const isMacUnicast: (self: MacAddress) => boolean = internal.isMacUnicast

/**
 * Returns `true` when the MAC address has the IEEE local-administration bit set.
 *
 * @category predicates
 * @since 4.0.0
 */
export const isMacLocallyAdministered: (self: MacAddress) => boolean = internal.isMacLocallyAdministered

/**
 * Returns `true` when the MAC address has the IEEE local-administration bit clear.
 *
 * @category predicates
 * @since 4.0.0
 */
export const isMacUniversallyAdministered: (self: MacAddress) => boolean = internal.isMacUniversallyAdministered

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
} = internal.match

/**
 * Formats an IP address in canonical numeric form.
 *
 * @category encoding
 * @since 4.0.0
 */
export const formatIp: (self: IpAddress) => string = internal.formatIp

/**
 * Returns `true` for the all-zero address of either IP version.
 *
 * @category predicates
 * @since 4.0.0
 */
export const isUnspecified: (self: IpAddress) => boolean = internal.isUnspecified

/**
 * Returns `true` for IPv4 `127.0.0.0/8` or IPv6 `::1`.
 *
 * @category predicates
 * @since 4.0.0
 */
export const isLoopback: (self: IpAddress) => boolean = internal.isLoopback

/**
 * Returns `true` for IPv4 `224.0.0.0/4` or IPv6 `ff00::/8`.
 *
 * @category predicates
 * @since 4.0.0
 */
export const isMulticast: (self: IpAddress) => boolean = internal.isMulticast

/**
 * Returns `true` for the IPv4 broadcast address `255.255.255.255`.
 *
 * @category predicates
 * @since 4.0.0
 */
export const isBroadcast: (self: Ipv4Address) => boolean = internal.isBroadcast

/**
 * Returns `true` for IPv4 `169.254.0.0/16` or IPv6 `fe80::/10`.
 *
 * @category predicates
 * @since 4.0.0
 */
export const isLinkLocal: (self: IpAddress) => boolean = internal.isLinkLocal

/**
 * Returns `true` for IPv4 private-use ranges defined by RFC 1918.
 *
 * @category predicates
 * @since 4.0.0
 */
export const isPrivate: (self: Ipv4Address) => boolean = internal.isPrivate

/**
 * Returns `true` for IPv6 unique-local addresses in `fc00::/7`.
 *
 * @category predicates
 * @since 4.0.0
 */
export const isUniqueLocal: (self: Ipv6Address) => boolean = internal.isUniqueLocal

/**
 * Returns `true` when an IPv6 address is in the `::ffff:0:0/96` mapped range.
 *
 * @category predicates
 * @since 4.0.0
 */
export const isIpv4Mapped: (self: Ipv6Address) => boolean = internal.isIpv4Mapped

/**
 * Converts an IPv4 address to its IPv4-mapped IPv6 representation.
 *
 * @category converting
 * @since 4.0.0
 */
export const toIpv4Mapped: (self: Ipv4Address) => Ipv6Address = internal.toIpv4Mapped

/**
 * Extracts the IPv4 value from an IPv4-mapped IPv6 address.
 *
 * @category converting
 * @since 4.0.0
 */
export const fromIpv4Mapped: (self: Ipv6Address) => Option.Option<Ipv4Address> = internal.fromIpv4Mapped

/**
 * Converts an IPv4-mapped IPv6 address to IPv4, leaving all other addresses unchanged.
 *
 * @category converting
 * @since 4.0.0
 */
export const toCanonical: (self: IpAddress) => IpAddress = internal.toCanonical

/**
 * Formats a resolved internet address, bracketing IPv6 around its port.
 *
 * @category encoding
 * @since 4.0.0
 */
export const formatInet: (self: InetAddress) => string = internal.formatInet

/**
 * Formats an IP address for use as a URL authority host.
 *
 * @category encoding
 * @since 4.0.0
 */
export const formatUrlHost: (self: IpAddress) => string = internal.formatUrlHost

/**
 * Creates a Unix-domain filesystem address without normalizing its opaque path.
 *
 * @category constructors
 * @since 4.0.0
 */
export const unixPathAddress: (path: string) => UnixPathAddress = internal.unixPathAddress

/**
 * Formats a portable socket address for human-readable output.
 *
 * @category encoding
 * @since 4.0.0
 */
export const formatSocketAddress: (self: SocketAddress) => string = internal.formatSocketAddress

/**
 * A checked network-address operation failure.
 *
 * @category errors
 * @since 4.0.0
 */
export class NetAddressError extends Schema.TaggedError<NetAddressError>("effect/net/NetAddressError")(
  "NetAddressError",
  {
    input: Schema.Unknown,
    kind: Schema.Literals(["Ipv4Address", "Ipv6Address", "IpAddress", "MacAddress", "InetAddress", "Port"]),
    reason: Schema.String
  }
) {
  override get message(): string {
    return `${this.kind}: ${this.reason}`
  }
}

const mapError = <A>(result: Result.Result<A, internal.NetAddressIssue>): Result.Result<A, NetAddressError> =>
  Result.mapError(
    result,
    (error) => new NetAddressError({ input: error.input, kind: error.kind, reason: error.reason })
  )

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
): Result.Result<Ipv4Address, NetAddressError> => mapError(internal.ipv4FromOctets(a, b, c, d))

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
): Result.Result<Ipv6Address, NetAddressError> => mapError(internal.ipv6FromSegments(a, b, c, d, e, f, g, h))

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
): Result.Result<MacAddress, NetAddressError> => mapError(internal.macAddressFromOctets(a, b, c, d, e, f))

/**
 * Parses a colon-separated MAC address containing six two-digit hexadecimal octets.
 *
 * @category decoding
 * @since 4.0.0
 */
export const macAddressFromString = (
  input: string
): Result.Result<MacAddress, NetAddressError> => mapError(internal.macAddressFromString(input))

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
 * @category decoding
 * @since 4.0.0
 */
export const ipv4FromString = (
  input: string
): Result.Result<Ipv4Address, NetAddressError> => mapError(internal.ipv4FromString(input))

/**
 * Parses an IPv6 address with optional compression and trailing embedded IPv4.
 *
 * @category decoding
 * @since 4.0.0
 */
export const ipv6FromString = (
  input: string
): Result.Result<Ipv6Address, NetAddressError> => mapError(internal.ipv6FromString(input))

/**
 * Parses a bare numeric IPv4 or IPv6 address.
 *
 * @category decoding
 * @since 4.0.0
 */
export const ipFromString = (
  input: string
): Result.Result<IpAddress, NetAddressError> => mapError(internal.ipFromString(input))

/**
 * Parses a trusted bare numeric IPv4 or IPv6 address, throwing on failure.
 *
 * @category unsafe
 * @since 4.0.0
 */
export const ipFromStringUnsafe = (input: string): IpAddress => Result.getOrThrow(ipFromString(input))

/**
 * Creates a checked IPv4 internet address.
 *
 * @category constructors
 * @since 4.0.0
 */
export const inetAddressV4 = (
  address: Ipv4Address,
  port: number
): Result.Result<InetAddressV4, NetAddressError> => mapError(internal.inetAddressV4(address, port))

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
): Result.Result<InetAddressV6, NetAddressError> => mapError(internal.inetAddressV6(address, port, options))

/**
 * Creates a checked internet address for an IP address and port.
 *
 * @category constructors
 * @since 4.0.0
 */
export const inetAddress = (
  address: IpAddress,
  port: number
): Result.Result<InetAddress, NetAddressError> => mapError(internal.inetAddress(address, port))

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
 * @category constructors
 * @since 4.0.0
 */
export const inetAddressFromIpString = (
  address: string,
  port: number
): Result.Result<InetAddress, NetAddressError> => mapError(internal.inetAddressFromIpString(address, port))

/**
 * Creates an internet address from a trusted numeric IP string and port.
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
export const inetAddressFromString = (
  input: string
): Result.Result<InetAddress, NetAddressError> => mapError(internal.inetAddressFromString(input))

/**
 * Parses a trusted numeric internet address and port, throwing on failure.
 *
 * @category unsafe
 * @since 4.0.0
 */
export const inetAddressFromStringUnsafe = (input: string): InetAddress =>
  Result.getOrThrow(inetAddressFromString(input))
