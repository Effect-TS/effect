import type * as HttpClient from "effect/http/HttpClient"
import type * as Layer from "effect/Layer"
import * as NetAddress from "effect/net/NetAddress"
import * as Result from "effect/Result"
import * as Dns from "node:dns"
import type * as Net from "node:net"
import * as NodeHttpClient from "../NodeHttpClient.ts"

const normalizeHost = (host: string): string => {
  const lower = host.toLowerCase()
  return lower.startsWith("[") && lower.endsWith("]") ? lower.slice(1, -1) : lower
}

const isGlobalAddress = (address: string): boolean => {
  const parsed = NetAddress.ipFromString(address)
  return Result.isSuccess(parsed) && NetAddress.isGlobal(parsed.success)
}

const refusedError = (hostname: string): NodeJS.ErrnoException =>
  Object.assign(new Error(`Connection to ${hostname} refused: it is not a globally reachable host`), {
    code: "ECONNREFUSED",
    syscall: "lookup",
    hostname
  })

/**
 * Creates a `net.LookupFunction` that resolves with `dns.lookup` and returns
 * only addresses it has checked: every address must be globally reachable
 * unless the host is in `allowedHosts`. Connecting through this lookup pins
 * the connection to a checked address, so DNS rebinding between the guard's
 * check and the connection cannot reach a refused address.
 *
 * @internal
 */
export const makeLookup = (allowedHosts: ReadonlyArray<string>): Net.LookupFunction => {
  const allowed = new Set(allowedHosts.map(normalizeHost))
  return (hostname, options, callback) => {
    const isAllowed = allowed.has(normalizeHost(hostname))
    Dns.lookup(hostname, { ...options, all: true }, (error, addresses) => {
      if (error) return callback(error, "", undefined)
      if (addresses.length === 0 || (!isAllowed && !addresses.every((entry) => isGlobalAddress(entry.address)))) {
        return callback(refusedError(hostname), "", undefined)
      }
      if (options.all) return callback(null, addresses)
      return callback(null, addresses[0].address, addresses[0].family)
    })
  }
}

/**
 * A node:http client that connects only to addresses accepted by
 * {@link makeLookup}. Node skips `lookup` for IP-literal URLs, which the
 * callback guard checks before every request instead. node:http never follows
 * redirects.
 *
 * @internal
 */
export const layerHttpClient = (allowedHosts: ReadonlyArray<string>): Layer.Layer<HttpClient.HttpClient> =>
  NodeHttpClient.layerNodeHttpOptions({ lookup: makeLookup(allowedHosts) })
