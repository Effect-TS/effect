import { TypeIdError } from "@effect/platform/Error"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as HashMap from "effect/HashMap"
import { pipeArguments } from "effect/Pipeable"
import type * as IndexedDbMigration from "../IndexedDbMigration.js"
import type * as IndexedDbTable from "../IndexedDbTable.js"
import type * as IndexedDbVersion from "../IndexedDbVersion.js"
import * as internalIndexedDbQuery from "./indexedDbQuery.js"

type IsStringLiteral<T> = T extends string ? string extends T ? false
  : true
  : false

/** @internal */
export type IndexFromTable<
  Source extends IndexedDbVersion.IndexedDbVersion.AnyWithProps,
  Table extends IndexedDbTable.IndexedDbTable.TableName<
    IndexedDbVersion.IndexedDbVersion.Tables<Source>
  >
> = IsStringLiteral<
  Extract<
    keyof IndexedDbTable.IndexedDbTable.Indexes<
      IndexedDbTable.IndexedDbTable.WithName<
        IndexedDbVersion.IndexedDbVersion.Tables<Source>,
        Table
      >
    >,
    string
  >
> extends true ? Extract<
    keyof IndexedDbTable.IndexedDbTable.Indexes<
      IndexedDbTable.IndexedDbTable.WithName<
        IndexedDbVersion.IndexedDbVersion.Tables<Source>,
        Table
      >
    >,
    string
  > :
  never

/** @internal */
export const TypeId: IndexedDbMigration.TypeId = Symbol.for(
  "@effect/platform/IndexedDbMigration"
) as IndexedDbMigration.TypeId

/** @internal */
export const ErrorTypeId: IndexedDbMigration.ErrorTypeId = Symbol.for(
  "@effect/platform/IndexedDbMigration/IndexedDbMigrationError"
) as IndexedDbMigration.ErrorTypeId

/** @internal */
export class IndexedDbMigrationError extends TypeIdError(
  ErrorTypeId,
  "IndexedDbMigrationError"
)<{
  readonly reason:
    | "OpenError"
    | "TransactionError"
    | "DecodeError"
    | "Blocked"
    | "UpgradeError"
    | "MissingTable"
    | "MissingIndex"
  readonly cause: unknown
}> {
  get message() {
    return this.reason
  }
}

const Proto = {
  [TypeId]: TypeId,
  pipe() {
    return pipeArguments(this, arguments)
  }
}

/** @internal */
export const makeTransactionProto = <
  Source extends IndexedDbVersion.IndexedDbVersion.AnyWithProps
>({
  IDBKeyRange,
  database,
  source,
  transaction
}: {
  readonly database: globalThis.IDBDatabase
  readonly IDBKeyRange: typeof globalThis.IDBKeyRange
  readonly source: Source
  readonly transaction: globalThis.IDBTransaction
}): IndexedDbMigration.IndexedDbMigration.Transaction<Source> => {
  const IndexedDbMigration = internalIndexedDbQuery.makeProto({
    database,
    IDBKeyRange,
    source,
    transaction
  }) as any
  IndexedDbMigration.transaction = transaction
  IndexedDbMigration.createObjectStore = (table: string) =>
    Effect.gen(function*() {
      const createTable = yield* HashMap.get(source.tables, table).pipe(
        Effect.catchTag(
          "NoSuchElementException",
          (cause) =>
            new IndexedDbMigrationError({
              reason: "MissingTable",
              cause
            })
        )
      )

      return yield* Effect.try({
        try: () => database.createObjectStore(createTable.tableName, createTable.options),
        catch: (cause) =>
          new IndexedDbMigrationError({
            reason: "TransactionError",
            cause
          })
      })
    })

  IndexedDbMigration.deleteObjectStore = (table: string) =>
    Effect.gen(function*() {
      const createTable = yield* HashMap.get(source.tables, table).pipe(
        Effect.catchTag(
          "NoSuchElementException",
          (cause) =>
            new IndexedDbMigrationError({
              reason: "MissingTable",
              cause
            })
        )
      )

      return yield* Effect.try({
        try: () => database.deleteObjectStore(createTable.tableName),
        catch: (cause) =>
          new IndexedDbMigrationError({
            reason: "TransactionError",
            cause
          })
      })
    })

  IndexedDbMigration.createIndex = (table: string, indexName: string, options?: IDBIndexParameters) =>
    Effect.gen(function*() {
      const store = transaction.objectStore(table)
      const sourceTable = HashMap.unsafeGet(source.tables, table)

      const keyPath = yield* Effect.fromNullable(
        sourceTable.options?.indexes[indexName] ?? undefined
      ).pipe(
        Effect.catchTag("NoSuchElementException", (error) =>
          new IndexedDbMigrationError({
            reason: "MissingIndex",
            cause: Cause.fail(error)
          }))
      )

      return yield* Effect.try({
        try: () => store.createIndex(indexName, keyPath, options),
        catch: (cause) =>
          new IndexedDbMigrationError({
            reason: "TransactionError",
            cause
          })
      })
    })

  IndexedDbMigration.deleteIndex = (table: string, indexName: string) =>
    Effect.gen(function*() {
      const store = transaction.objectStore(table)
      return yield* Effect.try({
        try: () => store.deleteIndex(indexName),
        catch: (cause) =>
          new IndexedDbMigrationError({
            reason: "TransactionError",
            cause
          })
      })
    })

  return IndexedDbMigration as any
}

