import { PgliteClient } from "@effect/sql-pglite"
import { assert, describe, layer } from "@effect/vitest"
import { Deferred, Effect, Exit, Fiber, References, Stream } from "effect"
import type { SqlClient } from "effect/sql/SqlClient"
import type { SqlError } from "effect/sql/SqlError"
import { TestClock } from "effect/testing"

const ClientLayer = PgliteClient.layer({})

const setup = (table: string) =>
  Effect.gen(function*() {
    const sql = yield* PgliteClient.PgliteClient
    yield* sql.unsafe(`CREATE TABLE IF NOT EXISTS ${table} (id SERIAL PRIMARY KEY, name TEXT)`)
    yield* sql.unsafe(`TRUNCATE TABLE ${table} RESTART IDENTITY`)
    return sql
  })

// A statement that takes the shared connection before another fiber begins a
// transaction must not run inside that transaction. Where the statement's
// fiber yields depends on scheduling, so callers start the transaction after
// each delay in `raceDelays`.
const raceDelays = Array.from({ length: 201 }, (_, delay) => delay)

const raceRolledBackTransaction = <A>(
  sql: SqlClient,
  table: string,
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
      yield* sql`INSERT INTO ${sql(table)} VALUES ('rolled back')`
      for (let i = 0; i < 1000; i++) yield* Effect.yieldNow
      return yield* Effect.fail("rollback")
    })).pipe(Effect.ignore, Effect.forkChild)
    const exit = yield* Fiber.join(plain)
    yield* Fiber.join(transaction)
    return exit
  })

// Tests in this suite share one database and may run concurrently.
const makeRaceClient = (table: string) =>
  Effect.gen(function*() {
    const sql = yield* PgliteClient.PgliteClient
    yield* sql`CREATE TABLE IF NOT EXISTS ${sql(table)} (kind TEXT NOT NULL)`
    yield* sql`DELETE FROM ${sql(table)}`
    return sql
  })

