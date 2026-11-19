import { ClickhouseClient, ClickhouseMigrator, ClickhouseWebClient } from "@effect/sql-clickhouse"
import { assert, it, type Vitest } from "@effect/vitest"
import { type Context, Effect, Fiber, Layer, Schedule, Stream } from "effect"
import { SqlClient } from "effect/sql"
import { ClickhouseContainer } from "./utils.ts"

interface Client extends SqlClient.SqlClient {
  readonly asCommand: <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>
  readonly withQueryId: <A, E, R>(effect: Effect.Effect<A, E, R>, queryId: string) => Effect.Effect<A, E, R>
}

const runningQueries = (sql: SqlClient.SqlClient, queryId: string) =>
  sql<{ running: number }>`
    SELECT toUInt32(count()) AS running FROM system.processes WHERE query_id = ${queryId}
  `.pipe(Effect.map(([row]) => row.running))

const waitUntilRunning = (sql: SqlClient.SqlClient, queryId: string, running: number) =>
  runningQueries(sql, queryId).pipe(
    Effect.flatMap((count) => count === running ? Effect.void : Effect.fail("still waiting" as const)),
    Effect.retry({ schedule: Schedule.spaced("100 millis"), times: 100 })
  )

// Runs far longer than the tests wait, and checks for cancellation between blocks.
const heavy = "SELECT toUInt8(sum(number) > 0) AS n FROM numbers(100000000000) SETTINGS max_threads = 1"

const suite = <I, S extends Client>(name: string, it: Vitest.MethodsNonLive<I>, tag: Context.Service<I, S>) => {
  it.effect("stops the server query when a stream ends early", () =>
    Effect.gen(function*() {
      const sql = yield* tag
      const queryId = `${name}-stream-take`

      // The first row arrives at once while the second branch keeps the server busy.
      const first = yield* sql.withQueryId(
        Stream.runCollect(
          sql<{ n: number }>`SELECT toUInt8(1) AS n UNION ALL ${sql.literal(heavy)}`.stream.pipe(Stream.take(1))
        ),
        queryId
      )

      assert.deepStrictEqual(first, [{ n: 1 }])
      yield* waitUntilRunning(sql, queryId, 0)
    }))

  it.effect("stops the server query when the fiber is interrupted", () =>
    Effect.gen(function*() {
      const sql = yield* tag
      const queryId = `${name}-interrupt`

      const fiber = yield* sql.withQueryId(sql.unsafe(heavy), queryId).pipe(Effect.forkChild)
      yield* waitUntilRunning(sql, queryId, 1)
      yield* Fiber.interrupt(fiber)

      yield* waitUntilRunning(sql, queryId, 0)
    }))

  it.effect("applies migrations once", () =>
    Effect.gen(function*() {
      const sql = yield* tag
      const table = `${name}_migrated`
      const run = ClickhouseMigrator.run({
        table: `effect_sql_migrations_${name}`,
        loader: ClickhouseMigrator.fromRecord({
          "1_create": sql.asCommand(sql.unsafe(`CREATE TABLE ${table} (id UInt32) ENGINE = MergeTree ORDER BY id`))
        })
      }).pipe(Effect.provideService(SqlClient.SqlClient, sql))

      assert.deepStrictEqual(yield* run, [[1, "create"]])
      assert.deepStrictEqual(yield* run, [])
    }))
}

const nodeLayer = Layer.unwrap(Effect.map(ClickhouseContainer.options, ClickhouseClient.layer))
const webLayer = Layer.unwrap(Effect.map(ClickhouseContainer.options, ClickhouseWebClient.layer))

it.layer(ClickhouseContainer.layer, { timeout: "120 seconds", excludeTestServices: true })("ClickHouse", (it) => {
  it.layer(nodeLayer)("ClickhouseClient", (it) => suite("node", it, ClickhouseClient.ClickhouseClient))
  it.layer(webLayer)("ClickhouseWebClient", (it) => suite("web", it, ClickhouseWebClient.ClickhouseWebClient))
})
