import { CrSql } from "@effect-native/crsql/CrSql"
import * as NodeSqlite from "@effect/sql-sqlite-node"
import { Effect } from "effect"

export const layerMem = NodeSqlite.SqliteClient.layer({ filename: ":memory:" })

export const ensureCrSqlLoaded = CrSql.fromSqliteClient()

export const createTodosCrr = Effect.gen(function*() {
  const crsql = yield* CrSql.fromSqliteClient()
  yield* crsql.automigrate`
    CREATE TABLE IF NOT EXISTS todos (
      id BLOB NOT NULL PRIMARY KEY,
      content TEXT NOT NULL DEFAULT '',
      completed INTEGER NOT NULL DEFAULT 0
    )
  `
  yield* crsql.asCrr("todos")
})
