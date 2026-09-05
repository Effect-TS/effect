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
  readonly cause?: unknown
  readonly message: string
}> {}

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

const fromAddressWithPrefix: {
  (self: NetAddress.Ipv4AddressWithPrefix): Ipv4Interface
  (self: NetAddress.Ipv6AddressWithPrefix): Ipv6Interface
  (self: NetAddress.IpAddressWithPrefix): IpInterface
} = (value: any): any => {
  const proto = Object.create(NetAddress.isIpv4Address(value.address) ? Ipv4InterfaceProto : Ipv6InterfaceProto)
  const self = Object.assign(proto, { address: value.address, prefixLength: value.prefixLength })
  return Object.freeze(self)
}

/**
 * Creates an interface address while preserving all address bits.
 *
 * @category constructors
 * @since 4.0.0
 */
export const make: {
  (address: NetAddress.Ipv4Address, prefixLength: number): Result.Result<Ipv4Interface, IpInterfaceError>
  (address: NetAddress.Ipv6Address, prefixLength: number): Result.Result<Ipv6Interface, IpInterfaceError>
  (address: NetAddress.IpAddress, prefixLength: number): Result.Result<IpInterface, IpInterfaceError>
} = (address: any, prefixLength: number): Result.Result<any, IpInterfaceError> => {
  const value = NetAddress.withPrefix(address, prefixLength)
  return Result.isFailure(value)
    ? Result.fail(new IpInterfaceError({ message: value.failure.message }))
    : Result.succeed(fromAddressWithPrefix(value.success))
}

/**
 * Parses an IPv4 interface address, defaulting a missing prefix length to 32.
 *
 * @category decoding
 * @since 4.0.0
 */
export const ipv4FromString = (input: string): Result.Result<Ipv4Interface, IpInterfaceError> => {
  const value = NetAddress.ipv4WithPrefixFromString(input, { prefix: "optional" })
  return Result.isFailure(value)
    ? Result.fail(new IpInterfaceError({ cause: value.failure, message: "failed to parse an IPv4 interface address" }))
    : Result.succeed(fromAddressWithPrefix(value.success))
}

/**
 * Parses an IPv6 interface address, defaulting a missing prefix length to 128.
 *
 * @category decoding
 * @since 4.0.0
 */
export const ipv6FromString = (input: string): Result.Result<Ipv6Interface, IpInterfaceError> => {
  const value = NetAddress.ipv6WithPrefixFromString(input, { prefix: "optional" })
  return Result.isFailure(value)
    ? Result.fail(new IpInterfaceError({ cause: value.failure, message: "failed to parse an IPv6 interface address" }))
    : Result.succeed(fromAddressWithPrefix(value.success))
}

/**
 * Parses an IPv4 or IPv6 interface address, defaulting a missing prefix length to the address width.
 *
 * @category decoding
 * @since 4.0.0
 */
export const fromString = (input: string): Result.Result<IpInterface, IpInterfaceError> => {
  const value = NetAddress.ipWithPrefixFromString(input, { prefix: "optional" })
  return Result.isFailure(value)
    ? Result.fail(new IpInterfaceError({ cause: value.failure, message: "failed to parse an IP interface address" }))
    : Result.succeed(fromAddressWithPrefix(value.success))
}

/**
 * Creates a trusted interface address, throwing when its prefix length is invalid.
 *
 * @category unsafe
 * @since 4.0.0
 */
export const makeUnsafe: {
  (address: NetAddress.Ipv4Address, prefixLength: number): Ipv4Interface
  (address: NetAddress.Ipv6Address, prefixLength: number): Ipv6Interface
  (address: NetAddress.IpAddress, prefixLength: number): IpInterface
} = (address: any, prefixLength: number): any => Result.getOrThrow(make(address, prefixLength))

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
export const network: {
  (self: Ipv4Interface): IpNetwork.Ipv4Network
  (self: Ipv6Interface): IpNetwork.Ipv6Network
  (self: IpInterface): IpNetwork.IpNetwork
} = (self: any): any => IpNetwork.fromAddressUnsafe(self.address, self.prefixLength)
