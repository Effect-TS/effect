import { assert, describe, it } from "@effect/vitest"
import { Deferred, Effect, Fiber, Redacted, Stream } from "effect"
import * as ClickhouseClient from "effect/clickhouse/ClickhouseClient"
import { HttpClient, HttpClientResponse } from "effect/http"
import * as Reactivity from "effect/reactivity/Reactivity"

const fixture = (options: ClickhouseClient.ClickhouseClientConfig = {}, error?: { code: number; status: number }) => {
  const requests: Array<{ url: URL; headers: Readonly<Record<string, string>>; text: string }> = []
  const http = HttpClient.make((request, url) =>
    Effect.gen(function*() {
      let text = ""
      if (request.body._tag === "Uint8Array") text = new TextDecoder().decode(request.body.body)
      if (request.body._tag === "Stream") {
        text = (yield* Stream.runCollect(request.body.stream.pipe(Stream.decodeText())).pipe(Effect.orDie)).join("")
      }
      requests.push({ url, headers: request.headers, text })
      if (url.pathname.endsWith("/ping")) return HttpClientResponse.fromWeb(request, new Response("Ok.\n"))
      if (error) {
        return HttpClientResponse.fromWeb(
          request,
          new Response(`Code: ${error.code}. DB::Exception: fixture error`, {
            status: error.status,
            headers: { "x-clickhouse-exception-code": String(error.code) }
          })
        )
      }
      const format = url.searchParams.get("default_format")
      const body = format === "JSONEachRow"
        ? "{\"some_value\":1}\n{\"some_value\":2}\n"
        : format
        ? JSON.stringify({
          meta: [{ name: "some_value", type: "UInt8" }],
          data: format === "JSONCompact" ? [[1]] : [{ some_value: 1 }],
          rows: 1
        })
        : ""
      return HttpClientResponse.fromWeb(
        request,
        new Response(body, { headers: { "x-clickhouse-query-id": "server-id" } })
      )
    })
  )
  return {
    requests,
    make: ClickhouseClient.make(options).pipe(
      Effect.provideService(HttpClient.HttpClient, http),
      Effect.provide(Reactivity.layer)
    )
  }
}

