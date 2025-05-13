import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as HashMap from "effect/HashMap"
import * as Layer from "effect/Layer"
import { pipeArguments } from "effect/Pipeable"
import * as Runtime from "effect/Runtime"
import { SyncScheduler } from "effect/Scheduler"
import * as IndexedDb from "../IndexedDb.js"
import type * as IndexedDbDatabase from "../IndexedDbDatabase.js"
import type * as IndexedDbVersion from "../IndexedDbVersion.js"
import * as internalIndexedDbQueryBuilder from "./indexedDbQueryBuilder.js"

/** @internal */
export type IsStringLiteral<T> = T extends string ? string extends T ? false
  : true
  : false

/** @internal */
export const TypeId: IndexedDbDatabase.TypeId = Symbol.for(
  "@effect/platform-browser/IndexedDbDatabase"
) as IndexedDbDatabase.TypeId

/** @internal */
export const ErrorTypeId: IndexedDbDatabase.ErrorTypeId = Symbol.for(
  "@effect/platform-browser/IndexedDbDatabase/IndexedDbDatabaseError"
) as IndexedDbDatabase.ErrorTypeId

const IndexedDbDatabaseErrorProto = Object.assign(Object.create(Cause.YieldableError.prototype), {
  [ErrorTypeId]: ErrorTypeId
})

/** @internal */
export const IndexedDbDatabaseError = (
  reason: IndexedDbDatabase.ErrorReason
): IndexedDbDatabase.IndexedDbDatabaseError => {
  const self = Object.create(IndexedDbDatabaseErrorProto)
  self._tag = "IndexedDbDatabaseError"
  self.reason = reason
  return self
}

