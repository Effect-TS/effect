/**
 * @since 1.0.0
 */
import { TypeIdError } from "@effect/platform/Error"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { type Pipeable, pipeArguments } from "effect/Pipeable"
import * as IndexedDbDatabase from "./IndexedDbDatabase.js"
import type * as IndexedDbQueryBuilder from "./IndexedDbQueryBuilder.js"
import type * as IndexedDbTable from "./IndexedDbTable.js"
import type * as IndexedDbVersion from "./IndexedDbVersion.js"
import * as internal from "./internal/indexedDbQueryBuilder.js"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for(
  "@effect/platform-browser/IndexedDbQuery"
)

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category type ids
 */
export const ErrorTypeId: unique symbol = Symbol.for(
  "@effect/platform-browser/IndexedDbQuery/IndexedDbQueryError"
)

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
}

const Proto = {
  [TypeId]: TypeId,
  pipe() {
    return pipeArguments(this, arguments)
  }
}

const makeProto = <
  Source extends IndexedDbVersion.IndexedDbVersion.AnyWithProps
>({
  IDBKeyRange,
  database,
  source
}: {
  readonly database: globalThis.IDBDatabase
  readonly IDBKeyRange: typeof globalThis.IDBKeyRange
  readonly source: Source
}): IndexedDbQuery<Source> => {
  function IndexedDbQuery() {}
  Object.setPrototypeOf(IndexedDbQuery, Proto)
  IndexedDbQuery.source = source
  IndexedDbQuery.database = database
  IndexedDbQuery.IDBKeyRange = IDBKeyRange

  IndexedDbQuery.from = <
    A extends IndexedDbTable.IndexedDbTable.TableName<
      IndexedDbVersion.IndexedDbVersion.Tables<Source>
    >
  >(table: A) => internal.fromMakeProto({ database, IDBKeyRange, source, table })

  IndexedDbQuery.clearAll = internal.clearAllMakeProto({ database, source })

  return IndexedDbQuery as any
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

/** @internal */
const makeApi = <
  Source extends IndexedDbVersion.IndexedDbVersion.AnyWithProps
>(
  database: globalThis.IDBDatabase,
  IDBKeyRange: typeof globalThis.IDBKeyRange,
  source: Source
): IndexedDbQuery<Source> => makeProto({ database, IDBKeyRange, source })

/**
 * @since 1.0.0
 * @category layers
 */
export const layer = Layer.effect(
  IndexedDbApi,
  Effect.gen(function*() {
    const { IDBKeyRange, database } = yield* IndexedDbDatabase.IndexedDbDatabase
    return IndexedDbApi.of({
      makeApi: (source) => makeApi(database, IDBKeyRange, source),
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
