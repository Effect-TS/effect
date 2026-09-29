import type { SqlError } from "effect/sql/SqlError"

/** @internal */
export const internalsKey = "~@effect/sql-mssql/MssqlConnection/internals" as const

/** @internal */
export interface ConnectionInternals {
  readonly deadError: () => SqlError | undefined
  /** Fired once when a pool must stop reusing the connection. */
  readonly retireHooks: Set<() => void>
}

/** @internal */
export const connectionInternals = (connection: object): ConnectionInternals =>
  (connection as Record<typeof internalsKey, ConnectionInternals>)[internalsKey]
