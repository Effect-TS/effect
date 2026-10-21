import { ClickhouseClient, ClickhouseMigrator } from "@effect/sql-clickhouse"
import { assert, beforeEach, describe, it } from "@effect/vitest"
import { Effect, Fiber, Stream } from "effect"
import * as Reactivity from "effect/reactivity/Reactivity"
import * as SqlClient from "effect/sql/SqlClient"
import * as Statement from "effect/sql/Statement"
import { TestClock } from "effect/testing"
import { Readable } from "node:stream"
import { vi } from "vitest"

let closeCalls = 0
let connectImmediately = false
const commandCalls: Array<Record<string, unknown>> = []
const queryCalls: Array<Record<string, unknown>> = []
const execCalls: Array<Record<string, unknown>> = []
const insertCalls: Array<Record<string, unknown>> = []
let queryImpl: ((options: Record<string, unknown>) => Promise<unknown>) | undefined
let execImpl: ((options: Record<string, unknown>) => Promise<unknown>) | undefined
let insertImpl: ((options: Record<string, unknown>) => Promise<unknown>) | undefined

vi.mock("@clickhouse/client", () => ({
  createClient: () => ({
    ping: () => connectImmediately ? Promise.resolve({ success: true }) : new Promise(() => {}),
    exec: (options: Record<string, unknown>) => {
      execCalls.push(options)
      return execImpl ? execImpl(options) : new Promise(() => {})
    },
    query: (options: Record<string, unknown>) => {
      queryCalls.push(options)
      return queryImpl ? queryImpl(options) : new Promise(() => {})
    },
    insert: (options: Record<string, unknown>) => {
      insertCalls.push(options)
      return insertImpl ? insertImpl(options) : new Promise(() => {})
    },
    command: (options: Record<string, unknown>) => {
      commandCalls.push(options)
      return Promise.resolve({})
    },
    close: () => {
      closeCalls++
      return Promise.resolve()
    }
  })
}))

// A minimal stand-in for the rows emitted by `ResultSet.stream()`
const makeRows = (values: ReadonlyArray<unknown>) =>
  values.map((value) => ({
    text: JSON.stringify(value),
    json: () => value
  }))

const makeResultSet = (chunks: ReadonlyArray<ReadonlyArray<unknown>>) => ({
  stream: () => Readable.from(chunks.map(makeRows), { objectMode: true })
})

const killCommand = (queryId: string) => ({
  query: "KILL QUERY WHERE query_id = {queryId:String}",
  query_params: { queryId }
})

// A request that never settles, plus a promise resolved once it has been sent
const pendingRequest = () => {
  let onSent = () => {}
  const sent = new Promise<void>((resolve) => {
    onSent = resolve
  })
  const impl = () => {
    onSent()
    return new Promise<never>(() => {})
  }
  return { sent, impl }
}

