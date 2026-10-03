import { assert, describe, it } from "@effect/vitest"
import { Cause, Clock, Duration, Effect, Exit, Option } from "effect"
import { Reactivity } from "effect/reactivity"
import { SqlError } from "effect/sql/SqlError"
import { rejects } from "node:assert/strict"
import { mkdtemp, rm, stat } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { pathToFileURL } from "node:url"

const isBun = "bun" in process.versions

const initializationFile = Effect.acquireRelease(
  Effect.promise(() => mkdtemp(join(tmpdir(), "effect-sqlite-bun-initialization-"))),
  (dir) => Effect.promise(() => rm(dir, { recursive: true, force: true }))
).pipe(Effect.map((dir) => join(dir, "test.db")))

const holdInitializationLock = (filename: string) =>
  Effect.gen(function*() {
    const db = yield* Effect.acquireRelease(
      Effect.promise(async () => {
        const { Database } = await import("bun:sqlite")
        return new Database(filename)
      }),
      (db) => Effect.sync(() => db.close())
    )
    db.run("BEGIN IMMEDIATE")
    return () => db.run("ROLLBACK")
  })

describe("Client", () => {
  it.live.skipIf(!isBun)("initializes WAL after a competing first-open lock is released", () =>
    Effect.gen(function*() {
      const { SqliteClient } = yield* Effect.promise(() => import("@effect/sql-sqlite-bun"))
      const filename = yield* initializationFile
      const release = yield* holdInitializationLock(filename)
      const liveClock = yield* Clock.Clock
      // Release only once initialization has encountered the real SQLite lock.
      // No timer competes with synchronous native busy waits.
      const clock: Clock.Clock = {
        ...liveClock,
        currentTimeMillisUnsafe: () => liveClock.currentTimeMillisUnsafe(),
        currentTimeNanosUnsafe: () => liveClock.currentTimeNanosUnsafe(),
        monotonicTimeNanosUnsafe: () => liveClock.monotonicTimeNanosUnsafe(),
        sleep: () => Effect.sync(release)
      }

      const result = yield* Effect.gen(function*() {
        const sql = yield* SqliteClient.SqliteClient
        assert.deepStrictEqual(yield* sql`SELECT 1 AS value`, [{ value: 1 }])
        assert.deepStrictEqual(yield* sql`PRAGMA busy_timeout`, [{ timeout: 2000 }])
        return yield* sql`PRAGMA journal_mode`
      }).pipe(
        Effect.provide(SqliteClient.layer({ filename, busyTimeout: "2 seconds" })),
        Effect.provideService(Clock.Clock, clock)
      )
      assert.deepStrictEqual(result, [{ journal_mode: "wal" }])
    }))

  it.live.skipIf(!isBun)(
    "fails WAL initialization with a typed error when the lock outlasts busyTimeout",
    () =>
      Effect.gen(function*() {
        const { SqliteClient } = yield* Effect.promise(() => import("@effect/sql-sqlite-bun"))
        const filename = yield* initializationFile
        yield* holdInitializationLock(filename)
        const exit = yield* Effect.gen(function*() {
          return yield* SqliteClient.SqliteClient
        }).pipe(Effect.provide(SqliteClient.layer({ filename, busyTimeout: "100 millis" })), Effect.exit)

        assert.isTrue(Exit.isFailure(exit))
        if (!Exit.isFailure(exit)) return
        assert.isFalse(Cause.hasDies(exit.cause), Cause.pretty(exit.cause))
        const error: unknown = Option.getOrThrow(Cause.findErrorOption(exit.cause))
        assert(error instanceof SqlError)
        assert.strictEqual(error._tag, "SqlError")
        assert(error.reason.cause instanceof Error)
        assert.match(error.reason.cause.message, /database is locked/i)
      })
  )

  it.effect.skipIf(!isBun)("fails an unopenable database layer with a typed error", () =>
    Effect.gen(function*() {
      const { SqliteClient } = yield* Effect.promise(() => import("@effect/sql-sqlite-bun"))
      const filename = (yield* initializationFile) + "/missing.db"
      const exit = yield* Effect.gen(function*() {
        return yield* SqliteClient.SqliteClient
      }).pipe(Effect.provide(SqliteClient.layer({ filename })), Effect.exit)

      assert.isTrue(Exit.isFailure(exit))
      if (!Exit.isFailure(exit)) return
      assert.isFalse(Cause.hasDies(exit.cause), Cause.pretty(exit.cause))
      const error: unknown = Option.getOrThrow(Cause.findErrorOption(exit.cause))
      assert(error instanceof SqlError)
      assert.strictEqual(error._tag, "SqlError")
    }))

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

  it.effect.skipIf(!isBun)(
    "recovers a failed deferred commit without losing an in-memory database",
    () =>
      Effect.gen(function*() {
        const { SqliteClient } = yield* Effect.promise(() => import("@effect/sql-sqlite-bun"))
        const sql = yield* SqliteClient.make({ filename: ":memory:" })
        yield* sql`PRAGMA foreign_keys = ON`
        yield* sql`CREATE TABLE parent (id INTEGER PRIMARY KEY)`
        yield* sql`CREATE TABLE child (parent_id INTEGER REFERENCES parent(id) DEFERRABLE INITIALLY DEFERRED)`
        yield* sql`INSERT INTO parent VALUES (1)`

        const failedCommit = yield* Effect.exit(sql.withTransaction(sql`INSERT INTO child VALUES (999)`))
        assert.isTrue(Exit.isFailure(failedCommit))
        if (!Exit.isFailure(failedCommit)) return
        assert.match(Cause.pretty(failedCommit.cause), /foreign key constraint failed/i)

        assert.deepStrictEqual(yield* sql`SELECT * FROM parent`, [{ id: 1 }])
        assert.deepStrictEqual(yield* sql`SELECT * FROM child`, [])
        yield* sql.withTransaction(sql`INSERT INTO child VALUES (1)`)
        assert.deepStrictEqual(yield* sql`SELECT * FROM child`, [{ parent_id: 1 }])
      }).pipe(Effect.provide(Reactivity.layer))
  )

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

  it.effect.skipIf(!isBun)("create implies readwrite for file: URIs", () =>
    Effect.gen(function*() {
      const { SqliteClient } = yield* Effect.promise(() => import("@effect/sql-sqlite-bun"))
      const filename = `/tmp/effect-sqlite-bun-uri-create-${crypto.randomUUID()}.db`
      yield* Effect.acquireRelease(Effect.void, () => Effect.promise(() => rm(filename, { force: true })))
      const sql = yield* SqliteClient.make({ filename: pathToFileURL(filename).href, readwrite: false })
      yield* sql`CREATE TABLE test (id INTEGER PRIMARY KEY)`
      yield* sql`INSERT INTO test (id) VALUES (1)`
      assert.deepStrictEqual(yield* sql`SELECT * FROM test`, [{ id: 1 }])
    }).pipe(Effect.provide(Reactivity.layer)))
})
