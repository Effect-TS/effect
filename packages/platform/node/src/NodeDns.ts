/**
 * The `NodeDns` module provides the Node.js `Dns` service for Effect programs.
 *
 * Address lookups use the operating system resolver through `dns.lookup`, so
 * they also read the hosts file. Record queries and reverse lookups use
 * `dns.Resolver` and can be cancelled by interruption. Interrupting an address
 * lookup does not stop the underlying `getaddrinfo` call, which keeps a libuv
 * thread pool worker busy until it returns.
 *
 * @stability unstable
 * @since 4.0.0
 */

/**
 * @stability unstable
 * @since 4.0.0
 */
export * from "@effect/platform-node-shared/NodeDns"
