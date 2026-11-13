import * as Protocol from "@effect/sql-trino/internal/protocol"
import { assert, describe, it } from "@effect/vitest"
import { Deferred, Duration, Effect, Fiber, Redacted, Result, Schedule, Stream } from "effect"
import * as Headers from "effect/http/Headers"
import * as HttpClient from "effect/http/HttpClient"
import { HttpClientError, TransportError } from "effect/http/HttpClientError"
import type * as HttpClientRequest from "effect/http/HttpClientRequest"
import * as HttpClientResponse from "effect/http/HttpClientResponse"
import { TestClock } from "effect/testing"

const BASE = "http://trino.test:8080"

interface Exchange {
  readonly method: string
  readonly url: string
  readonly headers: Readonly<Record<string, string>>
  readonly body: string
}

interface Reply {
  readonly status?: number
  readonly headers?: Record<string, string>
  readonly body: string
}

type Answer = Reply | "pending" | "transport" | Effect.Effect<Reply>

const respond = (request: HttpClientRequest.HttpClientRequest, reply: Reply) =>
  HttpClientResponse.fromWeb(
    request,
    new Response(reply.status === 204 ? null : reply.body, {
      status: reply.status ?? 200,
      headers: { "content-type": "application/json", ...reply.headers }
    })
  )

/** A scripted coordinator recording every request. */
const coordinator = (answer: (exchange: Exchange, log: ReadonlyArray<Exchange>) => Answer) => {
  const log: Array<Exchange> = []
  const http = HttpClient.make((request, url) => {
    const exchange: Exchange = {
      method: request.method,
      url: url.toString(),
      headers: { ...request.headers },
      body: request.body._tag === "Uint8Array" ? new TextDecoder().decode(request.body.body) : ""
    }
    log.push(exchange)
    const reply = answer(exchange, log)
    if (reply === "pending") return Effect.never
    if (reply === "transport") {
      return Effect.fail(new HttpClientError({ reason: new TransportError({ request, cause: "connection reset" }) }))
    }
    return Effect.isEffect(reply)
      ? Effect.map(reply, (r) => respond(request, r))
      : Effect.succeed(respond(request, reply))
  })
  return { http, log }
}

const config = (overrides: Partial<Protocol.ProtocolConfig> = {}): Protocol.ProtocolConfig => ({
  url: new URL(BASE),
  user: "alice",
  auth: { _tag: "None" },
  source: "effect-sql-trino",
  clientInfo: undefined,
  clientTags: [],
  traceToken: undefined,
  language: undefined,
  clientCapabilities: ["PATH", "PARAMETRIC_DATETIME", "SESSION_AUTHORIZATION"],
  resourceEstimates: new Map(),
  extraCredentials: new Map(),
  encodings: [],
  retry: Schedule.recurs(3),
  resumeWindow: Duration.minutes(1),
  cancelTimeout: Duration.seconds(5),
  ...overrides
})

const stats = (state: string) => `{"state":"${state}"}`
const queuedUri = (id: string) => `${BASE}/v1/statement/queued/${id}/y1/1`
const executingUri = (id: string, token: number) => `${BASE}/v1/statement/executing/${id}/y${token}/${token}`

const queued = (id: string) =>
  `{"id":"${id}","infoUri":"${BASE}/ui/${id}","nextUri":"${queuedUri(id)}","stats":${stats("QUEUED")}}`

const page = (id: string, options: { next?: string; columns?: string; data?: string; extra?: string } = {}) =>
  `{"id":"${id}","infoUri":"${BASE}/ui/${id}"${options.next === undefined ? "" : `,"nextUri":"${options.next}"`}${
    options.columns === undefined ? "" : `,"columns":${options.columns}`
  }${options.data === undefined ? "" : `,"data":${options.data}`},"stats":${
    stats(options.next === undefined ? "FINISHED" : "RUNNING")
  }${options.extra ?? ""}}`

const bigintColumn = `[{"name":"n","type":"bigint","typeSignature":{"rawType":"bigint","arguments":[]}}]`

const failed = (id: string, errorName: string) =>
  page(id, {
    extra:
      `,"error":{"message":"boom","errorCode":65541,"errorName":"${errorName}","errorType":"INTERNAL_ERROR","errorLocation":{"lineNumber":1,"columnNumber":8}}`
  })

