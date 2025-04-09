/**
 * @since 1.0.0
 */
import { TypeIdError } from "@effect/platform/Error"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as HashMap from "effect/HashMap"
import * as Layer from "effect/Layer"
import { type Pipeable, pipeArguments } from "effect/Pipeable"
import * as Schema from "effect/Schema"
import * as IndexedDbDatabase from "./IndexedDbDatabase.js"
import type * as IndexedDbTable from "./IndexedDbTable.js"
import type * as IndexedDbVersion from "./IndexedDbVersion.js"

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
  readonly reason: "TransactionError" | "DecodeError" | "UnknownError"
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

  readonly insert: <
    A extends IndexedDbTable.IndexedDbTable.TableName<
      IndexedDbVersion.IndexedDbVersion.Tables<Source>
    >
  >(
    table: A,
    data: Schema.Schema.Encoded<
      IndexedDbTable.IndexedDbTable.TableSchema<
        IndexedDbTable.IndexedDbTable.WithName<
          IndexedDbVersion.IndexedDbVersion.Tables<Source>,
          A
        >
      >
    >
  ) => Effect.Effect<
    globalThis.IDBValidKey,
    IndexedDbQueryError | IndexedDbDatabase.IndexedDbDatabaseError
  >

  readonly getAll: <
    A extends IndexedDbTable.IndexedDbTable.TableName<
      IndexedDbVersion.IndexedDbVersion.Tables<Source>
    >
  >(
    table: A
  ) => Effect.Effect<
    Array<
      Schema.Schema.Type<
        IndexedDbTable.IndexedDbTable.TableSchema<
          IndexedDbTable.IndexedDbTable.WithName<
            IndexedDbVersion.IndexedDbVersion.Tables<Source>,
            A
          >
        >
      >
    >,
    IndexedDbQueryError | IndexedDbDatabase.IndexedDbDatabaseError
  >
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
  database,
  source
}: {
  readonly database: globalThis.IDBDatabase
  readonly source: Source
}): IndexedDbQuery<Source> => {
  function IndexedDbQuery() {}
  Object.setPrototypeOf(IndexedDbQuery, Proto)
  IndexedDbQuery.source = source

  IndexedDbQuery.insert = (
    table: string,
    data: any
  ): Effect.Effect<
    globalThis.IDBValidKey,
    IndexedDbQueryError | IndexedDbDatabase.IndexedDbDatabaseError
  > =>
    Effect.async<globalThis.IDBValidKey, IndexedDbQueryError>((resume) => {
      const transaction = database.transaction([table], "readwrite")
      const objectStore = transaction.objectStore(table)
      const request = objectStore.add(data)

      request.onerror = () => {
        resume(
          Effect.fail(
            new IndexedDbQueryError({
              reason: "TransactionError",
              cause: request.error
            })
          )
        )
      }

      request.onsuccess = () => {
        resume(Effect.succeed(request.result))
      }
    })

  IndexedDbQuery.getAll = (table: string) =>
    Effect.gen(function*() {
      const data = yield* Effect.async<any, IndexedDbQueryError>((resume) => {
        const objectStore = database.transaction([table]).objectStore(table)
        const request = objectStore.getAll()

        request.onerror = (event) => {
          resume(
            Effect.fail(
              new IndexedDbQueryError({
                reason: "TransactionError",
                cause: event
              })
            )
          )
        }

        request.onsuccess = () => {
          resume(Effect.succeed(request.result))
        }
      })

      const tableSchema = Schema.Array(
        source.tables.pipe(HashMap.unsafeGet(table), (_) => _.tableSchema)
      )

      return yield* Schema.decodeUnknown(tableSchema)(data).pipe(
        Effect.mapError(
          (error) =>
            new IndexedDbQueryError({
              reason: "DecodeError",
              cause: error
            })
        )
      )
    })

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
>(database: globalThis.IDBDatabase, source: Source): IndexedDbQuery<Source> => makeProto({ database, source })

/**
 * @since 1.0.0
 * @category layers
 */
export const layer = Layer.effect(
  IndexedDbApi,
  Effect.gen(function*() {
    const { database } = yield* IndexedDbDatabase.IndexedDbDatabase
    return IndexedDbApi.of({
      makeApi: (source) => makeApi(database, source),
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
