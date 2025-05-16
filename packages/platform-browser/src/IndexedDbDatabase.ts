/**
 * @since 1.0.0
 */
import * as Context from "effect/Context"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as Layer from "effect/Layer"
import { type Pipeable, pipeArguments } from "effect/Pipeable"
import * as Runtime from "effect/Runtime"
import { SyncScheduler } from "effect/Scheduler"
import * as IndexedDb from "./IndexedDb.js"
import * as IndexedDbQueryBuilder from "./IndexedDbQueryBuilder.js"
import type * as IndexedDbTable from "./IndexedDbTable.js"
import type * as IndexedDbVersion from "./IndexedDbVersion.js"

/**
 * @since 1.0.0
 * @category type ids
 */
export const ErrorTypeId: unique symbol = Symbol.for("@effect/platform-browser/IndexedDbDatabase/Error")

/**
 * @since 1.0.0
 * @category type ids
 */
export type ErrorTypeId = typeof ErrorTypeId

/**
 * @since 1.0.0
 * @category errors
 */
export type ErrorReason =
  | "TransactionError"
  | "MissingTable"
  | "OpenError"
  | "UpgradeError"
  | "Aborted"
  | "Blocked"
  | "MissingIndex"

/**
 * @since 1.0.0
 * @category errors
 */
export class IndexedDbDatabaseError extends Data.TaggedError("IndexedDbDatabaseError")<{
  reason: ErrorReason
  cause: unknown
}> {
  /**
   * @since 1.0.0
   */
  readonly [ErrorTypeId]: ErrorTypeId = ErrorTypeId
}

/**
 * @since 1.0.0
 * @category models
 */
export class IndexedDbDatabase extends Context.Tag("@effect/platform-browser/IndexedDbDatabase")<
  IndexedDbDatabase,
  {
    readonly database: globalThis.IDBDatabase
    readonly IDBKeyRange: typeof globalThis.IDBKeyRange
  }
>() {}

/**
 * @since 1.0.0
 * @category models
 */
export interface IndexedDbSchema<
  in out FromVersion extends IndexedDbVersion.AnyWithProps = never,
  in out ToVersion extends IndexedDbVersion.AnyWithProps = never,
  out Error = never
> extends Pipeable {
  new(_: never): {}

  readonly previous: [FromVersion] extends [never] ? undefined : IndexedDbSchema<never, FromVersion, Error>
  readonly fromVersion: FromVersion
  readonly version: ToVersion
  readonly migrate: [FromVersion] extends [never] ? ((
      query: Transaction<ToVersion>
    ) => Effect.Effect<void, Error>) :
    ((
      fromQuery: Transaction<FromVersion>,
      toQuery: Transaction<ToVersion>
    ) => Effect.Effect<void, Error>)
  readonly add: <
    Version extends IndexedDbVersion.AnyWithProps,
    MigrationError
  >(
    version: Version,
    migrate: (
      fromQuery: Transaction<ToVersion>,
      toQuery: Transaction<Version>
    ) => Effect.Effect<void, MigrationError>
  ) => IndexedDbSchema<ToVersion, Version, MigrationError | Error>

  readonly getQueryBuilder: Effect.Effect<
    IndexedDbQueryBuilder.IndexedDbQueryBuilder<ToVersion>,
    never,
    IndexedDbDatabase
  >

  readonly layer: <DatabaseName extends string>(
    databaseName: DatabaseName
  ) => Layer.Layer<IndexedDbDatabase, IndexedDbDatabaseError, IndexedDb.IndexedDb>
}

/**
 * @since 1.0.0
 * @category models
 */
export interface Transaction<
  Source extends IndexedDbVersion.AnyWithProps = never
> extends Pipeable, Omit<IndexedDbQueryBuilder.IndexedDbQueryBuilder<Source>, "transaction"> {
  readonly transaction: globalThis.IDBTransaction

  readonly createObjectStore: <
    A extends IndexedDbTable.TableName<
      IndexedDbVersion.Tables<Source>
    >
  >(table: A) => Effect.Effect<globalThis.IDBObjectStore, IndexedDbDatabaseError>

  readonly deleteObjectStore: <
    A extends IndexedDbTable.TableName<
      IndexedDbVersion.Tables<Source>
    >
  >(table: A) => Effect.Effect<void, IndexedDbDatabaseError>

  readonly createIndex: <
    A extends IndexedDbTable.TableName<
      IndexedDbVersion.Tables<Source>
    >
  >(
    table: A,
    indexName: IndexFromTable<Source, A>,
    options?: IDBIndexParameters
  ) => Effect.Effect<globalThis.IDBIndex, IndexedDbDatabaseError>

  readonly deleteIndex: <
    A extends IndexedDbTable.TableName<
      IndexedDbVersion.Tables<Source>
    >
  >(
    table: A,
    indexName: IndexFromTable<Source, A>
  ) => Effect.Effect<void, IndexedDbDatabaseError>
}

/**
 * @since 1.0.0
 * @category models
 */
