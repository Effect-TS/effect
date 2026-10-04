/** @internal */
export const internalsKey = "~@effect/sql-mysql/MysqlConnection/internals" as const

/** @internal */
export interface ConnectionInternals {
  readonly isDead: () => boolean
  /** Fired once when the connection dies outside its own scope release. */
  readonly fatalHooks: Set<() => void>
}

/** @internal */
export const connectionInternals = (connection: object): ConnectionInternals =>
  (connection as Record<typeof internalsKey, ConnectionInternals>)[internalsKey]
