/**
 * @since 1.0.0
 */
/// <reference lib="webworker" />
import { SqlError } from "@effect/sql/SqlError"
import * as Effect from "effect/Effect"
import * as WaSqlite from "wa-sqlite"
import SQLiteESMFactory from "wa-sqlite/dist/wa-sqlite.mjs"
import { AccessHandlePoolVFS } from "wa-sqlite/src/examples/AccessHandlePoolVFS.js"

/**
 * @category models
 * @since 1.0.0
 */
export interface OpfsWorkerConfig {
  readonly port: MessagePort
  readonly dbName: string
}

/**
 * @category constructor
 * @since 1.0.0
 */
export const run = (
  options: OpfsWorkerConfig
): Effect.Effect<never, SqlError> =>
  Effect.gen(function*() {
    const factory = yield* Effect.promise(() => SQLiteESMFactory())
    const sqlite3 = WaSqlite.Factory(factory)
    const vfs = yield* Effect.promise(() => AccessHandlePoolVFS.create("opfs", factory))
    sqlite3.vfs_register(vfs, false)
    const db = yield* Effect.acquireRelease(
      Effect.tryPromise({
        try: () => sqlite3.open_v2(options.dbName, undefined, "opfs"),
        catch: (cause) => new SqlError({ cause, message: "Failed to open database" })
      }),
      (db) => Effect.sync(() => sqlite3.close(db))
    )

    return yield* Effect.async<never>((_resume) => {
      const onMessage = async (event: MessageEvent) => {
        const [id, sql, params] = event.data as [number, string, Array<any>]
        try {
          const results: Array<any> = []
          let columns: Array<string> | undefined
          for await (const stmt of sqlite3.statements(db, sql)) {
            sqlite3.bind_collection(stmt, params as any)
            while (await sqlite3.step(stmt) === WaSqlite.SQLITE_ROW) {
              columns = columns ?? sqlite3.column_names(stmt)
              const row = sqlite3.row(stmt)
              results.push(row)
            }
          }
          options.port.postMessage([id, undefined, [columns, results]])
        } catch (e: any) {
          const message = "message" in e ? e.message : String(e)
          options.port.postMessage([id, message, undefined])
        }
      }
      options.port.addEventListener("message", onMessage)
      options.port.postMessage([-1, undefined, undefined])
      return Effect.sync(() => {
        options.port.removeEventListener("message", onMessage)
      })
    })
  }).pipe(Effect.scoped)
