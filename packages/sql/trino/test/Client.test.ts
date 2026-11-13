import { TrinoClient, TrinoTypes } from "@effect/sql-trino"
import { assert, describe, it } from "@effect/vitest"
import { BigDecimal, Effect, Fiber, Layer, Redacted, Stream } from "effect"
import * as HttpClient from "effect/http/HttpClient"
import * as HttpClientResponse from "effect/http/HttpClientResponse"
import * as Reactivity from "effect/reactivity/Reactivity"
import type { SqlClient } from "effect/sql"
import * as Str from "effect/String"

const BASE = "http://trino.test:8080"

interface Exchange {
  readonly method: string
  readonly url: string
  readonly headers: Readonly<Record<string, string>>
  readonly body: string
}

interface Reply {
  readonly status?: number
  readonly headers?: Record<string, string> | undefined
  /** Raw JSON text, so tests can send numbers beyond 2^53. */
  readonly body: string
}

/**
 * A scripted coordinator: `reply` answers every request, returning
 * `undefined` to leave it pending forever.
 */
const coordinator = (reply: (exchange: Exchange, log: ReadonlyArray<Exchange>) => Reply | undefined) => {
  const log: Array<Exchange> = []
  const http = HttpClient.make((request, url) => {
    const exchange: Exchange = {
      method: request.method,
      url: url.toString(),
      headers: { ...request.headers },
      body: request.body._tag === "Uint8Array" ? new TextDecoder().decode(request.body.body) : ""
    }
    log.push(exchange)
    if (exchange.method === "GET" && exchange.url === `${BASE}/v1/info`) {
      return Effect.succeed(
        json(request, {
          body: `{"nodeVersion":{"version":"484"},"coordinator":true,"starting":false,"uptime":"1.00m"}`
        })
      )
    }
    const answer = reply(exchange, log)
    return answer === undefined ? Effect.never : Effect.succeed(json(request, answer))
  })
  return { log, http: Layer.succeed(HttpClient.HttpClient, http) }
}

const json = (request: Parameters<typeof HttpClientResponse.fromWeb>[0], reply: Reply) =>
  HttpClientResponse.fromWeb(
    request,
    new Response(reply.body, {
      status: reply.status ?? 200,
      headers: { "content-type": "application/json", ...reply.headers }
    })
  )

const stats = (state: string) =>
  `{"state":"${state}","queued":${
    state === "QUEUED"
  },"scheduled":true,"nodes":1,"totalSplits":1,"queuedSplits":0,"runningSplits":0,"completedSplits":1,"cpuTimeMillis":0,"wallTimeMillis":0,"queuedTimeMillis":0,"elapsedTimeMillis":0,"processedRows":0,"processedBytes":0,"physicalInputBytes":0,"peakMemoryBytes":0,"spilledBytes":0}`

const column = (name: string, rawType: string, args = "[]", type = rawType) =>
  `{"name":"${name}","type":"${type}","typeSignature":{"rawType":"${rawType}","arguments":${args}}}`

const queued = (id: string) =>
  `{"id":"${id}","infoUri":"${BASE}/ui/query.html?${id}","nextUri":"${BASE}/v1/statement/queued/${id}/y/1","stats":${
    stats("QUEUED")
  },"warnings":[]}`

const page = (id: string, options: { columns?: string; data?: string; next?: number; update?: string }) =>
  `{"id":"${id}","infoUri":"${BASE}/ui/query.html?${id}"${
    options.next === undefined ? "" : `,"nextUri":"${BASE}/v1/statement/executing/${id}/y/${options.next}"`
  }${options.columns === undefined ? "" : `,"columns":[${options.columns}]`}${
    options.data === undefined ? "" : `,"data":${options.data}`
  },"stats":${stats(options.next === undefined ? "FINISHED" : "RUNNING")},"warnings":[]${
    options.update === undefined ? "" : `,"updateType":"${options.update}"`
  }}`

/** Answers each POSTed statement with `respond(statement)` after one QUEUED round trip. */
const statements = (
  respond: (
    statement: string,
    exchange: Exchange
  ) => { readonly page: string; readonly headers?: Record<string, string> }
) => {
  let counter = 0
  const pending = new Map<string, { readonly page: string; readonly headers?: Record<string, string> }>()
  return coordinator((exchange) => {
    if (exchange.method === "POST") {
      const id = `q${++counter}`
      pending.set(`${BASE}/v1/statement/queued/${id}/y/1`, respond(exchange.body, exchange))
      return { body: queued(id) }
    }
    if (exchange.method === "DELETE") {
      return { status: 204, body: "" }
    }
    const answer = pending.get(exchange.url)
    return answer === undefined ? undefined : { body: answer.page, headers: answer.headers }
  })
}

const header = (exchange: Exchange, name: string) => exchange.headers[name.toLowerCase()]

