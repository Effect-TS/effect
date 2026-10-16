import { assert, describe, it } from "@effect/vitest"
import { Crypto, Effect, Stream } from "effect"
import { SqlMessageStorage } from "effect/cluster"
import { Reactivity } from "effect/reactivity"
import { SqlClient, Statement } from "effect/sql"
import type { SqlConnection } from "effect/sql"

// Observe the SQL driver boundary without requiring a database or mocking migrations.
const makeClient = Effect.gen(function*() {
  const statements: Array<string> = []
  const execute = (sql: string) =>
    Effect.sync(() => {
      statements.push(sql)
      return []
    })
  const connection: SqlConnection.Connection = {
    execute,
    executeRaw: execute,
    executeValues: execute,
    executeUnprepared: execute,
    executeValuesUnprepared: execute,
    executeStream: (sql) => Stream.fromEffect(execute(sql))
  }
  const sql = yield* SqlClient.make({
    driver: "test",
    acquirer: Effect.succeed(connection),
    compiler: Statement.makeCompilerSqlite(),
    spanAttributes: []
  })
  return { sql, statements }
}).pipe(Effect.provide(Reactivity.layer))

const crypto = Crypto.make({
  randomBytes: (size) => new Uint8Array(size),
  digest: (_algorithm, data) => Effect.succeed(data)
})

describe("SqlMessageStorage", () => {
  it.effect("makeEncoded still runs migrations by default", () =>
    Effect.gen(function*() {
      const { sql, statements } = yield* makeClient
      const storage = yield* SqlMessageStorage.makeEncoded().pipe(
        Effect.provideService(SqlClient.SqlClient, sql)
      )
      assert.isTrue(statements.some((sql) => sql.includes("CREATE TABLE IF NOT EXISTS \"cluster_migrations\"")))
      assert.isTrue(statements.some((sql) => sql.includes("CREATE TABLE IF NOT EXISTS \"cluster_messages\"")))
      assert.deepStrictEqual(yield* storage.repliesForUnfiltered(["1"]), [])
    }).pipe(Effect.provideService(Crypto.Crypto, crypto)))

  it.effect("makeEncodedStorage constructs a usable encoded driver without executing any SQL", () =>
    Effect.gen(function*() {
      const { sql, statements } = yield* makeClient
      const storage = yield* SqlMessageStorage.makeEncodedStorage({ prefix: "mailbox" }).pipe(
        Effect.provideService(SqlClient.SqlClient, sql)
      )
      // No DDL, history-table probes, transactions, or migration locks at startup.
      assert.deepStrictEqual(statements, [])
      assert.deepStrictEqual(yield* storage.repliesForUnfiltered(["1"]), [])
      assert.strictEqual(statements.length, 1)
      assert.include(statements[0], "FROM \"mailbox_replies\"")
    }).pipe(Effect.provideService(Crypto.Crypto, crypto)))
})