const run = (
  http: HttpClient.HttpClient,
  overrides: Partial<Protocol.ProtocolConfig> = {},
  session = Protocol.emptySession
) => {
  const settings = config(overrides)
  return Protocol.execute({
    transport: Protocol.makeTransport(http, settings),
    config: settings,
    session,
    statement: "SELECT n FROM t"
  })
}

const header = (exchange: Exchange | undefined, name: string) => exchange?.headers[name.toLowerCase()]

describe("statementHeaders", () => {
  it("renders the whole session, form-encoding values", () => {
    const session: Protocol.Session = {
      ...Protocol.emptySession,
      catalog: "hive",
      schema: "web",
      path: "hive.web",
      timeZone: "Europe/Paris",
      authorizationUser: "bob",
      properties: new Map([["query_max_run_time", "1h"], ["hive.note", "a,b=c d+e"]]),
      roles: new Map([["system", { type: "ROLE", role: "admin" }], ["hive", { type: "ALL", role: undefined }]]),
      originalRoles: new Map([["system", { type: "ROLE", role: "analyst" }]]),
      preparedStatements: new Map([["my stmt", "SELECT ?, 'a,b'"]]),
      transactionId: undefined
    }
    const headers = Protocol.statementHeaders(
      config({
        auth: { _tag: "Basic", password: Redacted.make("secret") },
        clientTags: ["etl", "nightly"],
        clientInfo: "tests",
        traceToken: "trace-1",
        language: "en-US",
        resourceEstimates: new Map([["EXECUTION_TIME", "1h"]]),
        extraCredentials: new Map([["token", Redacted.make("x=y")]]),
        encodings: ["json+zstd", "json"]
      }),
      session
    )
    assert.isTrue(Result.isSuccess(headers))
    if (Result.isFailure(headers)) return
    assert.deepStrictEqual(headers.success, {
      "X-Trino-User": "bob",
      "X-Trino-Original-User": "alice",
      "X-Trino-Source": "effect-sql-trino",
      "X-Trino-Client-Info": "tests",
      "X-Trino-Trace-Token": "trace-1",
      "X-Trino-Language": "en-US",
      "X-Trino-Client-Tags": "etl,nightly",
      "X-Trino-Client-Capabilities": "PATH,PARAMETRIC_DATETIME,SESSION_AUTHORIZATION",
      "X-Trino-Query-Data-Encoding": "json+zstd,json",
      "X-Trino-Resource-Estimate": "EXECUTION_TIME=1h",
      "X-Trino-Extra-Credential": "token=x%3Dy",
      "X-Trino-Catalog": "hive",
      "X-Trino-Schema": "web",
      "X-Trino-Path": "hive.web",
      "X-Trino-Time-Zone": "Europe/Paris",
      "X-Trino-Session": "query_max_run_time=1h,hive.note=a%2Cb%3Dc%20d%2Be",
      "X-Trino-Role": "system=ROLE%7Badmin%7D,hive=ALL",
      "X-Trino-Original-Roles": "ROLE{analyst}",
      "X-Trino-Prepared-Statement": "my%20stmt=SELECT%20%3F%2C%20'a%2Cb'",
      "X-Trino-Transaction-Id": "NONE"
    })
  })

  it("sends the transaction id once a transaction started", () => {
    const headers = Protocol.statementHeaders(config(), { ...Protocol.emptySession, transactionId: "tx-1" })
    assert.strictEqual(Result.isSuccess(headers) ? headers.success["X-Trino-Transaction-Id"] : undefined, "tx-1")
  })

  it("refuses what the server would reject or mis-split", () => {
    assert.isTrue(Result.isFailure(Protocol.statementHeaders(config(), { ...Protocol.emptySession, schema: "web" })))
    assert.isTrue(
      Result.isFailure(
        Protocol.statementHeaders(config(), { ...Protocol.emptySession, properties: new Map([["a=b", "1"]]) })
      )
    )
    assert.isTrue(Result.isFailure(Protocol.statementHeaders(config({ clientTags: ["a,b"] }), Protocol.emptySession)))
  })
})

