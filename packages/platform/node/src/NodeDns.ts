/**
 * The `NodeDns` module provides the Node.js `Dns` service for Effect programs.
 *
 * Address lookups use the operating system resolver through `dns.lookup`, so
 * they also read the hosts file. Record queries and reverse lookups share one
 * `dns.Resolver`. Node.js cannot cancel a single query or address lookup, so
 * interrupting one discards its result but lets the underlying work finish: a
 * query runs until it is answered or times out, and a `getaddrinfo` call keeps
 * a libuv thread pool worker busy until it returns.
 *
 * @stability experimental
 * @since 4.0.0
 */

/**
 * @stability experimental
 * @since 4.0.0
 */
export * from "@effect/platform-node-shared/NodeDns"
