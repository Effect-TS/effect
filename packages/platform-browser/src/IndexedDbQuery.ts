/**
 * @since 1.0.0
 */
import { TypeIdError } from "@effect/platform/Error"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { type Pipeable } from "effect/Pipeable"
import * as IndexedDbDatabase from "./IndexedDbDatabase.js"
import type * as IndexedDbQueryBuilder from "./IndexedDbQueryBuilder.js"
import type * as IndexedDbTable from "./IndexedDbTable.js"
import type * as IndexedDbVersion from "./IndexedDbVersion.js"
import * as internal from "./internal/indexedDbQuery.js"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = internal.TypeId

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category type ids
 */
export const ErrorTypeId: unique symbol = internal.ErrorTypeId

/**
 * @since 1.0.0
 * @category type ids
 */
export type ErrorTypeId = typeof ErrorTypeId

/**
 * @since 1.0.0
 * @category errors
 */
export class IndexedDbQueryError extends TypeIdError(
  ErrorTypeId,
  "IndexedDbQueryError"
)<{
  readonly reason: "TransactionError" | "DecodeError" | "UnknownError" | "NotFoundError"
  readonly cause: unknown
}> {
  get message() {
    return this.reason
  }
}

/**
 * @since 1.0.0
 * @category models
 */
export interface IndexedDbQuery<
  Source extends IndexedDbVersion.IndexedDbVersion.AnyWithProps = never
> extends Pipeable {
  new(_: never): {}

  readonly [TypeId]: TypeId
  readonly source: Source
  readonly database: globalThis.IDBDatabase

  readonly from: <
    A extends IndexedDbTable.IndexedDbTable.TableName<
      IndexedDbVersion.IndexedDbVersion.Tables<Source>
    >
  >(table: A) => IndexedDbQueryBuilder.IndexedDbQueryBuilder.From<Source, A>

  readonly clearAll: IndexedDbQueryBuilder.IndexedDbQueryBuilder.ClearAll<Source>

  readonly transaction: <
    Tables extends ReadonlyArray<
      IndexedDbTable.IndexedDbTable.TableName<
        IndexedDbVersion.IndexedDbVersion.Tables<Source>
      >
    >
  >(
    tables: Tables & {
      0: IndexedDbTable.IndexedDbTable.TableName<
        IndexedDbVersion.IndexedDbVersion.Tables<Source>
      >
    },
    mode: globalThis.IDBTransactionMode,
    callback: (api: {
      readonly from: <A extends Tables[number]>(table: A) => IndexedDbQueryBuilder.IndexedDbQueryBuilder.From<Source, A>
    }) => Effect.Effect<void>,
    options?: globalThis.IDBTransactionOptions
  ) => Effect.Effect<void>
}

/**
 * @since 1.0.0
 * @category tags
 */
export class IndexedDbApi extends Context.Tag(
  "@effect/platform-browser/IndexedDbApi"
)<
  IndexedDbApi,
  {
    readonly use: <A>(
      f: (database: globalThis.IDBDatabase) => Promise<A>
    ) => Effect.Effect<A, IndexedDbQueryError>

    readonly makeApi: <
      Source extends IndexedDbVersion.IndexedDbVersion.AnyWithProps = never
    >(source: Source) => IndexedDbQuery<Source>
  }
>() {}

/**
 * @since 1.0.0
 * @category layers
 */
export const layer = Layer.effect(
  IndexedDbApi,
  Effect.gen(function*() {
    const { IDBKeyRange, database } = yield* IndexedDbDatabase.IndexedDbDatabase
    return IndexedDbApi.of({
      makeApi: (source) => internal.makeProto({ database, IDBKeyRange, source, transaction: undefined }),
      use: (f) =>
        Effect.tryPromise({
          try: () => f(database),
          catch: (error) =>
            new IndexedDbQueryError({
              reason: "UnknownError",
              cause: error
            })
        })
    })
  })
)
