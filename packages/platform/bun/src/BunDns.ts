/**
 * The `BunDns` module provides Bun's `Dns` service for Effect programs.
 *
 * This adapter reuses the shared Node-compatible implementation, so address
 * lookups, record queries, and reverse lookups follow Bun's `node:dns`
 * compatibility layer.
 *
 * **Gotchas**
 *
 * Bun returns each character string of a TXT record as a separate record, so
 * a record made of several strings arrives as several TXT records whose chunks
 * cannot be reassembled (https://github.com/oven-sh/bun/issues/44692).
 *
 * @since 4.0.0
 */

/**
 * @since 4.0.0
 */
export * from "@effect/platform-node-shared/NodeDns"
