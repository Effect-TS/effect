/**
 * IPv4 and IPv6 interface addresses that preserve host bits alongside a prefix length.
 *
 * @since 4.0.0
 */
import * as Data from "../../Data.ts"
import * as Equal from "../../Equal.ts"
import * as Hash from "../../Hash.ts"
import { NodeInspectSymbol } from "../../Inspectable.ts"
import { hasProperty } from "../../Predicate.ts"
import * as Result from "../../Result.ts"
import * as IpNetwork from "./IpNetwork.ts"
import * as NetAddress from "./NetAddress.ts"

const TypeId = "~effect/net/IpInterface" as const

/**
 * A checked IP interface operation failure.
 *
 * @category errors
 * @since 4.0.0
 */
export class IpInterfaceError extends Data.TaggedError("IpInterfaceError")<{
  readonly input: unknown
  readonly kind: "Ipv4Interface" | "Ipv6Interface" | "IpInterface" | "PrefixLength"
  readonly reason: string
}> {
  override get message(): string {
    return `${this.kind}: ${this.reason}`
  }
}

/**
 * An IPv4 host address and prefix length that preserves host bits.
 *
 * @category models
 * @since 4.0.0
 */
export interface Ipv4Interface extends Equal.Equal, Hash.Hash {
  readonly _tag: "Ipv4Interface"
  readonly address: NetAddress.Ipv4Address
  readonly prefixLength: number
  readonly [TypeId]: typeof TypeId
  toString(): string
}

/**
 * An IPv6 host address and prefix length that preserves host bits.
 *
 * @category models
 * @since 4.0.0
 */
export interface Ipv6Interface extends Equal.Equal, Hash.Hash {
  readonly _tag: "Ipv6Interface"
  readonly address: NetAddress.Ipv6Address
  readonly prefixLength: number
  readonly [TypeId]: typeof TypeId
  toString(): string
}

/**
 * An IPv4 or IPv6 host address and prefix length that preserves host bits.
 *
 * @category models
 * @since 4.0.0
 */
export type IpInterface = Ipv4Interface | Ipv6Interface

/**
 * Returns `true` when a value is an IPv4 interface address.
 *
 * @category guards
 * @since 4.0.0
 */
export const isIpv4Interface = (u: unknown): u is Ipv4Interface => isIpInterface(u) && u._tag === "Ipv4Interface"

/**
 * Returns `true` when a value is an IPv6 interface address.
 *
 * @category guards
 * @since 4.0.0
 */
export const isIpv6Interface = (u: unknown): u is Ipv6Interface => isIpInterface(u) && u._tag === "Ipv6Interface"

/**
 * Returns `true` when a value is an IPv4 or IPv6 interface address.
 *
 * @category guards
 * @since 4.0.0
 */
export const isIpInterface = (u: unknown): u is IpInterface => hasProperty(u, TypeId)

const Ipv4InterfaceProto = {
  _tag: "Ipv4Interface",
  [TypeId]: TypeId,
  [Equal.symbol](this: Ipv4Interface, that: Equal.Equal): boolean {
    return isIpv4Interface(that) &&
      this.prefixLength === that.prefixLength &&
      Equal.equals(this.address, that.address)
  },
  [Hash.symbol](this: Ipv4Interface): number {
    return Hash.combine(Hash.hash(this.address), Hash.number(this.prefixLength))
  },
  toString(this: Ipv4Interface): string {
    return format(this)
  },
  [NodeInspectSymbol](this: Ipv4Interface): string {
    return this.toString()
  }
}

const Ipv6InterfaceProto = {
  _tag: "Ipv6Interface",
  [TypeId]: TypeId,
  [Equal.symbol](this: Ipv6Interface, that: Equal.Equal): boolean {
    return isIpv6Interface(that) &&
      this.prefixLength === that.prefixLength &&
      Equal.equals(this.address, that.address)
  },
  [Hash.symbol](this: Ipv6Interface): number {
    return Hash.combine(Hash.hash(this.address), Hash.number(this.prefixLength))
  },
  toString(this: Ipv6Interface): string {
    return format(this)
  },
  [NodeInspectSymbol](this: Ipv6Interface): string {
    return this.toString()
  }
}

const interfaceError = (
  kind: IpInterfaceError["kind"],
  input: unknown,
  reason: string
): Result.Result<never, IpInterfaceError> => Result.fail(new IpInterfaceError({ kind, input, reason }))

const width = (address: NetAddress.IpAddress): 32 | 128 => NetAddress.isIpv4Address(address) ? 32 : 128

const checkPrefixLength = (address: NetAddress.IpAddress, prefixLength: number): IpInterfaceError | undefined => {
  const maximum = width(address)
  return Number.isInteger(prefixLength) && prefixLength >= 0 && prefixLength <= maximum
    ? undefined
    : new IpInterfaceError({
      kind: "PrefixLength",
      input: prefixLength,
      reason: `prefix length must be an integer from 0 through ${maximum}`
    })
}

const makeIpv4Interface = (address: NetAddress.Ipv4Address, prefixLength: number): Ipv4Interface => {
  const self = Object.create(Ipv4InterfaceProto)
  self.address = address
  self.prefixLength = prefixLength
  return Object.freeze(self)
}

