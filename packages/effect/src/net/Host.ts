/**
 * Pure, platform-neutral host names and unresolved host and port endpoints.
 *
 * A `Host` is either a numeric IP address, an IPv6 literal with a zone such as
 * `fe80::1%eth0`, or a DNS domain name. Numeric addresses are parsed directly
 * into `NetAddress` values; domain names stay unresolved until they are looked
 * up with the `Dns` service.
 *
 * @stability unstable
 * @since 4.0.0
 */
import type * as Brand from "../Brand.ts"
import * as Equal from "../Equal.ts"
import * as Hash from "../Hash.ts"
import * as Inspectable from "../Inspectable.ts"
import { hasProperty } from "../Predicate.ts"
import * as Result from "../Result.ts"
import * as NetAddress from "./NetAddress.ts"

const TypeId = "~effect/net/Host" as const
const DomainNameTypeId = "~effect/net/Host/DomainName" as const

/**
 * A syntactically valid DNS domain name in lowercase ASCII form.
 *
 * **Details**
 *
 * Names follow the rules used by Go's resolver: at most 253 characters, labels
 * of 1 to 63 letters, digits, hyphens, or underscores, and no label starting or
 * ending with a hyphen. Underscores are allowed so that service names such as
 * `_http._tcp.example.com` are valid. The last label must not be numeric, which
 * keeps IPv4-like strings out. A trailing dot marks a fully qualified name and
 * is preserved. The root name `.` is valid.
 *
 * Internationalized names are stored in their ASCII (`xn--`) form.
 *
 * @see {@link domainNameFromString} for parsing and normalizing domain names
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export type DomainName = Brand.Branded<string, typeof DomainNameTypeId>

/**
 * A host as written in configuration or a URL authority: a numeric IP address,
 * a scoped IPv6 literal, or a domain name.
 *
 * @see {@link hostFromString} for parsing hosts
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export type Host = NetAddress.IpAddress | NetAddress.ScopedIpv6Literal | DomainName

/**
 * An unresolved host and port.
 *
 * @see {@link hostPortFromString} for parsing `host:port` strings
 * @see {@link formatHostPort} for formatting `host:port` strings
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface HostPort extends Equal.Equal, Hash.Hash, Inspectable.Inspectable {
  readonly _tag: "HostPort"
  readonly host: Host
  readonly port: number
  readonly [TypeId]: typeof TypeId
}

const hostError = (input: unknown, message: string): Result.Result<never, NetAddress.NetAddressError> =>
  Result.fail(new NetAddress.NetAddressError({ input, message }))

const asciiNameCharacter = /^[a-z0-9_.-]$/i
const labelPattern = /^[a-z0-9_](?:[a-z0-9_-]{0,61}[a-z0-9_])?$/
const numericLabel = /^(?:\d+|0x[0-9a-f]*)$/

const validateDomainName = (name: string): string | undefined => {
  if (name === ".") return undefined
  const relative = name.endsWith(".") ? name.slice(0, -1) : name
  if (relative.length === 0) return "domain name must not be empty"
  if (relative.length > 253) return "domain name must be at most 253 characters"
  const labels = relative.split(".")
  for (const label of labels) {
    if (label.length === 0) return "domain name labels must not be empty"
    if (label.length > 63) return "domain name labels must be at most 63 characters"
    if (!labelPattern.test(label)) {
      return "domain name labels must contain only letters, digits, hyphens, or underscores and must not start or end with a hyphen"
    }
  }
  if (numericLabel.test(labels[labels.length - 1])) {
    return "the last domain name label must not be numeric"
  }
  return undefined
}

const toAsciiDomainName = (input: string): string | undefined => {
  let ascii = true
  for (const character of input) {
    if (character.charCodeAt(0) < 0x80) {
      if (!asciiNameCharacter.test(character)) return undefined
    } else {
      ascii = false
    }
  }
  if (ascii) return input.toLowerCase()
  try {
    return new URL(`http://${input}`).hostname
  } catch {
    return undefined
  }
}

/**
 * Returns `true` when a value is a valid, normalized domain name.
 *
 * @stability unstable
 * @category guards
 * @since 4.0.0
 */
