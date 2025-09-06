#!/usr/bin/env node
import { getCrSqliteExtensionPath } from "@effect-native/libcrsql/effect"
import * as NodeSqlite from "@effect/sql-sqlite-node"
import { Effect } from "effect"

const program = Effect.gen(function*() {
  const sql = yield* NodeSqlite.SqliteClient.make({ filename: ":memory:" })
  const ext = yield* Effect.promise(() => getCrSqliteExtensionPath())
  yield* sql.loadExtension(ext)

  // Inspect crsql tables
  const tables = yield* sql`SELECT name, type FROM sqlite_master WHERE name LIKE 'crsql_%'`
  yield* Effect.log("crsql_* objects:", tables)

  const changesSchema = yield* sql`PRAGMA table_info(crsql_changes)`
  yield* Effect.log("crsql_changes schema:", changesSchema)

  const peersSchema = yield* sql`PRAGMA table_info(crsql_tracked_peers)`
  yield* Effect.log("crsql_tracked_peers schema:", peersSchema)
}).pipe(Effect.scoped)

Effect.runPromise(program)
