import { CrSql } from "@effect-native/crsql"
import * as CrSqliteExtension from "@effect-native/crsql/CrSqliteExtension"
import * as CrSqlSchema from "@effect-native/crsql/CrSqlSchema"
import * as NodeSqlite from "@effect/sql-sqlite-node"
import { assert, layer } from "@effect/vitest"
import { Effect } from "effect"
import * as DateTime from "effect/DateTime"
import * as Schema from "effect/Schema"

const DbMem = NodeSqlite.SqliteClient.layer({ filename: ":memory:" })

layer(DbMem)((it) => {
  it.scoped("fromSqliteClient: accepts loadedExtensionInfo effect", () =>
    Effect.gen(function*() {
      // Ensure the CR-SQLite extension is actually loaded on this connection.
      // This fulfills the contract that callers providing loadedExtensionInfo
      // have already taken ownership of loading the native extension.
      const preloaded = yield* CrSqliteExtension.loadLibCrSql
      assert.ok(typeof preloaded.sha === "string" && preloaded.sha.length > 0)

      // Provide only the loading metadata via the loadedExtensionInfo effect.
      // fromSqliteClient will still verify the extension via sqlExtInfo and
      // merge both into the ExtInfoLoaded service.

      const info = Effect.succeed({
        loadedAt: yield* DateTime.now,
        path: null
      }).pipe(Effect.flatMap(Schema.validate(CrSqlSchema.ExtInfoLoaded)))

      yield* info

      const sql = yield* NodeSqlite.SqliteClient.SqliteClient
      const crsql = yield* CrSql.CrSql.fromSqliteClient({
        sql,
        loadedExtensionInfo: info
      })

      // Basic sanity: service works and queries extension state.
      const sha = yield* crsql.getSha
      assert.match(sha, /^[0-9a-f]+$/i)

      const siteId = yield* crsql.getSiteIdHex
      assert.strictEqual(siteId.length, 32)
      assert.match(siteId, /^[0-9A-F]{32}$/i)
    }))

  it.scoped("ExtInfoLoaded decodeUnknown succeeds with encoded shape", () =>
    Effect.gen(function*() {
      const encoded = { path: null as string | null, loadedAt: new Date() }

      const typed = yield* Schema.decodeUnknown(CrSqlSchema.ExtInfoLoaded)(encoded)
      const roundTripped = yield* Schema.encode(CrSqlSchema.ExtInfoLoaded)(typed)
      assert.strictEqual(roundTripped.path, null)
      assert.ok(roundTripped.loadedAt instanceof Date)
      assert.strictEqual(roundTripped.loadedAt.getTime(), encoded.loadedAt.getTime())
    }))

  it.scoped("ExtInfoLoaded decodeUnknown fails for invalid shape", () =>
    Effect.gen(function*() {
      const bad = { path: 123 as unknown, loadedAt: new Date() }
      const res = yield* Schema.decodeUnknown(CrSqlSchema.ExtInfoLoaded)(bad).pipe(Effect.either)
      assert.strictEqual(res._tag, "Left")
    }))
})
