import { assert, describe, it } from "@effect/vitest"
import { Cause, Effect, Exit, Stream } from "effect"
import { HttpClient, HttpClientRequest, HttpClientResponse, HttpEffect, HttpServerRequest } from "effect/http"

const payload = "hello"
const bytes = new TextEncoder().encode(payload)
const fromClient = () =>
  HttpServerRequest.fromClientRequest(
    HttpClientRequest.post("http://localhost/upload").pipe(
      HttpClientRequest.setHeader("x-test", "headers-only"),
      HttpClientRequest.bodyStream(Stream.succeed(bytes), { contentType: "text/plain" })
    )
  )

const fromWeb = () =>
  HttpServerRequest.fromWeb(
    new Request("http://localhost/upload", {
      method: "POST",
      headers: { "x-test": "headers-only" },
      body: payload
    })
  )

const assertDefect = (exit: Exit.Exit<unknown, unknown>, message: RegExp) => {
  assert.isTrue(Exit.isFailure(exit), "body read must fail")
  if (Exit.isFailure(exit)) {
    assert.isTrue(Cause.hasDies(exit.cause), "body reuse must be a defect, not a typed parse error")
    assert.match(String(Cause.squash(exit.cause)), message)
  }
}

describe("request body consumption", () => {
  for (const [adapter, makeRequest] of [["web", fromWeb], ["client", fromClient]] as const) {
    it.effect(`${adapter}: caches text through modify but rejects a stream after a buffered read`, () =>
      Effect.gen(function*() {
        const request = makeRequest()
        assert.strictEqual(yield* request.text, payload)
        assert.strictEqual(yield* request.text, payload)
        assert.strictEqual(yield* request.modify({ url: "/copy" }).text, payload)
        assertDefect(yield* Effect.exit(Stream.runDrain(request.stream)), /middleware|already.*read/i)
      }))
  }

  it.effect("fromWebHandler can inspect headers without claiming the wrapped body", () =>
    Effect.gen(function*() {
      const request = fromClient()
      const response = yield* HttpEffect.fromWebHandler(async (web) => {
        assert.strictEqual(web.headers.get("x-test"), "headers-only")
        return new Response(null, { status: 204 })
      }).pipe(Effect.provideService(HttpServerRequest.HttpServerRequest, request))
      assert.strictEqual(response.status, 204)
      assert.strictEqual(yield* request.text, payload)
    }))

  it.effect("fromWebHandler accepts a consumed wrapped request, but its body errors with the consumed defect", () =>
    Effect.gen(function*() {
      const request = fromClient()
      yield* request.text
      const exit = yield* Effect.exit(Stream.runDrain(request.stream))
      assertDefect(exit, /middleware|already.*read/i)
      const response = yield* HttpEffect.fromWebHandler(async (web) => {
        const error = await web.text().then(() => undefined, (error: unknown) => error)
        assert.match(String(error), /middleware|already.*read/i)
        if (Exit.isFailure(exit)) {
          assert.strictEqual(String(error), String(Cause.squash(exit.cause)))
        }
        return new Response(null, { status: 204 })
      }).pipe(Effect.provideService(HttpServerRequest.HttpServerRequest, request))
      assert.strictEqual(response.status, 204)
    }))

  it.effect("toWeb returns the consumed original Request and leaves its native TypeError intact", () =>
    Effect.gen(function*() {
      const request = fromWeb()
      yield* request.text
      const web = yield* HttpServerRequest.toWeb(request)
      const error = yield* Effect.promise(() => web.text().then(() => undefined, (error: unknown) => error))
      assert.instanceOf(error, TypeError)
    }))

  it.effect("treats a web body read outside Effect as consumed", () =>
    Effect.gen(function*() {
      const source = new Request("http://localhost/upload", { method: "POST", body: payload })
      const request = HttpServerRequest.fromWeb(source)
      yield* Effect.promise(() => source.text())
      assertDefect(yield* Effect.exit(Stream.runDrain(request.stream)), /consum|already.*read|middleware/i)
    }))

  it.effect("a retried proxied upload cannot replay the incoming body", () =>
    Effect.gen(function*() {
      const request = HttpServerRequest.toClientRequest(fromClient())
      const client = HttpClient.make((outgoing) =>
        Effect.gen(function*() {
          assert.strictEqual(outgoing.body._tag, "Stream")
          if (outgoing.body._tag === "Stream") {
            yield* Stream.runDrain(outgoing.body.stream).pipe(Effect.orDie)
          }
          return HttpClientResponse.fromWeb(outgoing, new Response(null, { status: 503 }))
        })
      ).pipe(HttpClient.filterStatusOk, HttpClient.retry({ times: 1 }))
      assertDefect(yield* Effect.exit(client.execute(request)), /second|run.*again|already.*consum/i)
    }))
})