/** @internal */
export const makeInitialProto = <
  InitialVersion extends IndexedDbVersion.IndexedDbVersion.AnyWithProps,
  Error
>(
  initialVersion: InitialVersion,
  init: (
    toQuery: IndexedDbMigration.IndexedDbMigration.Transaction<InitialVersion>
  ) => Effect.Effect<void, Error>
): IndexedDbMigration.IndexedDbMigration.Initial<InitialVersion, Error> => {
  function IndexedDbMigration() {}
  Object.setPrototypeOf(IndexedDbMigration, Proto)
  IndexedDbMigration.version = initialVersion
  IndexedDbMigration.execute = init
  IndexedDbMigration._tag = "Initial"

  IndexedDbMigration.add = <
    Version extends IndexedDbVersion.IndexedDbVersion.AnyWithProps
  >(
    version: Version,
    execute: (
      fromQuery: IndexedDbMigration.IndexedDbMigration.Transaction<InitialVersion>,
      toQuery: IndexedDbMigration.IndexedDbMigration.Transaction<Version>
    ) => Effect.Effect<void, Error>
  ) =>
    makeProto({
      fromVersion: initialVersion,
      toVersion: version,
      execute,
      previous: IndexedDbMigration as any
    })

  return IndexedDbMigration as any
}

/** @internal */
export const makeProto = <
  FromVersion extends IndexedDbVersion.IndexedDbVersion.AnyWithProps,
  ToVersion extends IndexedDbVersion.IndexedDbVersion.AnyWithProps,
  Error
>(options: {
  readonly previous:
    | IndexedDbMigration.IndexedDbMigration.Migration<FromVersion, ToVersion, Error>
    | IndexedDbMigration.IndexedDbMigration.Initial<FromVersion, Error>
  readonly fromVersion: FromVersion
  readonly toVersion: ToVersion
  readonly execute: (
    fromQuery: IndexedDbMigration.IndexedDbMigration.Transaction<FromVersion>,
    toQuery: IndexedDbMigration.IndexedDbMigration.Transaction<ToVersion>
  ) => Effect.Effect<void, Error>
}): IndexedDbMigration.IndexedDbMigration.Migration<FromVersion, ToVersion, Error> => {
  function IndexedDbMigration() {}
  Object.setPrototypeOf(IndexedDbMigration, Proto)
  IndexedDbMigration.previous = options.previous
  IndexedDbMigration.fromVersion = options.fromVersion
  IndexedDbMigration.toVersion = options.toVersion
  IndexedDbMigration.execute = options.execute
  IndexedDbMigration._tag = "Migration"
  return IndexedDbMigration as any
}
