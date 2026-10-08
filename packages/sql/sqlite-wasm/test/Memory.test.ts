import { assert, describe, it } from "@effect/vitest"
import { Cause, Effect, Exit, Fiber, References, Stream } from "effect"
import { Reactivity } from "effect/reactivity"
import type { SqlClient } from "effect/sql/SqlClient"
import { ConnectionError, SqlError } from "effect/sql/SqlError"

// The wa-sqlite loader fetches its wasm from a file URL, which Node's fetch
// does not support.
const isBun = "bun" in process.versions

// A statement that takes the shared connection before another fiber begins a
// transaction must not run inside that transaction. Where the statement's
// fiber yields depends on scheduling, so callers start the transaction after
// each delay in `raceDelays`.
const raceDelays = Array.from({ length: 201 }, (_, delay) => delay)

const raceRolledBackTransaction = <A>(
  sql: SqlClient,
  statement: Effect.Effect<A, SqlError>,
  delay: number
) =>
  Effect.gen(function*() {
    const plain = yield* statement.pipe(
      Effect.provideService(References.MaxOpsBeforeYield, 3),
      Effect.exit,
      Effect.forkChild
    )
    for (let i = 0; i < delay; i++) yield* Effect.yieldNow
    const transaction = yield* sql.withTransaction(Effect.gen(function*() {
      yield* sql`INSERT INTO race VALUES ('rolled back')`
      for (let i = 0; i < 1000; i++) yield* Effect.yieldNow
      return yield* Effect.fail("rollback")
    })).pipe(Effect.ignore, Effect.forkChild)
    const exit = yield* Fiber.join(plain)
    yield* Fiber.join(transaction)
    return exit
  })

const makeRaceClient = Effect.gen(function*() {
  const { SqliteClient } = yield* Effect.promise(() => import("@effect/sql-sqlite-wasm"))
  const sql = yield* SqliteClient.makeMemory({})
  yield* sql`CREATE TABLE race (kind TEXT NOT NULL)`
  return sql
}).pipe(Effect.provide(Reactivity.layer))

describe("Memory", () => {
  it.effect.skipIf(!isBun)("export does not bypass failed-commit cleanup", () =>
    Effect.gen(function*() {
      const { SqliteClient } = yield* Effect.promise(() => import("@effect/sql-sqlite-wasm"))
      const sql = yield* SqliteClient.makeMemory({})
      yield* sql`PRAGMA foreign_keys = ON`
      yield* sql`CREATE TABLE parent (id INTEGER PRIMARY KEY)`
      yield* sql`CREATE TABLE child (parent_id INTEGER REFERENCES parent(id) DEFERRABLE INITIALLY DEFERRED)`

      // Fail only the cleanup ROLLBACK, leaving the deferred constraint failure real.
      const conn = yield* Effect.scoped(sql.reserve)
      const executeUnprepared = conn.executeUnprepared
      let failRollback = true
      Object.defineProperty(conn, "executeUnprepared", {
        configurable: true,
        value: (...args: Parameters<typeof executeUnprepared>) =>
          args[0] === "ROLLBACK" && failRollback
            ? Effect.fail(
              new SqlError({
                reason: new ConnectionError({
                  message: "injected rollback failure",
                  operation: "rollback",
                  cause: new Error("injected rollback failure")
                })
              })
            )
            : executeUnprepared.apply(conn, args)
      })
      const failedCommit = yield* Effect.exit(sql.withTransaction(sql`INSERT INTO child VALUES (999)`))
      assert.isTrue(Exit.isFailure(failedCommit))

      const rejected = yield* Effect.exit(sql.export)
      assert.isTrue(Exit.isFailure(rejected), "export bypassed the rejected connection")
      if (Exit.isFailure(rejected)) {
        assert.match(Cause.pretty(rejected.cause), /cannot be reused after failed COMMIT cleanup/i)
      }

      failRollback = false
      const snapshot = yield* SqliteClient.makeMemory({})
      yield* snapshot.import(yield* sql.export)
      assert.deepStrictEqual(yield* snapshot`SELECT * FROM child`, [])
    }).pipe(Effect.provide(Reactivity.layer)))

  it.effect.skipIf(!isBun)(
    "keeps a plain write out of another fiber's rolled back transaction",
    () =>
      Effect.gen(function*() {
        const lost: Array<number> = []
        for (const delay of raceDelays) {
          yield* Effect.scoped(Effect.gen(function*() {
            const sql = yield* makeRaceClient
            const exit = yield* raceRolledBackTransaction(sql, sql`INSERT INTO race VALUES ('plain')`, delay)
            const rows = yield* sql<{ n: number }>`SELECT count(*) AS n FROM race`
            if (Exit.isFailure(exit) || Number(rows[0].n) !== 1) lost.push(delay)
          }))
        }
        assert.deepStrictEqual(lost, [])
      })
  )

  it.effect.skipIf(!isBun)(
    "keeps a streamed read out of another fiber's uncommitted transaction",
    () =>
      Effect.gen(function*() {
        const dirty: Array<number> = []
        for (const delay of raceDelays) {
          yield* Effect.scoped(Effect.gen(function*() {
            const sql = yield* makeRaceClient
            const exit = yield* raceRolledBackTransaction(
              sql,
              Stream.runCollect(sql<{ n: number }>`SELECT count(*) AS n FROM race`.stream),
              delay
            )
            if (Exit.isFailure(exit) || Number(exit.value[0].n) !== 0) dirty.push(delay)
          }))
        }
        assert.deepStrictEqual(dirty, [])
      })
  )
})