describe("PgliteClient transactions", () => {
  layer(ClientLayer, { timeout: "30 seconds" })((it) => {
    it.effect("withTransaction commit", () =>
      Effect.gen(function*() {
        const sql = yield* setup("tx_commit")
        yield* sql.withTransaction(sql.unsafe(`INSERT INTO tx_commit (name) VALUES ('hello')`))
        const rows = yield* sql.unsafe<{ name: string }>(`SELECT name FROM tx_commit`)
        assert.deepStrictEqual(rows, [{ name: "hello" }])
      }))

    it.effect("withTransaction rollback", () =>
      Effect.gen(function*() {
        const sql = yield* setup("tx_rollback")
        yield* sql.unsafe(`INSERT INTO tx_rollback (name) VALUES ('hello')`).pipe(
          Effect.andThen(Effect.fail("boom")),
          sql.withTransaction,
          Effect.ignore
        )
        const rows = yield* sql.unsafe(`SELECT * FROM tx_rollback`)
        assert.deepStrictEqual(rows, [])
      }))

    it.effect("nested transaction commits both", () =>
      Effect.gen(function*() {
        const sql = yield* setup("tx_nested_commit")
        const stmt = sql.unsafe(`INSERT INTO tx_nested_commit (name) VALUES ('hello')`)
        yield* stmt.pipe(Effect.andThen(() => stmt.pipe(sql.withTransaction)), sql.withTransaction)
        const rows = yield* sql.unsafe<{ total: number }>(
          `SELECT count(*)::int AS total FROM tx_nested_commit`
        )
        assert.strictEqual(rows.at(0)?.total, 2)
      }))

    it.effect("nested transaction rollback via savepoint", () =>
      Effect.gen(function*() {
        const sql = yield* setup("tx_nested_rollback")
        const stmt = sql.unsafe(`INSERT INTO tx_nested_rollback (name) VALUES ('hello')`)
        yield* stmt.pipe(
          Effect.andThen(() => stmt.pipe(Effect.andThen(Effect.fail("boom")), sql.withTransaction, Effect.ignore)),
          sql.withTransaction
        )
        const rows = yield* sql.unsafe<{ total: number }>(
          `SELECT count(*)::int AS total FROM tx_nested_rollback`
        )
        assert.strictEqual(rows.at(0)?.total, 1)
      }))

    it.effect("releases completed nested transaction locks", () =>
      Effect.gen(function*() {
        const sql = yield* PgliteClient.PgliteClient
        const locks = sql`SELECT count(*)::integer AS count FROM pg_locks
          WHERE pid = pg_backend_pid() AND locktype = 'transactionid'`
        yield* sql.withTransaction(Effect.gen(function*() {
          yield* sql`CREATE TEMP TABLE savepoint_locks (value INTEGER) ON COMMIT DROP`

          yield* sql.withTransaction(sql`INSERT INTO savepoint_locks VALUES (1)`)
          assert.deepStrictEqual(yield* locks, [{ count: 1 }])

          const error = yield* sql.withTransaction(
            sql`INSERT INTO savepoint_locks VALUES (2)`.pipe(Effect.andThen(Effect.fail("rollback")))
          ).pipe(Effect.flip)
          assert.strictEqual(error, "rollback")
          assert.deepStrictEqual(yield* locks, [{ count: 1 }])

          assert.deepStrictEqual(yield* sql`SELECT value FROM savepoint_locks`, [{ value: 1 }])
        }))
      }))

    it.effect("preserves successful concurrent nested transactions", () =>
      Effect.gen(function*() {
        const sql = yield* setup("tx_nested_concurrent")
        const firstStarted = yield* Deferred.make<void>()
        const firstInserted = yield* Deferred.make<void>()

        yield* sql.withTransaction(
          Effect.all([
            sql.withTransaction(
              Effect.gen(function*() {
                yield* Deferred.succeed(firstStarted, undefined)
                yield* Effect.sleep("100 millis")
                yield* sql.unsafe(`INSERT INTO tx_nested_concurrent (name) VALUES ('first')`)
                yield* Deferred.succeed(firstInserted, undefined)
              })
            ),
            Deferred.await(firstStarted).pipe(
              Effect.andThen(sql.withTransaction(
                Deferred.await(firstInserted).pipe(
                  Effect.andThen(Effect.fail("rollback"))
                )
              ))
            )
          ], { concurrency: "unbounded" }).pipe(Effect.catch(() => Effect.void))
        )

        const rows = yield* sql.unsafe<{ name: string }>(`SELECT name FROM tx_nested_concurrent`)
        assert.deepStrictEqual(rows, [{ name: "first" }])
      }).pipe(TestClock.withLive))

    it.effect("keeps a plain write out of another fiber's rolled back transaction", () =>
      Effect.gen(function*() {
        const lost: Array<number> = []
        for (const delay of raceDelays) {
          yield* Effect.scoped(Effect.gen(function*() {
            const sql = yield* makeRaceClient("race_write")
            const exit = yield* raceRolledBackTransaction(
              sql,
              "race_write",
              sql`INSERT INTO race_write VALUES ('plain')`,
              delay
            )
            const rows = yield* sql<{ n: number }>`SELECT count(*) AS n FROM race_write`
            if (Exit.isFailure(exit) || Number(rows[0].n) !== 1) lost.push(delay)
          }))
        }
        assert.deepStrictEqual(lost, [])
      }))

    it.effect("keeps a streamed read out of another fiber's uncommitted transaction", () =>
      Effect.gen(function*() {
        const dirty: Array<number> = []
        for (const delay of raceDelays) {
          yield* Effect.scoped(Effect.gen(function*() {
            const sql = yield* makeRaceClient("race_stream")
            const exit = yield* raceRolledBackTransaction(
              sql,
              "race_stream",
              Stream.runCollect(sql<{ n: number }>`SELECT count(*) AS n FROM race_stream`.stream),
              delay
            )
            if (Exit.isFailure(exit) || Number(exit.value[0].n) !== 0) dirty.push(delay)
          }))
        }
        assert.deepStrictEqual(dirty, [])
      }))
  })
})
