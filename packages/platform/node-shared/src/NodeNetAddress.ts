/**
 * Network address conversion using Node-compatible network interface metadata.
 *
 * @since 4.0.0
 */
import * as Result from "effect/Result"
import * as NetAddress from "effect/unstable/net/NetAddress"
import * as Os from "node:os"

/**
 * Parses a numeric host and port, resolving named IPv6 zones through the host's
 * network interfaces.
 *
 * **Gotchas**
 *
 * Throws when the address or port is invalid, a named IPv6 zone cannot be
 * resolved, or the network interface lookup fails.
 *
 * @category unsafe
 * @since 4.0.0
 */
export const inetAddressFromHostStringUnsafe = (host: string, port: number): NetAddress.InetAddress =>
  Result.getOrThrow(NetAddress.inetAddressFromHostString(
    host,
    port,
    host.includes("%") ? NetAddress.scopeIdsFromInterfaces(Object.entries(Os.networkInterfaces())) : undefined
  ))
