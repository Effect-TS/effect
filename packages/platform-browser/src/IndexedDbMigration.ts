/**
 * @since 1.0.0
 */
import { TypeIdError } from "@effect/platform/Error"
import * as Effect from "effect/Effect"
import * as HashMap from "effect/HashMap"
import { type Pipeable, pipeArguments } from "effect/Pipeable"
import * as Schema from "effect/Schema"
import type * as IndexedDbTable from "./IndexedDbTable.js"
import type * as IndexedDbVersion from "./IndexedDbVersion.js"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for(
  "@effect/platform-browser/IndexedDbMigration"
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
  "@effect/platform-browser/IndexedDbMigration/IndexedDbMigrationError"
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
export class IndexedDbMigrationError extends TypeIdError(
  ErrorTypeId,
  "IndexedDbMigrationError"
)<{
  readonly reason:
    | "OpenError"
    | "TransactionError"
    | "Blocked"
    | "UpgradeError"
  readonly cause: unknown
}> {
  get message() {
    return this.reason
  }
}

export interface MigrationApi<
  Source extends IndexedDbVersion.IndexedDbVersion.AnyWithProps
> {
  readonly createObjectStore: <
    A extends IndexedDbTable.IndexedDbTable.TableName<
      IndexedDbVersion.IndexedDbVersion.Tables<Source>
    >
  >(
    table: A
  ) => Effect.Effect<globalThis.IDBObjectStore>

  readonly deleteObjectStore: <
    A extends IndexedDbTable.IndexedDbTable.TableName<
      IndexedDbVersion.IndexedDbVersion.Tables<Source>
    >
  >(
    table: A
  ) => Effect.Effect<void>

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
    >
  >

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
  ) => Effect.Effect<globalThis.IDBValidKey>

  readonly insertAll: <
    A extends IndexedDbTable.IndexedDbTable.TableName<
      IndexedDbVersion.IndexedDbVersion.Tables<Source>
    >
  >(
    table: A,
    dataList: ReadonlyArray<
      Schema.Schema.Encoded<
        IndexedDbTable.IndexedDbTable.TableSchema<
          IndexedDbTable.IndexedDbTable.WithName<
            IndexedDbVersion.IndexedDbVersion.Tables<Source>,
            A
          >
        >
      >
    >
  ) => Effect.Effect<globalThis.IDBValidKey>
}

/** @internal */
export const migrationApi = <
  Source extends IndexedDbVersion.IndexedDbVersion.AnyWithProps
>(
  database: IDBDatabase,
  transaction: IDBTransaction,
  source: Source
): MigrationApi<Source> => {
  const insert = <
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
  ) =>
    Effect.gen(function*() {
      const { tableSchema } = yield* HashMap.get(source.tables, table).pipe(
        Effect.catchTag(
          "NoSuchElementException",
          () =>
            new IndexedDbMigrationError({
              reason: "TransactionError",
              cause: null
            })
        )
      )

      yield* Schema.decodeUnknown(tableSchema)(data).pipe(
        Effect.catchTag("ParseError", (error) =>
          new IndexedDbMigrationError({
            reason: "TransactionError",
            cause: error
          }))
      )

      return yield* Effect.async<
        globalThis.IDBValidKey,
        IndexedDbMigrationError
      >((resume) => {
        const objectStore = transaction.objectStore(table)
        const request = objectStore.add(data)

        request.onerror = (event) => {
          resume(
            Effect.fail(
              new IndexedDbMigrationError({
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
    }).pipe(Effect.orDie)

  return {
    insert,
    insertAll: (table, dataList) => Effect.all(dataList.map((data) => insert(table, data))),

    createObjectStore: (table) =>
      Effect.gen(function*() {
        const createTable = HashMap.unsafeGet(source.tables, table)
        return database.createObjectStore(
          createTable.tableName,
          createTable.options
        )
      }),

    deleteObjectStore: (table) =>
      Effect.gen(function*() {
        const createTable = HashMap.unsafeGet(source.tables, table)
        return database.deleteObjectStore(createTable.tableName)
      }),

    getAll: (table) =>
      Effect.gen(function*() {
        const { tableName, tableSchema } = yield* HashMap.get(
          source.tables,
          table
        ).pipe(
          Effect.catchTag(
            "NoSuchElementException",
            () =>
              new IndexedDbMigrationError({
                reason: "TransactionError",
                cause: null
              })
          )
        )

        const data = yield* Effect.async<any, IndexedDbMigrationError>(
          (resume) => {
            const store = transaction.objectStore(tableName)
            const request = store.getAll()

            request.onerror = (event) => {
              resume(
                Effect.fail(
                  new IndexedDbMigrationError({
                    reason: "TransactionError",
                    cause: event
                  })
                )
              )
            }

            request.onsuccess = () => {
              resume(Effect.succeed(request.result))
            }
          }
        )

        const tableSchemaArray = Schema.Array(
          tableSchema
        ) as unknown as IndexedDbTable.IndexedDbTable.TableSchema<
          IndexedDbTable.IndexedDbTable.WithName<
            IndexedDbVersion.IndexedDbVersion.Tables<Source>,
            typeof tableName
          >
        >

        return yield* Schema.decodeUnknown(tableSchemaArray)(data).pipe(
          Effect.catchTag("ParseError", (error) =>
            new IndexedDbMigrationError({
              reason: "TransactionError",
              cause: error
            }))
        )
      }).pipe(Effect.orDie)
  }
}

/**
 * @since 1.0.0
 * @category interface
 */
export interface IndexedDbMigration<
  in out FromVersion extends IndexedDbVersion.IndexedDbVersion.AnyWithProps = never,
  in out ToVersion extends IndexedDbVersion.IndexedDbVersion.AnyWithProps = never,
  out Error = never
> extends Pipeable {
  new(_: never): {}

  readonly [TypeId]: TypeId
  readonly fromVersion: FromVersion
  readonly toVersion: ToVersion
  readonly execute: (
    fromQuery: MigrationApi<FromVersion>,
    toQuery: MigrationApi<ToVersion>
  ) => Effect.Effect<void, Error>
}

/**
 * @since 1.0.0
 * @category models
 */
export declare namespace IndexedDbMigration {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Any {
    readonly [TypeId]: TypeId
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export type AnyWithProps = IndexedDbMigration<
    IndexedDbVersion.IndexedDbVersion.AnyWithProps,
    IndexedDbVersion.IndexedDbVersion.AnyWithProps,
    any
  >
}

const Proto = {
  [TypeId]: TypeId,
  pipe() {
    return pipeArguments(this, arguments)
  }
}

const makeProto = <
  FromVersion extends IndexedDbVersion.IndexedDbVersion.AnyWithProps,
  ToVersion extends IndexedDbVersion.IndexedDbVersion.AnyWithProps,
  Error
>(options: {
  readonly fromVersion: FromVersion
  readonly toVersion: ToVersion
  readonly execute: (
    fromQuery: MigrationApi<FromVersion>,
    toQuery: MigrationApi<ToVersion>
  ) => Effect.Effect<void, Error>
}): IndexedDbMigration<FromVersion, ToVersion, Error> => {
  function IndexedDbMigration() {}
  Object.setPrototypeOf(IndexedDbMigration, Proto)
  IndexedDbMigration.fromVersion = options.fromVersion
  IndexedDbMigration.toVersion = options.toVersion
  IndexedDbMigration.execute = options.execute
  return IndexedDbMigration as any
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = makeProto
