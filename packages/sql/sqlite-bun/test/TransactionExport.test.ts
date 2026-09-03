import type { SqliteClient } from "@effect/sql-sqlite-bun"
import { assert, describe, it } from "@effect/vitest"
import { Cause, Deferred, Effect, Exit, Fiber } from "effect"
import { TestClock } from "effect/testing"
import * as Reactivity from "effect/unstable/reactivity/Reactivity"

const isBun = process.versions.bun !== undefined
const { Database } = isBun ? await import("bun:sqlite") : { Database: undefined }
const nativeDatabase = () => {
  if (Database === undefined) throw new Error("This test requires native bun:sqlite")
  return Database
}

const checkSnapshot = (bytes: Uint8Array, value: number) => {
  const copy = nativeDatabase().deserialize(bytes)
  try {
    assert.deepStrictEqual(copy.query("SELECT value FROM marker").all(), [{ value }])
  } finally {
    copy.close()
  }
}

const fixture = Effect.gen(function*() {
  const { SqliteClient } = yield* Effect.promise(() => import("@effect/sql-sqlite-bun"))
  const sql = yield* SqliteClient.make({ filename: ":memory:", transformResultNames: (name) => name.toUpperCase() })
  yield* sql`CREATE TABLE marker (value INTEGER NOT NULL)`
  yield* sql`INSERT INTO marker VALUES (1)`
  return sql
})

// The barrier is signaled inside BEGIN, immediately before the tested effect.
// The virtual timeout only bounds the self-wait; it does not trigger the bug.
const boundedTransaction = <A, E, R>(sql: SqliteClient.SqliteClient, body: Effect.Effect<A, E, R>) =>
  Effect.gen(function*() {
    const entered = yield* Deferred.make<void>()
    const fiber = yield* Effect.forkChild(
      sql.withTransaction(Effect.gen(function*() {
        assert.deepStrictEqual(yield* sql`SELECT value FROM marker`, [{ VALUE: 1 }])
        yield* Deferred.succeed(entered, undefined)
        return yield* body
      })).pipe(Effect.timeout("1 second"), Effect.exit)
    )
    yield* Deferred.await(entered)
    yield* TestClock.adjust("1 second")
    const result = yield* Fiber.join(fiber)
    if (Exit.isFailure(result)) {
      console.log("bounded transaction failure", Cause.pretty(result.cause))
      assert.match(Cause.pretty(result.cause), /TimeoutError/)
    }
    return result
  })

