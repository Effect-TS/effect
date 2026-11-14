import { TrinoClient } from "@effect/sql-trino"
import { assert, it } from "@effect/vitest"
import { Effect, Fiber, Schedule, Stream } from "effect"
import * as FetchHttpClient from "effect/http/FetchHttpClient"
import * as Reactivity from "effect/reactivity/Reactivity"
import { SqlClient } from "effect/sql"
import { layerTimeout, RequestLog, TrinoContainer } from "./utils.ts"

// A marker comment makes a statement findable in system.runtime.queries.
const marked = (label: string) => `/* ${label}-${crypto.randomUUID()} */`

const queryState = Effect.fnUntraced(function*(marker: string) {
  const sql = yield* SqlClient.SqlClient
  return yield* sql<{ state: string; error_code: string | null }>`
    SELECT state, error_code FROM system.runtime.queries
    WHERE query LIKE ${`%${marker}%`} AND query NOT LIKE '%system.runtime.queries%'`
})

const RUNNING_STATES: Record<string, true> = {
  QUEUED: true,
  WAITING_FOR_RESOURCES: true,
  DISPATCHING: true,
  PLANNING: true,
  STARTING: true,
  RUNNING: true,
  FINISHING: true
}

// The cancel is asynchronous on the coordinator; poll until the query left the running states.
const settledState = (marker: string) =>
  queryState(marker).pipe(
    Effect.flatMap((rows) =>
      rows.some((row) => RUNNING_STATES[row.state]) ? Effect.fail("still running" as const) : Effect.succeed(rows)
    ),
    Effect.retry({ schedule: Schedule.spaced("200 millis"), times: 100 })
  )

// 600 billion rows: the scan runs for hours, so a cancelled query can only have
// ended because of the cancel.
const UNBOUNDED_SCAN = "tpch.sf100000.lineitem"

// A JVM coordinator shared by concurrent tests; the default 5 s is too tight on a shared runner.
const timeout = 60_000