const posts = (log: ReadonlyArray<Exchange>) => log.filter((exchange) => exchange.method === "POST")

const withClient = <A, E>(
  http: Layer.Layer<HttpClient.HttpClient>,
  config: Partial<TrinoClient.TrinoClientConfig>,
  f: (sql: TrinoClient.TrinoClient & SqlClient.SqlClient) => Effect.Effect<A, E>
) =>
  Effect.gen(function*() {
    const sql = yield* TrinoClient.make({ url: BASE, user: "test", encodings: [], ...config })
    return yield* f(sql)
  }).pipe(Effect.scoped, Effect.provide(Layer.merge(http, Reactivity.layer)))

describe("TrinoClient", () => {
  it.effect("decodes rows like pg and names them after the columns", () => {
    const { http } = statements((statement) => {
      assert.strictEqual(statement, "SELECT id, total_amount FROM orders")
      return {
        page: page("q1", {
          columns: [
            column("id", "bigint"),
            column("total_amount", "decimal", `[{"kind":"LONG","value":4},{"kind":"LONG","value":2}]`, "decimal(4,2)")
          ].join(","),
          data: `[[9007199254740993,"12.50"]]`
        })
      }
    })
    return withClient(http, { transformResultNames: Str.snakeToCamel }, (sql) =>
      Effect.gen(function*() {
        const rows = yield* sql<{ id: bigint; totalAmount: string }>`SELECT id, total_amount FROM orders`
        assert.strictEqual(rows.length, 1)
        assert.strictEqual(rows[0].id, 9007199254740993n)
        assert.strictEqual(rows[0].totalAmount, "12.50")
      }))
  })

  it.effect("decodes with the codecs of the types registry", () => {
    const { http } = statements(() => ({
      page: page("q1", {
        columns: column(
          "total_amount",
          "decimal",
          `[{"kind":"LONG","value":4},{"kind":"LONG","value":2}]`,
          "decimal(4,2)"
        ),
        data: `[["12.50"]]`
      })
    }))
    return withClient(http, { types: TrinoTypes.makeEffectRegistry() }, (sql) =>
      Effect.gen(function*() {
        const rows = yield* sql<{ total_amount: BigDecimal.BigDecimal }>`SELECT total_amount FROM orders`
        assert.isTrue(BigDecimal.equals(rows[0].total_amount, BigDecimal.fromStringUnsafe("12.50")))
      }))
  })

  it.effect("sends parameters as EXECUTE IMMEDIATE literals", () => {
    const { http, log } = statements(() => ({ page: page("q1", { columns: column("x", "bigint"), data: "[[1]]" }) }))
    return withClient(http, {}, (sql) =>
      Effect.gen(function*() {
        yield* sql`SELECT ${"it's"} AS x WHERE ${sql("id")} = ${1n}`
        const [post] = posts(log)
        assert.isTrue(post.body.startsWith("EXECUTE IMMEDIATE 'SELECT ? AS x WHERE \"id\" = ?' USING "), post.body)
        assert.isTrue(post.body.includes("'it''s'"), post.body)
      }))
  })

  it.effect("compiles empty IN lists for Trino and typed parameters as casts", () => {
    const { http } = statements(() => ({ page: page("q1", {}) }))
    return withClient(http, {}, (sql) =>
      Effect.sync(() => {
        assert.deepStrictEqual(sql`SELECT 1 WHERE x IN ${sql.in([])}`.compile(), [
          "SELECT 1 WHERE x IN (SELECT NULL WHERE 1=0)",
          []
        ])
        const [text, params] = sql`SELECT ${sql.param("tinyint", 1)}`.compile()
        assert.strictEqual(text, "SELECT ?")
        assert.strictEqual(params.length, 1)
        assert.strictEqual(sql.onDialectOrElse({ orElse: () => "other", trino: () => "trino" }), "trino")
      }))
  })

  it.effect("keeps session changes the coordinator reports for later statements", () => {
    const { http, log } = statements((statement) =>
      statement === "USE hive.analytics"
        ? {
          page: page("q1", { update: "USE" }),
          headers: { "X-Trino-Set-Catalog": "hive", "X-Trino-Set-Schema": "analytics" }
        }
        : statement.startsWith("SET SESSION")
        ? { page: page("q2", { update: "SET SESSION" }), headers: { "X-Trino-Set-Session": "query_max_run_time=1h" } }
        : { page: page("q3", { columns: column("x", "integer"), data: "[[1]]" }) }
    )
    return withClient(http, { catalog: "memory", schema: "default" }, (sql) =>
      Effect.gen(function*() {
        yield* sql`USE hive.analytics`
        yield* sql`SET SESSION query_max_run_time = '1h'`
        yield* sql`SELECT 1 AS x`
        const last = posts(log)[2]
        assert.strictEqual(header(last, "X-Trino-Catalog"), "hive")
        assert.strictEqual(header(last, "X-Trino-Schema"), "analytics")
        assert.isTrue(header(last, "X-Trino-Session")?.includes("query_max_run_time=1h"))
        const session = yield* sql.session
        assert.strictEqual(session.schema, "analytics")
      }))
  })

  it.effect("runs transactions on their own session and refuses savepoints", () => {
    const { http, log } = statements((statement) =>
      statement === "START TRANSACTION"
        ? { page: page("q", { update: "START TRANSACTION" }), headers: { "X-Trino-Started-Transaction-Id": "tx-1" } }
        : statement === "COMMIT" || statement === "ROLLBACK"
        ? { page: page("q", { update: statement }), headers: { "X-Trino-Clear-Transaction-Id": "true" } }
        : { page: page("q", { columns: column("x", "integer"), data: "[[1]]" }) }
    )
    return withClient(http, {}, (sql) =>
      Effect.gen(function*() {
        yield* sql.withTransaction(sql`SELECT 1 AS x`)
        const [begin, inside, commit] = posts(log)
        assert.strictEqual(begin.body, "START TRANSACTION")
        assert.strictEqual(header(begin, "X-Trino-Transaction-Id"), "NONE")
        assert.strictEqual(header(inside, "X-Trino-Transaction-Id"), "tx-1")
        assert.strictEqual(commit.body, "COMMIT")
        assert.strictEqual((yield* sql.session).transactionId, undefined)

        const nested = yield* Effect.flip(sql.withTransaction(sql.withTransaction(sql`SELECT 1 AS x`)))
        assert.strictEqual(nested.reason._tag, "UnknownError")
        assert.strictEqual(nested.reason.operation, "savepoint")
        assert.strictEqual(posts(log).at(-1)?.body, "ROLLBACK")

        yield* sql`SELECT 1 AS x`
        assert.strictEqual(header(posts(log).at(-1)!, "X-Trino-Transaction-Id"), "NONE")
      }))
  })

  it.effect("streams rows page by page", () => {
    let counter = 0
    const { http } = coordinator((exchange) => {
      if (exchange.method === "POST") return { body: queued("q1") }
      counter++
      return counter === 1
        ? { body: page("q1", { columns: column("n", "integer"), data: "[[1],[2]]", next: 2 }) }
        : counter === 2
        ? { body: page("q1", { columns: column("n", "integer"), data: "[[3]]", next: 3 }) }
        : { body: page("q1", {}) }
    })
    return withClient(http, {}, (sql) =>
      Effect.gen(function*() {
        const rows = yield* Stream.runCollect(sql<{ n: number }>`SELECT n FROM t`.stream)
        assert.deepStrictEqual(rows.map((row) => row.n), [1, 2, 3])
      }))
  })

  it.effect("cancels the query on the coordinator when interrupted", () => {
    const { http, log } = coordinator((exchange) => {
      if (exchange.method === "POST") return { body: queued("q1") }
      if (exchange.method === "DELETE") return { status: 204, body: "" }
      return undefined
    })
    return withClient(http, {}, (sql) =>
      Effect.gen(function*() {
        const fiber = yield* Effect.forkChild(sql`SELECT * FROM big`)
        yield* Effect.yieldNow
        while (!log.some((exchange) => exchange.method === "GET" && exchange.url.includes("/v1/statement/"))) {
          yield* Effect.yieldNow
        }
        yield* Fiber.interrupt(fiber)
        assert.isTrue(log.some((exchange) => exchange.method === "DELETE" && exchange.url.includes("/q1/")))
      }))
  })

  it.effect("fails to connect while the coordinator is starting", () => {
    const http = Layer.succeed(
      HttpClient.HttpClient,
      HttpClient.make((request) =>
        Effect.succeed(json(request, { body: `{"nodeVersion":{"version":"484"},"coordinator":true,"starting":true}` }))
      )
    )
    return Effect.gen(function*() {
      const error = yield* Effect.flip(TrinoClient.make({ url: BASE, user: "test" }))
      assert.strictEqual(error.reason._tag, "ConnectionError")
      assert.strictEqual(error.reason.message, "TrinoClient: the coordinator is still starting")
    }).pipe(Effect.scoped, Effect.provide(Layer.merge(http, Reactivity.layer)))
  })

  it.effect("refuses credentials it cannot send when the client is built", () => {
    const { http } = statements(() => ({ page: page("q1", {}) }))
    return Effect.gen(function*() {
      const error = yield* Effect.flip(
        TrinoClient.make({ url: BASE, user: "a:b", password: Redacted.make("secret") })
      )
      assert.strictEqual(error.reason._tag, "ConnectionError")
      assert.isTrue(error.message.includes("basic authentication"))
    }).pipe(Effect.scoped, Effect.provide(Layer.merge(http, Reactivity.layer)))
  })
})