describe("credentials", () => {
  it("refuses a user that basic authentication cannot carry and a token that is not a header value", () => {
    assert.isTrue(Result.isSuccess(Protocol.validateAuth(config())))
    assert.isTrue(
      Result.isSuccess(
        Protocol.validateAuth(config({ auth: { _tag: "Basic", password: Redacted.make("p") } }))
      )
    )
    assert.isTrue(
      Result.isFailure(
        Protocol.validateAuth(config({ user: "a:b", auth: { _tag: "Basic", password: Redacted.make("p") } }))
      )
    )
    assert.isTrue(
      Result.isFailure(Protocol.validateAuth(config({ auth: { _tag: "Bearer", token: Redacted.make("a b") } })))
    )
  })

  it.effect("authenticates coordinator and keep-alive requests, never segment requests", () =>
    Effect.gen(function*() {
      const { http, log } = coordinator(() => ({ body: "{}" }))
      const settings = config({ auth: { _tag: "Basic", password: Redacted.make("secret") } })
      const transport = Protocol.makeTransport(http, settings)
      yield* transport.coordinator.get(`${BASE}/v1/info`)
      yield* transport.heartbeat.head(`${BASE}/v1/statement/queued/q1/y1/1`)
      yield* transport.segments.get("http://storage.test/segment")
      const [info, head, segment] = log
      assert.strictEqual(header(info, "Authorization"), `Basic ${btoa("alice:secret")}`)
      assert.strictEqual(header(info, "User-Agent"), "effect-sql-trino")
      assert.strictEqual(header(info, "Accept"), "application/json")
      assert.strictEqual(header(head, "Authorization"), `Basic ${btoa("alice:secret")}`)
      assert.isUndefined(header(segment, "Authorization"))
      assert.isUndefined(header(segment, "User-Agent"))

      const bearer = Protocol.makeTransport(http, config({ auth: { _tag: "Bearer", token: Redacted.make("jwt") } }))
      yield* bearer.coordinator.get(`${BASE}/v1/info`)
      assert.strictEqual(header(log[3], "Authorization"), "Bearer jwt")
    }))

  it.effect("never retries a keep-alive", () =>
    Effect.gen(function*() {
      const { http, log } = coordinator(() => ({ status: 503, body: "" }))
      const transport = Protocol.makeTransport(http, config())
      const response = yield* transport.heartbeat.head(`${BASE}/v1/statement/queued/q1/y1/1`)
      assert.strictEqual(response.status, 503)
      assert.strictEqual(log.length, 1)
    }))
})

describe("sessionDelta", () => {
  const fold = (headers: Record<string, string>, session = Protocol.emptySession) => {
    const delta = Protocol.sessionDelta(Headers.fromInput(headers))
    assert.isTrue(Result.isSuccess(delta))
    return Result.isSuccess(delta) ? delta.success.apply(session) : session
  }

  it("folds every session header, decoding form-encoded values", () => {
    const session = fold({
      "x-trino-set-catalog": "iceberg",
      "x-trino-set-schema": "sales",
      "x-trino-set-path": "iceberg.sales",
      "x-trino-set-session": "a=1, b=x%2Cy+z",
      "x-trino-set-role": "system=ROLE%7Badmin%7D, iceberg=NONE",
      "x-trino-added-prepare": "my+stmt=SELECT+%3F, other=%24zstd%3Aabc",
      "x-trino-started-transaction-id": "tx-9"
    }, { ...Protocol.emptySession, properties: new Map([["old", "v"]]) })
    assert.strictEqual(session.catalog, "iceberg")
    assert.strictEqual(session.schema, "sales")
    assert.strictEqual(session.path, "iceberg.sales")
    assert.deepStrictEqual([...session.properties], [["old", "v"], ["a", "1"], ["b", "x,y z"]])
    assert.deepStrictEqual([...session.roles], [["system", { type: "ROLE", role: "admin" }], [
      "iceberg",
      { type: "NONE", role: undefined }
    ]])
    assert.deepStrictEqual([...session.preparedStatements], [["my stmt", "SELECT ?"], ["other", "$zstd:abc"]])
    assert.strictEqual(session.transactionId, "tx-9")
  })

  it("clears properties, prepared statements and the transaction", () => {
    const session = fold({
      "x-trino-clear-session": "a",
      "x-trino-deallocated-prepare": "my+stmt",
      "x-trino-clear-transaction-id": "true"
    }, {
      ...Protocol.emptySession,
      properties: new Map([["a", "1"], ["b", "2"]]),
      preparedStatements: new Map([["my stmt", "SELECT 1"]]),
      transactionId: "tx-9"
    })
    assert.deepStrictEqual([...session.properties], [["b", "2"]])
    assert.strictEqual(session.preparedStatements.size, 0)
    assert.isUndefined(session.transactionId)
  })

  it("switches and resets the authorization user", () => {
    const before: Protocol.Session = {
      ...Protocol.emptySession,
      roles: new Map([["system", { type: "ALL", role: undefined }]])
    }
    const switched = fold({
      "x-trino-set-authorization-user": "bob",
      "x-trino-set-original-roles": "ROLE{analyst}"
    }, before)
    assert.strictEqual(switched.authorizationUser, "bob")
    assert.strictEqual(switched.roles.size, 0)
    assert.deepStrictEqual(switched.originalRoles.get("system"), { type: "ROLE", role: "analyst" })
    const reset = fold({ "x-trino-reset-authorization-user": "true" }, switched)
    assert.isUndefined(reset.authorizationUser)
    assert.strictEqual(reset.originalRoles.size, 0)
  })

  it("rejects malformed entries", () => {
    assert.isTrue(
      Result.isFailure(Protocol.sessionDelta(Headers.fromInput({ "x-trino-set-session": "novalue" })))
    )
    assert.isTrue(
      Result.isFailure(Protocol.sessionDelta(Headers.fromInput({ "x-trino-set-role": "system=bogus" })))
    )
  })
})