describe("ClickhouseClient", { concurrent: false }, () => {
  beforeEach(() => {
    connectImmediately = false
    commandCalls.length = 0
    queryCalls.length = 0
    execCalls.length = 0
    insertCalls.length = 0
    queryImpl = undefined
    execImpl = undefined
    insertImpl = undefined
  })

  it("infers DateTime parameters without empty parentheses", () => {
    const sql = Statement.make(Effect.void as any, ClickhouseClient.makeCompiler(), [], undefined)
    const date = new Date("2024-01-15T14:30:00Z")

    assert.deepStrictEqual(sql`SELECT ${date}`.compile(), ["SELECT {p1: DateTime}", [date]])
  })

  it.effect("preserves an explicit nullable parameter type and null value", () =>
    Effect.gen(function*() {
      connectImmediately = true
      const sql = yield* ClickhouseClient.make({ url: "http://localhost:8123" })

      assert.deepStrictEqual(sql`SELECT ${sql.param("Nullable(Int32)", null)}`.compile(), [
        "SELECT {p1: Nullable(Int32)}",
        [null]
      ])
    }).pipe(Effect.provide(Reactivity.layer)))

  it("preserves fractional JavaScript numbers in inferred parameters", () => {
    const sql = Statement.make(Effect.void as any, ClickhouseClient.makeCompiler(), [], undefined)
    const [query] = sql`SELECT ${1.5}`.compile()

    assert.strictEqual(query, "SELECT {p1: Float64}")
  })

  it("uses the ClickHouse dialect for dialect-specific fragments", () => {
    const sql = Statement.make(Effect.void as any, ClickhouseClient.makeCompiler(), [], undefined)

    assert.strictEqual(
      sql.onDialect({
        sqlite: () => "sqlite",
        pg: () => "pg",
        mysql: () => "mysql",
        mssql: () => "mssql",
        clickhouse: () => "clickhouse"
      }),
      "clickhouse"
    )
  })

  it.effect("closes the client when the connection check times out", () =>
    Effect.gen(function*() {
      connectImmediately = false
      closeCalls = 0
      const fiber = yield* Effect.forkDetach(
        ClickhouseClient.make({ url: "http://localhost:8123" }).pipe(Effect.scoped)
      )
      yield* Effect.yieldNow
      yield* TestClock.adjust("5 seconds")
      const result = fiber.pollUnsafe()

      assert.isDefined(result)
      assert.strictEqual(closeCalls, 1)
    }).pipe(Effect.provide(Reactivity.layer)))

  it.effect("parameterizes the query id when cancelling a query", () =>
    Effect.gen(function*() {
      connectImmediately = true
      commandCalls.length = 0
      const queryId = "id' OR 1 = 1 --"
      const client = yield* ClickhouseClient.make({ url: "http://localhost:8123" })
      const fiber = yield* client.withQueryId(client.unsafe("SELECT 1"), queryId).pipe(Effect.forkScoped)
      yield* Effect.yieldNow

      yield* Fiber.interrupt(fiber)

      assert.deepStrictEqual(commandCalls, [{
        query: "KILL QUERY WHERE query_id = {queryId:String}",
        query_params: { queryId }
      }])
    }).pipe(
      Effect.scoped,
      Effect.provide(Reactivity.layer)
    ))

  it.effect("parameterizes the query id when cancelling an insert", () =>
    Effect.gen(function*() {
      connectImmediately = true
      commandCalls.length = 0
      const queryId = "id' OR 1 = 1 --"
      const client = yield* ClickhouseClient.make({ url: "http://localhost:8123" })
      const fiber = yield* client.withQueryId(
        client.insertQuery({ table: "test", values: [] }),
        queryId
      ).pipe(Effect.forkScoped)
      yield* Effect.yieldNow

      yield* Fiber.interrupt(fiber)

      assert.deepStrictEqual(commandCalls, [{
        query: "KILL QUERY WHERE query_id = {queryId:String}",
        query_params: { queryId }
      }])
    }).pipe(
      Effect.scoped,
      Effect.provide(Reactivity.layer)
    ))

  it.effect("passes column selection to insertQuery", () =>
    Effect.gen(function*() {
      connectImmediately = true
      insertImpl = () => Promise.resolve({ executed: true, query_id: "" })
      const client = yield* ClickhouseClient.make({ url: "http://localhost:8123" })

      yield* client.insertQuery({ table: "people", values: [{ name: "Alice" }], columns: ["name"] })
      yield* client.insertQuery({ table: "people", values: [{ name: "Bob" }], columns: { except: ["id"] } })

      assert.strictEqual(insertCalls.length, 2)
      assert.strictEqual(insertCalls[0].table, "people")
      assert.strictEqual(insertCalls[0].format, "JSONEachRow")
      assert.deepStrictEqual(insertCalls[0].columns, ["name"])
      assert.deepStrictEqual(insertCalls[1].columns, { except: ["id"] })
    }).pipe(Effect.provide(Reactivity.layer)))

  it.effect("creates the ledger without sqlite ddl or BEGIN", () =>
    Effect.gen(function*() {
      connectImmediately = true
      const queries: Array<string> = []
      queryImpl = (options) => {
        queries.push(String(options.query))
        return Promise.resolve({ json: () => Promise.resolve({ data: [] }) })
      }
      const client = yield* ClickhouseClient.make({ url: "http://localhost:8123" })
      const applied = yield* ClickhouseMigrator.run({
        loader: ClickhouseMigrator.fromRecord({
          "1_init": Effect.void
        })
      }).pipe(Effect.provideService(SqlClient.SqlClient, client))

      assert.deepStrictEqual(applied, [[1, "init"]])
      assert.match(queries[0] ?? "", /ENGINE = MergeTree/)
      assert.notMatch(queries.join("\n"), /PRIMARY KEY NOT NULL|BEGIN/)
    }).pipe(
      Effect.ensuring(Effect.sync(() => {
        queryImpl = undefined
      })),
      Effect.provide(Reactivity.layer)
    ))

  describe("queryStream", () => {
    it.effect("streams decoded JSON rows with bound params and transformed names", () =>
      Effect.gen(function*() {
        connectImmediately = true
        queryImpl = () => Promise.resolve(makeResultSet([[{ user_id: 1 }], [{ user_id: 2 }]]))
        const client = yield* ClickhouseClient.make({
          url: "http://localhost:8123",
          transformResultNames: (s) => s.replace(/_(\w)/g, (_, c: string) => c.toUpperCase())
        })

        const rows = yield* Stream.runCollect(client.queryStream(client`SELECT user_id FROM t WHERE id = ${1}`))

        assert.deepStrictEqual(rows, [{ userId: 1 }, { userId: 2 }])
        assert.strictEqual(queryCalls[0].query, "SELECT user_id FROM t WHERE id = {p1: Float64}")
        assert.deepStrictEqual(queryCalls[0].query_params, { p1: 1 })
        assert.strictEqual(queryCalls[0].format, "JSONEachRow")
      }).pipe(Effect.provide(Reactivity.layer)))

    it.effect("emits progress events and transforms row payloads with JSONEachRowWithProgress", () =>
      Effect.gen(function*() {
        connectImmediately = true
        const progress = { progress: { read_rows: "1", read_bytes: "8", elapsed_ns: "1" } }
        queryImpl = () =>
          Promise.resolve(makeResultSet([[{ row: { user_id: 1 } }, progress, { totals: { user_id: 2 } }]]))
        const client = yield* ClickhouseClient.make({
          url: "http://localhost:8123",
          transformResultNames: (s) => s.replace(/_(\w)/g, (_, c: string) => c.toUpperCase())
        })

        const events = yield* Stream.runCollect(
          client.queryStream(client`SELECT user_id FROM t`, { format: "JSONEachRowWithProgress" })
        )

        assert.deepStrictEqual(events, [{ row: { userId: 1 } }, progress, { totals: { userId: 2 } }])
        assert.deepStrictEqual(queryCalls[0].clickhouse_settings, { http_write_exception_in_output_format: 1 })
      }).pipe(Effect.provide(Reactivity.layer)))

    it.effect("fails with a classified SqlError on a JSONEachRowWithProgress exception event", () =>
      Effect.gen(function*() {
        connectImmediately = true
        queryImpl = () =>
          Promise.resolve(makeResultSet([[
            { row: { a: 1 } },
            { exception: "Code: 159. DB::Exception: Timeout exceeded" }
          ]]))
        const client = yield* ClickhouseClient.make({ url: "http://localhost:8123" })

        const error = yield* Effect.flip(
          Stream.runCollect(client.queryStream(client`SELECT a FROM t`, { format: "JSONEachRowWithProgress" }))
        )

        assert.strictEqual(error.reason._tag, "StatementTimeoutError")
      }).pipe(Effect.provide(Reactivity.layer)))

    it.effect("streams raw bytes untouched for raw formats", () =>
      Effect.gen(function*() {
        connectImmediately = true
        const bytes = Buffer.from([0x50, 0x41, 0x52, 0x31, 0x0a, 0x00, 0xff])
        execImpl = () => Promise.resolve({ stream: Readable.from([bytes]) })
        const client = yield* ClickhouseClient.make({ url: "http://localhost:8123" })

        const chunks = yield* Stream.runCollect(
          client.queryStream(client`SELECT a FROM t WHERE id = ${1} -- note;`, { format: "Parquet" })
        )

        assert.deepStrictEqual(Buffer.concat(chunks), bytes)
        assert.strictEqual(queryCalls.length, 0)
        assert.strictEqual(execCalls[0].query, "SELECT a FROM t WHERE id = {p1: Float64} -- note\nFORMAT Parquet")
        assert.deepStrictEqual(execCalls[0].query_params, { p1: 1 })
      }).pipe(Effect.provide(Reactivity.layer)))

    it.effect("kills the query only when the stream is not read to the end", () =>
      Effect.gen(function*() {
        connectImmediately = true
        queryImpl = () => Promise.resolve(makeResultSet([[{ a: 1 }], [{ a: 2 }]]))
        const client = yield* ClickhouseClient.make({ url: "http://localhost:8123" })

        yield* Stream.runCollect(client.queryStream(client`SELECT a FROM t`)).pipe(client.withQueryId("full-id"))
        const rows = yield* Stream.runCollect(client.queryStream(client`SELECT a FROM t`).pipe(Stream.take(1))).pipe(
          client.withQueryId("take-id")
        )

        assert.deepStrictEqual(rows, [{ a: 1 }])
        assert.deepStrictEqual(commandCalls, [killCommand("take-id")])
      }).pipe(Effect.provide(Reactivity.layer)))

    it.effect("kills the query when interrupted while the request is in flight", () =>
      Effect.gen(function*() {
        connectImmediately = true
        const request = pendingRequest()
        execImpl = request.impl
        const client = yield* ClickhouseClient.make({ url: "http://localhost:8123" })

        const fiber = yield* Stream.runDrain(client.queryStream(client`SELECT a FROM t`, { format: "CSV" })).pipe(
          client.withQueryId("in-flight-id"),
          Effect.forkScoped
        )
        yield* Effect.promise(() => request.sent)
        yield* Fiber.interrupt(fiber)

        assert.deepStrictEqual(commandCalls, [killCommand("in-flight-id")])
      }).pipe(Effect.provide(Reactivity.layer)))
  })
})