describe.skipIf(!isBun)("native Bun transaction export", () => {
  it("native SQLite serializes BEGIN IMMEDIATE and reads uncommitted data from the snapshot", () => {
    const Database = nativeDatabase()
    const source = new Database(":memory:")
    try {
      source.run("CREATE TABLE marker (value INTEGER NOT NULL)")
      source.run("INSERT INTO marker VALUES (1)")
      source.run("BEGIN IMMEDIATE")
      try {
        source.run("UPDATE marker SET value = 2")
        checkSnapshot(source.serialize(), 2)
        assert.isTrue(source.inTransaction)
        assert.isNotNull(source.query("SELECT sqlite_version() AS version").get())
      } finally {
        source.run("ROLLBACK")
      }
      assert.deepStrictEqual(source.query("SELECT value FROM marker").all(), [{ value: 1 }])
    } finally {
      source.close()
    }
  })

  it.effect("outside export and ordinary transaction statements work", () =>
    Effect.gen(function*() {
      const sql = yield* fixture
      checkSnapshot(yield* sql.export, 1)
      assert.deepStrictEqual(yield* sql.withTransaction(sql`SELECT value FROM marker`), [{ VALUE: 1 }])
      yield* sql.withTransaction(sql`UPDATE marker SET value = 2`)
      checkSnapshot(yield* sql.export, 2)
    }).pipe(Effect.provide(Reactivity.layer)))

  it.effect("same-client nested commit and rollback preserve normal statements", () =>
    Effect.gen(function*() {
      const sql = yield* fixture
      yield* sql.withTransaction(Effect.gen(function*() {
        yield* sql.withTransaction(sql`UPDATE marker SET value = 2`)
        const inner = yield* sql.withTransaction(
          sql`UPDATE marker SET value = 3`.pipe(Effect.andThen(Effect.fail("rollback")))
        ).pipe(Effect.exit)
        assert.isTrue(Exit.isFailure(inner))
        assert.deepStrictEqual(yield* sql`SELECT value FROM marker`, [{ VALUE: 2 }])
      }))
      checkSnapshot(yield* sql.export, 2)
      assert.isTrue(
        Exit.isFailure(
          yield* sql.withTransaction(sql`UPDATE marker SET value = 4`.pipe(Effect.andThen(Effect.fail("rollback"))))
            .pipe(Effect.exit)
        )
      )
      checkSnapshot(yield* sql.export, 2)
    }).pipe(Effect.provide(Reactivity.layer)))

  it.effect("withTransaction(export) completes; failed-run recovery releases permit and scope closes database", () =>
    Effect.gen(function*() {
      const { result, sql } = yield* Effect.scoped(Effect.gen(function*() {
        const sql = yield* fixture
        const result = yield* boundedTransaction(sql, sql.export)
        console.log("transaction export exit", result._tag)
        // These controls execute even on base after timeout, before the final assertion.
        assert.deepStrictEqual(yield* sql`SELECT value FROM marker`, [{ VALUE: 1 }])
        checkSnapshot(yield* sql.export, 1)
        yield* sql.withTransaction(sql`UPDATE marker SET value = 2`)
        checkSnapshot(yield* sql.export, 2)
        return { sql, result }
      }))
      assert.isTrue(Exit.isFailure(yield* sql`SELECT value FROM marker`.pipe(Effect.exit)))
      assert.isTrue(Exit.isFailure(yield* sql.export.pipe(Effect.exit)))
      console.log("recovery queries, subsequent transaction, exports, and closed-database checks passed")
      assert.isTrue(Exit.isSuccess(result))
      if (Exit.isSuccess(result)) checkSnapshot(result.value, 1)
    }).pipe(Effect.provide(Reactivity.layer)))

  it.effect("nested transaction export includes uncommitted writes", () =>
    Effect.gen(function*() {
      const sql = yield* fixture
      const result = yield* boundedTransaction(
        sql,
        sql.withTransaction(Effect.gen(function*() {
          yield* sql`UPDATE marker SET value = 2`
          return yield* sql.export
        }))
      )
      assert.isTrue(Exit.isSuccess(result))
      if (Exit.isSuccess(result)) checkSnapshot(result.value, 2)
      checkSnapshot(yield* sql.export, 2)
    }).pipe(Effect.provide(Reactivity.layer)))

  it.effect("snapshot survives inner rollback without changing outer transaction", () =>
    Effect.gen(function*() {
      const sql = yield* fixture
      const result = yield* boundedTransaction(
        sql,
        Effect.gen(function*() {
          let bytes: Uint8Array | undefined
          const inner = yield* sql.withTransaction(Effect.gen(function*() {
            yield* sql`UPDATE marker SET value = 2`
            bytes = yield* sql.export
            return yield* Effect.fail("rollback snapshot write")
          })).pipe(Effect.exit)
          assert.isTrue(Exit.isFailure(inner))
          assert.deepStrictEqual(yield* sql`SELECT value FROM marker`, [{ VALUE: 1 }])
          return bytes
        })
      )
      checkSnapshot(yield* sql.export, 1)
      assert.isTrue(Exit.isSuccess(result))
      if (Exit.isSuccess(result)) {
        assert.isDefined(result.value)
        checkSnapshot(result.value!, 2)
      }
    }).pipe(Effect.provide(Reactivity.layer)))

  it.effect("withoutTransforms transaction view shares export context", () =>
    Effect.gen(function*() {
      const sql = yield* fixture
      const raw = sql.withoutTransforms()
      assert.notStrictEqual(sql, raw)
      assert.strictEqual(sql.transactionService, raw.transactionService)
      const result = yield* boundedTransaction(
        sql,
        raw.withTransaction(Effect.gen(function*() {
          yield* raw`UPDATE marker SET value = 2`
          return yield* sql.export
        }))
      )
      assert.isTrue(Exit.isSuccess(result))
      if (Exit.isSuccess(result)) checkSnapshot(result.value, 2)
    }).pipe(Effect.provide(Reactivity.layer)))

  for (const foreignContext of [false, true]) {
    it.effect(`outside export waits for its own client's permit (foreign transaction context: ${foreignContext})`, () =>
      Effect.gen(function*() {
        const a = yield* fixture
        const b = yield* fixture
        yield* b`UPDATE marker SET value = 99`
        const held = yield* Deferred.make<void>()
        const release = yield* Deferred.make<void>()
        const started = yield* Deferred.make<void>()
        const completed = yield* Deferred.make<void>()
        const holder = yield* Effect.forkChild(a.withTransaction(Effect.gen(function*() {
          yield* a`UPDATE marker SET value = 2`
          yield* Deferred.succeed(held, undefined)
          yield* Deferred.await(release)
          yield* a`UPDATE marker SET value = 3`
        })))
        yield* Deferred.await(held)
        const exporting = Effect.gen(function*() {
          if (foreignContext) assert.deepStrictEqual(yield* b`SELECT value FROM marker`, [{ VALUE: 99 }])
          yield* Deferred.succeed(started, undefined)
          const bytes = yield* a.export
          yield* Deferred.succeed(completed, undefined)
          return bytes
        })
        const exporter = yield* Effect.forkChild(foreignContext ? b.withTransaction(exporting) : exporting)
        yield* Deferred.await(started)
        yield* TestClock.adjust(0)
        const finishedBeforeRelease = yield* Deferred.isDone(completed)
        yield* Deferred.succeed(release, undefined)
        yield* Fiber.join(holder)
        const bytes = yield* Fiber.join(exporter)
        assert.isFalse(finishedBeforeRelease)
        checkSnapshot(bytes, 3)
        checkSnapshot(yield* b.export, 99)
      }).pipe(Effect.provide(Reactivity.layer)))
  }
})
