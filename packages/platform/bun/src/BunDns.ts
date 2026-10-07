/**
 * The `BunDns` module provides Bun's `Dns` service for Effect programs.
 *
 * This adapter reuses the shared Node-compatible implementation, so address
 * lookups, record queries, and reverse lookups follow Bun's `node:dns`
 * compatibility layer.
 *
 * **Gotchas**
 *
 * Bun's resolver reports a name without records of the requested type as a
 * missing name, so both fail with `NotFound`. It also returns each chunk of a
 * multi-chunk TXT record as a separate record.
 *
 * @since 4.0.0
 */

/**
 * @since 4.0.0
 */
export * from "@effect/platform-node-shared/NodeDns"
