import { ClickhouseWebClient } from "@effect/sql-clickhouse"
import { assert, describe, it } from "@effect/vitest"
import { Effect, Exit, Fiber, Scope, Stream } from "effect"
import * as Reactivity from "effect/reactivity/Reactivity"
import { SqlError } from "effect/sql/SqlError"
import { vi } from "vitest"

/**
 * Drives the real `@clickhouse/client-web` through an injected `fetch`, the
 * way a Cloudflare Worker would run it: no sockets, no Node HTTP client. The
 * global `fetch` must never be touched when a `fetch` option is given.
 */

interface Recorded {
  readonly url: URL
  readonly body: string
  readonly signal: AbortSignal | null | undefined
}

const killQueryId = (request: Recorded): string | undefined =>
  request.body.startsWith("KILL QUERY") ? request.url.searchParams.get("param_queryId") ?? undefined : undefined

const makeFetch = (handler: (request: Recorded) => Response | Promise<Response>) => {
  const requests: Array<Recorded> = []
  const fetch = Object.assign(
    async (input: Parameters<typeof globalThis.fetch>[0], init?: RequestInit) => {
      const recorded: Recorded = {
        url: new URL(input instanceof Request ? input.url : String(input)),
        body: typeof init?.body === "string" ? init.body : "",
        signal: init?.signal
      }
      requests.push(recorded)
      // The connectivity check and the KILL command are not what a test asserts on.
      if (recorded.url.searchParams.get("query") === "SELECT 'ping'" || killQueryId(recorded) !== undefined) {
        return new Response("")
      }
      return handler(recorded)
    },
    { preconnect: () => {} }
  )
  return { requests, fetch }
}

const json = (body: unknown) => new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } })

const provide = Effect.provide(Reactivity.layer)

