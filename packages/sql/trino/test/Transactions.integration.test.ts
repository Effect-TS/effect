import { TrinoClient } from "@effect/sql-trino"
import { assert, it } from "@effect/vitest"
import { Deferred, Effect, Exit, Fiber, Layer } from "effect"
import * as SqlClient from "effect/sql/SqlClient"
import { layerTimeout, TrinoContainer } from "./utils.ts"

// Trino's connectors write only in autocommit mode ("Catalog only supports
// writes using autocommit"), so an explicit transaction can read and run
// session statements but never write.

const tableName = () => `memory.default.tx_${crypto.randomUUID().replaceAll("-", "_")}`

const timeout = 120_000

it.layer(TrinoContainer.layerClient.pipe(Layer.provideMerge(TrinoContainer.layer)), {
  timeout: layerTimeout,
  excludeTestServices: true
})("TrinoClient transactions", (it) => {
  it.effect("a write inside a transaction is refused and leaves nothing behind", () =>
    Effect.gen(function*() {
      const sql = yield* TrinoClient.TrinoClient
      const table = tableName()
      yield* sql.unsafe(`CREATE TABLE ${table} (v integer)`)
      yield* sql.unsafe(`INSERT INTO ${table} VALUES (1)`)
      const exit = yield* Effect.exit(sql.withTransaction(Effect.gen(function*() {
        // Reads inside the transaction see the autocommitted row.
        const [count] = yield* sql.unsafe<{ n: bigint }>(`SELECT count(*) AS n FROM ${table}`)
        assert.strictEqual(count.n, 1n)
        yield* sql.unsafe(`INSERT INTO ${table} VALUES (2)`)
      })))
      assert.isTrue(Exit.isFailure(exit), "a write inside a transaction must be refused")
      if (Exit.isFailure(exit)) {
        assert.include(String(exit.cause), "autocommit")
      }
      assert.strictEqual((yield* sql.session).transactionId, undefined)
      const rows = yield* sql.unsafe<{ v: number }>(`SELECT v FROM ${table}`)
      assert.deepStrictEqual(rows.map((row) => row.v), [1])
      yield* sql.unsafe(`DROP TABLE ${table}`)
    }), timeout)

  it.effect("a failed statement aborts the transaction until it rolls back", () =>
    Effect.gen(function*() {
      const sql = yield* TrinoClient.TrinoClient
      const error = yield* Effect.flip(sql.withTransaction(Effect.gen(function*() {
        yield* Effect.ignore(sql`SELECT * FROM memory.default.does_not_exist`)
        // The transaction is aborted: further statements fail.
        yield* sql`SELECT 1`
      })))
      assert.strictEqual(error._tag, "SqlError")
      assert.strictEqual((yield* sql.session).transactionId, undefined)
      const [row] = yield* sql<{ one: number }>`SELECT 1 AS one`
      assert.strictEqual(row.one, 1)
    }), timeout)

  it.effect(
    "nested transactions fail with the typed savepoint error and end the outer one",
    () =>
      Effect.gen(function*() {
        const sql = yield* TrinoClient.TrinoClient
        let innerRan = false
        const error = yield* Effect.flip(sql.withTransaction(Effect.gen(function*() {
          yield* sql`SELECT 1`
          yield* sql.withTransaction(Effect.sync(() => {
            innerRan = true
          }))
        })))
        assert.strictEqual(error.reason._tag, "UnknownError")
        assert.strictEqual(error.reason.operation, "savepoint")
        assert.isFalse(error.isRetryable)
        assert.isFalse(innerRan)
        assert.strictEqual((yield* sql.session).transactionId, undefined)
        const [row] = yield* sql<{ one: number }>`SELECT 1 AS one`
        assert.strictEqual(row.one, 1)
      }),
    timeout
  )

  it.effect("concurrent transactions run as separate Trino transactions", () =>
    Effect.gen(function*() {
      const sql = yield* TrinoClient.TrinoClient
      const bothOpen = yield* Deferred.make<void>()
      let open = 0
      const transaction = sql.withTransaction(Effect.gen(function*() {
        open++
        if (open === 2) yield* Deferred.succeed(bothOpen, undefined)
        yield* Deferred.await(bothOpen)
        const rows = yield* sql<{ id: string }>`SELECT transaction_id AS id FROM system.runtime.transactions`
        return rows.map((row) => row.id)
      }))
      const fibers = yield* Effect.forEach([1, 2], () => Effect.forkChild(transaction))
      const [first] = yield* Fiber.joinAll(fibers)
      assert.isTrue(new Set(first).size >= 2, `saw ${first.length} open transactions`)
      assert.strictEqual((yield* sql.session).transactionId, undefined)
    }), timeout)

  it.effect("BeginTransaction replaces START TRANSACTION for one transaction", () =>
    Effect.gen(function*() {
      const sql = yield* TrinoClient.TrinoClient
      const transactions = sql<{ isolation: string; readOnly: boolean }>`
        SELECT isolation_level AS isolation, read_only AS "readOnly" FROM system.runtime.transactions`
      const chosen = yield* sql.withTransaction(transactions).pipe(
        Effect.provideService(SqlClient.BeginTransaction, "START TRANSACTION ISOLATION LEVEL SERIALIZABLE, READ ONLY")
      )
      assert.isTrue(
        chosen.some((row) => row.isolation === "SERIALIZABLE" && row.readOnly),
        `transactions seen: ${JSON.stringify(chosen)}`
      )
      // The next transaction uses the client's own START TRANSACTION again.
      const plain = yield* sql.withTransaction(transactions)
      assert.isTrue(plain.some((row) => !row.readOnly), `transactions seen: ${JSON.stringify(plain)}`)
    }), timeout)
})