/** @internal */
export const IndexedDbMigration = Context.GenericTag<IndexedDbDatabase.IndexedDbMigration>(
  "@effect/platform-browser/IndexedDbMigration"
)

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
  tables,
  transaction
}: {
  readonly database: globalThis.IDBDatabase
  readonly IDBKeyRange: typeof globalThis.IDBKeyRange
  readonly tables: HashMap.HashMap<string, IndexedDbVersion.IndexedDbVersion.Tables<Source>>
  readonly transaction: globalThis.IDBTransaction
}): IndexedDbDatabase.IndexedDbDatabase.Transaction<Source> => {
  const IndexedDbMigration = internalIndexedDbQueryBuilder.makeProto({
    database,
    IDBKeyRange,
    tables,
    transaction
  }) as any
  IndexedDbMigration.transaction = transaction
  IndexedDbMigration.createObjectStore = (table: string) =>
    Effect.gen(function*() {
      const createTable = yield* HashMap.get(tables, table).pipe(
        Effect.catchTag(
          "NoSuchElementException",
          (cause) =>
            IndexedDbDatabaseError({
              _tag: "MissingTable",
              cause
            })
        )
      )

      return yield* Effect.try({
        try: () => database.createObjectStore(createTable.tableName, createTable.options),
        catch: (cause) =>
          IndexedDbDatabaseError({
            _tag: "TransactionError",
            cause
          })
      })
    })

  IndexedDbMigration.deleteObjectStore = (table: string) =>
    Effect.gen(function*() {
      const createTable = yield* HashMap.get(tables, table).pipe(
        Effect.catchTag(
          "NoSuchElementException",
          (cause) =>
            IndexedDbDatabaseError({
              _tag: "MissingTable",
              cause
            })
        )
      )

      return yield* Effect.try({
        try: () => database.deleteObjectStore(createTable.tableName),
        catch: (cause) =>
          IndexedDbDatabaseError({
            _tag: "TransactionError",
            cause
          })
      })
    })

  IndexedDbMigration.createIndex = (table: string, indexName: string, options?: IDBIndexParameters) =>
    Effect.gen(function*() {
      const store = transaction.objectStore(table)
      const sourceTable = HashMap.unsafeGet(tables, table)

      const keyPath = yield* Effect.fromNullable(
        sourceTable.options?.indexes[indexName] ?? undefined
      ).pipe(
        Effect.catchTag("NoSuchElementException", (error) =>
          IndexedDbDatabaseError({
            _tag: "MissingIndex",
            cause: Cause.fail(error)
          }))
      )

      return yield* Effect.try({
        try: () => store.createIndex(indexName, keyPath, options),
        catch: (cause) =>
          IndexedDbDatabaseError({
            _tag: "TransactionError",
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
          IndexedDbDatabaseError({
            _tag: "TransactionError",
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
    toQuery: IndexedDbDatabase.IndexedDbDatabase.Transaction<InitialVersion>
  ) => Effect.Effect<void, Error>
): IndexedDbDatabase.IndexedDbDatabase.Initial<InitialVersion, Error> => {
  function IndexedDbDatabaseImpl() {}
  Object.setPrototypeOf(IndexedDbDatabaseImpl, Proto)
  IndexedDbDatabaseImpl.version = initialVersion
  IndexedDbDatabaseImpl.execute = init
  IndexedDbDatabaseImpl._tag = "Initial"

  IndexedDbDatabaseImpl.add = <
    Version extends IndexedDbVersion.IndexedDbVersion.AnyWithProps
  >(
    version: Version,
    execute: (
      fromQuery: IndexedDbDatabase.IndexedDbDatabase.Transaction<InitialVersion>,
      toQuery: IndexedDbDatabase.IndexedDbDatabase.Transaction<Version>
    ) => Effect.Effect<void, Error>
  ) =>
    makeProto({
      fromVersion: initialVersion,
      toVersion: version,
      execute,
      previous: IndexedDbDatabaseImpl as any
    })

  IndexedDbDatabaseImpl.getQueryBuilder = Effect.gen(function*() {
    const { IDBKeyRange, database } = yield* IndexedDbMigration
    return internalIndexedDbQueryBuilder.makeProto({
      database,
      IDBKeyRange,
      tables: initialVersion.tables,
      transaction: undefined
    })
  })

  IndexedDbDatabaseImpl.layer = <DatabaseName extends string>(
    databaseName: DatabaseName
  ) => layer(databaseName, IndexedDbDatabaseImpl as any)

  return IndexedDbDatabaseImpl as any
}

/** @internal */
export const makeProto = <
  FromVersion extends IndexedDbVersion.IndexedDbVersion.AnyWithProps,
  ToVersion extends IndexedDbVersion.IndexedDbVersion.AnyWithProps,
  Error
>(options: {
  readonly previous:
    | IndexedDbDatabase.IndexedDbDatabase.Migration<FromVersion, ToVersion, Error>
    | IndexedDbDatabase.IndexedDbDatabase.Initial<FromVersion, Error>
  readonly fromVersion: FromVersion
  readonly toVersion: ToVersion
  readonly execute: (
    fromQuery: IndexedDbDatabase.IndexedDbDatabase.Transaction<FromVersion>,
    toQuery: IndexedDbDatabase.IndexedDbDatabase.Transaction<ToVersion>
  ) => Effect.Effect<void, Error>
}): IndexedDbDatabase.IndexedDbDatabase.Migration<FromVersion, ToVersion, Error> => {
  function IndexedDbDatabaseImpl() {}
  Object.setPrototypeOf(IndexedDbDatabaseImpl, Proto)
  IndexedDbDatabaseImpl.previous = options.previous
  IndexedDbDatabaseImpl.fromVersion = options.fromVersion
  IndexedDbDatabaseImpl.toVersion = options.toVersion
  IndexedDbDatabaseImpl.execute = options.execute
  IndexedDbDatabaseImpl._tag = "Migration"

  IndexedDbDatabaseImpl.getQueryBuilder = Effect.gen(function*() {
    const { IDBKeyRange, database } = yield* IndexedDbMigration
    return internalIndexedDbQueryBuilder.makeProto({
      database,
      IDBKeyRange,
      tables: options.toVersion.tables,
      transaction: undefined
    })
  })

  IndexedDbDatabaseImpl.layer = <DatabaseName extends string>(
    databaseName: DatabaseName
  ) => layer(databaseName, IndexedDbDatabaseImpl as any)

  return IndexedDbDatabaseImpl as any
}

const layer = <DatabaseName extends string>(
  databaseName: DatabaseName,
  migration: IndexedDbDatabase.IndexedDbDatabase.Any
) =>
  Layer.scoped(
    IndexedDbMigration,
    Effect.gen(function*() {
      const { IDBKeyRange, indexedDB } = yield* IndexedDb.IndexedDb
      const runtime = yield* Effect.runtime()

      let oldVersion = 0
      let current = migration
      const migrations: Array<IndexedDbDatabase.IndexedDbDatabase.Any> = []

      while (current._tag === "Migration") {
        migrations.unshift(current)
        current = (current as unknown as IndexedDbDatabase.IndexedDbDatabase.AnyMigration).previous as any
      }

      // Add the initial migration
      migrations.unshift(current)

      const version = migrations.length
      const database = yield* Effect.acquireRelease(
        Effect.async<globalThis.IDBDatabase, IndexedDbDatabase.IndexedDbDatabaseError>((resume) => {
          const request = indexedDB.open(databaseName, version)

          request.onblocked = (event) => {
            resume(
              Effect.fail(
                IndexedDbDatabaseError({ _tag: "Blocked", cause: event })
              )
            )
          }

          request.onerror = (event) => {
            const idbRequest = event.target as IDBRequest<IDBDatabase>

            resume(
              Effect.fail(
                IndexedDbDatabaseError({
                  _tag: "OpenError",
                  cause: idbRequest.error
                })
              )
            )
          }

          let fiber: Fiber.RuntimeFiber<void, IndexedDbDatabase.IndexedDbDatabaseError> | undefined
          request.onupgradeneeded = (event) => {
            const idbRequest = event.target as IDBRequest<IDBDatabase>
            const database = idbRequest.result
            const transaction = idbRequest.transaction
            oldVersion = event.oldVersion

            if (transaction === null) {
              return resume(
                Effect.fail(
                  IndexedDbDatabaseError({
                    _tag: "TransactionError",
                    cause: null
                  })
                )
              )
            }

            transaction.onabort = (event) => {
              resume(
                Effect.fail(
                  IndexedDbDatabaseError({
                    _tag: "Aborted",
                    cause: event
                  })
                )
              )
            }

            transaction.onerror = (event) => {
              resume(
                Effect.fail(
                  IndexedDbDatabaseError({
                    _tag: "TransactionError",
                    cause: event
                  })
                )
              )
            }

            const effect = Effect.forEach(migrations.slice(oldVersion), (untypedMigration) => {
              if (untypedMigration._tag === "Initial") {
                const migration = untypedMigration as IndexedDbDatabase.IndexedDbDatabase.AnyInitial
                const api = makeTransactionProto({
                  database,
                  IDBKeyRange,
                  tables: migration.version.tables,
                  transaction
                })
                return migration.execute(api)
              } else if (untypedMigration._tag === "Migration") {
                const migration = untypedMigration as IndexedDbDatabase.IndexedDbDatabase.AnyMigration
                const fromApi = makeTransactionProto({
                  database,
                  IDBKeyRange,
                  tables: migration.fromVersion.tables,
                  transaction
                })
                const toApi = makeTransactionProto({
                  database,
                  IDBKeyRange,
                  tables: migration.toVersion.tables,
                  transaction
                })
                return migration.execute(fromApi, toApi)
              }

              return Effect.dieMessage("Invalid migration")
            }, { discard: true }).pipe(
              Effect.mapError((cause) =>
                IndexedDbDatabaseError({
                  _tag: "UpgradeError",
                  cause
                })
              )
            )
            const scheduler = new SyncScheduler()
            fiber = Runtime.runFork(runtime, effect, { scheduler })
            scheduler.flush()
          }

          request.onsuccess = (event) => {
            const idbRequest = event.target as IDBRequest<IDBDatabase>
            const database = idbRequest.result
            if (fiber) {
              // ensure migration errors are propagated
              resume(Effect.as(Fiber.join(fiber), database))
            } else {
              resume(Effect.succeed(database))
            }
          }
        }),
        (database) => Effect.sync(() => database.close())
      )

      return ({ database, IDBKeyRange })
    })
  )
