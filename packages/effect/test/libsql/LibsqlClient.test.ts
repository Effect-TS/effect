import { assert, describe, it } from "@effect/vitest"
import { Deferred, Effect, Exit, Fiber, Redacted, Scope, Stream } from "effect"
import { HttpClient, HttpClientResponse } from "effect/http"
import * as LibsqlClient from "effect/libsql/LibsqlClient"
import * as Reactivity from "effect/reactivity/Reactivity"
import { TestClock } from "effect/testing"

const fixture = (options: LibsqlClient.LibsqlClientConfig = { url: "libsql://database.example" }, result?: unknown) => {
  const requests: Array<{ url: URL; headers: Readonly<Record<string, string>>; body: any }> = []
  const http = HttpClient.make((request, url) =>
    Effect.sync(() => {
      assert.strictEqual(request.body._tag, "Uint8Array")
      const body = JSON.parse(new TextDecoder().decode((request.body as any).body))
      requests.push({ url, headers: request.headers, body })
      const close = body.requests[0].type === "close"
      return HttpClientResponse.fromWeb(
        request,
        new Response(JSON.stringify({
          baton: close ? null : "session-baton",
          results: body.requests.map((entry: any) => ({
            type: "ok",
            response: entry.type === "close" ? { type: "close" } : {
              type: "execute",
              result: result ?? {
                cols: [{ name: "some_value", decltype: "INTEGER" }],
                rows: entry.stmt.sql.startsWith("SELECT")
                  ? [[entry.stmt.args[0] ?? { type: "integer", value: "42" }]]
                  : [],
                affected_row_count: 0,
                last_insert_rowid: null
              }
            }
          }))
        }))
      )
    })
  )
  return {
    requests,
    make: LibsqlClient.make(options).pipe(
      Effect.provideService(HttpClient.HttpClient, http),
      Effect.provide(Reactivity.layer)
    )
  }
}

