/**
 * Pure, canonical IPv4 and IPv6 network prefixes using CIDR notation.
 *
 * @since 4.0.0
 */
import * as Data from "../../Data.ts"
import * as Equal from "../../Equal.ts"
import { dual } from "../../Function.ts"
import * as Hash from "../../Hash.ts"
import { NodeInspectSymbol } from "../../Inspectable.ts"
import * as InternalNet from "../../internal/net.ts"
import { hasProperty } from "../../Predicate.ts"
import * as Result from "../../Result.ts"
import * as NetAddress from "./NetAddress.ts"

const TypeId = "~effect/net/IpNetwork" as const

/**
 * A checked IP network operation failure.
 *
 * @category errors
 * @since 4.0.0
 */
export class IpNetworkError extends Data.TaggedError("IpNetworkError")<{
  readonly cause?: unknown
  readonly message: string
}> {}

/**
 * An immutable canonical 32-bit IPv4 network prefix.
 *
 * @category models
 * @since 4.0.0
 */
export interface Ipv4Network extends Equal.Equal, Hash.Hash {
  readonly _tag: "Ipv4Network"
  readonly address: NetAddress.Ipv4Address
  readonly prefixLength: number
  readonly [TypeId]: typeof TypeId
  toString(): string
}

/**
 * An immutable canonical 128-bit IPv6 network prefix.
 *
 * @category models
 * @since 4.0.0
 */
export interface Ipv6Network extends Equal.Equal, Hash.Hash {
  readonly _tag: "Ipv6Network"
  readonly address: NetAddress.Ipv6Address
  readonly prefixLength: number
  readonly [TypeId]: typeof TypeId
  toString(): string
}

/**
 * A canonical IPv4 or IPv6 network prefix.
 *
 * @category models
 * @since 4.0.0
 */
export type IpNetwork = Ipv4Network | Ipv6Network

/**
 * Returns `true` when a value is an IPv4 network prefix.
 *
 * @category guards
 * @since 4.0.0
 */
export const isIpv4Network = (u: unknown): u is Ipv4Network => isIpNetwork(u) && u._tag === "Ipv4Network"

/**
 * Returns `true` when a value is an IPv6 network prefix.
 *
 * @category guards
 * @since 4.0.0
 */
export const isIpv6Network = (u: unknown): u is Ipv6Network => isIpNetwork(u) && u._tag === "Ipv6Network"

/**
 * Returns `true` when a value is an IPv4 or IPv6 network prefix.
 *
 * @category guards
 * @since 4.0.0
 */
export const isIpNetwork = (u: unknown): u is IpNetwork => hasProperty(u, TypeId)

const Ipv4NetworkProto = {
  _tag: "Ipv4Network",
  [TypeId]: TypeId,
  [Equal.symbol](this: Ipv4Network, that: Equal.Equal): boolean {
    return isIpv4Network(that) && this.prefixLength === that.prefixLength && Equal.equals(this.address, that.address)
  },
  [Hash.symbol](this: Ipv4Network): number {
    return Hash.combine(Hash.hash(this.address))(Hash.number(this.prefixLength))
  },
  toString(this: Ipv4Network): string {
    return format(this)
  },
  [NodeInspectSymbol](this: Ipv4Network): string {
    return this.toString()
  }
}

const Ipv6NetworkProto = {
  _tag: "Ipv6Network",
  [TypeId]: TypeId,
  [Equal.symbol](this: Ipv6Network, that: Equal.Equal): boolean {
    return isIpv6Network(that) && this.prefixLength === that.prefixLength && Equal.equals(this.address, that.address)
  },
  [Hash.symbol](this: Ipv6Network): number {
    return Hash.combine(Hash.hash(this.address))(Hash.number(this.prefixLength))
  },
  toString(this: Ipv6Network): string {
    return format(this)
  },
  [NodeInspectSymbol](this: Ipv6Network): string {
    return this.toString()
  }
}

const toBytes = (address: NetAddress.IpAddress): ReadonlyArray<number> =>
  NetAddress.isIpv4Address(address) ? NetAddress.ipv4ToOctets(address) : NetAddress.ipv6ToOctets(address)

const fromBytes = (address: NetAddress.IpAddress, bytes: ReadonlyArray<number>): NetAddress.IpAddress => {
  const array = new Uint8Array(bytes)
  return NetAddress.isIpv4Address(address)
    ? NetAddress.ipv4FromBytesUnsafe(array)
    : NetAddress.ipv6FromBytesUnsafe(array)
}

