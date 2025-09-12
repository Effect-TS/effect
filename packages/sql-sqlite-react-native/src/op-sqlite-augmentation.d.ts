/**
 * Temporary ambient augmentation for `@op-engineering/op-sqlite`.
 *
 * Why this file exists
 * - Under TypeScript `moduleResolution: "NodeNext"`, value exports that come through
 *   `export * from './functions'` do not show up in the public type definitions unless
 *   that subpath is explicitly listed in the package `exports` map.
 * - In `@op-engineering/op-sqlite@15.0.3`, this means `open` (and friends) are
 *   available at runtime but are not visible to the type system when doing
 *   `import * as Sqlite from '@op-engineering/op-sqlite'`.
 * - Our code calls `Sqlite.open(...)`, which triggers TS2339/TS2305 without this
 *   augmentation when using NodeNext.
 *
 * What this does
 * - Minimally augments the module to surface the `open` function and a narrow `DB`
 *   shape that covers only what we use here (close/executeSync/executeAsync).
 * - This merges with the library’s existing types; it does not replace them.
 *
 * Removal plan
 * - TODO: Remove this file once upstream publishes a fix that explicitly re‑exports
 *   these functions in the types entry (see tracking PR below). At that point,
 *   `Sqlite.open` should type‑check without any local augmentation.
 *
 * More details
 * - Upstream PR: https://github.com/OP-Engineering/op-sqlite/pull/324
 */

declare module "@op-engineering/op-sqlite" {
  /** Minimal DB shape needed by this package */
  export type DB = {
    close(): void
    executeSync(query: string, params?: Array<unknown>): { rows?: Array<unknown> }
    executeAsync(query: string, params?: Array<unknown>): Promise<{ rows?: Array<unknown> }>
  }

  /** Open a local sqlite/sqlcipher database */
  export function open(options: {
    name: string
    location?: string
    encryptionKey?: string
  }): DB
}
