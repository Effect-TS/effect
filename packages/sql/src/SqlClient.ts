/**
 * @since 1.0.0
 */
import type { Reactivity } from "@effect/experimental/Reactivity"
import type { Tag } from "effect/Context"
import * as Context from "effect/Context"
import type { Effect } from "effect/Effect"
import type { ReadonlyMailbox } from "effect/Mailbox"
import type { ReadonlyRecord } from "effect/Record"
import type { CloseableScope, Scope } from "effect/Scope"
import type { Stream } from "effect/Stream"
import type { NoInfer } from "effect/Types"
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

  /**
   * Copy of the client without transformations.
   */
  readonly withoutTransforms: () => this

  readonly reserve: Effect<Connection, SqlError, Scope>

  /**
   * With the given effect, ensure all sql queries are run in a transaction.
   */
  readonly withTransaction: <R, E, A>(
    self: Effect<A, E, R>
  ) => Effect<A, E | SqlError, R>

  /**
   * Use the Reactivity service from @effect/experimental to create a reactive
   * query.
   */
  readonly reactive: <A, E, R>(
    keys: ReadonlyArray<unknown> | ReadonlyRecord<string, ReadonlyArray<unknown>>,
    effect: Effect<A, E, R>
  ) => Stream<A, E, R>
  /**
   * Use the Reactivity service from @effect/experimental to create a reactive
   * query.
   */
  readonly reactiveMailbox: <A, E, R>(
    keys: ReadonlyArray<unknown> | ReadonlyRecord<string, ReadonlyArray<unknown>>,
    effect: Effect<A, E, R>
  ) => Effect<ReadonlyMailbox<A, E>, never, R | Scope>
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
    readonly transactionAcquirer?: Connection.Acquirer
    readonly spanAttributes: ReadonlyArray<readonly [string, unknown]>
    readonly beginTransaction?: string | undefined
    readonly rollback?: string | undefined
    readonly commit?: string | undefined
    readonly savepoint?: ((name: string) => string) | undefined
    readonly rollbackSavepoint?: ((name: string) => string) | undefined
    readonly transformRows?: (<A extends object>(row: ReadonlyArray<A>) => ReadonlyArray<A>) | undefined
    readonly reactiveMailbox?: <A, E, R>(
      keys: ReadonlyArray<unknown> | ReadonlyRecord<string, ReadonlyArray<unknown>>,
      effect: Effect<A, E, R>
    ) => Effect<ReadonlyMailbox<A, E>, never, R | Scope>
  }
}

/**
 * @category constructors
 * @since 1.0.0
 */
export const make: (options: SqlClient.MakeOptions) => Effect<SqlClient, never, Reactivity> = internal.make

/**
 * @since 1.0.0
 * @category transactions
 */
export const makeWithTransaction: <I, S>(
  options: {
    readonly transactionTag: Tag<I, readonly [conn: S, counter: number]>
    readonly spanAttributes: ReadonlyArray<readonly [string, unknown]>
    readonly acquireConnection: Effect<readonly [CloseableScope | undefined, S], SqlError>
    readonly begin: (conn: NoInfer<S>) => Effect<void, SqlError>
    readonly savepoint: (conn: NoInfer<S>, id: number) => Effect<void, SqlError>
    readonly commit: (conn: NoInfer<S>) => Effect<void, SqlError>
    readonly rollback: (conn: NoInfer<S>) => Effect<void, SqlError>
    readonly rollbackSavepoint: (conn: NoInfer<S>, id: number) => Effect<void, SqlError>
  }
) => <R, E, A>(effect: Effect<A, E, R>) => Effect<A, E | SqlError, R> = internal.makeWithTransaction

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

/**
 * @since 1.0.0
 */
export class SafeIntegers extends Context.Reference<SafeIntegers>()("@effect/sql/SqlClient/SafeIntegers", {
  defaultValue: () => false
}) {}