describe("native libSQL HTTP", () => {
  it.effect("encodes parameters and closes the statement baton", () =>
    Effect.gen(function*() {
      const f = fixture({ url: "libsql://database.example", authToken: Redacted.make("secret") })
      const sql = yield* f.make
      const result = yield* sql`SELECT ${123}`
      assert.deepStrictEqual(result, [{ some_value: 123 }])
      assert.strictEqual(f.requests[0].url.toString(), "https://database.example/v2/pipeline")
      assert.strictEqual(f.requests[0].headers.authorization, "Bearer secret")
      assert.strictEqual(f.requests[0].body.baton, null)
      assert.deepStrictEqual(f.requests[0].body.requests[0].stmt.args, [{ type: "integer", value: "123" }])
      assert.strictEqual(f.requests[1].body.baton, "session-baton")
      assert.strictEqual(f.requests[1].body.requests[0].type, "close")
    }))

  it.effect("keeps transaction and nested savepoints on one baton", () =>
    Effect.gen(function*() {
      const f = fixture()
      const sql = yield* f.make
      yield* sql.withTransaction(Effect.gen(function*() {
        yield* sql`SELECT ${1}`
        yield* sql.withTransaction(sql`SELECT ${2}`)
      }))
      const operations = f.requests.map(({ body }) => body.requests[0].stmt?.sql ?? "close")
      assert.deepStrictEqual(operations, [
        "BEGIN IMMEDIATE",
        "SELECT ?",
        "SAVEPOINT effect_sql_1",
        "SELECT ?",
        "RELEASE SAVEPOINT effect_sql_1",
        "COMMIT",
        "close"
      ])
      assert.strictEqual(f.requests[0].body.baton, null)
      assert.isTrue(f.requests.slice(1).every(({ body }) => body.baton === "session-baton"))
    }))

  it.effect("rolls back failed transactions and releases the server session", () =>
    Effect.gen(function*() {
      const f = fixture()
      const sql = yield* f.make
      const result = yield* Effect.result(sql.withTransaction(Effect.gen(function*() {
        yield* sql`SELECT ${1}`
        return yield* Effect.fail("application failure")
      })))
      assert.strictEqual(result._tag, "Failure")
      assert.deepStrictEqual(f.requests.map(({ body }) => body.requests[0].stmt?.sql ?? "close"), [
        "BEGIN IMMEDIATE",
        "SELECT ?",
        "ROLLBACK",
        "close"
      ])
    }))

  it.effect("supports bigint, string, binary, boolean, null and floating values", () =>
    Effect.gen(function*() {
      for (const mode of ["bigint", "string"] as const) {
        const f = fixture({ url: "http://localhost:8080", intMode: mode, protocolVersion: 3 })
        const sql = yield* f.make
        const bigint = yield* sql`SELECT ${BigInt("9223372036854775807")}`.values
        assert.strictEqual(bigint[0][0], mode === "bigint" ? BigInt("9223372036854775807") : "9223372036854775807")
        assert.strictEqual(f.requests[0].url.pathname, "/v3/pipeline")
        for (const value of [new Uint8Array([0, 255, 1]), null, "日本語", 1.5]) {
          assert.deepStrictEqual((yield* sql`SELECT ${value}`.values)[0][0], value)
        }
        assert.strictEqual((yield* sql`SELECT ${true}`.values)[0][0], mode === "bigint" ? BigInt("1") : "1")
      }
    }))

  it.effect("rejects unsafe integers and unsupported local URLs", () =>
    Effect.gen(function*() {
      const f = fixture()
      const sql = yield* f.make
      assert.strictEqual((yield* Effect.result(sql`SELECT ${BigInt("9223372036854775807")}`))._tag, "Failure")
      for (const value of [Number.MAX_SAFE_INTEGER + 1, Infinity, BigInt("9223372036854775808"), { invalid: true }]) {
        assert.strictEqual((yield* Effect.result(sql`SELECT ${value}`))._tag, "Failure")
      }
      for (
        const url of [
          "file:/tmp/database.db",
          ":memory:",
          "ws://database.example",
          "https://user:secret@database.example"
        ]
      ) {
        assert.strictEqual((yield* Effect.result(fixture({ url }).make))._tag, "Failure")
      }
    }))

  it.effect("preserves column order and applies transforms to rows and streams", () =>
    Effect.gen(function*() {
      const f = fixture({ url: "https://database.example", transformResultNames: () => "someValue" })
      const sql = yield* f.make
      assert.deepStrictEqual(yield* sql`SELECT ${42}`, [{ someValue: 42 }])
      assert.deepStrictEqual(yield* sql`SELECT ${42}`.values, [[42]])
      assert.deepStrictEqual(yield* Stream.runCollect(sql`SELECT ${42}`.stream), [{ someValue: 42 }])
      const raw = (yield* sql`SELECT ${42}`.raw) as LibsqlClient.ResultSet
      assert.deepStrictEqual(raw.columns, ["some_value"])
      assert.strictEqual(raw.rowsAffected, 0)
    }))

  it.effect("classifies server constraints and HTTP authentication errors", () =>
    Effect.gen(function*() {
      for (
        const [code, expected] of [
          ["SQLITE_CONSTRAINT_UNIQUE", "UniqueViolation"],
          ["SQLITE_BUSY", "LockTimeoutError"],
          ["SQL_PARSE_ERROR", "SqlSyntaxError"]
        ]
      ) {
        const http = HttpClient.make((request) =>
          Effect.succeed(
            HttpClientResponse.fromWeb(
              request,
              new Response(
                JSON.stringify({
                  baton: null,
                  results: [{ type: "error", error: { code, message: "database error" } }]
                })
              )
            )
          )
        )
        const sql = yield* LibsqlClient.make({ url: "https://database.example" }).pipe(
          Effect.provideService(HttpClient.HttpClient, http),
          Effect.provide(Reactivity.layer)
        )
        const error = yield* Effect.flip(sql`SELECT 1`)
        assert.strictEqual(error.reason._tag, expected)
        assert.deepStrictEqual(error.reason.cause, { code, message: "database error" })
      }
      const http = HttpClient.make((request) =>
        Effect.succeed(HttpClientResponse.fromWeb(request, new Response("unauthorized", { status: 401 })))
      )
      const sql = yield* LibsqlClient.make({ url: "https://database.example" }).pipe(
        Effect.provideService(HttpClient.HttpClient, http),
        Effect.provide(Reactivity.layer)
      )
      assert.strictEqual((yield* Effect.flip(sql`SELECT 1`)).reason._tag, "AuthenticationError")
    }))

  it.effect("rejects malformed rows and pipeline response counts", () =>
    Effect.gen(function*() {
      const f = fixture(undefined, { cols: [{ name: "value" }], rows: [[]], affected_row_count: 0 })
      const sql = yield* f.make
      assert.strictEqual((yield* Effect.result(sql`SELECT 1`))._tag, "Failure")
      assert.strictEqual(f.requests[1].body.requests[0].type, "close")
      const http = HttpClient.make((request) =>
        Effect.succeed(HttpClientResponse.fromWeb(request, new Response(JSON.stringify({ baton: null, results: [] }))))
      )
      const other = yield* LibsqlClient.make({ url: "https://database.example" }).pipe(
        Effect.provideService(HttpClient.HttpClient, http),
        Effect.provide(Reactivity.layer)
      )
      assert.strictEqual((yield* Effect.flip(other`SELECT 1`)).reason.operation, "protocol")
    }))

  it.effect("refuses server base URLs that could leak the authentication token", () =>
    Effect.gen(function*() {
      const requests: Array<string> = []
      const http = HttpClient.make((request, url) =>
        Effect.sync(() => {
          requests.push(url.origin)
          const body = JSON.parse(new TextDecoder().decode((request.body as any).body))
          const close = body.requests[0].type === "close"
          return HttpClientResponse.fromWeb(
            request,
            new Response(JSON.stringify({
              baton: close ? null : "session-baton",
              base_url: close ? null : "https://attacker.example",
              results: [{
                type: "ok",
                response: close
                  ? { type: "close" }
                  : { type: "execute", result: { cols: [], rows: [], affected_row_count: 0 } }
              }]
            }))
          )
        })
      )
      const sql = yield* LibsqlClient.make({ url: "https://database.example", authToken: Redacted.make("secret") })
        .pipe(Effect.provideService(HttpClient.HttpClient, http), Effect.provide(Reactivity.layer))
      assert.strictEqual((yield* Effect.flip(sql`SELECT 1`)).reason.operation, "protocol")
      assert.deepStrictEqual(requests, ["https://database.example", "https://database.example"])
    }))

  it.effect("preserves insert IDs and rejects affected counts that lose precision", () =>
    Effect.gen(function*() {
      const f = fixture(undefined, {
        cols: [],
        rows: [],
        affected_row_count: 1,
        last_insert_rowid: "9223372036854775807"
      })
      const sql = yield* f.make
      const result = (yield* sql`INSERT INTO example VALUES (1)`.raw) as LibsqlClient.ResultSet
      assert.strictEqual(result.lastInsertRowid, BigInt("9223372036854775807"))
      assert.strictEqual(result.rowsAffected, 1)
      const invalid = fixture(undefined, {
        cols: [],
        rows: [],
        affected_row_count: Number.MAX_SAFE_INTEGER + 1,
        last_insert_rowid: null
      })
      const other = yield* invalid.make
      assert.strictEqual((yield* Effect.result(other`SELECT 1`))._tag, "Failure")
      assert.strictEqual(invalid.requests[1].body.requests[0].type, "close")
    }))

  it.effect("bounds reserved connection cleanup while an independent request holds its lock", () =>
    Effect.gen(function*() {
      const started = yield* Deferred.make<void>()
      const http = HttpClient.make((request) =>
        Effect.gen(function*() {
          const body = JSON.parse(new TextDecoder().decode((request.body as any).body))
          if (body.requests[0].stmt?.sql === "SELECT hold") {
            yield* Deferred.succeed(started, undefined)
            return yield* Effect.never
          }
          return HttpClientResponse.fromWeb(
            request,
            new Response(JSON.stringify({
              baton: "session-baton",
              results: [{
                type: "ok",
                response: { type: "execute", result: { cols: [], rows: [], affected_row_count: 0 } }
              }]
            }))
          )
        })
      )
      const sql = yield* LibsqlClient.make({ url: "https://database.example" }).pipe(
        Effect.provideService(HttpClient.HttpClient, http),
        Effect.provide(Reactivity.layer)
      )
      const lease = yield* Scope.make()
      const connection = yield* Scope.provide(sql.reserve, lease)
      yield* connection.execute("SELECT 1", [], undefined)
      const pending = yield* Effect.forkChild(connection.execute("SELECT hold", [], undefined))
      yield* Deferred.await(started)
      const closing = yield* Effect.forkChild(Scope.close(lease, Exit.void))
      yield* TestClock.adjust("5 seconds")
      yield* Fiber.join(closing)
      assert.strictEqual(
        (yield* Effect.flip(connection.execute("SELECT 2", [], undefined))).reason.operation,
        "protocol"
      )
      yield* Fiber.interrupt(pending)
    }))

  it.effect("retires reserved sessions interrupted after dispatch instead of reusing an uncertain baton", () =>
    Effect.gen(function*() {
      const started = yield* Deferred.make<void>()
      const requests: Array<{ baton: string | null; query: string }> = []
      let interruptedSignal: AbortSignal | undefined
      const http = HttpClient.make((request, _url, signal) =>
        Effect.gen(function*() {
          const body = JSON.parse(new TextDecoder().decode((request.body as any).body))
          const query = body.requests[0].stmt?.sql ?? "close"
          requests.push({ baton: body.baton, query })
          if (query === "SELECT interrupted") {
            interruptedSignal = signal
            yield* Deferred.succeed(started, undefined)
            return yield* Effect.never
          }
          return HttpClientResponse.fromWeb(
            request,
            new Response(JSON.stringify({
              baton: query === "close" ? null : "known-baton",
              results: [{
                type: "ok",
                response: query === "close"
                  ? { type: "close" }
                  : { type: "execute", result: { cols: [], rows: [], affected_row_count: 0 } }
              }]
            }))
          )
        })
      )
      const sql = yield* LibsqlClient.make({ url: "https://database.example" }).pipe(
        Effect.provideService(HttpClient.HttpClient, http),
        Effect.provide(Reactivity.layer)
      )
      const lease = yield* Scope.make()
      const connection = yield* Scope.provide(sql.reserve, lease)
      yield* connection.execute("BEGIN IMMEDIATE", [], undefined)
      const pending = yield* Effect.forkChild(connection.execute("SELECT interrupted", [], undefined))
      yield* Deferred.await(started)
      yield* Fiber.interrupt(pending)
      assert.isTrue(interruptedSignal!.aborted)
      const error = yield* Effect.flip(connection.execute("SELECT after interruption", [], undefined))
      assert.strictEqual(error.reason.operation, "protocol")
      assert.strictEqual(requests.length, 2)
      yield* Scope.close(lease, Exit.void)
      assert.deepStrictEqual(requests[2], { baton: "known-baton", query: "close" })
    }))

  it.effect("keeps reserved sessions reusable after a confirmed SQL failure", () =>
    Effect.gen(function*() {
      const batons: Array<string | null> = []
      const http = HttpClient.make((request) =>
        Effect.sync(() => {
          const body = JSON.parse(new TextDecoder().decode((request.body as any).body))
          batons.push(body.baton)
          const query = body.requests[0].stmt?.sql
          return HttpClientResponse.fromWeb(
            request,
            new Response(JSON.stringify({
              baton: "confirmed-baton",
              results: [
                query === "SELECT invalid"
                  ? { type: "error", error: { code: "SQL_PARSE_ERROR", message: "invalid SQL" } }
                  : { type: "ok", response: { type: "execute", result: { cols: [], rows: [], affected_row_count: 0 } } }
              ]
            }))
          )
        })
      )
      const sql = yield* LibsqlClient.make({ url: "https://database.example" }).pipe(
        Effect.provideService(HttpClient.HttpClient, http),
        Effect.provide(Reactivity.layer)
      )
      const connection = yield* sql.reserve
      assert.strictEqual(
        (yield* Effect.flip(connection.execute("SELECT invalid", [], undefined))).reason._tag,
        "SqlSyntaxError"
      )
      yield* connection.execute("SELECT valid", [], undefined)
      assert.deepStrictEqual(batons, [null, "confirmed-baton"])
    }))

  it.effect("does not dispatch a queued reserved query after its scope closes", () =>
    Effect.gen(function*() {
      const started = yield* Deferred.make<void>()
      const release = yield* Deferred.make<void>()
      const requests: Array<string> = []
      const http = HttpClient.make((request) =>
        Effect.gen(function*() {
          const body = JSON.parse(new TextDecoder().decode((request.body as any).body))
          const query = body.requests[0].stmt?.sql ?? "close"
          requests.push(query)
          if (query === "SELECT hold") {
            yield* Deferred.succeed(started, undefined)
            yield* Deferred.await(release)
          }
          return HttpClientResponse.fromWeb(
            request,
            new Response(JSON.stringify({
              baton: query === "close" ? null : "known-baton",
              results: [{
                type: "ok",
                response: query === "close"
                  ? { type: "close" }
                  : { type: "execute", result: { cols: [], rows: [], affected_row_count: 0 } }
              }]
            }))
          )
        })
      )
      const sql = yield* LibsqlClient.make({ url: "https://database.example", concurrency: 1 }).pipe(
        Effect.provideService(HttpClient.HttpClient, http),
        Effect.provide(Reactivity.layer)
      )
      const first = yield* sql.reserve
      const lease = yield* Scope.make()
      const second = yield* Scope.provide(sql.reserve, lease)
      const holding = yield* Effect.forkChild(first.execute("SELECT hold", [], undefined))
      yield* Deferred.await(started)
      const queued = yield* Effect.forkChild(Effect.result(second.execute("SELECT queued", [], undefined)))
      yield* Effect.yieldNow
      const closing = yield* Effect.forkChild(Scope.close(lease, Exit.void))
      yield* TestClock.adjust("5 seconds")
      yield* Fiber.join(closing)
      yield* Deferred.succeed(release, undefined)
      yield* Fiber.join(holding)
      assert.strictEqual((yield* Fiber.join(queued))._tag, "Failure")
      assert.deepStrictEqual(requests, ["SELECT hold"])
    }))
})
