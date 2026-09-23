import { ClickhouseClient } from "@effect/sql-clickhouse"
import { assert, beforeEach, describe, it } from "@effect/vitest"
import { Effect, Fiber, Stream } from "effect"
import { TestClock } from "effect/testing"
import * as Reactivity from "effect/unstable/reactivity/Reactivity"
import { SqlError } from "effect/unstable/sql/SqlError"
import * as Statement from "effect/unstable/sql/Statement"
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

describe("ClickhouseClient", { concurrent: false }, () => {
  beforeEach(() => {
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

  it.effect("does not leak per-request query id and settings into later requests", () =>
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
          client.queryStream<{ a: number }>({ query: "SELECT a FROM t" })
        )

        assert.deepStrictEqual(rows, [{ a: 1 }, { a: 2 }, { a: 3 }])
        assert.strictEqual(queryCalls.length, 1)
        assert.strictEqual(queryCalls[0].query, "SELECT a FROM t")
        assert.strictEqual(queryCalls[0].format, "JSONEachRow")
      }).pipe(Effect.provide(Reactivity.layer)))

    it.effect("preserves progress events with JSONEachRowWithProgress", () =>
      Effect.gen(function*() {
        connectImmediately = true
        const progress = { progress: { read_rows: "2", read_bytes: "16", elapsed_ns: "100" } }
        queryImpl = () => Promise.resolve(makeResultSet([[{ row: { a: 1 } }, progress, { row: { a: 2 } }]]))
        const client = yield* ClickhouseClient.make({ url: "http://localhost:8123" })

        const events = yield* Stream.runCollect(
          client.queryStream<{ a: number }>({
            query: "SELECT a FROM t",
            format: "JSONEachRowWithProgress"
          })
        )

        assert.deepStrictEqual(events, [{ row: { a: 1 } }, progress, { row: { a: 2 } }])
        assert.strictEqual(queryCalls[0].format, "JSONEachRowWithProgress")
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
            client.queryStream({ query: "SELECT a FROM t", format: "JSONEachRowWithProgress" })
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
          client.queryStream<{ exception: string }>({ query: "SELECT exception FROM t" })
        )

        assert.deepStrictEqual(rows, [{ exception: "just a column value" }])
      }).pipe(Effect.provide(Reactivity.layer)))

    it.effect("applies per-request clickhouse settings and query id", () =>
      Effect.gen(function*() {
        connectImmediately = true
        queryImpl = () => Promise.resolve(makeResultSet([[{ a: 1 }]]))
        const client = yield* ClickhouseClient.make({ url: "http://localhost:8123" })

        yield* Stream.runCollect(client.queryStream({ query: "SELECT a FROM t" })).pipe(
          client.withQueryId("stream-settings-id"),
          client.withClickhouseSettings({ max_block_size: "1" })
        )
        yield* Stream.runCollect(client.queryStream({ query: "SELECT a FROM t" }))

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
          client.queryStream({ query: "SELECT a, b FROM t", format: "CSV" })
        )

        assert.strictEqual(Buffer.concat(chunks).toString(), "a,b\n1,2\n")
        assert.strictEqual(queryCalls.length, 0)
        assert.strictEqual(execCalls.length, 1)
        assert.strictEqual(execCalls[0].query, "SELECT a, b FROM t FORMAT CSV")
      }).pipe(Effect.provide(Reactivity.layer)))

    it.effect("streams Parquet bytes without splitting rows", () =>
      Effect.gen(function*() {
        connectImmediately = true
        const bytes = Buffer.from([0x50, 0x41, 0x52, 0x31, 0x0a, 0x00, 0xff])
        execImpl = () => Promise.resolve({ stream: Readable.from([bytes]) })
        const client = yield* ClickhouseClient.make({ url: "http://localhost:8123" })

        const chunks = yield* Stream.runCollect(
          client.queryStream({ query: "SELECT a FROM t", format: "Parquet" })
        )

        assert.deepStrictEqual(Buffer.concat(chunks), bytes)
        assert.strictEqual(execCalls[0].query, "SELECT a FROM t FORMAT Parquet")
      }).pipe(Effect.provide(Reactivity.layer)))

    it.effect("fails with a classified SqlError when the query fails", () =>
      Effect.gen(function*() {
        connectImmediately = true
        queryImpl = () => Promise.reject({ code: 62 })
        const client = yield* ClickhouseClient.make({ url: "http://localhost:8123" })

        const error = yield* Effect.flip(
          Stream.runCollect(client.queryStream({ query: "SELEC a" }))
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
          Stream.runCollect(client.queryStream({ query: "SELECT a FROM t" }))
        )

        assert(error instanceof SqlError)
        assert.strictEqual(error.reason._tag, "UnknownError")
      }).pipe(Effect.provide(Reactivity.layer)))

    it.effect("kills the query when cancelled while the request is in flight", () =>
      Effect.gen(function*() {
        connectImmediately = true
        const queryId = "stream-query-id"
        const client = yield* ClickhouseClient.make({ url: "http://localhost:8123" })

        const fiber = yield* Stream.runDrain(client.queryStream({ query: "SELECT a FROM t" })).pipe(
          client.withQueryId(queryId),
          Effect.forkScoped
        )
        yield* Effect.yieldNow
        yield* Fiber.interrupt(fiber)

        assert.deepStrictEqual(commandCalls, [{
          query: "KILL QUERY WHERE query_id = {queryId:String}",
          query_params: { queryId }
        }])
      }).pipe(Effect.provide(Reactivity.layer)))

    it.effect("kills the raw exec query when cancelled while the request is in flight", () =>
      Effect.gen(function*() {
        connectImmediately = true
        const queryId = "raw-stream-query-id"
        const client = yield* ClickhouseClient.make({ url: "http://localhost:8123" })

        const fiber = yield* Stream.runDrain(
          client.queryStream({ query: "SELECT a FROM t", format: "CSV" })
        ).pipe(
          client.withQueryId(queryId),
          Effect.forkScoped
        )
        yield* Effect.yieldNow
        yield* Fiber.interrupt(fiber)

        assert.strictEqual(execCalls.length, 1)
        assert.deepStrictEqual(commandCalls, [{
          query: "KILL QUERY WHERE query_id = {queryId:String}",
          query_params: { queryId }
        }])
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

        const fiber = yield* Stream.runDrain(client.queryStream({ query: "SELECT a FROM t" })).pipe(
          client.withQueryId(queryId),
          Effect.forkScoped
        )
        yield* Effect.promise(() => streamRequested)
        yield* Fiber.interrupt(fiber)

        assert.isTrue(readable.destroyed)
        assert.deepStrictEqual(commandCalls, [{
          query: "KILL QUERY WHERE query_id = {queryId:String}",
          query_params: { queryId }
        }])
      }).pipe(Effect.provide(Reactivity.layer)))
  })
})
