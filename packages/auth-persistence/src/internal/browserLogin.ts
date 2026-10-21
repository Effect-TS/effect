import { Persistence, Record, Unavailable } from "@effect/auth/BrowserLogin"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import * as SqlClient from "effect/sql/SqlClient"

import { makeNativeSqlTables } from "./nativeSqlTable.ts"
import { exactSqlText } from "./sqlChange.ts"
import { cleanupSqlRows } from "./sqlCleanup.ts"
import { makeSqlCommitExecutor } from "./sqlCommit.ts"
import { Table } from "./sqlTable.ts"

const codec = Schema.fromJsonString(Record)
const Row = Schema.Struct({ payload: Schema.String, version: Schema.String })

/** SQLite/D1 and PostgreSQL; apply through application migrations. Terminal
 * attempts are retained until expiry. Contains private provenance, never bearers.
 */
const migration = `CREATE TABLE yielded_browser_login (
  namespace TEXT NOT NULL,
  attempt_id TEXT NOT NULL,
  version TEXT NOT NULL,
  expires_at_millis BIGINT NOT NULL,
  payload TEXT NOT NULL,
  PRIMARY KEY (namespace, attempt_id)
)`

const layer = Layer.effect(
  Persistence,
  Effect.gen(function*() {
    const sql = yield* SqlClient.SqlClient

    if (!sql.onDialectOrElse({ sqlite: () => true, pg: () => true, orElse: () => false })) {
      return yield* Unavailable.make({})
    }
    const executor = yield* makeSqlCommitExecutor(() => Unavailable.make({}))

    const table = makeNativeSqlTables(sql)(
      new Table(
        "yielded_browser_login",
        {
          namespace: { name: "namespace", type: "text" },
          attemptId: { name: "attempt_id", type: "text" },
          expiresAt: { name: "expires_at_millis", type: "integer" }
        },
        [["namespace", "attemptId"]]
      )
    )

    const clock = sql.onDialectOrElse({
      sqlite: () => sql.literal("CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)"),
      orElse: () => sql.literal("CAST(EXTRACT(EPOCH FROM clock_timestamp()) * 1000 AS BIGINT)")
    })

    return Persistence.of({
      cleanup: ({ namespace, limit }) =>
        executor.run(
          cleanupSqlRows(
            [
              {
                table,
                keys: ["namespace", "attemptId"],
                due: sql`${exactSqlText(sql, table.column("namespace"), table.value("namespace", namespace))} and ${
                  table.column("expiresAt")
                } <= ${clock}`,
                order: [table.column("expiresAt"), table.column("attemptId")]
              }
            ],
            limit
          ),
          "statement"
        ),
      get: Effect.fnUntraced(function*(namespace, id) {
        const rows =
          yield* sql`SELECT payload, version FROM yielded_browser_login WHERE namespace = ${namespace} AND attempt_id = ${id}`

        if (rows.length === 0) return undefined
        if (rows.length !== 1) return yield* Unavailable.make({})
        const row = yield* Schema.decodeUnknownEffect(Row)(rows[0])
        const record = yield* Schema.decodeEffect(codec)(row.payload)

        if (record.version !== row.version) return yield* Unavailable.make({})

        return record
      }, executor.read),
      insert: Effect.fnUntraced(
        function*(namespace, id, record) {
          const payload = yield* Schema.encodeEffect(codec)(record)

          const rows =
            yield* sql`INSERT INTO yielded_browser_login (namespace, attempt_id, version, expires_at_millis, payload)
        SELECT ${namespace}, ${id}, ${record.version}, ${record.expiresAtMillis}, ${payload}
        WHERE ${record.expiresAtMillis} > ${clock}
        ON CONFLICT (namespace, attempt_id) DO NOTHING RETURNING version`

          return rows.length === 1
        },
        (effect) => executor.run(effect, "statement")
      ),
      compareAndSet: Effect.fnUntraced(
        function*(namespace, id, version, record) {
          if (version === record.version) return yield* Unavailable.make({})
          const payload = yield* Schema.encodeEffect(codec)(record)

          const rows = yield* sql`UPDATE yielded_browser_login SET version = ${record.version}, payload = ${payload}
        WHERE namespace = ${namespace} AND attempt_id = ${id} AND version = ${version}
        AND expires_at_millis = ${record.expiresAtMillis} AND expires_at_millis > ${clock}
        RETURNING version`

          return rows.length === 1
        },
        (effect) => executor.run(effect, "statement")
      )
    })
  })
)

export const BrowserLoginPersistence = { migration, layer }
