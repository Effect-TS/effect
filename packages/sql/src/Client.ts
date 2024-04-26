/**
 * @since 1.0.0
 */
import type { Tag } from "effect/Context"
import type { Effect } from "effect/Effect"
import type { Scope } from "effect/Scope"
import type { Connection } from "./Connection.js"
import type { SqlError } from "./Error.js"
import * as internal from "./internal/client.js"
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
export interface Client extends Constructor {
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
export namespace Client {
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
}: Client.MakeOptions) => Client = internal.make

/**
 * @since 1.0.0
 */
export const defaultTransforms: (
  transformer: (str: string) => string,
  nested?: boolean
) => {
  readonly value: (value: any) => any
  readonly object: (obj: Record<string, any>) => any
  readonly array: <A extends object>(rows: ReadonlyArray<A>) => ReadonlyArray<A>
} = internal.defaultTransforms

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
