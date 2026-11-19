import * as Clickhouse from "@clickhouse/client"
import { ClickhouseClient, ClickhouseMigrator, ClickhouseWebClient } from "@effect/sql-clickhouse"
import { assert, describe, it } from "@effect/vitest"
import { Cause, Effect, Exit, Fiber, Stream } from "effect"
import * as Reactivity from "effect/reactivity/Reactivity"
import * as SqlClient from "effect/sql/SqlClient"
import * as Statement from "effect/sql/Statement"
import { TestClock } from "effect/testing"
import { build } from "esbuild"
import { createServer } from "node:http"
import type { AddressInfo } from "node:net"
import { Readable } from "node:stream"
import { fileURLToPath } from "node:url"
import { beforeEach, vi } from "vitest"

let closeCalls = 0
let connectImmediately = false
const commandCalls: Array<Record<string, unknown>> = []
const insertCalls: Array<Record<string, unknown>> = []
let insertImpl: ((options: Record<string, unknown>) => Promise<unknown>) | undefined
let queryImpl: ((options: Record<string, unknown>) => Promise<unknown>) | undefined
let commandImpl: ((options: Record<string, unknown>) => Promise<unknown>) | undefined

vi.mock("@clickhouse/client", () => ({
  createClient: vi.fn(() => ({
    ping: () => connectImmediately ? Promise.resolve({ success: true }) : new Promise(() => {}),
    query: (options: Record<string, unknown>) => queryImpl ? queryImpl(options) : new Promise(() => {}),
    insert: (options: Record<string, unknown>) => {
      insertCalls.push(options)
      return insertImpl ? insertImpl(options) : new Promise(() => {})
    },
    command: (options: Record<string, unknown>) => {
      commandCalls.push(options)
      return commandImpl ? commandImpl(options) : Promise.resolve({})
    },
    close: () => {
      closeCalls++
      return Promise.resolve()
    }
  }))
}))

