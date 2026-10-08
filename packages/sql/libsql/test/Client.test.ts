import { LibsqlClient } from "@effect/sql-libsql"
import { assert, describe, it } from "@effect/vitest"
import { Effect, Exit, Fiber, References } from "effect"
import * as Reactivity from "effect/reactivity/Reactivity"
import type { SqlClient } from "effect/sql/SqlClient"
import type { SqlError } from "effect/sql/SqlError"

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
  const sql = yield* LibsqlClient.make({ url: ":memory:" })
  yield* sql`CREATE TABLE race (kind TEXT NOT NULL)`
  return sql
}).pipe(Effect.provide(Reactivity.layer))

describe("Client", () => {
  it.effect("keeps a plain write out of another fiber's rolled back transaction", () =>
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
    }))
})
