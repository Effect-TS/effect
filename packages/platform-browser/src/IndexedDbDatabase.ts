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
import * as IndexedDbMigration from "./IndexedDbMigration.js"

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
  "@effect/platform-browser/IndexedDb/IndexedDbDatabaseError"
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
  "@effect/platform-browser/IndexedDbDatabase"
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
    readonly database: IDBDatabase
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
}): IndexedDbDatabase.Service<Id> => {
  function IndexedDb() {}
  Object.setPrototypeOf(IndexedDb, Proto)
  IndexedDb.identifier = options.identifier
  IndexedDb.version = options.version
  IndexedDb.database = options.database
  return IndexedDb as any
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const layer = <
  Id extends string,
  Migrations extends ReadonlyArray<IndexedDbMigration.IndexedDbMigration.Any>
>(
  identifier: Id,
  ...migrations: Migrations & {
    0: IndexedDbMigration.IndexedDbMigration.Any
  }
) =>
  Layer.effect(
    IndexedDbDatabase,
    Effect.gen(function*() {
      const { indexedDB } = yield* IndexedDb.IndexedDb

      let oldVersion = 0
      const version = migrations.length
      const database = yield* Effect.async<
        globalThis.IDBDatabase,
        IndexedDbDatabaseError
      >((resume) => {
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
              const migration = untypedMigration as IndexedDbMigration.IndexedDbMigration.AnyWithProps
              const fromApi = IndexedDbMigration.migrationApi(
                database,
                transaction,
                migration.fromVersion
              )
              const toApi = IndexedDbMigration.migrationApi(
                database,
                transaction,
                migration.toVersion
              )

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
            }, Promise.resolve())
          }
        }

        request.onsuccess = (event) => {
          const idbRequest = event.target as IDBRequest<IDBDatabase>
          const database = idbRequest.result
          resume(Effect.succeed(database))
        }
      })

      return makeProto({ identifier, version, database })
    })
  )