describe("ClickhouseClient", { concurrent: false }, () => {
  beforeEach(() => {
    closeCalls = 0
    connectImmediately = true
    commandCalls.length = 0
    insertCalls.length = 0
    insertImpl = queryImpl = commandImpl = undefined
  })

  const assertKilled = (queryId: string) =>
    assert.deepStrictEqual(commandCalls.map(({ query, query_params }) => ({ query, query_params })), [{
      query: "KILL QUERY WHERE query_id = {queryId:String}",
      query_params: { queryId }
    }])

  it("infers DateTime parameters without empty parentheses", () => {
    const sql = Statement.make(Effect.void as any, ClickhouseClient.makeCompiler(), [], undefined)
    const date = new Date("2024-01-15T14:30:00Z")

    assert.deepStrictEqual(sql`SELECT ${date}`.compile(), ["SELECT {p1: DateTime}", [date]])
  })

  it.effect("preserves an explicit nullable parameter type and null value", () =>
    Effect.gen(function*() {
      const sql = yield* ClickhouseClient.make({ url: "http://localhost:8123" })

      assert.deepStrictEqual(sql`SELECT ${sql.param("Nullable(Int32)", null)}`.compile(), [
        "SELECT {p1: Nullable(Int32)}",
        [null]
      ])
    }).pipe(Effect.provide(Reactivity.layer)))

  it("binds plain objects shaped like ClickHouse params as String parameters", () => {
    const sql = Statement.make(Effect.void as any, ClickhouseClient.makeCompiler(), [], undefined)
    const paramLike = { _tag: "Custom", kind: "ClickhouseParam", paramA: "Int32", paramB: 1 }

    assert.deepStrictEqual(sql`SELECT ${paramLike}`.compile(), ["SELECT {p1: String}", [paramLike]])
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

  it.effect("exposes the underlying ClickHouse client", () =>
    Effect.gen(function*() {
      const createClient = vi.mocked(Clickhouse.createClient)
      createClient.mockClear()
      const sql = yield* ClickhouseClient.make({ url: "http://localhost:8123" })

      assert.strictEqual(createClient.mock.results.length, 1)
      assert.strictEqual(sql.client, createClient.mock.results[0].value)
    }).pipe(Effect.provide(Reactivity.layer)))

  it.effect("closes the client when the connection check times out", () =>
    Effect.gen(function*() {
      connectImmediately = false
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
      const queryId = "id' OR 1 = 1 --"
      const client = yield* ClickhouseClient.make({ url: "http://localhost:8123" })
      const fiber = yield* client.withQueryId(client.unsafe("SELECT 1"), queryId).pipe(Effect.forkScoped)
      yield* Effect.yieldNow

      yield* Fiber.interrupt(fiber)

      assertKilled(queryId)
    }).pipe(
      Effect.scoped,
      Effect.provide(Reactivity.layer)
    ))

  it.effect("parameterizes the query id when cancelling an insert", () =>
    Effect.gen(function*() {
      const queryId = "id' OR 1 = 1 --"
      const client = yield* ClickhouseClient.make({ url: "http://localhost:8123" })
      const fiber = yield* client.withQueryId(
        client.insertQuery({ table: "test", values: [] }),
        queryId
      ).pipe(Effect.forkScoped)
      yield* Effect.yieldNow

      yield* Fiber.interrupt(fiber)

      assertKilled(queryId)
    }).pipe(
      Effect.scoped,
      Effect.provide(Reactivity.layer)
    ))

  it.effect("interrupts a query even when KILL QUERY fails", () =>
    Effect.gen(function*() {
      commandImpl = () => Promise.reject(new Error("Not enough privileges"))
      const client = yield* ClickhouseClient.make({ url: "http://localhost:8123" })
      const fiber = yield* client.unsafe("SELECT 1").pipe(Effect.forkScoped)
      yield* Effect.yieldNow

      yield* Fiber.interrupt(fiber)
      const exit = yield* Fiber.await(fiber)

      assert.isTrue(Exit.isFailure(exit) && Cause.hasInterruptsOnly(exit.cause))
    }).pipe(
      Effect.scoped,
      Effect.provide(Reactivity.layer)
    ))

  it.effect("aborts an unanswered KILL QUERY after 5 seconds", () =>
    Effect.gen(function*() {
      let killSignal: AbortSignal | undefined
      commandImpl = (options) => {
        killSignal = options.abort_signal as AbortSignal
        return new Promise(() => {})
      }
      const client = yield* ClickhouseClient.make({ url: "http://localhost:8123" })
      const fiber = yield* client.unsafe("SELECT 1").pipe(Effect.forkScoped)
      yield* Effect.yieldNow

      const interrupting = yield* Effect.forkChild(Fiber.interrupt(fiber))
      yield* TestClock.adjust("5 seconds")

      assert.isDefined(interrupting.pollUnsafe())
      assert.isTrue(killSignal?.aborted)
    }).pipe(
      Effect.scoped,
      Effect.provide(Reactivity.layer)
    ))

  it.live("closes a response being read before killing its query", () =>
    Effect.gen(function*() {
      const events: Array<string> = []
      const sent = Promise.withResolvers<void>()
      const server = createServer((req, res) => {
        let body = ""
        req.on("data", (chunk) => body += chunk)
        req.on("end", () => {
          if (req.url?.startsWith("/ping")) {
            res.end("Ok.\n")
          } else if (body.startsWith("KILL QUERY")) {
            events.push("kill")
            res.writeHead(500, { "x-clickhouse-exception-code": "497" }).end(
              "Code: 497. DB::Exception: Not enough privileges"
            )
          } else if (body.startsWith("SELECT a FROM slow")) {
            res.on("close", () => events.push("closed"))
            res.writeHead(200, { "content-type": "application/json" }).write("{\"data\":[", () => sent.resolve())
          } else {
            res.writeHead(200, { "content-type": "application/json" }).end("{\"data\":[{\"n\":1}]}")
          }
        })
      })
      yield* Effect.acquireRelease(
        Effect.promise(() => new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))),
        () => Effect.promise(() => new Promise((resolve) => server.close(resolve)))
      )
      const { port } = server.address() as AddressInfo
      const actual = yield* Effect.promise(() => vi.importActual<typeof Clickhouse>("@clickhouse/client"))
      vi.mocked(Clickhouse.createClient).mockImplementationOnce(actual.createClient)
      // One connection, so a response left open would hold back the kill and later queries.
      const sql = yield* ClickhouseClient.make({ url: `http://127.0.0.1:${port}`, max_open_connections: 1 })

      const fiber = yield* sql`SELECT a FROM slow`.pipe(Effect.forkChild)
      yield* Effect.promise(() => sent.promise)
      yield* Effect.sleep("100 millis")
      yield* Fiber.interrupt(fiber)

      assert.deepStrictEqual(events, ["closed", "kill"])
      assert.deepStrictEqual(yield* sql`SELECT 1 AS n`, [{ n: 1 }])
    }).pipe(Effect.provide(Reactivity.layer)), { timeout: 20_000 })

  it.effect("passes column selection to insertQuery", () =>
    Effect.gen(function*() {
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

  it.effect("writes the ledger with commands and runs migrations as queries", () =>
    Effect.gen(function*() {
      const queries: Array<string> = []
      queryImpl = (options) => {
        queries.push(String(options.query))
        return Promise.resolve({ json: () => Promise.resolve({ data: [] }) })
      }
      const client = yield* ClickhouseClient.make({ url: "http://localhost:8123" })
      const applied = yield* ClickhouseMigrator.run({
        loader: ClickhouseMigrator.fromRecord({
          "1_init": client`CREATE TABLE init`
        })
      }).pipe(Effect.provideService(SqlClient.SqlClient, client))

      const select = `SELECT migration_id, name, created_at FROM "effect_sql_migrations" ORDER BY migration_id DESC`
      assert.deepStrictEqual(applied, [[1, "init"]])
      assert.deepStrictEqual(queries, [select, "CREATE TABLE init", select])
      assert.strictEqual(commandCalls.length, 2)
      assert.match(String(commandCalls[0].query), /ENGINE = MergeTree/)
      assert.match(String(commandCalls[1].query), /^INSERT INTO "effect_sql_migrations"/)
    }).pipe(
      Effect.provide(Reactivity.layer)
    ))

  it.effect("retries a failed migration and the ones after it on the next run", () =>
    Effect.gen(function*() {
      queryImpl = (options) => {
        const ledger: Array<{ migration_id: unknown; name: unknown }> = []
        for (const command of commandCalls) {
          if (String(command.query).startsWith(`INSERT INTO "effect_sql_migrations"`)) {
            const params = Object.values(command.query_params as Record<string, unknown>)
            for (let i = 0; i < params.length; i += 2) {
              ledger.unshift({ migration_id: params[i], name: params[i + 1] })
            }
          }
        }
        const data = String(options.query).startsWith("SELECT migration_id") ? ledger : []
        return Promise.resolve({ json: () => Promise.resolve({ data }) })
      }
      const client = yield* ClickhouseClient.make({ url: "http://localhost:8123" })
      let attempts = 0
      const run = ClickhouseMigrator.run({
        loader: ClickhouseMigrator.fromRecord({
          "1_first": client`CREATE TABLE first`,
          "2_second": Effect.suspend(() => attempts++ === 0 ? Effect.fail("rejected") : Effect.void),
          "3_third": client`CREATE TABLE third`
        })
      }).pipe(Effect.provideService(SqlClient.SqlClient, client))

      const error = yield* Effect.flip(run)
      assert.strictEqual(error.message, `Migration "2_second" failed`)
      assert.deepStrictEqual(yield* run, [[2, "second"], [3, "third"]])
    }).pipe(
      Effect.provide(Reactivity.layer)
    ))

  it.effect("kills a streamed query only when the stream is not read to the end", () =>
    Effect.gen(function*() {
      // A minimal stand-in for the row batches emitted by `ResultSet.stream()`
      queryImpl = () =>
        Promise.resolve({
          stream: () =>
            Readable.from(
              [[{ a: 1 }], [{ a: 2 }]].map((rows) => rows.map((row) => ({ json: () => Promise.resolve(row) }))),
              { objectMode: true }
            )
        })
      const client = yield* ClickhouseClient.make({ url: "http://localhost:8123" })

      const all = yield* Stream.runCollect(client`SELECT a FROM t`.stream).pipe(client.withQueryId("full-id"))
      const first = yield* Stream.runCollect(client`SELECT a FROM t`.stream.pipe(Stream.take(1))).pipe(
        client.withQueryId("take-id")
      )

      assert.deepStrictEqual(all, [{ a: 1 }, { a: 2 }])
      assert.deepStrictEqual(first, [{ a: 1 }])
      assertKilled("take-id")
    }).pipe(
      Effect.provide(Reactivity.layer)
    ))
})

describe("ClickhouseWebClient", { concurrent: false }, () => {
  interface Recorded {
    readonly query: string
    readonly params: URLSearchParams
    readonly signal: AbortSignal | null | undefined
  }

  const makeClient = (handler: (request: Recorded) => Response) => {
    const requests: Array<Recorded> = []
    const fetch = Object.assign(
      async (input: Parameters<typeof globalThis.fetch>[0], init?: RequestInit) => {
        const url = new URL(input instanceof Request ? input.url : String(input))
        const query = typeof init?.body === "string" ? init.body : ""
        const request = { query, params: url.searchParams, signal: init?.signal }
        requests.push(request)
        return url.searchParams.get("query") === "SELECT 'ping'" || query.startsWith("KILL QUERY")
          ? new Response("")
          : handler(request)
      },
      { preconnect: () => {} }
    )
    return Effect.map(
      ClickhouseWebClient.make({ url: "http://clickhouse.test:8123", fetch }),
      (sql) => ({ sql, requests })
    )
  }

  const killed = (requests: ReadonlyArray<Recorded>) =>
    requests.filter((request) => request.query.startsWith("KILL QUERY")).map((request) =>
      request.params.get("param_queryId")
    )

  it.effect("sends statements through the configured fetch only", () =>
    Effect.gen(function*() {
      const globalFetch = vi.spyOn(globalThis, "fetch")
      const { sql, requests } = yield* makeClient(() =>
        new Response(JSON.stringify({ data: [{ n: 1 }] }), { headers: { "content-type": "application/json" } })
      )

      const rows = yield* sql`SELECT ${1} AS n`

      assert.deepStrictEqual(rows, [{ n: 1 }])
      const select = requests.find((request) => request.query === "SELECT {p1: Float64} AS n")
      assert.strictEqual(select?.params.get("param_p1"), "1")
      assert.strictEqual(globalFetch.mock.calls.length, 0)
      globalFetch.mockRestore()
    }).pipe(Effect.provide(Reactivity.layer)))

  it.effect("kills a streamed query and cancels the body only when the stream is not read to the end", () =>
    Effect.gen(function*() {
      const cancelled: Array<string | null> = []
      const { sql, requests } = yield* makeClient((request) => {
        const queryId = request.params.get("query_id")
        return new Response(
          new ReadableStream<Uint8Array>({
            start(controller) {
              controller.enqueue(new TextEncoder().encode("{\"a\":1}\n{\"a\":2}\n"))
              // "take-id" stays open, as a long-running query would.
              if (queryId === "full-id") controller.close()
            },
            cancel() {
              cancelled.push(queryId)
            }
          })
        )
      })

      const all = yield* Stream.runCollect(sql`SELECT a FROM t`.stream).pipe(sql.withQueryId("full-id"))
      const first = yield* Stream.runCollect(sql`SELECT a FROM t`.stream.pipe(Stream.take(1))).pipe(
        sql.withQueryId("take-id")
      )

      assert.deepStrictEqual(all, [{ a: 1 }, { a: 2 }])
      assert.deepStrictEqual(first, [{ a: 1 }])
      assert.deepStrictEqual(killed(requests), ["take-id"])
      assert.deepStrictEqual(cancelled, ["take-id"])
    }).pipe(Effect.provide(Reactivity.layer)))

  it.effect("aborts and kills a query interrupted while its result is being read", () =>
    Effect.gen(function*() {
      const reading = Promise.withResolvers<void>()
      let signal: AbortSignal | null | undefined
      const { sql, requests } = yield* makeClient((request) => {
        signal = request.signal
        return new Response(
          new ReadableStream<Uint8Array>({
            pull(controller) {
              // Part of the body arrives and the rest waits until the request is aborted.
              controller.enqueue(new TextEncoder().encode("{\"data\":["))
              reading.resolve()
              return new Promise((_, reject) => request.signal?.addEventListener("abort", reject))
            }
          }, { highWaterMark: 0 }),
          { headers: { "content-type": "application/json" } }
        )
      })

      const fiber = yield* sql`SELECT a FROM t`.pipe(sql.withQueryId("read-id"), Effect.forkChild)
      yield* Effect.promise(() => reading.promise)
      yield* Fiber.interrupt(fiber)

      assert.isTrue(signal?.aborted)
      assert.deepStrictEqual(killed(requests), ["read-id"])
    }).pipe(Effect.provide(Reactivity.layer)))

  it.effect("fails a stream with a SqlError on a malformed row", () =>
    Effect.gen(function*() {
      const { sql } = yield* makeClient(() => new Response("not-json\n"))

      const error = yield* Effect.flip(Stream.runCollect(sql`SELECT a FROM t`.stream))

      assert.strictEqual(error.reason.operation, "parseRow")
    }).pipe(Effect.provide(Reactivity.layer)))

  it.effect("classifies a ClickHouse error response", () =>
    Effect.gen(function*() {
      const { sql } = yield* makeClient(() =>
        new Response("Code: 62. DB::Exception: Syntax error: failed at position 1 (SYNTAX_ERROR) (version 25.8.1.1)", {
          status: 400,
          headers: { "x-clickhouse-exception-code": "62" }
        })
      )

      const error = yield* Effect.flip(sql`SELEC 1`)

      assert.strictEqual(error.reason._tag, "SqlSyntaxError")
    }).pipe(Effect.provide(Reactivity.layer)))

  it("bundles with the migrator for a runtime without Node built-ins", () =>
    build({
      entryPoints: ["ClickhouseWebClient.ts", "ClickhouseMigrator.ts"].map((name) =>
        fileURLToPath(new URL(`../src/${name}`, import.meta.url))
      ),
      bundle: true,
      write: false,
      outdir: "out",
      format: "esm",
      platform: "neutral",
      conditions: ["workerd", "worker", "browser"],
      mainFields: ["module", "main"],
      logLevel: "silent"
    }), 60_000)
})
