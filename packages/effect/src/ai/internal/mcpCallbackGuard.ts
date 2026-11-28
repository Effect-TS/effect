/**
 * The default webhook callback guard: refuses hosts that resolve to addresses
 * that are not globally routable.
 */
import * as Effect from "../../Effect.ts"
import * as Equal from "../../Equal.ts"
import * as Dns from "../../net/Dns.ts"
import * as NetAddress from "../../net/NetAddress.ts"
import * as Result from "../../Result.ts"

/**
 * @internal
 */
export interface Guard {
  // Fails with the reason the URL is refused.
  readonly check: (url: URL) => Effect.Effect<void, string>
  readonly allowsPlaintext: (url: URL) => boolean
}

// The reason is deliberately generic so a refusal does not reveal whether the
// host is an address, failed to resolve, or resolved to a refused address.
const refused = Effect.fail("callback host is not allowed")

// Lower case, without the brackets around an IPv6 literal.
const normalizeHost = (host: string): string => {
  const lower = host.toLowerCase()
  return lower.startsWith("[") && lower.endsWith("]") ? lower.slice(1, -1) : lower
}

// Matches normalized hosts against host names and IP literals. An IP literal
// matches any spelling of the same address.
const makeHostMatcher = (allowedHosts: ReadonlyArray<string>): (host: string) => boolean => {
  const names = new Set<string>()
  const addresses: Array<NetAddress.IpAddress> = []
  for (const entry of allowedHosts) {
    const host = normalizeHost(entry)
    names.add(host)
    const address = NetAddress.ipFromString(host)
    if (Result.isSuccess(address)) addresses.push(address.success)
  }
  return (host) => {
    if (names.has(host)) return true
    if (addresses.length === 0) return false
    const address = NetAddress.ipFromString(host)
    return Result.isSuccess(address) && addresses.some((allowed) => Equal.equals(allowed, address.success))
  }
}

/**
 * @internal
 */
export const make = (options: {
  readonly allowedHosts?: ReadonlyArray<string> | undefined
}): Effect.Effect<Guard, never, Dns.Dns> =>
  Effect.gen(function*() {
    const dns = yield* Dns.Dns
    const isAllowed = makeHostMatcher(options.allowedHosts ?? [])
    return {
      check: (url) => {
        const host = normalizeHost(url.hostname)
        if (host === "") return refused
        if (isAllowed(host)) return Effect.void
        const literal = NetAddress.ipFromString(host)
        if (Result.isSuccess(literal)) {
          return NetAddress.isGlobal(literal.success) ? Effect.void : refused
        }
        return dns.lookup(host).pipe(
          Effect.matchEffect({
            onFailure: () => refused,
            onSuccess: (addresses) =>
              addresses.length > 0 && addresses.every(NetAddress.isGlobal) ? Effect.void : refused
          })
        )
      },
      allowsPlaintext: (url) => isAllowed(normalizeHost(url.hostname))
    } satisfies Guard
  })
