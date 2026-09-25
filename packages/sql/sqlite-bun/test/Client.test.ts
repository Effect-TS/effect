import { assert, describe, it } from "@effect/vitest"
import { Duration, Effect } from "effect"
import { Reactivity } from "effect/reactivity"
import { rejects } from "node:assert/strict"
import { rm, stat } from "node:fs/promises"
import { pathToFileURL } from "node:url"

const isBun = "bun" in process.versions

describe("Client", () => {
  it.effect("should work", () => Effect.void)

  it.effect.skipIf(!isBun)("uses a 5 second busy timeout", () =>
    Effect.gen(function*() {
      const { SqliteClient } = yield* Effect.promise(() => import("@effect/sql-sqlite-bun"))
      const sql = yield* SqliteClient.make({ filename: ":memory:" })
      assert.deepStrictEqual(yield* sql`PRAGMA busy_timeout`, [{ timeout: 5000 }])

      const custom = yield* SqliteClient.make({ filename: ":memory:", busyTimeout: "1 second" })
      assert.deepStrictEqual(yield* custom`PRAGMA busy_timeout`, [{ timeout: 1000 }])

      const infinite = yield* SqliteClient.make({ filename: ":memory:", busyTimeout: Duration.infinity })
      assert.deepStrictEqual(yield* infinite`PRAGMA busy_timeout`, [{ timeout: 2_147_483_647 }])
    }).pipe(Effect.provide(Reactivity.layer)))

  it.effect.skipIf(!isBun)("starts transactions immediately", () =>
    Effect.gen(function*() {
      const { SqliteClient } = yield* Effect.promise(() => import("@effect/sql-sqlite-bun"))
      const filename = `/tmp/effect-sqlite-bun-transaction-${crypto.randomUUID()}.db`
      yield* Effect.acquireRelease(
        Effect.void,
        () => Effect.promise(() => rm(filename, { force: true }))
      )

      const client = yield* SqliteClient.make({ filename })
      const contender = yield* SqliteClient.make({ filename })
      yield* contender`PRAGMA busy_timeout = 1`

      yield* client.withTransaction(
        Effect.gen(function*() {
          const error = yield* Effect.flip(contender`BEGIN IMMEDIATE`)
          assert.strictEqual(error._tag, "SqlError")
          assert(error.reason.cause instanceof Error)
          assert.match(error.reason.cause.message, /database is locked/i)
        })
      )
    }).pipe(Effect.provide(Reactivity.layer)))

  it.effect.skipIf(!isBun)("exports inside transactions", () =>
    Effect.gen(function*() {
      const { SqliteClient } = yield* Effect.promise(() => import("@effect/sql-sqlite-bun"))
      const { Database } = yield* Effect.promise(() => import("bun:sqlite"))
      const sql = yield* SqliteClient.make({ filename: ":memory:" })
      yield* sql`CREATE TABLE test (id INTEGER PRIMARY KEY)`

      const bytes = yield* sql.withTransaction(
        sql`INSERT INTO test DEFAULT VALUES`.pipe(Effect.andThen(sql.export))
      )
      const snapshot = Database.deserialize(bytes)
      try {
        assert.deepStrictEqual(snapshot.query("SELECT * FROM test").all(), [{ id: 1 }])
      } finally {
        snapshot.close()
      }
    }).pipe(Effect.provide(Reactivity.layer)))

  it.effect.skipIf(!isBun)("readonly clients reject writes", () =>
    Effect.gen(function*() {
      const { SqliteClient } = yield* Effect.promise(() => import("@effect/sql-sqlite-bun"))
      const filename = `/tmp/effect-sqlite-bun-readonly-${crypto.randomUUID()}.db`
      yield* Effect.acquireRelease(
        Effect.void,
        () => Effect.promise(() => rm(filename, { force: true }))
      )

      yield* Effect.scoped(
        Effect.gen(function*() {
          const sql = yield* SqliteClient.make({ filename })
          yield* sql`CREATE TABLE test (id INTEGER PRIMARY KEY)`
        })
      )

      const sql = yield* SqliteClient.make({ filename, readonly: true })
      assert.deepStrictEqual(yield* sql`SELECT * FROM test`, [])

      const error = yield* Effect.flip(sql`INSERT INTO test DEFAULT VALUES`)
      assert.strictEqual(error._tag, "SqlError")
      assert(error.reason.cause instanceof Error)
      assert.match(error.reason.cause.message, /attempt to write a readonly database/i)

      yield* sql`PRAGMA query_only = ON`
      assert.deepStrictEqual(yield* sql.withTransaction(sql`SELECT * FROM test`), [])
    }).pipe(Effect.provide(Reactivity.layer)))

  it.effect.skipIf(!isBun)("opens file: URIs in readonly mode", () =>
    Effect.gen(function*() {
      const { SqliteClient } = yield* Effect.promise(() => import("@effect/sql-sqlite-bun"))
      const filename = `/tmp/effect-sqlite-bun-uri-${crypto.randomUUID()}.db`
      yield* Effect.acquireRelease(
        Effect.void,
        () => Effect.promise(() => rm(filename, { force: true }))
      )

      yield* Effect.scoped(
        Effect.gen(function*() {
          const sql = yield* SqliteClient.make({ filename })
          yield* sql`CREATE TABLE test (id INTEGER PRIMARY KEY)`
          yield* sql`INSERT INTO test (id) VALUES (1)`
        })
      )

      const uri = `${pathToFileURL(filename).href}?immutable=1`
      const sql = yield* SqliteClient.make({ filename: uri, readonly: true })
      assert.deepStrictEqual(yield* sql`SELECT * FROM test`, [{ id: 1 }])

      const error = yield* Effect.flip(sql`INSERT INTO test (id) VALUES (2)`)
      assert.strictEqual(error._tag, "SqlError")
      assert(error.reason.cause instanceof Error)
      assert.match(error.reason.cause.message, /attempt to write a readonly database/i)
    }).pipe(Effect.provide(Reactivity.layer)))

  it.effect.skipIf(!isBun)("rejects writes to a plain readonly file: URI", () =>
    Effect.gen(function*() {
      const { SqliteClient } = yield* Effect.promise(() => import("@effect/sql-sqlite-bun"))
      const filename = `/tmp/effect-sqlite-bun-uri-readonly-${crypto.randomUUID()}.db`
      yield* Effect.acquireRelease(Effect.void, () => Effect.promise(() => rm(filename, { force: true })))

      yield* Effect.scoped(Effect.gen(function*() {
        const sql = yield* SqliteClient.make({ filename })
        yield* sql`CREATE TABLE test (id INTEGER PRIMARY KEY)`
      }))

      const sql = yield* SqliteClient.make({ filename: pathToFileURL(filename).href, readonly: true })
      assert.deepStrictEqual(yield* sql`SELECT * FROM test`, [])
      const error = yield* Effect.flip(sql`INSERT INTO test (id) VALUES (1)`)
      assert.strictEqual(error._tag, "SqlError")
      assert(error.reason.cause instanceof Error)
      assert.match(error.reason.cause.message, /attempt to write a readonly database/i)
    }).pipe(Effect.provide(Reactivity.layer)))

  it.effect.skipIf(!isBun)("respects create: false for ordinary filenames", () =>
    Effect.gen(function*() {
      const { SqliteClient } = yield* Effect.promise(() => import("@effect/sql-sqlite-bun"))
      const filename = `/tmp/effect-sqlite-bun-no-create-${crypto.randomUUID()}.db`
      yield* Effect.acquireRelease(
        Effect.void,
        () => Effect.promise(() => rm(filename, { force: true }))
      )

      yield* Effect.promise(() =>
        rejects(
          Effect.runPromise(
            Effect.scoped(SqliteClient.make({ filename, create: false })).pipe(Effect.provide(Reactivity.layer))
          ),
          /unable to open database file/i
        )
      )
      const sql = yield* SqliteClient.make({ filename })
      yield* sql`CREATE TABLE test (id INTEGER PRIMARY KEY)`
      assert.deepStrictEqual(yield* sql`SELECT * FROM test`, [])
    }).pipe(Effect.provide(Reactivity.layer)))

  it.effect.skipIf(!isBun)("opens existing file: URIs with create: false", () =>
    Effect.gen(function*() {
      const { SqliteClient } = yield* Effect.promise(() => import("@effect/sql-sqlite-bun"))
      const filename = `/tmp/effect-sqlite-bun-uri-no-create-${crypto.randomUUID()}.db`
      yield* Effect.acquireRelease(
        Effect.void,
        () => Effect.promise(() => rm(filename, { force: true }))
      )

      yield* Effect.scoped(
        Effect.gen(function*() {
          const sql = yield* SqliteClient.make({ filename })
          yield* sql`CREATE TABLE test (id INTEGER PRIMARY KEY)`
        })
      )

      const sql = yield* SqliteClient.make({ filename: pathToFileURL(filename).href, create: false })
      yield* sql`INSERT INTO test (id) VALUES (1)`
      assert.deepStrictEqual(yield* sql`SELECT * FROM test`, [{ id: 1 }])
    }).pipe(Effect.provide(Reactivity.layer)))

  it.effect.skipIf(!isBun)("does not create a missing file: URI with create: false", () =>
    Effect.gen(function*() {
      const { SqliteClient } = yield* Effect.promise(() => import("@effect/sql-sqlite-bun"))
      const filename = `/tmp/effect-sqlite-bun-uri-missing-${crypto.randomUUID()}.db`
      yield* Effect.acquireRelease(Effect.void, () => Effect.promise(() => rm(filename, { force: true })))

      yield* Effect.promise(async () => {
        await rejects(
          Effect.runPromise(
            Effect.scoped(SqliteClient.make({ filename: pathToFileURL(filename).href, create: false })).pipe(
              Effect.provide(Reactivity.layer)
            )
          ),
          /unable to open database file/i
        )
        await rejects(stat(filename), { code: "ENOENT" })
      })
    }).pipe(Effect.provide(Reactivity.layer)))

  for (const create of [undefined, true]) {
    it.effect.skipIf(!isBun)(
      `create implies readwrite for file: URIs (create: ${create ?? "default"})`,
      () =>
        Effect.gen(function*() {
          const { SqliteClient } = yield* Effect.promise(() => import("@effect/sql-sqlite-bun"))
          const filename = `/tmp/effect-sqlite-bun-uri-create-${crypto.randomUUID()}.db`
          yield* Effect.acquireRelease(Effect.void, () => Effect.promise(() => rm(filename, { force: true })))
          const sql = yield* SqliteClient.make({ filename: pathToFileURL(filename).href, readwrite: false, create })
          yield* sql`CREATE TABLE test (id INTEGER PRIMARY KEY)`
          yield* sql`INSERT INTO test (id) VALUES (1)`
          assert.deepStrictEqual(yield* sql`SELECT * FROM test`, [{ id: 1 }])
        }).pipe(Effect.provide(Reactivity.layer))
    )
  }
})
