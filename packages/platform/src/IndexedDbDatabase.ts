/**
 * https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB
 *
 * @since 1.0.0
 */
import { TypeIdError } from "@effect/platform/Error"
import * as IndexedDb from "@effect/platform/IndexedDb"
import { Layer } from "effect"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { pipeArguments } from "effect/Pipeable"
import type * as IndexedDbMigration from "./IndexedDbMigration.js"
import * as internal from "./internal/indexedDbMigration.js"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for(
  "@effect/platform/IndexedDbDatabase"
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
  "@effect/platform/IndexedDbDatabase/IndexedDbDatabaseError"
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
 * @category tags
 */
export class IndexedDbDatabase extends Context.Tag(
  "@effect/platform/IndexedDbDatabase"
)<IndexedDbDatabase, IndexedDbDatabase.AnyWithProps>() {}

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
    new(_: never): {}
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

const Proto = {
  [TypeId]: TypeId,
  pipe() {
    return pipeArguments(this, arguments)
  }
}

const makeProto = <Id extends string>(options: {
  readonly identifier: Id
  readonly version: number
  readonly database: globalThis.IDBDatabase
  readonly IDBKeyRange: typeof globalThis.IDBKeyRange
}): IndexedDbDatabase.Service<Id> => {
  function IndexedDb() {}
  Object.setPrototypeOf(IndexedDb, Proto)
  IndexedDb.identifier = options.identifier
  IndexedDb.version = options.version
  IndexedDb.database = options.database
  IndexedDb.IDBKeyRange = options.IDBKeyRange
  return IndexedDb as any
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const layer = <
  Id extends string,
  Migration extends IndexedDbMigration.IndexedDbMigration.Any
>(identifier: Id, migration: Migration) =>
  Layer.effect(
    IndexedDbDatabase,
    Effect.gen(function*() {
      const { IDBKeyRange, indexedDB } = yield* IndexedDb.IndexedDb

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
      const database = yield* Effect.async<globalThis.IDBDatabase, IndexedDbDatabaseError>((resume) => {
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

        request.onupgradeneeded = (event) => {
          const idbRequest = event.target as IDBRequest<IDBDatabase>
          const database = idbRequest.result
          const transaction = idbRequest.transaction
          oldVersion = event.oldVersion

          if (transaction === null) {
            resume(
              Effect.fail(
                new IndexedDbDatabaseError({
                  reason: "TransactionError",
                  cause: null
                })
              )
            )
          } else {
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

            migrations.slice(oldVersion).reduce((prev, untypedMigration) => {
              if (untypedMigration._tag === "Migration") {
                const migration = untypedMigration as IndexedDbMigration.IndexedDbMigration.AnyMigration
                const fromApi = internal.makeTransactionProto({
                  database,
                  IDBKeyRange,
                  source: migration.fromVersion,
                  transaction
                })
                const toApi = internal.makeTransactionProto({
                  database,
                  IDBKeyRange,
                  source: migration.toVersion,
                  transaction
                })

                return prev.then(() =>
                  Effect.runPromise(migration.execute(fromApi, toApi)).catch(
                    (cause) => {
                      resume(
                        Effect.fail(
                          new IndexedDbDatabaseError({
                            reason: "UpgradeError",
                            cause
                          })
                        )
                      )
                    }
                  )
                )
              } else if (untypedMigration._tag === "Initial") {
                const migration = untypedMigration as IndexedDbMigration.IndexedDbMigration.AnyInitial
                const api = internal.makeTransactionProto({
                  database,
                  IDBKeyRange,
                  source: migration.version,
                  transaction
                })

                return prev.then(() =>
                  Effect.runPromise(migration.execute(api)).catch(
                    (cause) => {
                      resume(
                        Effect.fail(
                          new IndexedDbDatabaseError({
                            reason: "UpgradeError",
                            cause
                          })
                        )
                      )
                    }
                  )
                )
              } else {
                resume(Effect.dieMessage("Invalid migration"))
                return Promise.resolve()
              }
            }, Promise.resolve())
          }
        }

        request.onsuccess = (event) => {
          const idbRequest = event.target as IDBRequest<IDBDatabase>
          const database = idbRequest.result
          resume(Effect.succeed(database))
        }
      })

      return makeProto({ identifier, version, database, IDBKeyRange })
    })
  )
