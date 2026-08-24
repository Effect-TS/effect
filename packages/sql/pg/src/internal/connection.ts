import type { SqlError } from "effect/unstable/sql/SqlError"

/** @internal */
export const internalsKey = "~@effect/sql-pg/PgConnection/internals" as const

/** @internal */
export interface ConnectionInternals {
  /** The pool item identity: the unpinned base connection. */
  readonly base: object
  readonly deadError: () => SqlError | undefined
  /** Fired once when the connection dies outside its own scope release. */
  readonly fatalHooks: Set<() => void>
}

/** @internal */
export const connectionInternals = (connection: object): ConnectionInternals =>
  (connection as Record<typeof internalsKey, ConnectionInternals>)[internalsKey]
