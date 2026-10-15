import { ClickhouseClient } from "@effect/sql-clickhouse"
import { assert, beforeEach, describe, it } from "@effect/vitest"
import { Effect, Fiber, Stream } from "effect"
import * as Reactivity from "effect/reactivity/Reactivity"
import { SqlError } from "effect/sql/SqlError"
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

  it.effect("uses a custom query id and settings only for the query they are set on", () =>
    Effect.gen(function*() {
      connectImmediately = true
      queryImpl = () => Promise.resolve({ json: () => Promise.resolve({ data: [] }) })
      const client = yield* ClickhouseClient.make({ url: "http://localhost:8123" })

      yield* client`SELECT 1`.pipe(
        client.withQueryId("first-id"),
        client.withClickhouseSettings({ max_block_size: "100" })
      )
      yield* client`SELECT 2`

      assert.strictEqual(queryCalls.length, 2)
      assert.strictEqual(queryCalls[0].query_id, "first-id")
      assert.deepStrictEqual(queryCalls[0].clickhouse_settings, { max_block_size: "100" })
      assert.notStrictEqual(queryCalls[1].query_id, "first-id")
      assert.deepStrictEqual(queryCalls[1].clickhouse_settings, {})
    }).pipe(Effect.provide(Reactivity.layer)))

  describe("queryStream", () => {
    it.effect("streams rows with the default JSONEachRow format", () =>
      Effect.gen(function*() {
        connectImmediately = true
        queryImpl = () => Promise.resolve(makeResultSet([[{ a: 1 }, { a: 2 }], [{ a: 3 }]]))
        const client = yield* ClickhouseClient.make({ url: "http://localhost:8123" })

        const rows = yield* Stream.runCollect(
          client.queryStream(client<{ a: number }>`SELECT a FROM t`)
        )

        assert.deepStrictEqual(rows, [{ a: 1 }, { a: 2 }, { a: 3 }])
        assert.strictEqual(queryCalls.length, 1)
        assert.strictEqual(queryCalls[0].query, "SELECT a FROM t")
        assert.strictEqual(queryCalls[0].format, "JSONEachRow")
      }).pipe(Effect.provide(Reactivity.layer)))

    it.effect("binds interpolated statement values as query params", () =>
      Effect.gen(function*() {
        connectImmediately = true
        queryImpl = () => Promise.resolve(makeResultSet([]))
        execImpl = () => Promise.resolve({ stream: Readable.from([]) })
        const client = yield* ClickhouseClient.make({ url: "http://localhost:8123" })

        yield* Stream.runCollect(client.queryStream(client`SELECT a FROM t WHERE id = ${1} AND name = ${"x"}`))
        yield* Stream.runCollect(
          client.queryStream(client`SELECT a FROM t WHERE id = ${client.param("UInt64", 2)}`, { format: "CSV" })
        )

        assert.strictEqual(queryCalls[0].query, "SELECT a FROM t WHERE id = {p1: Float64} AND name = {p2: String}")
        assert.deepStrictEqual(queryCalls[0].query_params, { p1: 1, p2: "x" })
        assert.strictEqual(execCalls[0].query, "SELECT a FROM t WHERE id = {p1: UInt64}\nFORMAT CSV")
        assert.deepStrictEqual(execCalls[0].query_params, { p1: 2 })
      }).pipe(Effect.provide(Reactivity.layer)))

    it.effect("applies transformQueryNames and transformResultNames to JSON streams", () =>
      Effect.gen(function*() {
        connectImmediately = true
        const progress = { progress: { read_rows: "1", read_bytes: "8", elapsed_ns: "1" } }
        queryImpl = (options) =>
          Promise.resolve(makeResultSet(
            options.format === "JSONEachRowWithProgress"
              ? [[
                { row: { user_id: 1 } },
                progress,
                { totals: { user_id: 2 } },
                { min: { user_id: 1 } },
                { max: { user_id: 3 } }
              ]]
              : [[{ user_id: 1 }]]
          ))
        const client = yield* ClickhouseClient.make({
          url: "http://localhost:8123",
          transformQueryNames: (s) => s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`),
          transformResultNames: (s) => s.replace(/_(\w)/g, (_, c: string) => c.toUpperCase())
        })

        const rows = yield* Stream.runCollect(
          client.queryStream(client`SELECT ${client("userId")} FROM t`)
        )
        const events = yield* Stream.runCollect(
          client.queryStream(client`SELECT user_id FROM t`, { format: "JSONEachRowWithProgress" })
        )

        assert.strictEqual(queryCalls[0].query, `SELECT "user_id" FROM t`)
        assert.deepStrictEqual(rows, [{ userId: 1 }])
        assert.deepStrictEqual(events, [
          { row: { userId: 1 } },
          progress,
          { totals: { userId: 2 } },
          { min: { userId: 1 } },
          { max: { userId: 3 } }
        ])
      }).pipe(Effect.provide(Reactivity.layer)))

    it.effect("preserves progress events with JSONEachRowWithProgress", () =>
      Effect.gen(function*() {
        connectImmediately = true
        const progress = { progress: { read_rows: "2", read_bytes: "16", elapsed_ns: "100" } }
        queryImpl = () => Promise.resolve(makeResultSet([[{ row: { a: 1 } }, progress, { row: { a: 2 } }]]))
        const client = yield* ClickhouseClient.make({ url: "http://localhost:8123" })

        const events = yield* Stream.runCollect(
          client.queryStream(client<{ a: number }>`SELECT a FROM t`, { format: "JSONEachRowWithProgress" })
        )

        assert.deepStrictEqual(events, [{ row: { a: 1 } }, progress, { row: { a: 2 } }])
        assert.strictEqual(queryCalls[0].format, "JSONEachRowWithProgress")
      }).pipe(Effect.provide(Reactivity.layer)))

    it.effect("writes mid-stream exceptions into the output only for JSONEachRowWithProgress", () =>
      Effect.gen(function*() {
        connectImmediately = true
        queryImpl = () => Promise.resolve(makeResultSet([]))
        const client = yield* ClickhouseClient.make({ url: "http://localhost:8123" })

        yield* Stream.runCollect(
          client.queryStream(client`SELECT a FROM t`, { format: "JSONEachRowWithProgress" })
        ).pipe(client.withClickhouseSettings({ max_block_size: "1" }))
        yield* Stream.runCollect(
          client.queryStream(client`SELECT a FROM t`, { format: "JSONEachRowWithProgress" })
        ).pipe(client.withClickhouseSettings({ http_write_exception_in_output_format: 0 }))
        yield* Stream.runCollect(client.queryStream(client`SELECT a FROM t`))

        assert.deepStrictEqual(queryCalls[0].clickhouse_settings, {
          http_write_exception_in_output_format: 1,
          max_block_size: "1"
        })
        assert.deepStrictEqual(queryCalls[1].clickhouse_settings, { http_write_exception_in_output_format: 0 })
        assert.deepStrictEqual(queryCalls[2].clickhouse_settings, {})
      }).pipe(Effect.provide(Reactivity.layer)))

    it.effect("lets client-level clickhouse_settings override the exception output default", () =>
      Effect.gen(function*() {
        connectImmediately = true
        queryImpl = () => Promise.resolve(makeResultSet([]))
        const client = yield* ClickhouseClient.make({
          url: "http://localhost:8123",
          clickhouse_settings: { http_write_exception_in_output_format: 0 }
        })

        yield* Stream.runCollect(
          client.queryStream(client`SELECT a FROM t`, { format: "JSONEachRowWithProgress" })
        )

        assert.strictEqual(
          (queryCalls[0].clickhouse_settings as Record<string, unknown>).http_write_exception_in_output_format,
          0
        )
      }).pipe(Effect.provide(Reactivity.layer)))

    it.effect("fails the stream when JSONEachRowWithProgress reports an exception event", () =>
      Effect.gen(function*() {
        connectImmediately = true
        queryImpl = () =>
          Promise.resolve(makeResultSet([[
            { row: { a: 1 } },
            { exception: "Code: 159. DB::Exception: Timeout exceeded" }
          ]]))
        const client = yield* ClickhouseClient.make({ url: "http://localhost:8123" })

        const error = yield* Effect.flip(
          Stream.runCollect(
            client.queryStream(client`SELECT a FROM t`, { format: "JSONEachRowWithProgress" })
          )
        )

        assert(error instanceof SqlError)
        assert.strictEqual(error.reason._tag, "StatementTimeoutError")
      }).pipe(Effect.provide(Reactivity.layer)))

    it.effect("does not treat an `exception` column as an error outside JSONEachRowWithProgress", () =>
      Effect.gen(function*() {
        connectImmediately = true
        queryImpl = () => Promise.resolve(makeResultSet([[{ exception: "just a column value" }]]))
        const client = yield* ClickhouseClient.make({ url: "http://localhost:8123" })

        const rows = yield* Stream.runCollect(
          client.queryStream(client<{ exception: string }>`SELECT exception FROM t`)
        )

        assert.deepStrictEqual(rows, [{ exception: "just a column value" }])
      }).pipe(Effect.provide(Reactivity.layer)))

    it.effect("applies per-request clickhouse settings and query id", () =>
      Effect.gen(function*() {
        connectImmediately = true
        queryImpl = () => Promise.resolve(makeResultSet([[{ a: 1 }]]))
        const client = yield* ClickhouseClient.make({ url: "http://localhost:8123" })

        yield* Stream.runCollect(client.queryStream(client`SELECT a FROM t`)).pipe(
          client.withQueryId("stream-settings-id"),
          client.withClickhouseSettings({ max_block_size: "1" })
        )
        yield* Stream.runCollect(client.queryStream(client`SELECT a FROM t`))

        assert.strictEqual(queryCalls[0].query_id, "stream-settings-id")
        assert.deepStrictEqual(queryCalls[0].clickhouse_settings, { max_block_size: "1" })
        assert.notStrictEqual(queryCalls[1].query_id, "stream-settings-id")
        assert.deepStrictEqual(queryCalls[1].clickhouse_settings, {})
      }).pipe(Effect.provide(Reactivity.layer)))

    it.effect("streams raw bytes for CSV with an explicit FORMAT clause", () =>
      Effect.gen(function*() {
        connectImmediately = true
        execImpl = () => Promise.resolve({ stream: Readable.from([Buffer.from("a,b\n"), Buffer.from("1,2\n")]) })
        const client = yield* ClickhouseClient.make({ url: "http://localhost:8123" })

        const chunks = yield* Stream.runCollect(
          client.queryStream(client`SELECT a, b FROM t`, { format: "CSV" })
        )

        assert.strictEqual(Buffer.concat(chunks).toString(), "a,b\n1,2\n")
        assert.strictEqual(queryCalls.length, 0)
        assert.strictEqual(execCalls.length, 1)
        assert.strictEqual(execCalls[0].query, "SELECT a, b FROM t\nFORMAT CSV")
      }).pipe(Effect.provide(Reactivity.layer)))

    it.effect("strips trailing semicolons and whitespace before the FORMAT clause", () =>
      Effect.gen(function*() {
        connectImmediately = true
        execImpl = () => Promise.resolve({ stream: Readable.from([Buffer.from("1\n")]) })
        const client = yield* ClickhouseClient.make({ url: "http://localhost:8123" })

        yield* Stream.runCollect(client.queryStream(client`SELECT 1; \n`, { format: "CSV" }))
        yield* Stream.runCollect(client.queryStream(client`SELECT 1 -- note`, { format: "CSV" }))

        assert.strictEqual(execCalls[0].query, "SELECT 1\nFORMAT CSV")
        // the clause starts on its own line so a trailing comment cannot swallow it
        assert.strictEqual(execCalls[1].query, "SELECT 1 -- note\nFORMAT CSV")
      }).pipe(Effect.provide(Reactivity.layer)))

    it.effect("streams Parquet bytes without splitting rows", () =>
      Effect.gen(function*() {
        connectImmediately = true
        const bytes = Buffer.from([0x50, 0x41, 0x52, 0x31, 0x0a, 0x00, 0xff])
        execImpl = () => Promise.resolve({ stream: Readable.from([bytes]) })
        const client = yield* ClickhouseClient.make({ url: "http://localhost:8123" })

        const chunks = yield* Stream.runCollect(
          client.queryStream(client`SELECT a FROM t`, { format: "Parquet" })
        )

        assert.deepStrictEqual(Buffer.concat(chunks), bytes)
        assert.strictEqual(execCalls[0].query, "SELECT a FROM t\nFORMAT Parquet")
      }).pipe(Effect.provide(Reactivity.layer)))

    it.effect("fails with a classified SqlError when the query fails", () =>
      Effect.gen(function*() {
        connectImmediately = true
        queryImpl = () => Promise.reject({ code: 62 })
        const client = yield* ClickhouseClient.make({ url: "http://localhost:8123" })

        const error = yield* Effect.flip(
          Stream.runCollect(client.queryStream(client`SELEC a`))
        )

        assert(error instanceof SqlError)
        assert.strictEqual(error.reason._tag, "SqlSyntaxError")
      }).pipe(Effect.provide(Reactivity.layer)))

    it.effect("fails with a SqlError when a row cannot be parsed", () =>
      Effect.gen(function*() {
        connectImmediately = true
        const badRow = {
          text: "{",
          json: () => {
            throw new SyntaxError("bad row")
          }
        }
        queryImpl = () => Promise.resolve({ stream: () => Readable.from([[badRow]], { objectMode: true }) })
        const client = yield* ClickhouseClient.make({ url: "http://localhost:8123" })

        const error = yield* Effect.flip(
          Stream.runCollect(client.queryStream(client`SELECT a FROM t`)).pipe(client.withQueryId("parse-id"))
        )

        assert(error instanceof SqlError)
        assert.strictEqual(error.reason._tag, "UnknownError")
        assert.deepStrictEqual(commandCalls, [killCommand("parse-id")])
      }).pipe(Effect.provide(Reactivity.layer)))

    it.effect("kills the query when cancelled while the request is in flight", () =>
      Effect.gen(function*() {
        connectImmediately = true
        const queryId = "stream-query-id"
        const request = pendingRequest()
        queryImpl = request.impl
        const client = yield* ClickhouseClient.make({ url: "http://localhost:8123" })

        const fiber = yield* Stream.runDrain(client.queryStream(client`SELECT a FROM t`)).pipe(
          client.withQueryId(queryId),
          Effect.forkScoped
        )
        yield* Effect.promise(() => request.sent)
        yield* Fiber.interrupt(fiber)

        assert.deepStrictEqual(commandCalls, [killCommand(queryId)])
      }).pipe(Effect.provide(Reactivity.layer)))

    it.effect("kills the raw exec query when cancelled while the request is in flight", () =>
      Effect.gen(function*() {
        connectImmediately = true
        const queryId = "raw-stream-query-id"
        const request = pendingRequest()
        execImpl = request.impl
        const client = yield* ClickhouseClient.make({ url: "http://localhost:8123" })

        const fiber = yield* Stream.runDrain(
          client.queryStream(client`SELECT a FROM t`, { format: "CSV" })
        ).pipe(
          client.withQueryId(queryId),
          Effect.forkScoped
        )
        yield* Effect.promise(() => request.sent)
        yield* Fiber.interrupt(fiber)

        assert.strictEqual(execCalls.length, 1)
        assert.deepStrictEqual(commandCalls, [killCommand(queryId)])
      }).pipe(Effect.provide(Reactivity.layer)))

    it.effect("kills the query when the consumer stops early", () =>
      Effect.gen(function*() {
        connectImmediately = true
        queryImpl = () => Promise.resolve(makeResultSet([[{ a: 1 }], [{ a: 2 }]]))
        execImpl = () => Promise.resolve({ stream: Readable.from([Buffer.from("1\n"), Buffer.from("2\n")]) })
        const client = yield* ClickhouseClient.make({ url: "http://localhost:8123" })

        const rows = yield* Stream.runCollect(client.queryStream(client`SELECT a FROM t`).pipe(Stream.take(1))).pipe(
          client.withQueryId("take-id")
        )
        yield* Stream.runCollect(
          client.queryStream(client`SELECT a FROM t`, { format: "CSV" }).pipe(Stream.take(1))
        ).pipe(client.withQueryId("take-raw-id"))

        assert.deepStrictEqual(rows, [{ a: 1 }])
        assert.deepStrictEqual(commandCalls, [killCommand("take-id"), killCommand("take-raw-id")])
      }).pipe(Effect.provide(Reactivity.layer)))

    it.effect("does not kill the query when the stream is fully consumed or the request is rejected", () =>
      Effect.gen(function*() {
        connectImmediately = true
        execImpl = () => Promise.resolve({ stream: Readable.from([Buffer.from("1\n")]) })
        const client = yield* ClickhouseClient.make({ url: "http://localhost:8123" })

        queryImpl = () => Promise.resolve(makeResultSet([[{ a: 1 }], [{ a: 2 }]]))
        yield* Stream.runCollect(client.queryStream(client`SELECT a FROM t`))
        yield* Stream.runCollect(client.queryStream(client`SELECT a FROM t`, { format: "CSV" }))
        queryImpl = () => Promise.reject({ code: 62 })
        yield* Effect.flip(Stream.runCollect(client.queryStream(client`SELEC a`)))

        assert.deepStrictEqual(commandCalls, [])
      }).pipe(Effect.provide(Reactivity.layer)))

    it.effect("destroys the response stream and kills the query when cancelled mid-stream", () =>
      Effect.gen(function*() {
        connectImmediately = true
        const queryId = "mid-stream-query-id"
        const readable = new Readable({ objectMode: true, read() {} })
        readable.push(makeRows([{ a: 1 }]))
        let onStreamRequested = () => {}
        const streamRequested = new Promise<void>((resolve) => {
          onStreamRequested = resolve
        })
        queryImpl = () =>
          Promise.resolve({
            stream: () => {
              onStreamRequested()
              return readable
            }
          })
        const client = yield* ClickhouseClient.make({ url: "http://localhost:8123" })

        const fiber = yield* Stream.runDrain(client.queryStream(client`SELECT a FROM t`)).pipe(
          client.withQueryId(queryId),
          Effect.forkScoped
        )
        yield* Effect.promise(() => streamRequested)
        yield* Fiber.interrupt(fiber)

        assert.isTrue(readable.destroyed)
        assert.deepStrictEqual(commandCalls, [killCommand(queryId)])
      }).pipe(Effect.provide(Reactivity.layer)))
  })
})