const maskBytes = (bytes: ReadonlyArray<number>, prefixLength: number): Array<number> => {
  const wholeBytes = Math.floor(prefixLength / 8)
  const partialBits = prefixLength % 8
  return bytes.map((byte, index) => {
    if (index < wholeBytes) return byte
    if (index === wholeBytes && partialBits !== 0) return byte & ((0xff << (8 - partialBits)) & 0xff)
    return 0
  })
}

const prefixLengthError = (address: NetAddress.IpAddress): IpNetworkError =>
  new IpNetworkError({
    message: `prefix length must be an integer from 0 through ${InternalNet.width(address)}`
  })

/**
 * Creates a network prefix when the address has no host bits set.
 *
 * **Gotchas**
 *
 * Use {@link fromAddress} when a host address should be truncated to its containing network.
 *
 * @category constructors
 * @since 4.0.0
 */
export const make: {
  (address: NetAddress.Ipv4Address, prefixLength: number): Result.Result<Ipv4Network, IpNetworkError>
  (address: NetAddress.Ipv6Address, prefixLength: number): Result.Result<Ipv6Network, IpNetworkError>
  (address: NetAddress.IpAddress, prefixLength: number): Result.Result<IpNetwork, IpNetworkError>
} = (address: any, prefixLength: number): Result.Result<any, IpNetworkError> => {
  if (!InternalNet.checkPrefixLength(address, prefixLength)) {
    return Result.fail(prefixLengthError(address))
  }
  const bytes = toBytes(address)
  const masked = maskBytes(bytes, prefixLength)
  if (bytes.some((byte, index) => byte !== masked[index])) {
    return Result.fail(new IpNetworkError({ message: "address has non-zero host bits" }))
  }
  return Result.succeed(InternalNet.make(address, prefixLength, Ipv4NetworkProto, Ipv6NetworkProto))
}

/**
 * Creates the canonical network containing an address by clearing its host bits.
 *
 * **Gotchas**
 *
 * The returned network's address can differ from the input address.
 *
 * @category constructors
 * @since 4.0.0
 */
export const fromAddress: {
  (address: NetAddress.Ipv4Address, prefixLength: number): Result.Result<Ipv4Network, IpNetworkError>
  (address: NetAddress.Ipv6Address, prefixLength: number): Result.Result<Ipv6Network, IpNetworkError>
  (address: NetAddress.IpAddress, prefixLength: number): Result.Result<IpNetwork, IpNetworkError>
} = (address: any, prefixLength: number): Result.Result<any, IpNetworkError> => {
  if (!InternalNet.checkPrefixLength(address, prefixLength)) {
    return Result.fail(prefixLengthError(address))
  }
  const masked = fromBytes(address, maskBytes(toBytes(address), prefixLength))
  return Result.succeed(InternalNet.make(masked, prefixLength, Ipv4NetworkProto, Ipv6NetworkProto))
}

/**
 * Parses a strict IPv4 network prefix in CIDR notation.
 *
 * @category decoding
 * @since 4.0.0
 */
export const ipv4FromString = (input: string): Result.Result<Ipv4Network, IpNetworkError> => {
  const parsed = InternalNet.parse(input, true, NetAddress.ipv4FromString)
  return Result.isFailure(parsed)
    ? Result.fail(new IpNetworkError({ cause: parsed.failure, message: "failed to parse an IPv4 network prefix" }))
    : make(parsed.success.address, parsed.success.prefixLength)
}

/**
 * Parses a strict IPv6 network prefix in CIDR notation.
 *
 * @category decoding
 * @since 4.0.0
 */
export const ipv6FromString = (input: string): Result.Result<Ipv6Network, IpNetworkError> => {
  const parsed = InternalNet.parse(input, true, NetAddress.ipv6FromString)
  return Result.isFailure(parsed)
    ? Result.fail(new IpNetworkError({ cause: parsed.failure, message: "failed to parse an IPv6 network prefix" }))
    : make(parsed.success.address, parsed.success.prefixLength)
}

/**
 * Parses a strict IPv4 or IPv6 network prefix in CIDR notation.
 *
 * @category decoding
 * @since 4.0.0
 */
