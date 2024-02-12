/**
 * @since 1.0.0
 */
import type { Schema } from "@effect/schema/Schema"
import type { Context, Tag } from "effect/Context"
import type { Effect } from "effect/Effect"
import type { Option } from "effect/Option"
import type * as request from "effect/Request"
import type { RequestResolver } from "effect/RequestResolver"
import type { Scope } from "effect/Scope"
import type { Connection } from "./Connection.js"
import type { ResultLengthMismatch, SchemaError, SqlError } from "./Error.js"
import * as internal from "./internal/client.js"
import type { Compiler, Constructor, Fragment, Primitive, Statement } from "./Statement.js"

/**
 * @category model
 * @since 1.0.0
 */
export interface Client extends Constructor {
  /**
   * Copy of the client for safeql etc.
   */
  readonly safe: this

  /**
   * Create unsafe SQL query
   */
  readonly unsafe: <A extends object>(
    sql: string,
    params?: ReadonlyArray<Primitive> | undefined
  ) => Statement<A>

  /**
   * Create an `AND` chain for a where clause
   */
  readonly and: (clauses: ReadonlyArray<string | Fragment>) => Fragment

  /**
   * Create an `OR` chain for a where clause
   */
  readonly or: (clauses: ReadonlyArray<string | Fragment>) => Fragment

  /**
   * Create comma seperated values, with an optional prefix
   *
   * Useful for `ORDER BY` and `GROUP BY` clauses
   */
  readonly csv: {
    (values: ReadonlyArray<string | Fragment>): Fragment
    (prefix: string, values: ReadonlyArray<string | Fragment>): Fragment
  }

  readonly join: (
    literal: string,
    addParens?: boolean,
    fallback?: string
  ) => (clauses: ReadonlyArray<string | Fragment>) => Fragment

  readonly reserve: Effect<Connection, SqlError, Scope>

  /**
   * With the given effect, ensure all sql queries are run in a transaction.
   *
   * Note: This will not include query run inside request resolvers.
   */
  withTransaction<R, E, A>(
    self: Effect<A, E, R>
  ): Effect<A, E | SqlError, R>

  /**
   * Run a sql query with a request schema and a result schema.
   *
   * The request schema is used to validate the input of the query.
   * The result schema is used to validate the output of the query.
   */
  schema<IR, II, IA, AR, AI, A, R, E>(
    requestSchema: Schema<IA, II, IR>,
    resultSchema: Schema<A, AI, AR>,
    run: (_: II) => Effect<ReadonlyArray<unknown>, E, R>
  ): (_: IA) => Effect<ReadonlyArray<A>, E | SchemaError, R | IR | AR>

  /**
   * Run a sql query with a request schema that returns void.
   */
  schemaVoid<IR, II, IA, R, E>(
    requestSchema: Schema<IA, II, IR>,
    run: (_: II) => Effect<unknown, E, R>
  ): (_: IA) => Effect<void, E | SchemaError, R | IR>

  /**
   * Run a sql query with a request schema and a result schema.
   *
   * The request schema is used to validate the input of the query.
   * The result schema is used to validate the output of the query.
   *
   * Takes the first result of the query.
   */
  schemaSingle<IR, II, IA, AR, AI, A, R, E>(
    requestSchema: Schema<IA, II, IR>,
    resultSchema: Schema<A, AI, AR>,
    run: (_: II) => Effect<ReadonlyArray<unknown>, E, R>
  ): (_: IA) => Effect<A, E | SchemaError, R | IR | AR>

  /**
   * Run a sql query with a request schema and a result schema.
   *
   * The request schema is used to validate the input of the query.
   * The result schema is used to validate the output of the query.
   *
   * Returns an Option of the first result of the query.
   */
  schemaSingleOption<IR, II, IA, AR, AI, A, R, E>(
    requestSchema: Schema<IA, II, IR>,
    resultSchema: Schema<A, AI, AR>,
    run: (_: II) => Effect<ReadonlyArray<unknown>, E, R>
  ): (_: IA) => Effect<Option<A>, E | SchemaError, R | IR | AR>

  /**
   * Create a resolver for a sql query with a request schema and a result schema.
   *
   * Takes a tag parameter to identify the requests.
   *
   * The request schema is used to validate the input of the query.
   * The result schema is used to validate the output of the query.
   *
   * Returns a resolver, request and a execute function.
   */

  resolver<T extends string, R, IR, II, IA, AR, AI, A, E>(
    tag: T,
    options: {
      readonly request: Schema<IA, II, IR>
      readonly result: Schema<A, AI, AR>
      readonly run: (
        requests: ReadonlyArray<II>
      ) => Effect<ReadonlyArray<unknown>, E, R>
    }
  ): Resolver<T, R | IR | AR, IA, A, E | ResultLengthMismatch>

