import { ClickhouseClient, ClickhouseMigrator, ClickhouseWebClient } from "@effect/sql-clickhouse"
import { assert, it, type Vitest } from "@effect/vitest"
import { type Context, Effect, Fiber, Layer, Schedule, Stream } from "effect"
import { SqlClient } from "effect/sql"
import { ClickhouseContainer } from "./utils.ts"

/**
 * Runs the same assertions against the Node client and the web client, both
 * talking to one real ClickHouse server.
 */

/** The part of a ClickHouse client that is identical in the Node and the web entry. */
interface Subject extends SqlClient.SqlClient {
  readonly asCommand: <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>
  readonly withQueryId: <A, E, R>(effect: Effect.Effect<A, E, R>, queryId: string) => Effect.Effect<A, E, R>
  readonly withClickhouseSettings: <A, E, R>(
    effect: Effect.Effect<A, E, R>,
    settings: { readonly max_threads: number }
  ) => Effect.Effect<A, E, R>
}

type Insert<S> = (
  client: S,
  table: string,
  values: ReadonlyArray<{ id: number; name: string }>
) => Effect.Effect<unknown>

const runningQueries = (sql: SqlClient.SqlClient, queryId: string) =>
  sql<{ running: number }>`
    SELECT toUInt32(count()) AS running FROM system.processes WHERE query_id = ${queryId}
  `.pipe(Effect.map(([row]) => row.running))

const waitUntil = <E>(check: Effect.Effect<boolean, E>) =>
  check.pipe(
    Effect.flatMap((ok) => ok ? Effect.void : Effect.fail("condition not met yet" as const)),
    Effect.retry({ schedule: Schedule.spaced("100 millis"), times: 100 })
  )

// An aggregation the server computes for far longer than the tests wait, and
// that it checks for cancellation between blocks.
const heavy = "SELECT toUInt8(sum(number) > 0) AS n FROM numbers(100000000000) SETTINGS max_threads = 1"

