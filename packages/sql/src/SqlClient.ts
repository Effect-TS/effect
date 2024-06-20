/**
 * @since 1.0.0
 */
import type { Tag } from "effect/Context"
import type { Effect } from "effect/Effect"
import type { Scope } from "effect/Scope"
import * as internal from "./internal/client.js"
import type { Connection } from "./SqlConnection.js"
import type { SqlError } from "./SqlError.js"
import type { Compiler, Constructor } from "./Statement.js"

/**
 * @category type ids
 * @since 1.0.0
 */
export const TypeId: unique symbol = internal.TypeId

/**
 * @category type ids
 * @since 1.0.0
 */
export type TypeId = typeof TypeId

/**
 * @category models
 * @since 1.0.0
 */
export interface SqlClient extends Constructor {
  readonly [TypeId]: TypeId

  /**
   * Copy of the client for safeql etc.
   */
  readonly safe: this

  readonly reserve: Effect<Connection, SqlError, Scope>

  /**
   * With the given effect, ensure all sql queries are run in a transaction.
   */
  readonly withTransaction: <R, E, A>(
    self: Effect<A, E, R>
  ) => Effect<A, E | SqlError, R>
}

/**
 * @category models
 * @since 1.0.0
 */
export const SqlClient: Tag<SqlClient, SqlClient> = internal.clientTag

/**
 * @category models
 * @since 1.0.0
 */
export namespace SqlClient {
  /**
   * @category models
   * @since 1.0.0
   */
  export interface MakeOptions {
    readonly acquirer: Connection.Acquirer
    readonly compiler: Compiler
    readonly transactionAcquirer: Connection.Acquirer
    readonly spanAttributes: ReadonlyArray<readonly [string, unknown]>
    readonly beginTransaction?: string | undefined
    readonly rollback?: string | undefined
    readonly commit?: string | undefined
    readonly savepoint?: ((name: string) => string) | undefined
    readonly rollbackSavepoint?: ((name: string) => string) | undefined
  }
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const make: ({
  acquirer,
  beginTransaction,
  commit,
  rollback,
  rollbackSavepoint,
  savepoint,
  transactionAcquirer
}: SqlClient.MakeOptions) => SqlClient = internal.make

/**
 * @since 1.0.0
 */
export interface TransactionConnection {
  readonly _: unique symbol
}

/**
 * @since 1.0.0
 */
export const TransactionConnection: Tag<TransactionConnection, readonly [conn: Connection, depth: number]> =
  internal.TransactionConnection