// Real time throughout: the client's retry schedules and the polling below must not run on a TestClock.
it.layer(TrinoContainer.layerClient, {
  timeout: layerTimeout,
  excludeTestServices: true
})(
  "TrinoClient",
  (it) => {
    it.effect("writes with the insert helper and reads back values and value rows", () =>
      Effect.gen(function*() {
        const sql = yield* TrinoClient.TrinoClient
        const table = `memory.default.people_${crypto.randomUUID().replaceAll("-", "")}`
        yield* sql`CREATE TABLE ${sql(table)} (id bigint, name varchar)`
        yield* sql`INSERT INTO ${sql(table)} ${sql.insert([{ id: 1n, name: "a" }, { id: 2n, name: "b" }])}`
        const rows = yield* sql<{ id: bigint; name: string }>`SELECT id, name FROM ${sql(table)} ORDER BY id`
        assert.deepStrictEqual(rows, [{ id: 1n, name: "a" }, { id: 2n, name: "b" }])
        const values = yield* sql`SELECT id, name FROM ${sql(table)} ORDER BY id`.values
        assert.deepStrictEqual(values, [[1n, "a"], [2n, "b"]])
        const ids = yield* sql<{ id: bigint }>`SELECT id FROM ${sql(table)} WHERE id IN ${sql.in([2n])}`
        assert.deepStrictEqual(ids, [{ id: 2n }])
      }), timeout)

    it.effect("streams rows across pages", () =>
      Effect.gen(function*() {
        const sql = yield* TrinoClient.TrinoClient
        const count = yield* sql`SELECT orderkey FROM tpch.tiny.orders`.stream.pipe(Stream.runCount)
        assert.strictEqual(count, 15_000)
      }), timeout)

    it.effect("ending a stream early cancels the query on the coordinator", () =>
      Effect.gen(function*() {
        const sql = yield* TrinoClient.TrinoClient
        const log = yield* RequestLog
        const marker = marked("stream-take")
        const taken = yield* sql.unsafe(`${marker} SELECT * FROM tpch.sf1.lineitem`).stream.pipe(
          Stream.take(5),
          Stream.runCollect
        )
        assert.strictEqual(taken.length, 5)
        assert.isTrue(log.some((entry) => entry.startsWith("DELETE ")))
        const [state] = yield* settledState(marker)
        assert.strictEqual(state.state, "FAILED")
        assert.strictEqual(state.error_code, "USER_CANCELED")
      }), timeout)

    it.effect("interrupting a running statement cancels the query on the coordinator", () =>
      Effect.gen(function*() {
        const sql = yield* TrinoClient.TrinoClient
        const marker = marked("interrupt")
        const fiber = yield* Effect.forkChild(sql.unsafe(`${marker} SELECT count(*) FROM ${UNBOUNDED_SCAN}`))
        yield* queryState(marker).pipe(
          Effect.filterOrFail((rows) => rows.length > 0 && rows[0].state === "RUNNING"),
          Effect.retry({ schedule: Schedule.spaced("100 millis"), times: 300 })
        )
        yield* Fiber.interrupt(fiber)
        const [state] = yield* settledState(marker)
        assert.strictEqual(state.state, "FAILED")
        assert.strictEqual(state.error_code, "USER_CANCELED")
      }), timeout)

    it.effect(
      "a reserved connection keeps USE and SET SESSION without touching the shared session",
      () =>
        Effect.gen(function*() {
          const sql = yield* TrinoClient.TrinoClient
          const conn = yield* sql.reserve
          yield* conn.executeUnprepared("USE tpch.tiny", [], undefined)
          yield* conn.executeUnprepared("SET SESSION query_max_run_time = '1h'", [], undefined)
          const [nations] = yield* conn.execute("SELECT count(*) AS n FROM nation", [], undefined)
          assert.strictEqual(nations.n, 25n)
          const settings = yield* conn.execute("SHOW SESSION LIKE 'query_max_run_time'", [], undefined)
          assert.strictEqual(settings[0].Value, "1h")
          const shared = yield* sql.session
          assert.isUndefined(shared.catalog)
          assert.isUndefined(shared.properties.get("query_max_run_time"))
        }),
      timeout
    )

    it.effect("USE on the shared session applies to later statements of the client", () =>
      Effect.gen(function*() {
        const container = yield* TrinoContainer
        const sql = yield* TrinoClient.make({
          url: `http://${container.getHost()}:${container.getMappedPort(8080)}`,
          user: "test"
        }).pipe(Effect.provide([FetchHttpClient.layer, Reactivity.layer]))
        yield* sql`USE tpch.tiny`
        const [row] = yield* sql<{ n: bigint }>`SELECT count(*) AS n FROM region`
        assert.strictEqual(row.n, 5n)
        const session = yield* sql.session
        assert.strictEqual(session.catalog, "tpch")
        assert.strictEqual(session.schema, "tiny")
      }), timeout)

    it.effect("classifies server errors into SqlError reasons", () =>
      Effect.gen(function*() {
        const sql = yield* TrinoClient.TrinoClient
        const syntax = yield* sql.unsafe("SELEC 1").pipe(Effect.flip)
        assert.strictEqual(syntax.reason._tag, "SqlSyntaxError")
        const missing = yield* sql.unsafe("SELECT * FROM tpch.tiny.no_such_table").pipe(Effect.flip)
        assert.strictEqual(missing.reason._tag, "SqlSyntaxError")
      }), timeout)

    it.effect("enforces a session query_max_run_time as a statement timeout", () =>
      Effect.gen(function*() {
        const sql = yield* TrinoClient.TrinoClient
        const conn = yield* sql.reserve
        yield* conn.executeUnprepared("SET SESSION query_max_run_time = '1s'", [], undefined)
        const error = yield* conn.executeUnprepared("SELECT count(*) FROM tpch.sf100.lineitem", [], undefined).pipe(
          Effect.flip
        )
        assert.strictEqual(error.reason._tag, "StatementTimeoutError")
      }), timeout)
  }
)