export type IndexFromTable<
  Source extends IndexedDbVersion.AnyWithProps,
  Table extends IndexedDbTable.TableName<
    IndexedDbVersion.Tables<Source>
  >
> = IsStringLiteral<
  Extract<
    keyof IndexedDbTable.Indexes<
      IndexedDbTable.WithName<
        IndexedDbVersion.Tables<Source>,
        Table
      >
    >,
    string
  >
> extends true ? Extract<
    keyof IndexedDbTable.Indexes<
      IndexedDbTable.WithName<
        IndexedDbVersion.Tables<Source>,
        Table
      >
    >,
    string
  > :
  never

/**
 * @since 1.0.0
 * @category models
 */
export interface Any {
  readonly previous?: Any | undefined
  readonly layer: <DatabaseName extends string>(
    databaseName: DatabaseName
  ) => Layer.Layer<IndexedDbDatabase, IndexedDbDatabaseError, IndexedDb.IndexedDb>
}

/**
 * @since 1.0.0
 * @category models
 */
export type AnySchema = IndexedDbSchema<
  IndexedDbVersion.AnyWithProps,
  IndexedDbVersion.AnyWithProps,
  any
>

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = <
  InitialVersion extends IndexedDbVersion.AnyWithProps,
  Error
>(
  initialVersion: InitialVersion,
  init: (
    toQuery: Transaction<InitialVersion>
  ) => Effect.Effect<void, Error>
): IndexedDbSchema<never, InitialVersion, Error> => {
  function IndexedDbDatabaseImpl() {}
  IndexedDbDatabaseImpl.pipe = function() {
    return pipeArguments(this, arguments)
  }
  IndexedDbDatabaseImpl.version = initialVersion
  IndexedDbDatabaseImpl.migrate = init
  IndexedDbDatabaseImpl._tag = "Initial"

  IndexedDbDatabaseImpl.add = <
    Version extends IndexedDbVersion.AnyWithProps
  >(
    version: Version,
    migrate: (
      fromQuery: Transaction<InitialVersion>,
      toQuery: Transaction<Version>
    ) => Effect.Effect<void, Error>
  ) =>
    makeProto({
      fromVersion: initialVersion,
      version,
      migrate,
      previous: IndexedDbDatabaseImpl as any
    })

  IndexedDbDatabaseImpl.getQueryBuilder = Effect.gen(function*() {
    const { IDBKeyRange, database } = yield* IndexedDbDatabase
    return IndexedDbQueryBuilder.make({
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

const makeProto = <
  FromVersion extends IndexedDbVersion.AnyWithProps,
  ToVersion extends IndexedDbVersion.AnyWithProps,
  Error
>(options: {
  readonly previous:
    | IndexedDbSchema<FromVersion, ToVersion, Error>
    | IndexedDbSchema<never, FromVersion, Error>
  readonly fromVersion: FromVersion
  readonly version: ToVersion
  readonly migrate: (
    fromQuery: Transaction<FromVersion>,
    toQuery: Transaction<ToVersion>
  ) => Effect.Effect<void, Error>
}): IndexedDbSchema<FromVersion, ToVersion, Error> => {
  function IndexedDbDatabaseImpl() {}
  IndexedDbDatabaseImpl.pipe = options.previous.pipe
  IndexedDbDatabaseImpl.previous = options.previous
  IndexedDbDatabaseImpl.fromVersion = options.fromVersion
  IndexedDbDatabaseImpl.version = options.version
  IndexedDbDatabaseImpl.migrate = options.migrate
  IndexedDbDatabaseImpl._tag = "Migration"

  IndexedDbDatabaseImpl.getQueryBuilder = Effect.gen(function*() {
    const { IDBKeyRange, database } = yield* IndexedDbDatabase
    return IndexedDbQueryBuilder.make({
      database,
      IDBKeyRange,
      tables: options.version.tables,
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
  migration: Any
) =>
  Layer.scoped(
    IndexedDbDatabase,
    Effect.gen(function*() {
      const { IDBKeyRange, indexedDB } = yield* IndexedDb.IndexedDb
      const runtime = yield* Effect.runtime()

      let oldVersion = 0
      const migrations: Array<Any> = []
      let current = migration
      while (current) {
        migrations.unshift(current)
        current = (current as unknown as AnySchema).previous as any
      }

      const version = migrations.length
      const database = yield* Effect.acquireRelease(
        Effect.async<globalThis.IDBDatabase, IndexedDbDatabaseError>((resume) => {
          const request = indexedDB.open(databaseName, version)

          request.onblocked = (event) => {
            resume(Effect.fail(
              new IndexedDbDatabaseError({
                reason: "Blocked",
                cause: event
              })
            ))
          }

          request.onerror = (event) => {
            const idbRequest = event.target as IDBRequest<IDBDatabase>

            resume(Effect.fail(
              new IndexedDbDatabaseError({
                reason: "OpenError",
                cause: idbRequest.error
              })
            ))
          }

          let fiber: Fiber.RuntimeFiber<void, IndexedDbDatabaseError> | undefined
          request.onupgradeneeded = (event) => {
            const idbRequest = event.target as IDBRequest<IDBDatabase>
            const database = idbRequest.result
            const transaction = idbRequest.transaction
            oldVersion = event.oldVersion

            if (transaction === null) {
              return resume(Effect.fail(
                new IndexedDbDatabaseError({
                  reason: "TransactionError",
                  cause: null
                })
              ))
            }

            transaction.onabort = (event) => {
              resume(Effect.fail(
                new IndexedDbDatabaseError({
                  reason: "Aborted",
                  cause: event
                })
              ))
            }

            transaction.onerror = (event) => {
              resume(Effect.fail(
                new IndexedDbDatabaseError({
                  reason: "TransactionError",
                  cause: event
                })
              ))
            }

            const effect = Effect.forEach(migrations.slice(oldVersion), (untypedMigration) => {
              if (untypedMigration.previous === undefined) {
                const migration = untypedMigration as any as AnySchema
                const api = makeTransactionProto({
                  database,
                  IDBKeyRange,
                  tables: migration.version.tables,
                  transaction
                })
                return (migration as any).migrate(api) as Effect.Effect<void, IndexedDbDatabaseError>
              } else if (untypedMigration.previous) {
                const migration = untypedMigration as any as AnySchema
                const fromApi = makeTransactionProto({
                  database,
                  IDBKeyRange,
                  tables: migration.fromVersion.tables,
                  transaction
                })
                const toApi = makeTransactionProto({
                  database,
                  IDBKeyRange,
                  tables: migration.version.tables,
                  transaction
                })
                return migration.migrate(fromApi, toApi) as Effect.Effect<void, IndexedDbDatabaseError>
              }

              return Effect.dieMessage("Invalid migration")
            }, { discard: true }).pipe(
              Effect.mapError((cause) =>
                new IndexedDbDatabaseError({
                  reason: "UpgradeError",
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

// -----------------------------------------------------------------------------
// Internal
// -----------------------------------------------------------------------------

type IsStringLiteral<T> = T extends string ? string extends T ? false : true : false

const makeTransactionProto = <
  Source extends IndexedDbVersion.AnyWithProps
>({
  IDBKeyRange,
  database,
  tables,
  transaction
}: {
  readonly database: globalThis.IDBDatabase
  readonly IDBKeyRange: typeof globalThis.IDBKeyRange
  readonly tables: ReadonlyMap<string, IndexedDbVersion.Tables<Source>>
  readonly transaction: globalThis.IDBTransaction
}): Transaction<Source> => {
  const IndexedDbMigration = IndexedDbQueryBuilder.make({
    database,
    IDBKeyRange,
    tables,
    transaction
  }) as any
  IndexedDbMigration.transaction = transaction
  IndexedDbMigration.createObjectStore = Effect.fnUntraced(function*(table: string) {
    const createTable = yield* Effect.fromNullable(tables.get(table)).pipe(
      Effect.mapError((cause) =>
        new IndexedDbDatabaseError({
          reason: "MissingTable",
          cause
        })
      )
    )

    return yield* Effect.try({
      try: () => database.createObjectStore(createTable.tableName, createTable.options),
      catch: (cause) =>
        new IndexedDbDatabaseError({
          reason: "TransactionError",
          cause
        })
    })
  })

  IndexedDbMigration.deleteObjectStore = Effect.fnUntraced(function*(table: string) {
    const createTable = yield* Effect.fromNullable(tables.get(table)).pipe(
      Effect.mapError((cause) =>
        new IndexedDbDatabaseError({
          reason: "MissingTable",
          cause
        })
      )
    )

    return yield* Effect.try({
      try: () => database.deleteObjectStore(createTable.tableName),
      catch: (cause) =>
        new IndexedDbDatabaseError({
          reason: "TransactionError",
          cause
        })
    })
  })

  IndexedDbMigration.createIndex = Effect.fnUntraced(
    function*(table: string, indexName: string, options?: IDBIndexParameters) {
      const store = transaction.objectStore(table)
      const sourceTable = tables.get(table)!

      const keyPath = yield* Effect.fromNullable(
        sourceTable.options?.indexes[indexName] ?? undefined
      ).pipe(
        Effect.mapError((cause) =>
          new IndexedDbDatabaseError({
            reason: "MissingIndex",
            cause
          })
        )
      )

      return yield* Effect.try({
        try: () => store.createIndex(indexName, keyPath, options),
        catch: (cause) =>
          new IndexedDbDatabaseError({
            reason: "TransactionError",
            cause
          })
      })
    }
  )

  IndexedDbMigration.deleteIndex = (table: string, indexName: string) =>
    Effect.try({
      try: () => transaction.objectStore(table).deleteIndex(indexName),
      catch: (cause) =>
        new IndexedDbDatabaseError({
          reason: "TransactionError",
          cause
        })
    })

  return IndexedDbMigration as any
}