describe("execute", () => {
  it.effect("posts, follows nextUri through QUEUED and RUNNING, and finishes", () =>
    Effect.gen(function*() {
      const { http, log } = coordinator((exchange) => {
        if (exchange.method === "POST") return { body: queued("q1") }
        if (exchange.url === queuedUri("q1")) {
          return { body: page("q1", { next: executingUri("q1", 1) }) }
        }
        if (exchange.url === executingUri("q1", 1)) {
          return {
            body: page("q1", { next: executingUri("q1", 2), columns: bigintColumn, data: "[[9007199254740993],[2]]" }),
            headers: { "x-trino-set-session": "a=1" }
          }
        }
        return {
          body: page("q1", {
            extra:
              `,"updateType":"INSERT","updateCount":9007199254740993,"warnings":[{"warningCode":{"code":1,"name":"DEPRECATED"},"message":"old"}]`
          }),
          headers: { "x-trino-set-session": "a=1", "x-trino-set-schema": "web" }
        }
      })
      const events = yield* Stream.runCollect(run(http))
      assert.deepStrictEqual(events.map((event) => event._tag), ["Started", "Columns", "Rows", "Finished"])

      const post = log[0]
      assert.strictEqual(post.method, "POST")
      assert.strictEqual(post.url, `${BASE}/v1/statement`)
      assert.strictEqual(post.body, "SELECT n FROM t")
      assert.strictEqual(header(post, "content-type"), "text/plain; charset=utf-8")
      assert.strictEqual(header(post, "X-Trino-Transaction-Id"), "NONE")
      assert.deepStrictEqual(log.slice(1).map((exchange) => exchange.url), [
        queuedUri("q1"),
        executingUri("q1", 1),
        executingUri("q1", 2)
      ])
      assert.isUndefined(header(log[1], "X-Trino-Session"))
      assert.strictEqual(header(log[1], "X-Trino-User"), "alice")

      const finished = events[3]
      assert.strictEqual(finished._tag, "Finished")
      if (finished._tag !== "Finished") return
      assert.strictEqual(finished.result.queryId, "q1")
      assert.strictEqual(finished.result.updateType, "INSERT")
      assert.strictEqual(finished.result.updateCount, 9007199254740993n)
      assert.deepStrictEqual(finished.result.warnings, [{ code: "DEPRECATED", message: "old" }])
      const session = finished.result.delta.apply(Protocol.emptySession)
      assert.deepStrictEqual([...session.properties], [["a", "1"]])
      assert.strictEqual(session.schema, "web")

      const columns = events[1]
      assert.deepStrictEqual(columns._tag === "Columns" ? columns.columns[0].typeSignature : undefined, {
        rawType: "bigint",
        arguments: []
      })
    }))

  it.effect("keeps a gateway path prefix", () =>
    Effect.gen(function*() {
      const { http, log } = coordinator(() => ({ body: page("q1") }))
      yield* Stream.runDrain(run(http, { url: new URL(`${BASE}/trino/`) }))
      assert.strictEqual(log[0].url, `${BASE}/trino/v1/statement`)
    }))

  it.effect("parses spooled segments", () =>
    Effect.gen(function*() {
      const data =
        `{"encoding":"json+zstd","segments":[{"type":"inline","data":"W1sxXV0=","metadata":{"rowOffset":0,"rowsCount":1,"segmentSize":5}},{"type":"spooled","uri":"https://s3/seg","ackUri":"${BASE}/v1/spooled/ack/x","headers":{"x-amz-key":["k"]},"metadata":{"rowOffset":1,"rowsCount":9,"segmentSize":42,"uncompressedSize":90}}]}`
      const { http } = coordinator(() => ({ body: page("q1", { columns: bigintColumn, data }) }))
      const events = yield* Stream.runCollect(run(http))
      const segments = events.find((event) => event._tag === "Segments")
      assert.isDefined(segments)
      if (segments?._tag !== "Segments") return
      assert.strictEqual(segments.encoding, "json+zstd")
      assert.deepStrictEqual(segments.segments.map((segment) => segment.type), ["inline", "spooled"])
      assert.strictEqual(segments.segments[0].data, "W1sxXV0=")
      assert.strictEqual(segments.segments[1].uri, "https://s3/seg")
      assert.deepStrictEqual([...segments.segments[1].headers], [["x-amz-key", ["k"]]])
    }))

  it.effect("fails with QueryFailed when the server reports an error", () =>
    Effect.gen(function*() {
      const { http, log } = coordinator((exchange) =>
        exchange.method === "POST" ? { body: queued("q1") } : { body: failed("q1", "SYNTAX_ERROR") }
      )
      const error = yield* Stream.runDrain(run(http)).pipe(Effect.flip)
      assert.strictEqual(error._tag, "QueryFailed")
      if (error._tag !== "QueryFailed") return
      assert.strictEqual(error.error.errorName, "SYNTAX_ERROR")
      assert.deepStrictEqual(error.error.errorLocation, { lineNumber: 1, columnNumber: 8 })
      assert.isFalse(log.some((exchange) => exchange.method === "DELETE"))
    }))

  it.effect("a failed COMMIT carries the delta that clears the transaction", () =>
    Effect.gen(function*() {
      const { http } = coordinator((exchange) =>
        exchange.method === "POST"
          ? { body: queued("q1") }
          : { body: failed("q1", "TRANSACTION_CONFLICT"), headers: { "x-trino-clear-transaction-id": "true" } }
      )
      const error = yield* Stream.runDrain(
        Protocol.execute({
          transport: Protocol.makeTransport(http, config()),
          config: config(),
          session: { ...Protocol.emptySession, transactionId: "tx-1" },
          statement: "COMMIT"
        })
      ).pipe(Effect.flip)
      assert.strictEqual(error._tag, "QueryFailed")
      if (error._tag !== "QueryFailed") return
      assert.isDefined(error.delta)
      const session = error.delta?.apply({ ...Protocol.emptySession, transactionId: "tx-1" })
      assert.isUndefined(session?.transactionId)
    }))

  it.effect("retries 503 and transport failures on the same nextUri", () =>
    Effect.gen(function*() {
      let gets = 0
      const { http, log } = coordinator((exchange) => {
        if (exchange.method === "POST") return { body: queued("q1") }
        gets++
        if (gets === 1) return { status: 503, body: "busy" }
        if (gets === 2) return "transport"
        return { body: page("q1") }
      })
      yield* Stream.runDrain(run(http))
      assert.deepStrictEqual(log.slice(1).map((exchange) => exchange.url), [
        queuedUri("q1"),
        queuedUri("q1"),
        queuedUri("q1")
      ])
    }))

  it.effect("waits for Retry-After on 429", () =>
    Effect.gen(function*() {
      let posts = 0
      const { http, log } = coordinator(() =>
        ++posts === 1 ? { status: 429, headers: { "retry-after": "5" }, body: "" } : { body: page("q1") }
      )
      const fiber = yield* Stream.runDrain(run(http)).pipe(Effect.forkChild({ startImmediately: true }))
      yield* TestClock.adjust("4 seconds")
      assert.strictEqual(log.length, 1)
      yield* TestClock.adjust("1 second")
      yield* Fiber.join(fiber)
      assert.strictEqual(log.length, 2)
    }))

  it.effect("retries an empty 200 body", () =>
    Effect.gen(function*() {
      let posts = 0
      const { http, log } = coordinator(() => ++posts === 1 ? { body: "" } : { body: page("q1") })
      yield* Stream.runDrain(run(http))
      assert.strictEqual(log.length, 2)
    }))

  it.effect("does not retry 401", () =>
    Effect.gen(function*() {
      const { http, log } = coordinator(() => ({ status: 401, body: "Unauthorized" }))
      const error = yield* Stream.runDrain(run(http)).pipe(Effect.flip)
      assert.strictEqual(error._tag, "HttpStatusFailure")
      assert.strictEqual(error._tag === "HttpStatusFailure" ? error.status : undefined, 401)
      assert.strictEqual(log.length, 1)
    }))

  it.effect("does not retry 500 or 408: the coordinator answers them for failures a repeat would not cure", () =>
    Effect.gen(function*() {
      for (const status of [500, 408]) {
        const { http, log } = coordinator(() => ({ status, body: "failed" }))
        const error = yield* Stream.runDrain(run(http)).pipe(Effect.flip)
        assert.strictEqual(error._tag === "HttpStatusFailure" ? error.status : undefined, status)
        assert.strictEqual(log.length, 1)
      }
    }))

  it.effect("gives up after the retry schedule", () =>
    Effect.gen(function*() {
      const { http, log } = coordinator(() => ({ status: 502, body: "bad gateway" }))
      const error = yield* Stream.runDrain(run(http, { retry: Schedule.recurs(2) })).pipe(Effect.flip)
      assert.strictEqual(error._tag, "HttpStatusFailure")
      assert.strictEqual(log.length, 3)
    }))

  it.effect("DELETEs the current nextUri when the consumer stops early", () =>
    Effect.gen(function*() {
      const { http, log } = coordinator((exchange) => {
        if (exchange.method === "POST") return { body: queued("q1") }
        if (exchange.method === "DELETE") return { status: 204, body: "" }
        return { body: page("q1", { next: executingUri("q1", 1), columns: bigintColumn, data: "[[1]]" }) }
      })
      const events = yield* Stream.runCollect(run(http).pipe(Stream.take(3)))
      assert.deepStrictEqual(events.map((event) => event._tag), ["Started", "Columns", "Rows"])
      const deletes = log.filter((exchange) => exchange.method === "DELETE")
      assert.deepStrictEqual(deletes.map((exchange) => exchange.url), [executingUri("q1", 1)])
      assert.strictEqual(header(deletes[0], "X-Trino-User"), "alice")
    }))

  it.effect("retries a cancel DELETE refused by a proxy", () =>
    Effect.gen(function*() {
      let deletes = 0
      const { http, log } = coordinator((exchange) => {
        if (exchange.method === "POST") return { body: queued("q1") }
        if (exchange.method === "DELETE") return ++deletes === 1 ? { status: 503, body: "" } : { status: 204, body: "" }
        return { body: page("q1", { next: executingUri("q1", 1), columns: bigintColumn, data: "[[1]]" }) }
      })
      yield* Stream.runDrain(run(http).pipe(Stream.take(3)))
      assert.deepStrictEqual(
        log.filter((exchange) => exchange.method === "DELETE").map((exchange) => exchange.url),
        [executingUri("q1", 1), executingUri("q1", 1)]
      )
    }))

  it.effect("DELETEs on interruption while a GET is pending", () =>
    Effect.gen(function*() {
      const { http, log } = coordinator((exchange) => {
        if (exchange.method === "POST") return { body: queued("q1") }
        if (exchange.method === "DELETE") return { status: 204, body: "" }
        return "pending"
      })
      const fiber = yield* Stream.runDrain(run(http)).pipe(Effect.forkChild({ startImmediately: true }))
      yield* Effect.yieldNow
      yield* Fiber.interrupt(fiber)
      assert.deepStrictEqual(
        log.filter((exchange) => exchange.method === "DELETE").map((exchange) => exchange.url),
        [queuedUri("q1")]
      )
    }))

  it.effect("cancels a statement interrupted before the first response", () =>
    Effect.gen(function*() {
      const postReply = yield* Deferred.make<Reply>()
      const { http, log } = coordinator((exchange) => {
        if (exchange.method === "POST") return Deferred.await(postReply)
        if (exchange.method === "DELETE") return { status: 204, body: "" }
        return "pending"
      })
      const fiber = yield* Stream.runDrain(run(http)).pipe(Effect.forkChild({ startImmediately: true }))
      yield* Effect.yieldNow
      assert.strictEqual(log.length, 1)
      const interrupted = yield* Fiber.interrupt(fiber).pipe(Effect.forkChild({ startImmediately: true }))
      yield* Effect.yieldNow
      yield* Deferred.succeed(postReply, { body: queued("q1") })
      yield* Fiber.join(interrupted)
      assert.deepStrictEqual(log.map((exchange) => exchange.method), ["POST", "DELETE"])
      assert.strictEqual(log[1].url, queuedUri("q1"))
    }))

  it.effect("resubmits on NO_NODES_AVAILABLE inside the resume window", () =>
    Effect.gen(function*() {
      let posts = 0
      const { http, log } = coordinator((exchange) => {
        if (exchange.method === "POST") return { body: queued(`q${++posts}`) }
        return exchange.url === queuedUri("q1") ? { body: failed("q1", "NO_NODES_AVAILABLE") } : { body: page("q2") }
      })
      const fiber = yield* Stream.runCollect(run(http)).pipe(Effect.forkChild({ startImmediately: true }))
      yield* TestClock.adjust("1 second")
      const events = yield* Fiber.join(fiber)
      assert.deepStrictEqual(events.map((event) => event._tag), ["Started", "Started", "Finished"])
      assert.strictEqual(log.filter((exchange) => exchange.method === "POST").length, 2)
    }))

  it.effect("fails NO_NODES_AVAILABLE once the resume window is spent", () =>
    Effect.gen(function*() {
      const { http } = coordinator((exchange) =>
        exchange.method === "POST" ? { body: queued("q1") } : { body: failed("q1", "NO_NODES_AVAILABLE") }
      )
      const error = yield* Stream.runDrain(run(http, { resumeWindow: Duration.zero })).pipe(Effect.flip)
      assert.strictEqual(error._tag, "QueryFailed")
    }))

  it.effect("resubmits while the dispatcher has no workers", () =>
    Effect.gen(function*() {
      let posts = 0
      const { http, log } = coordinator((exchange) => {
        if (exchange.method === "POST") return { body: queued(`q${++posts}`) }
        return exchange.url === queuedUri("q1")
          ? {
            body: page("q1", {
              extra:
                `,"error":{"message":"Insufficient active worker nodes. Waited 1.00s for at least 1 workers, but only 0 workers are active","errorCode":131072,"errorName":"GENERIC_INSUFFICIENT_RESOURCES","errorType":"INSUFFICIENT_RESOURCES"}`
            })
          }
          : { body: page("q2") }
      })
      const fiber = yield* Stream.runDrain(run(http)).pipe(Effect.forkChild({ startImmediately: true }))
      yield* TestClock.adjust("1 second")
      yield* Fiber.join(fiber)
      assert.strictEqual(log.filter((exchange) => exchange.method === "POST").length, 2)
    }))

  it.effect("resubmits when Trino 476 finds no nodes for the catalog", () =>
    Effect.gen(function*() {
      let posts = 0
      const { http, log } = coordinator((exchange) => {
        if (exchange.method === "POST") return { body: queued(`q${++posts}`) }
        return exchange.url === queuedUri("q1")
          ? {
            body: page("q1", {
              extra:
                `,"error":{"message":"nodes is empty","errorCode":65536,"errorName":"GENERIC_INTERNAL_ERROR","errorType":"INTERNAL_ERROR"}`
            })
          }
          : { body: page("q2") }
      })
      const fiber = yield* Stream.runDrain(run(http)).pipe(Effect.forkChild({ startImmediately: true }))
      yield* TestClock.adjust("1 second")
      yield* Fiber.join(fiber)
      assert.strictEqual(log.filter((exchange) => exchange.method === "POST").length, 2)
    }))

  it.effect("does not resubmit a not-ready failure inside a transaction", () =>
    Effect.gen(function*() {
      const { http, log } = coordinator((exchange) =>
        exchange.method === "POST" ? { body: queued("q1") } : { body: failed("q1", "NO_NODES_AVAILABLE") }
      )
      const error = yield* Stream.runDrain(
        run(http, {}, { ...Protocol.emptySession, transactionId: "tx-1" })
      ).pipe(Effect.flip)
      assert.strictEqual(error._tag, "QueryFailed")
      assert.strictEqual(log.filter((exchange) => exchange.method === "POST").length, 1)
    }))

  it.effect("does not resubmit other internal errors", () =>
    Effect.gen(function*() {
      const { http, log } = coordinator((exchange) =>
        exchange.method === "POST"
          ? { body: queued("q1") }
          : {
            body: page("q1", {
              extra:
                `,"error":{"message":"Compiler failed","errorCode":65536,"errorName":"GENERIC_INTERNAL_ERROR","errorType":"INTERNAL_ERROR"}`
            })
          }
      )
      const error = yield* Stream.runDrain(run(http)).pipe(Effect.flip)
      assert.strictEqual(error._tag, "QueryFailed")
      assert.strictEqual(log.filter((exchange) => exchange.method === "POST").length, 1)
    }))

  it.effect("does not resubmit other insufficient-resource failures", () =>
    Effect.gen(function*() {
      const { http } = coordinator((exchange) =>
        exchange.method === "POST" ? { body: queued("q1") } : { body: failed("q1", "EXCEEDED_GLOBAL_MEMORY_LIMIT") }
      )
      const error = yield* Stream.runDrain(run(http)).pipe(Effect.flip)
      assert.strictEqual(error._tag, "QueryFailed")
    }))

  it.effect("refuses a nextUri on another origin and never requests it", () =>
    Effect.gen(function*() {
      const { http, log } = coordinator((exchange) =>
        exchange.method === "POST"
          ? { body: page("q1", { next: "http://attacker.test/v1/statement/executing/q1/y1/1" }) }
          : { body: page("q1") }
      )
      // A client that followed the link would poll on the test clock, so it is advanced to fail rather than hang.
      const fiber = yield* Stream.runDrain(run(http)).pipe(Effect.flip, Effect.forkChild({ startImmediately: true }))
      yield* TestClock.adjust("1 minute")
      assert.deepStrictEqual(log.map((exchange) => exchange.url), [`${BASE}/v1/statement`])
      const error = yield* Fiber.join(fiber)
      assert.strictEqual(error._tag, "ProtocolViolation")
    }))

  it.effect("refuses a nextUri that switches the scheme", () =>
    Effect.gen(function*() {
      const { http, log } = coordinator(() => ({ body: page("q1", { next: `https://trino.test:8080/v1/x` }) }))
      const error = yield* Stream.runDrain(run(http)).pipe(Effect.flip)
      assert.strictEqual(error._tag, "ProtocolViolation")
      assert.strictEqual(log.length, 1)
    }))

  it.effect("uses the configured heartbeat interval", () =>
    Effect.gen(function*() {
      const { http, log } = coordinator((exchange) => {
        if (exchange.method === "POST") {
          return { body: page("q1", { next: executingUri("q1", 1), columns: bigintColumn, data: "[[1]]" }) }
        }
        if (exchange.method === "HEAD") return { body: "" }
        return { body: page("q1") }
      })
      const fiber = yield* run(http, { heartbeatInterval: Duration.seconds(5) }).pipe(
        Stream.tap((event) => event._tag === "Rows" ? Effect.sleep("17 seconds") : Effect.void),
        Stream.runDrain,
        Effect.forkChild({ startImmediately: true })
      )
      yield* TestClock.adjust("17 seconds")
      yield* Fiber.join(fiber)
      assert.strictEqual(log.filter((exchange) => exchange.method === "HEAD").length, 3)
    }))

  it.effect("sends HEAD heartbeats while the consumer pauses", () =>
    Effect.gen(function*() {
      const { http, log } = coordinator((exchange) => {
        if (exchange.method === "POST") return { body: queued("q1") }
        if (exchange.url === queuedUri("q1")) {
          return { body: page("q1", { next: executingUri("q1", 1), columns: bigintColumn, data: "[[1]]" }) }
        }
        return { body: page("q1") }
      })
      const fiber = yield* run(http).pipe(
        Stream.tap((event) => event._tag === "Rows" ? Effect.sleep("45 seconds") : Effect.void),
        Stream.runDrain,
        Effect.forkChild({ startImmediately: true })
      )
      yield* TestClock.adjust("45 seconds")
      yield* Fiber.join(fiber)
      const heads = log.filter((exchange) => exchange.method === "HEAD")
      assert.deepStrictEqual(heads.map((exchange) => exchange.url), [executingUri("q1", 1)])
    }))
})

describe("serverInfo", () => {
  it.effect("reads the node version once the server started", () =>
    Effect.gen(function*() {
      const { http, log } = coordinator(() => ({
        body: `{"nodeVersion":{"version":"484"},"coordinator":true,"starting":false,"uptime":"1.00m"}`
      }))
      const info = yield* Protocol.serverInfo(Protocol.makeTransport(http, config()), config())
      assert.deepStrictEqual(info, { nodeVersion: "484", starting: false })
      assert.strictEqual(log[0].url, `${BASE}/v1/info`)
    }))

  it.effect("reports a server that is still starting", () =>
    Effect.gen(function*() {
      const { http } = coordinator(() => ({ body: `{"nodeVersion":{"version":"484"},"starting":true}` }))
      const info = yield* Protocol.serverInfo(Protocol.makeTransport(http, config()), config())
      assert.isTrue(info.starting)
    }))
})
