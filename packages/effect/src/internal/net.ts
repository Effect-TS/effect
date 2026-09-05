import * as Data from "../Data.ts"
import * as Result from "../Result.ts"
import * as NetAddress from "../unstable/net/NetAddress.ts"

interface IpValue {
  readonly address: NetAddress.IpAddress
  readonly prefixLength: number
}

/** @internal */
export class ParseError extends Data.TaggedError("ParseError")<{
  readonly cause?: unknown
  readonly input: unknown
  readonly message: string
}> {}

/** @internal */
export interface ParsedIp<A extends NetAddress.IpAddress> {
  readonly address: A
  readonly prefixLength: number
}

/** @internal */
export const width = (address: NetAddress.IpAddress): 32 | 128 => NetAddress.isIpv4Address(address) ? 32 : 128

/** @internal */
export const checkPrefixLength = (
  address: NetAddress.IpAddress,
  prefixLength: number
): boolean => Number.isInteger(prefixLength) && prefixLength >= 0 && prefixLength <= width(address)

/** @internal */
export const make = <A extends IpValue>(
  address: NetAddress.IpAddress,
  prefixLength: number,
  ipv4Proto: object,
  ipv6Proto: object
): A => {
  const self = Object.create(NetAddress.isIpv4Address(address) ? ipv4Proto : ipv6Proto)
  self.address = address
  self.prefixLength = prefixLength
  return Object.freeze(self)
}

/** @internal */
export const parse = <A extends NetAddress.IpAddress>(
  input: string,
  prefixRequired: boolean,
  parseAddress: (input: string) => Result.Result<A, { readonly message: string }>
): Result.Result<ParsedIp<A>, ParseError> => {
  const slash = input.indexOf("/")
  if (
    (prefixRequired ? slash <= 0 : slash === 0) ||
    slash !== input.lastIndexOf("/") ||
    (slash !== -1 && slash === input.length - 1)
  ) {
    const message = prefixRequired
      ? "expected an address and prefix length separated by one slash"
      : "expected an address with at most one trailing prefix length"
    return Result.fail(new ParseError({ input, message }))
  }
  let prefixLength: number | undefined
  if (slash !== -1) {
    const prefix = input.slice(slash + 1)
    if (!/^(0|[1-9][0-9]*)$/.test(prefix)) {
      return Result.fail(
        new ParseError({
          input: prefix,
          message: "prefix length must be an unpadded ASCII decimal integer"
        })
      )
    }
    prefixLength = Number(prefix)
  }
  const address = parseAddress(slash === -1 ? input : input.slice(0, slash))
  if (Result.isFailure(address)) {
    return Result.fail(
      new ParseError({
        cause: address.failure,
        input,
        message: "failed to parse an IP address"
      })
    )
  }
  return Result.succeed({ address: address.success, prefixLength: prefixLength ?? width(address.success) })
}

/** @internal */
export const format = (self: IpValue): string => `${NetAddress.formatIp(self.address)}/${self.prefixLength}`
