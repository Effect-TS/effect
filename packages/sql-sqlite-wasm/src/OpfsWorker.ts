/**
 * @since 1.0.0
 */
/// <reference lib="webworker" />
import { SqlError } from "@effect/sql/SqlError"
import * as WaSqlite from "@effect/wa-sqlite"
import SQLiteESMFactory from "@effect/wa-sqlite/dist/wa-sqlite.mjs"
import { AccessHandlePoolVFS } from "@effect/wa-sqlite/src/examples/AccessHandlePoolVFS.js"
import * as Effect from "effect/Effect"
import type { OpfsWorkerMessage } from "./internal/opfsWorker.js"

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
        let messageId: number
        const message = event.data as OpfsWorkerMessage
        try {
          switch (message[0]) {
            case "close": {
              options.port.close()
              return resume(Effect.void)
            }
            case "import": {
              const [, id, data] = message
              messageId = id
              sqlite3.deserialize(db, "main", data, data.length, data.length, 1 | 2)
              options.port.postMessage([id, void 0, void 0])
              return
            }
            case "export": {
              const [, id] = message
              messageId = id
              const data = sqlite3.serialize(db, "main")
              options.port.postMessage([id, undefined, data], [data.buffer])
              return
            }
            case "update_hook": {
              messageId = -1
              sqlite3.update_hook(db, (_op, _db, table, rowid) => {
                if (!table) return
                options.port.postMessage(["update_hook", table, Number(rowid)])
              })
              return
            }
            default: {
              const [id, sql, params] = message
              messageId = id
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
              return
            }
          }
        } catch (e: any) {
          const message = "message" in e ? e.message : String(e)
          options.port.postMessage([messageId!, message, undefined])
        }
      }
      options.port.addEventListener("message", onMessage)
      options.port.postMessage(["ready", undefined, undefined])
      return Effect.sync(() => {
        options.port.removeEventListener("message", onMessage)
      })
    })
  }).pipe(Effect.scoped)