export const isDomainName = (u: unknown): u is DomainName =>
  typeof u === "string" && u === u.toLowerCase() && toAsciiDomainName(u) === u && validateDomainName(u) === undefined

/**
 * Returns `true` when a value is a host.
 *
 * @stability unstable
 * @category guards
 * @since 4.0.0
 */
export const isHost = (u: unknown): u is Host =>
  NetAddress.isIpAddress(u) || NetAddress.isScopedIpv6Literal(u) || isDomainName(u)

/**
 * Returns `true` when a value is an unresolved host and port.
 *
 * @stability unstable
 * @category guards
 * @since 4.0.0
 */
export const isHostPort = (u: unknown): u is HostPort => hasProperty(u, TypeId)

/**
 * Parses and normalizes a domain name.
 *
 * **Details**
 *
 * ASCII names are lowercased. Names containing non-ASCII characters are
 * converted to their ASCII (`xn--`) form using the WHATWG URL host parser, then
 * validated with the same rules as ASCII names. A trailing dot is preserved.
 *
 * **Example** (Normalizing domain names)
 *
 * ```ts import.meta.vitest
 * import { Result } from "effect"
 * import { Host } from "effect/net"
 *
 * Result.getOrThrow(Host.domainNameFromString("Example.COM")) // => "example.com"
 * Result.getOrThrow(Host.domainNameFromString("bücher.example")) // => "xn--bcher-kva.example"
 * Result.isFailure(Host.domainNameFromString("1.2.3.4")) // => true
 * ```
 *
 * @stability unstable
 * @category decoding
 * @since 4.0.0
 */
export const domainNameFromString = (input: string): Result.Result<DomainName, NetAddress.NetAddressError> => {
  const name = toAsciiDomainName(input)
  if (name === undefined) return hostError(input, "invalid domain name")
  const error = validateDomainName(name)
  return error === undefined ? Result.succeed(name as DomainName) : hostError(input, error)
}

/**
 * Parses a trusted domain name, throwing on failure.
 *
 * @stability unstable
 * @category unsafe
 * @since 4.0.0
 */
export const domainNameFromStringUnsafe = (input: string): DomainName => Result.getOrThrow(domainNameFromString(input))

/**
 * Parses a host as a numeric IP address, a scoped IPv6 literal, or a domain
 * name, in that order.
 *
 * **Example** (Parsing hosts)
 *
 * ```ts import.meta.vitest
 * import { Result } from "effect"
 * import { Host, NetAddress } from "effect/net"
 *
 * NetAddress.isIpAddress(Result.getOrThrow(Host.hostFromString("10.0.0.5"))) // => true
 * Result.getOrThrow(Host.hostFromString("fe80::1%eth0")) // => "fe80::1%eth0"
 * Result.getOrThrow(Host.hostFromString("DB.internal")) // => "db.internal"
 * ```
 *
 * @stability unstable
 * @category decoding
 * @since 4.0.0
 */
export const hostFromString = (input: string): Result.Result<Host, NetAddress.NetAddressError> => {
  const address = NetAddress.ipFromString(input)
  if (Result.isSuccess(address)) return address
  if (input.includes("%")) return NetAddress.scopedIpv6LiteralFromString(input)
  if (input.includes(":")) return address
  return domainNameFromString(input)
}

/**
 * Parses a trusted host, throwing on failure.
 *
 * @stability unstable
 * @category unsafe
 * @since 4.0.0
 */
export const hostFromStringUnsafe = (input: string): Host => Result.getOrThrow(hostFromString(input))

/**
 * Formats a host without brackets.
 *
 * @stability unstable
 * @category encoding
 * @since 4.0.0
 */
export const formatHost = (self: Host): string => typeof self === "string" ? self : NetAddress.formatIp(self)

/**
 * Returns `true` when a domain name ends with a dot, which excludes it from
 * resolver search domains.
 *
 * @stability unstable
 * @category predicates
 * @since 4.0.0
 */
export const isFullyQualified = (self: DomainName): boolean => self.endsWith(".")