  /**
   * Create a resolver for a sql query with a request schema and a result schema.
   * Returns an Option of the first result of the query.
   *
   * Takes a tag parameter to identify the requests.
   *
   * The request schema is used to validate the input of the query.
   * The result schema is used to validate the output of the query.
   *
   * Returns a resolver, request and a execute function.
   */
  resolverSingleOption<T extends string, R, IR, II, IA, AR, AI, A, E>(
    tag: T,
    options: {
      readonly request: Schema<IA, II, IR>
      readonly result: Schema<A, AI, AR>
      readonly run: (request: II) => Effect<ReadonlyArray<unknown>, E, R>
    }
  ): Resolver<T, R | IR | AR, IA, Option<A>, E>

  /**
   * Create a resolver for a sql query with a request schema and a result schema.
   * Returns the first result of the query.
   *
   * Takes a tag parameter to identify the requests.
   *
   * The request schema is used to validate the input of the query.
   * The result schema is used to validate the output of the query.
   *
   * Returns a resolver, request and a execute function.
   */
  resolverSingle<T extends string, R, IR, II, IA, AR, AI, A, E>(
    tag: T,
    options: {
      readonly request: Schema<IA, II, IR>
      readonly result: Schema<A, AI, AR>
      readonly run: (request: II) => Effect<ReadonlyArray<unknown>, E, R>
    }
  ): Resolver<T, R | IR | AR, IA, A, E>

  /**
   * Create a resolver for a sql query with a request schema.
   * Returns no result.
   *
   * Takes a tag parameter to identify the requests.
   *
   * The request schema is used to validate the input of the query.
   *
   * Returns a resolver, request and a execute function.
   */
  resolverVoid<T extends string, R, IR, II, IA, E>(
    tag: T,
    options: {
      readonly request: Schema<IA, II, IR>
      readonly run: (
        requests: ReadonlyArray<II>
      ) => Effect<unknown, E, R>
    }
  ): Resolver<T, R | IR, IA, void, E>

  /**
   * Create a resolver for a sql query with a request schema and a result schema.
   * Returns an array of the potentially matching results.
   *
   * Takes a tag parameter to identify the requests.
   * Takes a function to extract the id from the request and result.
   *
   * Returns a resolver, request and an execute function.
   */
  resolverId<T extends string, R, IR, II, IA, AR, AI, A, E>(
    tag: T,
    options: {
      readonly id: Schema<IA, II, IR>
      readonly result: Schema<A, AI, AR>
      readonly resultId: (_: AI) => IA
      readonly run: (
        requests: ReadonlyArray<II>
      ) => Effect<ReadonlyArray<unknown>, E, R>
    }
  ): Resolver<T, R | IR | AR, IA, Option<A>, E>

  /**
   * Create a resolver for a sql query with a request schema and a result schema.
   * Returns an array of the potentially matching results.
   *
   * Takes a tag parameter to identify the requests.
   * Takes a function to extract the id from the request and result.
   *
   * Returns a resolver, request and an execute function.
   */
  resolverIdMany<T extends string, R, IR, II, IA, AR, AI, A, E, K>(
    tag: T,
    options: {
      readonly request: Schema<IA, II, IR>
      readonly requestId: (_: IA) => K
      readonly result: Schema<A, AI, AR>
      readonly resultId: (_: AI) => K
      readonly run: (
        requests: ReadonlyArray<II>
      ) => Effect<ReadonlyArray<unknown>, E, R>
    }
  ): Resolver<T, R | IR | AR, IA, ReadonlyArray<A>, E>
}

/**
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
    readonly beginTransaction?: string
    readonly rollback?: string
    readonly commit?: string
    readonly savepoint?: (name: string) => string
    readonly rollbackSavepoint?: (name: string) => string
  }
}

/**
 * @category constructor
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
 * @category models
 * @since 1.0.0
 */
export interface Request<T extends string, I, E, A> extends request.Request<A, SchemaError | E> {
  readonly _tag: T
  readonly i0: I
}

/**
 * @category models
 * @since 1.0.0
 */
export type Resolver<T extends string, R, I, A, E> = [never] extends [R] ? ResolverWithExecute<T, I, A, E>
  : ResolverBase<T, R, I, A, E>

/**
 * @category models
 * @since 1.0.0
 */
export interface ResolverBase<T extends string, R, I, A, E> {
  readonly Request: request.Request.Constructor<Request<T, I, E, A>, "_tag">
  readonly Resolver: RequestResolver<Request<T, I, E, A>, R>
  readonly makeExecute: (
    Resolver: RequestResolver<any, never>,
    context?: Context<any>
  ) => (i0: I) => Effect<A, SchemaError | E>
  readonly populateCache: (id: I, _: A) => Effect<void>
  readonly invalidateCache: (id: I) => Effect<void>
}

/**
 * @category models
 * @since 1.0.0
 */
export interface ResolverWithExecute<T extends string, I, A, E> extends ResolverBase<T, never, I, A, E> {
  readonly execute: (_: I) => Effect<A, SchemaError | E>
}

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
export const TransactionConnection: Tag<
  readonly [conn: Connection, counter: number],
  readonly [conn: Connection, counter: number]
> = internal.TransactionConn
