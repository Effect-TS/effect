/**
 * @since 1.0.0
 */
import { TypeIdError } from "@effect/platform/Error"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as Layer from "effect/Layer"
import * as Runtime from "effect/Runtime"
import { SyncScheduler } from "effect/Scheduler"
import * as IndexedDb from "./IndexedDb.js"
import type * as IndexedDbMigration from "./IndexedDbMigration.js"
import * as internal from "./internal/indexedDbMigration.js"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for(
  "@effect/platform-browser/IndexedDbDatabase"
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
  "@effect/platform-browser/IndexedDbDatabase/IndexedDbDatabaseError"
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
export class IndexedDbDatabaseError extends TypeIdError(
  ErrorTypeId,
  "IndexedDbDatabaseError"
)<{
  readonly reason:
    | "OpenError"
    | "TransactionError"
    | "Blocked"
    | "Aborted"
    | "UpgradeError"
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
export declare namespace IndexedDbDatabase {
  /**
   * @since 1.0.0
   * @category model
   */
  export interface Service<out Id extends string = string> {
    readonly [TypeId]: TypeId
    readonly identifier: Id
    readonly version: number
    readonly database: globalThis.IDBDatabase
    readonly IDBKeyRange: typeof globalThis.IDBKeyRange
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface Any {
    readonly [TypeId]: TypeId
    readonly identifier: string
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export type AnyWithProps = IndexedDbDatabase.Service
}

/**
 * @since 1.0.0
 * @category tags
 */
export class IndexedDbDatabase extends Context.Tag(
  "@effect/platform-browser/IndexedDbDatabase"
)<IndexedDbDatabase, IndexedDbDatabase.AnyWithProps>() {}

const makeProto = <Id extends string>(options: {
  readonly identifier: Id
  readonly version: number
  readonly database: globalThis.IDBDatabase
  readonly IDBKeyRange: typeof globalThis.IDBKeyRange
}): IndexedDbDatabase.Service<Id> => ({
  [TypeId]: TypeId,
  database: options.database,
  IDBKeyRange: options.IDBKeyRange,
  identifier: options.identifier,
  version: options.version
})

/**
 * @since 1.0.0
 * @category constructors
 */
export const layer = <
  Id extends string,
  Migration extends IndexedDbMigration.IndexedDbMigration.Any
>(identifier: Id, migration: Migration) =>
  Layer.scoped(
    IndexedDbDatabase,
    Effect.gen(function*() {
      const { IDBKeyRange, indexedDB } = yield* IndexedDb.IndexedDb
      const runtime = yield* Effect.runtime()

      let oldVersion = 0
      let current = migration
      const migrations: Array<IndexedDbMigration.IndexedDbMigration.Any> = []

      while (current._tag === "Migration") {
        migrations.unshift(current)
        current = (current as unknown as IndexedDbMigration.IndexedDbMigration.AnyMigration).previous as any
      }

      // Add the initial migration
      migrations.unshift(current)

      const version = migrations.length
      const database = yield* Effect.acquireRelease(
        Effect.async<globalThis.IDBDatabase, IndexedDbDatabaseError>((resume) => {
          const request = indexedDB.open(identifier, version)

          request.onblocked = (event) => {
            resume(
              Effect.fail(
                new IndexedDbDatabaseError({ reason: "Blocked", cause: event })
              )
            )
          }

          request.onerror = (event) => {
            const idbRequest = event.target as IDBRequest<IDBDatabase>

            resume(
              Effect.fail(
                new IndexedDbDatabaseError({
                  reason: "OpenError",
                  cause: idbRequest.error
                })
              )
            )
          }

          let fiber: Fiber.RuntimeFiber<void, IndexedDbDatabaseError> | undefined
          request.onupgradeneeded = (event) => {
            const idbRequest = event.target as IDBRequest<IDBDatabase>
            const database = idbRequest.result
            const transaction = idbRequest.transaction
            oldVersion = event.oldVersion

            if (transaction === null) {
              return resume(
                Effect.fail(
                  new IndexedDbDatabaseError({
                    reason: "TransactionError",
                    cause: null
                  })
                )
              )
            }

            transaction.onabort = (event) => {
              resume(
                Effect.fail(
                  new IndexedDbDatabaseError({
                    reason: "Aborted",
                    cause: event
                  })
                )
              )
            }

            transaction.onerror = (event) => {
              resume(
                Effect.fail(
                  new IndexedDbDatabaseError({
                    reason: "TransactionError",
                    cause: event
                  })
                )
              )
            }

            const effect = Effect.forEach(migrations.slice(oldVersion), (untypedMigration) => {
              if (untypedMigration._tag === "Migration") {
                const migration = untypedMigration as IndexedDbMigration.IndexedDbMigration.AnyMigration
                const fromApi = internal.makeTransactionProto({
                  database,
                  IDBKeyRange,
                  tables: migration.fromVersion.tables,
                  transaction
                })
                const toApi = internal.makeTransactionProto({
                  database,
                  IDBKeyRange,
                  tables: migration.toVersion.tables,
                  transaction
                })
                return migration.execute(fromApi, toApi)
              } else if (untypedMigration._tag === "Initial") {
                const migration = untypedMigration as IndexedDbMigration.IndexedDbMigration.AnyInitial
                const api = internal.makeTransactionProto({
                  database,
                  IDBKeyRange,
                  tables: migration.version.tables,
                  transaction
                })
                return migration.execute(api)
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

      return makeProto({ identifier, version, database, IDBKeyRange })
    })
  )