const HostPortProto = {
  ...Inspectable.BaseProto,
  _tag: "HostPort",
  [TypeId]: TypeId,
  [Equal.symbol](this: HostPort, that: Equal.Equal): boolean {
    return isHostPort(that) && this.port === that.port && Equal.equals(this.host, that.host)
  },
  [Hash.symbol](this: HostPort): number {
    return Hash.combine(Hash.hash(this.host), Hash.number(this.port))
  },
  toString(this: HostPort): string {
    return formatHostPort(this)
  },
  toJSON(this: HostPort): string {
    return this.toString()
  }
}

const isPort = (port: number): boolean => Number.isInteger(port) && port >= 0 && port <= 0xffff

const makeHostPort = (host: Host, port: number): HostPort => {
  const self = Object.create(HostPortProto)
  self.host = host
  self.port = port
  return Object.freeze(self)
}

/**
 * Creates a checked host and port.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const hostPort = (host: Host, port: number): Result.Result<HostPort, NetAddress.NetAddressError> => {
  if (!isHost(host)) return hostError(host, "expected a host")
  if (!isPort(port)) return hostError(port, "port must be an integer from 0 through 65535")
  return Result.succeed(makeHostPort(host, port))
}

/**
 * Creates a trusted host and port, throwing on failure.
 *
 * @stability unstable
 * @category unsafe
 * @since 4.0.0
 */
export const hostPortUnsafe = (host: Host, port: number): HostPort => Result.getOrThrow(hostPort(host, port))

/**
 * Parses `host:port`, `[IPv6]:port`, or `[IPv6%zone]:port`.
 *
 * **Details**
 *
 * IPv6 hosts must be bracketed and other hosts must not be. The port is
 * required and must be an unpadded decimal integer from 0 through 65535.
 *
 * **Example** (Parsing host and port strings)
 *
 * ```ts import.meta.vitest
 * import { Result } from "effect"
 * import { Host } from "effect/net"
 *
 * const endpoint = Result.getOrThrow(Host.hostPortFromString("DB.internal:5432"))
 * endpoint.host // => "db.internal"
 * endpoint.port // => 5432
 * Host.formatHostPort(Result.getOrThrow(Host.hostPortFromString("[::1]:80"))) // => "[::1]:80"
 * ```
 *
 * @see {@link formatHostPort} for the inverse operation
 * @stability unstable
 * @category decoding
 * @since 4.0.0
 */
export const hostPortFromString = (input: string): Result.Result<HostPort, NetAddress.NetAddressError> => {
  let hostText: string
  let portText: string
  if (input.startsWith("[")) {
    const end = input.indexOf("]")
    if (end === -1 || input[end + 1] !== ":") return hostError(input, "expected [IPv6]:port")
    hostText = input.slice(1, end)
    portText = input.slice(end + 2)
    if (!hostText.includes(":")) return hostError(input, "only IPv6 addresses use brackets")
  } else {
    const separator = input.lastIndexOf(":")
    if (separator === -1) return hostError(input, "expected host:port")
    if (input.indexOf(":") !== separator) return hostError(input, "IPv6 addresses must be bracketed")
    hostText = input.slice(0, separator)
    portText = input.slice(separator + 1)
  }
  if (!/^(0|[1-9]\d*)$/.test(portText)) {
    return hostError(input, "port must be an unpadded decimal integer")
  }
  const port = Number(portText)
  if (!isPort(port)) return hostError(input, "port must be an integer from 0 through 65535")
  return Result.map(hostFromString(hostText), (host) => makeHostPort(host, port))
}

/**
 * Parses a trusted `host:port` string, throwing on failure.
 *
 * @stability unstable
 * @category unsafe
 * @since 4.0.0
 */
export const hostPortFromStringUnsafe = (input: string): HostPort => Result.getOrThrow(hostPortFromString(input))

/**
 * Formats a host and port, bracketing IPv6 hosts.
 *
 * @see {@link hostPortFromString} for the inverse operation
 * @stability unstable
 * @category encoding
 * @since 4.0.0
 */
export const formatHostPort = (self: HostPort): string => {
  const host = formatHost(self.host)
  return host.includes(":") ? `[${host}]:${self.port}` : `${host}:${self.port}`
}
