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
  readonly input: unknown
  readonly kind: "Ipv4Network" | "Ipv6Network" | "IpNetwork" | "PrefixLength"
  readonly reason: string
}> {
  override get message(): string {
    return `${this.kind}: ${this.reason}`
  }
}

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

const networkError = (
  kind: IpNetworkError["kind"],
  input: unknown,
  reason: string
): Result.Result<never, IpNetworkError> => Result.fail(new IpNetworkError({ kind, input, reason }))

const width = (address: NetAddress.IpAddress): 32 | 128 => NetAddress.isIpv4Address(address) ? 32 : 128

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

const checkPrefixLength = (address: NetAddress.IpAddress, prefixLength: number): IpNetworkError | undefined => {
  const maximum = width(address)
  return Number.isInteger(prefixLength) && prefixLength >= 0 && prefixLength <= maximum
    ? undefined
    : new IpNetworkError({
      kind: "PrefixLength",
      input: prefixLength,
      reason: `prefix length must be an integer from 0 through ${maximum}`
    })
}

const makeIpv4Network = (address: NetAddress.Ipv4Address, prefixLength: number): Ipv4Network => {
  const self = Object.create(Ipv4NetworkProto)
  self.address = address
  self.prefixLength = prefixLength
  return Object.freeze(self)
}

const makeIpv6Network = (address: NetAddress.Ipv6Address, prefixLength: number): Ipv6Network => {
  const self = Object.create(Ipv6NetworkProto)
  self.address = address
  self.prefixLength = prefixLength
  return Object.freeze(self)
}

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
export const make =
  ((address: NetAddress.IpAddress, prefixLength: number): Result.Result<IpNetwork, IpNetworkError> => {
    const prefixError = checkPrefixLength(address, prefixLength)
    if (prefixError !== undefined) return Result.fail(prefixError)
    const bytes = toBytes(address)
    const masked = maskBytes(bytes, prefixLength)
    if (bytes.some((byte, index) => byte !== masked[index])) {
      const kind = NetAddress.isIpv4Address(address) ? "Ipv4Network" : "Ipv6Network"
      return networkError(kind, { address, prefixLength }, "address has non-zero host bits")
    }
    return Result.succeed(
      NetAddress.isIpv4Address(address)
        ? makeIpv4Network(address, prefixLength)
        : makeIpv6Network(address, prefixLength)
    )
  }) as {
    (address: NetAddress.Ipv4Address, prefixLength: number): Result.Result<Ipv4Network, IpNetworkError>
    (address: NetAddress.Ipv6Address, prefixLength: number): Result.Result<Ipv6Network, IpNetworkError>
    (address: NetAddress.IpAddress, prefixLength: number): Result.Result<IpNetwork, IpNetworkError>
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
export const fromAddress =
  ((address: NetAddress.IpAddress, prefixLength: number): Result.Result<IpNetwork, IpNetworkError> => {
    const prefixError = checkPrefixLength(address, prefixLength)
    if (prefixError !== undefined) return Result.fail(prefixError)
    const masked = fromBytes(address, maskBytes(toBytes(address), prefixLength))
    return Result.succeed(
      NetAddress.isIpv4Address(masked)
        ? makeIpv4Network(masked, prefixLength)
        : makeIpv6Network(masked, prefixLength)
    )
  }) as {
    (address: NetAddress.Ipv4Address, prefixLength: number): Result.Result<Ipv4Network, IpNetworkError>
    (address: NetAddress.Ipv6Address, prefixLength: number): Result.Result<Ipv6Network, IpNetworkError>
    (address: NetAddress.IpAddress, prefixLength: number): Result.Result<IpNetwork, IpNetworkError>
  }

const parseParts = (
  input: string,
  kind: "Ipv4Network" | "Ipv6Network" | "IpNetwork"
): Result.Result<readonly [string, number], IpNetworkError> => {
  const slash = input.indexOf("/")
  if (slash <= 0 || slash !== input.lastIndexOf("/") || slash === input.length - 1) {
    return networkError(kind, input, "expected an address and prefix length separated by one slash")
  }
  const prefix = input.slice(slash + 1)
  if (!/^(0|[1-9][0-9]*)$/.test(prefix)) {
    return networkError("PrefixLength", prefix, "prefix length must be an unpadded ASCII decimal integer")
  }
  return Result.succeed([input.slice(0, slash), Number(prefix)])
}

/**
 * Parses a strict IPv4 network prefix in CIDR notation.
 *
 * @category decoding
 * @since 4.0.0
 */
export const ipv4FromString = (input: string): Result.Result<Ipv4Network, IpNetworkError> => {
  const parts = parseParts(input, "Ipv4Network")
  if (Result.isFailure(parts)) return Result.fail(parts.failure)
  const address = NetAddress.ipv4FromString(parts.success[0])
  if (Result.isFailure(address)) return networkError("Ipv4Network", input, address.failure.reason)
  return make(address.success, parts.success[1])
}

/**
 * Parses a strict IPv6 network prefix in CIDR notation.
 *
 * @category decoding
 * @since 4.0.0
 */
export const ipv6FromString = (input: string): Result.Result<Ipv6Network, IpNetworkError> => {
  const parts = parseParts(input, "Ipv6Network")
  if (Result.isFailure(parts)) return Result.fail(parts.failure)
  const address = NetAddress.ipv6FromString(parts.success[0])
  if (Result.isFailure(address)) return networkError("Ipv6Network", input, address.failure.reason)
  return make(address.success, parts.success[1])
}

/**
 * Parses a strict IPv4 or IPv6 network prefix in CIDR notation.
 *
 * @category decoding
 * @since 4.0.0
 */
export const fromString = (input: string): Result.Result<IpNetwork, IpNetworkError> => {
  const parts = parseParts(input, "IpNetwork")
  if (Result.isFailure(parts)) return Result.fail(parts.failure)
  const address = NetAddress.ipFromString(parts.success[0])
  if (Result.isFailure(address)) return networkError("IpNetwork", input, address.failure.reason)
  return make(address.success, parts.success[1])
}

/**
 * Creates a trusted network prefix, throwing when its address or prefix is invalid.
 *
 * @category unsafe
 * @since 4.0.0
 */
export const makeUnsafe =
  ((address: NetAddress.IpAddress, prefixLength: number): IpNetwork =>
    Result.getOrThrow(make(address, prefixLength))) as {
      (address: NetAddress.Ipv4Address, prefixLength: number): Ipv4Network
      (address: NetAddress.Ipv6Address, prefixLength: number): Ipv6Network
      (address: NetAddress.IpAddress, prefixLength: number): IpNetwork
    }

/**
 * Creates the network containing a trusted address, throwing when its prefix is invalid.
 *
 * @category unsafe
 * @since 4.0.0
 */
export const fromAddressUnsafe =
  ((address: NetAddress.IpAddress, prefixLength: number): IpNetwork =>
    Result.getOrThrow(fromAddress(address, prefixLength))) as {
      (address: NetAddress.Ipv4Address, prefixLength: number): Ipv4Network
      (address: NetAddress.Ipv6Address, prefixLength: number): Ipv6Network
      (address: NetAddress.IpAddress, prefixLength: number): IpNetwork
    }

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
export const format = (self: IpNetwork): string => `${NetAddress.formatIp(self.address)}/${self.prefixLength}`

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
export const addressCount = (self: IpNetwork): bigint => BigInt(1) << BigInt(width(self.address) - self.prefixLength)

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
} = dual(
  2,
  (self: IpNetwork, other: IpNetwork): boolean =>
    self._tag === other._tag && self.prefixLength <= other.prefixLength && containsBytes(self, other.address)
)

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