describe("native ClickHouse HTTP", () => {
  it.effect("sends typed parameters, credentials, IDs and per-query settings", () =>
    Effect.gen(function*() {
      const f = fixture({
        url: "https://database.example",
        database: "analytics",
        username: "user",
        password: Redacted.make("secret"),
        clickhouseSettings: { max_threads: 1 }
      })
      const sql = yield* f.make
      const result = yield* sql`SELECT ${123}, ${sql.param("Array(String)", ["a'b", "c\\d"])}`.pipe(
        sql.withQueryId("my-query"),
        sql.withClickhouseSettings({ max_threads: 2 })
      )
      assert.deepStrictEqual(result, [{ some_value: 1 }])
      const request = f.requests[1]
      assert.strictEqual(request.text, "SELECT {p1: Float64}, {p2: Array(String)}")
      assert.strictEqual(request.url.searchParams.get("param_p1"), "123")
      assert.strictEqual(request.url.searchParams.get("param_p2"), "['a\\'b','c\\\\d']")
      assert.strictEqual(request.url.searchParams.get("database"), "analytics")
      assert.strictEqual(request.url.searchParams.get("query_id"), "my-query")
      assert.strictEqual(request.url.searchParams.get("max_threads"), "2")
      assert.strictEqual(request.headers.authorization, "Basic dXNlcjpzZWNyZXQ=")
    }))

  it.effect("supports raw metadata, ordered values and row transforms", () =>
    Effect.gen(function*() {
      const f = fixture({ transformResultNames: () => "someValue" })
      const sql = yield* f.make
      assert.deepStrictEqual(yield* sql`SELECT 1`, [{ someValue: 1 }])
      assert.deepStrictEqual(yield* sql`SELECT 1`.values, [[1]])
      const raw = (yield* sql`SELECT 1`.raw) as ClickhouseClient.QueryResult
      assert.strictEqual(raw.query_id, "server-id")
      assert.deepStrictEqual(raw.meta, [{ name: "some_value", type: "UInt8" }])
      assert.deepStrictEqual(yield* Stream.runCollect(sql`SELECT 1`.stream), [{ someValue: 1 }, { someValue: 2 }])
    }))

  it.effect("consumes command bodies and inserts object and byte streams", () =>
    Effect.gen(function*() {
      const f = fixture()
      const sql = yield* f.make
      assert.deepStrictEqual(yield* sql.asCommand(sql`CREATE TABLE example(value UInt8)`), [])
      assert.strictEqual(f.requests[1].url.searchParams.has("default_format"), false)
      assert.deepStrictEqual(
        yield* sql.insertQuery({
          table: "db.example",
          columns: ["some_value"],
          values: [{ some_value: 1 }, { some_value: 2 }]
        }),
        { query_id: "server-id", executed: true }
      )
      assert.strictEqual(
        f.requests[2].url.searchParams.get("query"),
        "INSERT INTO \"db\".\"example\" (\"some_value\") FORMAT JSONEachRow"
      )
      assert.strictEqual(f.requests[2].text, "{\"some_value\":1}\n{\"some_value\":2}\n")
      yield* sql.insertQuery({
        table: "example",
        format: "CSV",
        values: Stream.make(new TextEncoder().encode("1\n2\n"))
      })
      assert.strictEqual(f.requests[3].text, "1\n2\n")
      assert.deepStrictEqual(yield* sql.insertQuery({ table: "example", values: [] }), {
        query_id: "",
        executed: false
      })
      assert.strictEqual(f.requests.length, 4)
    }))

  it.effect("classifies ClickHouse exception codes", () =>
    Effect.gen(function*() {
      for (
        const [code, tag] of [[516, "AuthenticationError"], [497, "AuthorizationError"], [62, "SqlSyntaxError"], [
          159,
          "StatementTimeoutError"
        ], [999, "UnknownError"]] as const
      ) {
        const f = fixture({}, { code, status: 500 })
        const sql = yield* f.make
        assert.strictEqual((yield* Effect.flip(sql`SELECT 1`)).reason._tag, tag)
      }
    }))

  it.effect("rejects invalid URLs and incompatible insert formats", () =>
    Effect.gen(function*() {
      assert.strictEqual((yield* Effect.result(fixture({ url: "file:/tmp/db" }).make))._tag, "Failure")
      const sql = yield* fixture().make
      assert.strictEqual(
        (yield* Effect.result(sql.insertQuery({ table: "example", format: "CSV", values: [{ value: 1 }] })))._tag,
        "Failure"
      )
      assert.strictEqual(
        (yield* Effect.result(sql.insertQuery({ table: "example", format: "CSV;DROP", values: Stream.empty })))._tag,
        "Failure"
      )
    }))

  it.effect("fails transactions before sending unsupported controls", () =>
    Effect.gen(function*() {
      const f = fixture()
      const sql = yield* f.make
      const error = yield* Effect.flip(sql.withTransaction(sql`SELECT 1`))
      assert.strictEqual(error.reason.operation, "beginTransaction")
      assert.strictEqual(f.requests.length, 1)
    }))

  it.effect("infers nullable parameters", () =>
    Effect.gen(function*() {
      const f = fixture()
      const sql = yield* f.make
      yield* sql`SELECT ${null}`
      assert.strictEqual(f.requests[1].text, "SELECT {p1: Nullable(String)}")
      assert.strictEqual(f.requests[1].url.searchParams.get("param_p1"), "\\N")
    }))

  it.effect("escapes top-level and nested strings for ClickHouse Escaped format", () =>
    Effect.gen(function*() {
      const f = fixture()
      const sql = yield* f.make
      yield* sql`SELECT ${"雪💚'\\\0\t\n\r\b\f"}, ${sql.param("Array(String)", ["'\\\0\t\n\r"])} `
      assert.strictEqual(f.requests[1].url.searchParams.get("param_p1"), "雪💚'\\\\\\0\\t\\n\\r\\b\\f")
      assert.strictEqual(f.requests[1].url.searchParams.get("param_p2"), "['\\'\\\\\\0\\t\\n\\r']")
    }))

  it.effect("classifies exception headers on HTTP 200 and rejects invalid JSON", () =>
    Effect.gen(function*() {
      for (
        const [body, headers, expected] of [[
          "Code: 62. syntax error",
          { "x-clickhouse-exception-code": "62" },
          "SqlSyntaxError"
        ], ["{\"data\":null}", {}, "UnknownError"]] as const
      ) {
        const http = HttpClient.make((request, url) =>
          Effect.succeed(
            HttpClientResponse.fromWeb(
              request,
              url.pathname.endsWith("/ping") ? new Response("Ok.") : new Response(body, { headers })
            )
          )
        )
        const sql = yield* ClickhouseClient.make({}).pipe(
          Effect.provideService(HttpClient.HttpClient, http),
          Effect.provide(Reactivity.layer)
        )
        assert.strictEqual((yield* Effect.flip(sql`SELECT 1`)).reason._tag, expected)
      }
    }))

  it.effect("kills interrupted HTTP queries with their parameterized identifier", () =>
    Effect.gen(function*() {
      const started = yield* Deferred.make<void>()
      const operations: Array<{ query: string; url: URL }> = []
      let signal: AbortSignal | undefined
      const http = HttpClient.make((request, url, abort) =>
        Effect.gen(function*() {
          if (url.pathname.endsWith("/ping")) return HttpClientResponse.fromWeb(request, new Response("Ok."))
          const query = request.body._tag === "Uint8Array" ? new TextDecoder().decode(request.body.body) : ""
          operations.push({ query, url })
          if (query.startsWith("SELECT")) {
            signal = abort
            yield* Deferred.succeed(started, undefined)
            return yield* Effect.never
          }
          return HttpClientResponse.fromWeb(request, new Response(""))
        })
      )
      const sql = yield* ClickhouseClient.make({}).pipe(
        Effect.provideService(HttpClient.HttpClient, http),
        Effect.provide(Reactivity.layer)
      )
      const fiber = yield* Effect.forkChild(sql`SELECT sleep(10)`.pipe(sql.withQueryId("query'with quote")))
      yield* Deferred.await(started)
      yield* Fiber.interrupt(fiber)
      assert.isTrue(signal!.aborted)
      assert.strictEqual(operations[1].query, "KILL QUERY WHERE query_id = {queryId:String} SYNC")
      assert.strictEqual(operations[1].url.searchParams.get("param_queryId"), "query'with quote")
    }))

  it.effect("kills streams that a consumer stops early", () =>
    Effect.gen(function*() {
      const f = fixture()
      const sql = yield* f.make
      assert.deepStrictEqual(yield* Stream.runCollect(sql`SELECT 1`.stream.pipe(Stream.take(1))), [{ some_value: 1 }])
      assert.strictEqual(f.requests.at(-1)!.text, "KILL QUERY WHERE query_id = {queryId:String} SYNC")
    }))

  it.effect("kills queries, commands and inserts interrupted while reading response bodies", () =>
    Effect.gen(function*() {
      for (const operation of ["query", "command", "insert"] as const) {
        const reading = yield* Deferred.make<void>()
        const queries: Array<string> = []
        let querySignal: AbortSignal | undefined
        const http = HttpClient.make((request, url, signal) =>
          Effect.sync(() => {
            if (url.pathname.endsWith("/ping")) return HttpClientResponse.fromWeb(request, new Response("Ok."))
            const query = url.searchParams.get("query") ??
              (request.body._tag === "Uint8Array" ? new TextDecoder().decode(request.body.body) : "")
            queries.push(query)
            if (query.startsWith("KILL QUERY")) return HttpClientResponse.fromWeb(request, new Response(""))
            querySignal = signal
            return HttpClientResponse.fromWeb(
              request,
              new Response(
                new ReadableStream<Uint8Array>({
                  pull() {
                    Deferred.doneUnsafe(reading, Effect.void)
                    return new Promise<void>(() => {})
                  }
                })
              )
            )
          })
        )
        const sql = yield* ClickhouseClient.make({ clickhouseSettings: { wait_end_of_query: 0 } }).pipe(
          Effect.provideService(HttpClient.HttpClient, http),
          Effect.provide(Reactivity.layer)
        )
        const run = operation === "query" ?
          sql`SELECT 1`
          : operation === "command" ?
          sql.asCommand(sql`ALTER TABLE example ADD COLUMN value UInt8`)
          : sql.insertQuery({ table: "example", values: [{ value: 1 }] })
        const fiber = yield* Effect.forkChild(run)
        yield* Deferred.await(reading)
        yield* Fiber.interrupt(fiber)
        assert.isTrue(querySignal!.aborted)
        assert.strictEqual(queries.at(-1), "KILL QUERY WHERE query_id = {queryId:String} SYNC")
      }
    }))
})
