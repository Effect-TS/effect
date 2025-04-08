/**
 * @since 1.0.0
 */
import { TypeIdError } from "@effect/platform/Error"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as HashMap from "effect/HashMap"
import * as Layer from "effect/Layer"
import { type Pipeable, pipeArguments } from "effect/Pipeable"
import type * as Schema from "effect/Schema"
import * as IndexedDb from "./IndexedDbDatabase.js"
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
  "@effect/platform-browser/IndexedDbQuery/IndexedDbError"
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
  readonly reason: "TransactionError" | "DecodeError"
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
export declare namespace IndexedDbQuery {
  /**
   * @since 1.0.0
   * @category model
   */
  export interface Service<
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
      IndexedDbQueryError | IndexedDb.IndexedDbDatabaseError
    >

    readonly create: <
      A extends IndexedDbTable.IndexedDbTable.TableName<
        IndexedDbVersion.IndexedDbVersion.Tables<Source>
      >
    >(
      table: A
    ) => Effect.Effect<
      void,
      IndexedDbQueryError | IndexedDb.IndexedDbDatabaseError
    >
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface Any {
    readonly [TypeId]: TypeId
  }
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
  readonly database: IDBDatabase
  readonly source: Source
}): IndexedDbQuery.Service<Source> => {
  function IndexedDbQuery() {}
  Object.setPrototypeOf(IndexedDbQuery, Proto)
  IndexedDbQuery.source = source

  IndexedDbQuery.insert = (
    table: string,
    data: any
  ): Effect.Effect<
    globalThis.IDBValidKey,
    IndexedDbQueryError | IndexedDb.IndexedDbDatabaseError
  > =>
    Effect.async<globalThis.IDBValidKey, IndexedDbQueryError>((resume) => {
      const transaction = database.transaction([table], "readwrite")
      const objectStore = transaction.objectStore(table)
      const request = objectStore.add(data)

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

      request.onsuccess = (_) => {
        resume(Effect.succeed(request.result))
      }
    })

  IndexedDbQuery.create = (
    table: string
  ): Effect.Effect<
    void,
    IndexedDbQueryError | IndexedDb.IndexedDbDatabaseError
  > =>
    Effect.async<void, IndexedDbQueryError>((resume) => {
      const createTable = HashMap.unsafeGet(source.tables, table)

      const request = database.createObjectStore(
        createTable.tableName,
        createTable.options
      )

      request.transaction.onerror = (event) => {
        resume(
          Effect.fail(
            new IndexedDbQueryError({
              reason: "TransactionError",
              cause: event
            })
          )
        )
      }
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
    readonly makeApi: <
      Source extends IndexedDbVersion.IndexedDbVersion.AnyWithProps = never
    >(
      source: Source
    ) => IndexedDbQuery.Service<Source>
  }
>() {}

export const makeApi = <
  Source extends IndexedDbVersion.IndexedDbVersion.AnyWithProps
>(
  database: IDBDatabase,
  source: Source
): IndexedDbQuery.Service<Source> => makeProto({ database, source })

export const layer = Layer.effect(
  IndexedDbApi,
  Effect.gen(function*() {
    const { database } = yield* IndexedDb.IndexedDbDatabase
    return IndexedDbApi.of({ makeApi: (source) => makeApi(database, source) })
  })
)