export const fromString = (input: string): Result.Result<IpNetwork, IpNetworkError> => {
  const parsed = InternalNet.parse(input, true, NetAddress.ipFromString)
  return Result.isFailure(parsed)
    ? Result.fail(new IpNetworkError({ cause: parsed.failure, message: "failed to parse an IP network prefix" }))
    : make(parsed.success.address, parsed.success.prefixLength)
}

/**
 * Creates a trusted network prefix, throwing when its address or prefix is invalid.
 *
 * @category unsafe
 * @since 4.0.0
 */
export const makeUnsafe: {
  (address: NetAddress.Ipv4Address, prefixLength: number): Ipv4Network
  (address: NetAddress.Ipv6Address, prefixLength: number): Ipv6Network
  (address: NetAddress.IpAddress, prefixLength: number): IpNetwork
} = (address: any, prefixLength: number): any => Result.getOrThrow(make(address, prefixLength))

/**
 * Creates the network containing a trusted address, throwing when its prefix is invalid.
 *
 * @category unsafe
 * @since 4.0.0
 */
export const fromAddressUnsafe: {
  (address: NetAddress.Ipv4Address, prefixLength: number): Ipv4Network
  (address: NetAddress.Ipv6Address, prefixLength: number): Ipv6Network
  (address: NetAddress.IpAddress, prefixLength: number): IpNetwork
} = (address: any, prefixLength: number): any => Result.getOrThrow(fromAddress(address, prefixLength))

/**
 * Parses a trusted network prefix in CIDR notation, throwing on failure.
 *
 * @category unsafe
 * @since 4.0.0
 */
export const fromStringUnsafe = (input: string): IpNetwork => Result.getOrThrow(fromString(input))

/**
 * Formats a network prefix using canonical address text and its decimal prefix length.
 *
 * @category encoding
 * @since 4.0.0
 */
export const format = (self: IpNetwork): string => InternalNet.format(self)

/**
 * Returns the lowest address in a network prefix.
 *
 * @category getters
 * @since 4.0.0
 */
export const firstAddress = (self: IpNetwork): NetAddress.IpAddress => self.address

/**
 * Returns the numerically greatest address in a network prefix.
 *
 * @category getters
 * @since 4.0.0
 */
export const lastAddress = (self: IpNetwork): NetAddress.IpAddress => {
  const bytes = toBytes(self.address)
  const networkMask = maskBytes(bytes.map(() => 0xff), self.prefixLength)
  return fromBytes(self.address, bytes.map((byte, index) => byte | (networkMask[index] ^ 0xff)))
}

/**
 * Returns the exact number of addresses in a network prefix.
 *
 * @category getters
 * @since 4.0.0
 */
export const addressCount = (self: IpNetwork): bigint =>
  BigInt(1) << BigInt(InternalNet.width(self.address) - self.prefixLength)

const containsBytes = (self: IpNetwork, address: NetAddress.IpAddress): boolean => {
  if (NetAddress.isIpv4Address(self.address) !== NetAddress.isIpv4Address(address)) return false
  const expected = toBytes(self.address)
  const actual = maskBytes(toBytes(address), self.prefixLength)
  return expected.every((byte, index) => byte === actual[index])
}

/**
 * Returns `true` when a network prefix contains an IP address.
 *
 * @category predicates
 * @since 4.0.0
 */
export const contains: {
  (address: NetAddress.IpAddress): (self: IpNetwork) => boolean
  (self: IpNetwork, address: NetAddress.IpAddress): boolean
} = dual(2, containsBytes)

/**
 * Returns `true` when a network prefix contains every address in another network prefix.
 *
 * @category predicates
 * @since 4.0.0
 */
export const containsNetwork: {
  (other: IpNetwork): (self: IpNetwork) => boolean
  (self: IpNetwork, other: IpNetwork): boolean
} = dual(2, (self: IpNetwork, other: IpNetwork): boolean => {
  return self._tag === other._tag && self.prefixLength <= other.prefixLength && containsBytes(self, other.address)
})

/**
 * Returns `true` when two network prefixes contain at least one common address.
 *
 * @category predicates
 * @since 4.0.0
 */
export const overlaps: {
  (other: IpNetwork): (self: IpNetwork) => boolean
  (self: IpNetwork, other: IpNetwork): boolean
} = dual(2, (self: IpNetwork, other: IpNetwork): boolean => {
  if (self._tag !== other._tag) return false
  return self.prefixLength <= other.prefixLength
    ? containsBytes(self, other.address)
    : containsBytes(other, self.address)
})
