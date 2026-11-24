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

// The host of a URL without the brackets around an IPv6 literal.
const urlHost = (url: URL): string => {
  const host = url.hostname.toLowerCase()
  return host.startsWith("[") && host.endsWith("]") ? host.slice(1, -1) : host
}

// Matches hosts against host names and IP literals case-insensitively. An IP
// literal matches any spelling of the same address.
const makeHostMatcher = (allowedHosts: ReadonlyArray<string>): (host: string) => boolean => {
  const names = new Set<string>()
  const addresses: Array<NetAddress.IpAddress> = []
  for (const entry of allowedHosts) {
    let host = entry.toLowerCase()
    if (host.startsWith("[") && host.endsWith("]")) host = host.slice(1, -1)
    names.add(host)
    const address = NetAddress.ipFromString(host)
    if (Result.isSuccess(address)) addresses.push(address.success)
  }
  return (host) => {
    const normalized = host.toLowerCase()
    if (names.has(normalized)) return true
    if (addresses.length === 0) return false
    const address = NetAddress.ipFromString(normalized)
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
        const host = urlHost(url)
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
      allowsPlaintext: (url) => isAllowed(urlHost(url))
    } satisfies Guard
  })
