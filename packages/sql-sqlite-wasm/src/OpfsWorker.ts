/**
 * @since 1.0.0
 */
/// <reference lib="webworker" />
import { SqlError } from "@effect/sql/SqlError"
import * as WaSqlite from "@effect/wa-sqlite"
import SQLiteESMFactory from "@effect/wa-sqlite/dist/wa-sqlite.mjs"
import { AccessHandlePoolVFS } from "@effect/wa-sqlite/src/examples/AccessHandlePoolVFS.js"
import * as Effect from "effect/Effect"

/**
 * @category models
 * @since 1.0.0
 */
export interface OpfsWorkerConfig {
  readonly port: EventTarget & Pick<MessagePort, "postMessage" | "close">
  readonly dbName: string
}

/**
 * @category constructor
 * @since 1.0.0
 */
export const run = (
  options: OpfsWorkerConfig
): Effect.Effect<void, SqlError> =>
  Effect.gen(function*() {
    const factory = yield* Effect.promise(() => SQLiteESMFactory())
    const sqlite3 = WaSqlite.Factory(factory)
    const vfs = yield* Effect.promise(() => AccessHandlePoolVFS.create("opfs", factory))
    sqlite3.vfs_register(vfs, false)
    const db = yield* Effect.acquireRelease(
      Effect.try({
        try: () => sqlite3.open_v2(options.dbName, undefined, "opfs"),
        catch: (cause) => new SqlError({ cause, message: "Failed to open database" })
      }),
      (db) => Effect.sync(() => sqlite3.close(db))
    )

    return yield* Effect.async<void>((resume) => {
      const onMessage = (event: any) => {
        const [id, sql, params] = event
          .data as ([number, string, Array<any>] | ["close"] | ["import", Uint8Array] | ["export"])
        if (id === "close") {
          options.port.close()
          return resume(Effect.void)
        }
        try {
          if (id === "import") {
            sqlite3.deserialize(db, "main", sql, sql.length, sql.length, 1 | 2)
            options.port.postMessage([id, undefined, void 0])
          } else if (id === "export") {
            const data = sqlite3.serialize(db, "main")
            options.port.postMessage([id, undefined, data], [data.buffer])
          } else {
            const results: Array<any> = []
            let columns: Array<string> | undefined
            for (const stmt of sqlite3.statements(db, sql)) {
              sqlite3.bind_collection(stmt, params as any)
              while (sqlite3.step(stmt) === WaSqlite.SQLITE_ROW) {
                columns = columns ?? sqlite3.column_names(stmt)
                const row = sqlite3.row(stmt)
                results.push(row)
              }
            }
            options.port.postMessage([id, undefined, [columns, results]])
          }
        } catch (e: any) {
          const message = "message" in e ? e.message : String(e)
          options.port.postMessage([id, message, undefined])
        }
      }
      options.port.addEventListener("message", onMessage)
      options.port.postMessage(["ready", undefined, undefined])
      return Effect.sync(() => {
        options.port.removeEventListener("message", onMessage)
      })
    })
  }).pipe(Effect.scoped)
