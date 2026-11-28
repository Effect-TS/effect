/**
 * Deno implementation of the `DnsClient` service, shared with Node.js.
 * Requires `--allow-net`. Deno does not report unreachable UDP ports, so
 * queries to them fail with `Timeout` instead of `Refused`.
 *
 * @stability experimental
 * @since 4.0.0
 */

/**
 * @stability experimental
 * @since 4.0.0
 */
export * from "@effect/platform-node-shared/NodeDnsClient"