const makeIpv6Interface = (address: NetAddress.Ipv6Address, prefixLength: number): Ipv6Interface => {
  const self = Object.create(Ipv6InterfaceProto)
  self.address = address
  self.prefixLength = prefixLength
  return Object.freeze(self)
}

/**
 * Creates an interface address while preserving all address bits.
 *
 * @category constructors
 * @since 4.0.0
 */
export const make =
  ((address: NetAddress.IpAddress, prefixLength: number): Result.Result<IpInterface, IpInterfaceError> => {
    const prefixError = checkPrefixLength(address, prefixLength)
    if (prefixError !== undefined) return Result.fail(prefixError)
    return Result.succeed(
      NetAddress.isIpv4Address(address)
        ? makeIpv4Interface(address, prefixLength)
        : makeIpv6Interface(address, prefixLength)
    )
  }) as {
    (address: NetAddress.Ipv4Address, prefixLength: number): Result.Result<Ipv4Interface, IpInterfaceError>
    (address: NetAddress.Ipv6Address, prefixLength: number): Result.Result<Ipv6Interface, IpInterfaceError>
    (address: NetAddress.IpAddress, prefixLength: number): Result.Result<IpInterface, IpInterfaceError>
  }

const parseParts = (
  input: string,
  kind: "Ipv4Interface" | "Ipv6Interface" | "IpInterface"
): Result.Result<readonly [string, number | undefined], IpInterfaceError> => {
  const slash = input.indexOf("/")
  if (slash === -1) return Result.succeed([input, undefined])
  if (slash === 0 || slash !== input.lastIndexOf("/") || slash === input.length - 1) {
    return interfaceError(kind, input, "expected an address with at most one trailing prefix length")
  }
  const prefix = input.slice(slash + 1)
  if (!/^(0|[1-9][0-9]*)$/.test(prefix)) {
    return interfaceError("PrefixLength", prefix, "prefix length must be an unpadded ASCII decimal integer")
  }
  return Result.succeed([input.slice(0, slash), Number(prefix)])
}

/**
 * Parses an IPv4 interface address, defaulting a missing prefix length to 32.
 *
 * @category decoding
 * @since 4.0.0
 */
export const ipv4FromString = (input: string): Result.Result<Ipv4Interface, IpInterfaceError> => {
  const parts = parseParts(input, "Ipv4Interface")
  if (Result.isFailure(parts)) return Result.fail(parts.failure)
  const address = NetAddress.ipv4FromString(parts.success[0])
  if (Result.isFailure(address)) return interfaceError("Ipv4Interface", input, address.failure.reason)
  return make(address.success, parts.success[1] ?? 32)
}

/**
 * Parses an IPv6 interface address, defaulting a missing prefix length to 128.
 *
 * @category decoding
 * @since 4.0.0
 */
export const ipv6FromString = (input: string): Result.Result<Ipv6Interface, IpInterfaceError> => {
  const parts = parseParts(input, "Ipv6Interface")
  if (Result.isFailure(parts)) return Result.fail(parts.failure)
  const address = NetAddress.ipv6FromString(parts.success[0])
  if (Result.isFailure(address)) return interfaceError("Ipv6Interface", input, address.failure.reason)
  return make(address.success, parts.success[1] ?? 128)
}

/**
 * Parses an IPv4 or IPv6 interface address, defaulting a missing prefix length to the address width.
 *
 * @category decoding
 * @since 4.0.0
 */
export const fromString = (input: string): Result.Result<IpInterface, IpInterfaceError> => {
  const parts = parseParts(input, "IpInterface")
  if (Result.isFailure(parts)) return Result.fail(parts.failure)
  const address = NetAddress.ipFromString(parts.success[0])
  if (Result.isFailure(address)) return interfaceError("IpInterface", input, address.failure.reason)
  return make(address.success, parts.success[1] ?? width(address.success))
}

/**
 * Creates a trusted interface address, throwing when its prefix length is invalid.
 *
 * @category unsafe
 * @since 4.0.0
 */
export const makeUnsafe =
  ((address: NetAddress.IpAddress, prefixLength: number): IpInterface =>
    Result.getOrThrow(make(address, prefixLength))) as {
      (address: NetAddress.Ipv4Address, prefixLength: number): Ipv4Interface
      (address: NetAddress.Ipv6Address, prefixLength: number): Ipv6Interface
      (address: NetAddress.IpAddress, prefixLength: number): IpInterface
    }

/**
 * Parses a trusted interface address, throwing on failure.
 *
 * @category unsafe
 * @since 4.0.0
 */
export const fromStringUnsafe = (input: string): IpInterface => Result.getOrThrow(fromString(input))

/**
 * Formats an interface address using canonical address text and its decimal prefix length.
 *
 * @category encoding
 * @since 4.0.0
 */
export const format = (self: IpInterface): string => `${NetAddress.formatIp(self.address)}/${self.prefixLength}`

/**
 * Returns the canonical network containing an interface address.
 *
 * @category conversions
 * @since 4.0.0
 */
export const network =
  ((self: IpInterface): IpNetwork.IpNetwork => IpNetwork.fromAddressUnsafe(self.address, self.prefixLength)) as {
    (self: Ipv4Interface): IpNetwork.Ipv4Network
    (self: Ipv6Interface): IpNetwork.Ipv6Network
    (self: IpInterface): IpNetwork.IpNetwork
  }