const suiteWith = <I, S extends Subject>(
  name: string,
  it: Vitest.MethodsNonLive<I>,
  tag: Context.Service<I, S>,
  insert: Insert<S>
) => {
  const table = (suffix: string) => `${name.toLowerCase()}_${suffix}`

  it.effect("binds typed parameters", () =>
    Effect.gen(function*() {
      const sql = yield* tag

      const rows = yield* sql<{ sum: number; text: string }>`SELECT ${1.5} + ${2} AS sum, ${"héllo"} AS text`

      assert.deepStrictEqual(rows, [{ sum: 3.5, text: "héllo" }])
    }))

  it.effect("returns rows as values", () =>
    Effect.gen(function*() {
      const sql = yield* tag

      const rows = yield* sql`SELECT toUInt8(1) AS a, 'x' AS b`.values

      assert.deepStrictEqual(rows, [[1, "x"]])
    }))

  it.effect("applies settings to a statement", () =>
    Effect.gen(function*() {
      const sql = yield* tag

      const rows = yield* sql.withClickhouseSettings(
        sql<{ threads: number }>`SELECT toUInt8(getSetting('max_threads')) AS threads`,
        { max_threads: 3 }
      )

      assert.deepStrictEqual(rows, [{ threads: 3 }])
    }))

  it.effect("round trips inserted rows", () =>
    Effect.gen(function*() {
      const sql = yield* tag
      const people = table("people")
      yield* sql.asCommand(
        sql.unsafe(`CREATE TABLE ${people} (id UInt32, name String) ENGINE = MergeTree ORDER BY id`)
      )

      yield* insert(sql, people, [{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }])
      const rows = yield* sql<{ id: number; name: string }>`SELECT id, name FROM ${sql(people)} ORDER BY id`

      assert.deepStrictEqual(rows, [{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }])
      yield* sql.asCommand(sql.unsafe(`DROP TABLE ${people}`))
    }))

  it.effect("streams every row of a large result", () =>
    Effect.gen(function*() {
      const sql = yield* tag

      const rows = yield* Stream.runCollect(
        sql<{ n: number }>`SELECT toUInt32(number) AS n FROM numbers(50000)`.stream
      )

      assert.strictEqual(rows.length, 50000)
      assert.deepStrictEqual(rows[0], { n: 0 })
      assert.deepStrictEqual(rows[49999], { n: 49999 })
    }))

  it.effect("stops the server query when a stream ends early", () =>
    Effect.gen(function*() {
      const sql = yield* tag
      const queryId = `${name.toLowerCase()}-stream-take`

      // The first row arrives at once; the second branch keeps the server busy.
      const first = yield* sql.withQueryId(
        Stream.runCollect(
          sql<{ n: number }>`SELECT toUInt8(1) AS n UNION ALL ${sql.literal(heavy)}`.stream.pipe(Stream.take(1))
        ),
        queryId
      )

      assert.strictEqual(first.length, 1)
      yield* waitUntil(Effect.map(runningQueries(sql, queryId), (running) => running === 0))
    }))

  it.effect("stops the server query when the fiber is interrupted", () =>
    Effect.gen(function*() {
      const sql = yield* tag
      const queryId = `${name.toLowerCase()}-interrupt`

      const fiber = yield* sql.withQueryId(sql.unsafe(heavy), queryId).pipe(Effect.forkChild)
      yield* waitUntil(Effect.map(runningQueries(sql, queryId), (running) => running === 1))
      yield* Fiber.interrupt(fiber)

      yield* waitUntil(Effect.map(runningQueries(sql, queryId), (running) => running === 0))
    }))

  it.effect("maps server errors to SqlError reasons", () =>
    Effect.gen(function*() {
      const sql = yield* tag

      const syntax = yield* Effect.flip(sql.unsafe("SELEC 1"))
      const missing = yield* Effect.flip(sql.unsafe("SELECT * FROM table_that_does_not_exist"))

      assert.strictEqual(syntax.reason._tag, "SqlSyntaxError")
      assert.strictEqual(missing.reason._tag, "SqlSyntaxError")
    }))

  it.effect("applies migrations once", () =>
    Effect.gen(function*() {
      const sql = yield* tag
      const migrated = table("migrated")
      const run = ClickhouseMigrator.run({
        table: `effect_sql_migrations_${name.toLowerCase()}`,
        loader: ClickhouseMigrator.fromRecord({
          "1_create": sql.asCommand(
            sql.unsafe(`CREATE TABLE ${migrated} (id UInt32) ENGINE = MergeTree ORDER BY id`)
          )
        })
      }).pipe(Effect.provideService(SqlClient.SqlClient, sql))

      const first = yield* run
      const second = yield* run

      assert.deepStrictEqual(first, [[1, "create"]])
      assert.deepStrictEqual(second, [])
      yield* sql.asCommand(sql.unsafe(`DROP TABLE ${migrated}`))
    }))
}

const nodeLayer = Layer.unwrap(Effect.map(ClickhouseContainer.options, ClickhouseClient.layer))
const webLayer = Layer.unwrap(Effect.map(ClickhouseContainer.options, ClickhouseWebClient.layer))

it.layer(ClickhouseContainer.layer, { timeout: "120 seconds", excludeTestServices: true })("ClickHouse", (it) => {
  it.layer(nodeLayer)("Node client", (it) =>
    suiteWith(
      "Node",
      it,
      ClickhouseClient.ClickhouseClient,
      (client, table, values) => Effect.orDie(client.insertQuery({ table, values }))
    ))
  it.layer(webLayer)("Web client", (it) =>
    suiteWith(
      "Web",
      it,
      ClickhouseWebClient.ClickhouseWebClient,
      (client, table, values) => Effect.orDie(client.insertQuery({ table, values }))
    ))
})