describe("ClickhouseWebClient over fetch", { concurrent: false }, () => {
  it.effect("runs statements through the supplied fetch and never the global one", () =>
    Effect.gen(function*() {
      const globalFetch = vi.spyOn(globalThis, "fetch")
      const { fetch, requests } = makeFetch(() => json({ data: [{ n: 1 }] }))
      const sql = yield* ClickhouseWebClient.make({ url: "http://clickhouse.test:8123", fetch })

      const rows = yield* sql`SELECT ${1} AS n`

      assert.deepStrictEqual(rows, [{ n: 1 }])
      const select = requests.find((request) => request.body.startsWith("SELECT {p1"))
      assert.isDefined(select)
      assert.strictEqual(select.body, "SELECT {p1: Float64} AS n")
      assert.strictEqual(select.url.searchParams.get("param_p1"), "1")
      assert.strictEqual(globalFetch.mock.calls.length, 0)
      globalFetch.mockRestore()
    }).pipe(Effect.scoped, provide))

  it.effect("exposes the underlying ClickHouse client and closes it with the scope", () =>
    Effect.gen(function*() {
      const { fetch, requests } = makeFetch(() => json({ data: [{ n: 1 }] }))
      const scope = yield* Scope.make()
      const sql = yield* ClickhouseWebClient.make({ url: "http://clickhouse.test:8123", fetch }).pipe(
        Effect.provideService(Scope.Scope, scope)
      )
      const close = vi.spyOn(sql.client, "close")

      // The handle is the instance the client was built with: it reaches the supplied `fetch`.
      const result = yield* Effect.promise(() => sql.client.query({ query: "SELECT 1 AS n", format: "JSON" }))
      assert.deepStrictEqual((yield* Effect.promise(() => result.json<{ n: number }>())).data, [{ n: 1 }])
      assert.isDefined(requests.find((request) => request.body === "SELECT 1 AS n"))
      assert.strictEqual(close.mock.calls.length, 0)

      yield* Scope.close(scope, Exit.void)

      assert.strictEqual(close.mock.calls.length, 1)
    }).pipe(provide))

  it.effect("streams rows from a response body", () =>
    Effect.gen(function*() {
      const { fetch, requests } = makeFetch(() => new Response("{\"a\":1}\n{\"a\":2}\n"))
      const sql = yield* ClickhouseWebClient.make({ url: "http://clickhouse.test:8123", fetch })

      const rows = yield* Stream.runCollect(sql`SELECT a FROM t`.stream)

      assert.deepStrictEqual(rows, [{ a: 1 }, { a: 2 }])
      assert.strictEqual(requests.filter((request) => killQueryId(request) !== undefined).length, 0)
    }).pipe(Effect.scoped, provide))

  it.effect("kills the query and cancels the body when a stream is not read to the end", () =>
    Effect.gen(function*() {
      let cancelled = false
      const { fetch, requests } = makeFetch(() =>
        new Response(
          new ReadableStream<Uint8Array>({
            start(controller) {
              controller.enqueue(new TextEncoder().encode("{\"a\":1}\n"))
            },
            cancel() {
              cancelled = true
            }
          })
        )
      )
      const sql = yield* ClickhouseWebClient.make({ url: "http://clickhouse.test:8123", fetch })

      const rows = yield* Stream.runCollect(sql`SELECT a FROM t`.stream.pipe(Stream.take(1))).pipe(
        sql.withQueryId("take-id")
      )

      assert.deepStrictEqual(rows, [{ a: 1 }])
      assert.isTrue(cancelled)
      assert.deepStrictEqual(requests.map(killQueryId).filter((id) => id !== undefined), ["take-id"])
    }).pipe(Effect.scoped, provide))

  it.effect("aborts the request and kills the query when the fiber is interrupted", () =>
    Effect.gen(function*() {
      let signal: AbortSignal | null | undefined
      const requested = Promise.withResolvers<void>()
      const { fetch, requests } = makeFetch((request) => {
        signal = request.signal
        requested.resolve()
        // Stays pending until the client aborts, as a long-running query would.
        const response = Promise.withResolvers<Response>()
        request.signal?.addEventListener("abort", () => response.reject(new DOMException("aborted", "AbortError")))
        return response.promise
      })
      const sql = yield* ClickhouseWebClient.make({ url: "http://clickhouse.test:8123", fetch })

      const fiber = yield* sql.withQueryId(sql.unsafe("SELECT sleep(3)"), "slow-id").pipe(Effect.forkChild)
      yield* Effect.promise(() => requested.promise)
      yield* Fiber.interrupt(fiber)

      assert.isTrue(signal?.aborted)
      assert.deepStrictEqual(requests.map(killQueryId).filter((id) => id !== undefined), ["slow-id"])
    }).pipe(Effect.scoped, provide))

  it.effect("maps a ClickHouse error response to a SqlError reason", () =>
    Effect.gen(function*() {
      const { fetch } = makeFetch(() =>
        new Response("Code: 62. DB::Exception: Syntax error: failed at position 1 (SYNTAX_ERROR) (version 24.8.1.1)", {
          status: 400,
          headers: { "x-clickhouse-exception-code": "62" }
        })
      )
      const sql = yield* ClickhouseWebClient.make({ url: "http://clickhouse.test:8123", fetch })

      const error = yield* Effect.flip(sql`SELEC 1`)

      assert.instanceOf(error, SqlError)
      assert.strictEqual(error.reason._tag, "SqlSyntaxError")
    }).pipe(Effect.scoped, provide))

  it.effect("inserts JSON rows with the table and columns in the request", () =>
    Effect.gen(function*() {
      const { fetch, requests } = makeFetch(() => new Response(""))
      const sql = yield* ClickhouseWebClient.make({ url: "http://clickhouse.test:8123", fetch })

      yield* sql.insertQuery({ table: "people", values: [{ name: "Alice" }, { name: "Bob" }], columns: ["name"] })

      const query = requests.map((request) => request.url.searchParams.get("query")).find((value) =>
        value !== null && value.startsWith("INSERT")
      )
      assert.strictEqual(query, "INSERT INTO people (name) FORMAT JSONEachRow")
      const body = requests.find((request) => request.body.includes("Alice"))?.body
      assert.strictEqual(body, "{\"name\":\"Alice\"}\n{\"name\":\"Bob\"}\n")
    }).pipe(Effect.scoped, provide))
})
