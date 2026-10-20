import { assert, describe, it } from "@effect/vitest"
import { Cause, Effect, Exit, Stream } from "effect"
import {
  HttpClient,
  HttpClientRequest,
  HttpClientResponse,
  HttpEffect,
  HttpServerError,
  HttpServerRequest
} from "effect/http"

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

const streamText = (request: HttpServerRequest.HttpServerRequest) =>
  Effect.map(Stream.mkUint8Array(request.stream), (bytes) => new TextDecoder().decode(bytes))

describe("request body", () => {
  for (const [adapter, makeRequest] of [["web", fromWeb], ["client", fromClient]] as const) {
    it.effect(`${adapter}: caches text through modify`, () =>
      Effect.gen(function*() {
        const request = makeRequest()
        assert.strictEqual(yield* request.text, payload)
        assert.strictEqual(yield* request.text, payload)
        assert.strictEqual(yield* request.modify({ url: "/copy" }).text, payload)
      }))
  }

  it.effect("web: a second stream completes with no bytes", () =>
    Effect.gen(function*() {
      const request = fromWeb()
      assert.strictEqual(yield* streamText(request), payload)
      assert.strictEqual(yield* streamText(request), "")
    }))

  it.effect("client: a second stream replays the body", () =>
    Effect.gen(function*() {
      const request = fromClient()
      assert.strictEqual(yield* streamText(request), payload)
      assert.strictEqual(yield* streamText(request), payload)
    }))

  it.effect("web: text after a stream fails with a typed RequestParseError", () =>
    Effect.gen(function*() {
      const request = fromWeb()
      yield* Stream.runDrain(request.stream)
      const exit = yield* Effect.exit(request.text)
      assert.isTrue(Exit.isFailure(exit))
      if (Exit.isFailure(exit)) {
        assert.isFalse(Cause.hasDies(exit.cause))
        const error = Cause.squash(exit.cause)
        assert.instanceOf(error, HttpServerError.HttpServerError)
        assert.instanceOf((error as HttpServerError.HttpServerError).reason, HttpServerError.RequestParseError)
      }
    }))

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

  it.effect("toWeb returns the consumed original Request and leaves its native TypeError intact", () =>
    Effect.gen(function*() {
      const request = fromWeb()
      yield* request.text
      const web = yield* HttpServerRequest.toWeb(request)
      const error = yield* Effect.promise(() => web.text().then(() => undefined, (error: unknown) => error))
      assert.instanceOf(error, TypeError)
    }))

  it.effect("a retried proxied upload resends the replayed client body", () =>
    Effect.gen(function*() {
      const request = HttpServerRequest.toClientRequest(fromClient())
      const received: Array<string> = []
      const client = HttpClient.make((outgoing) =>
        Effect.gen(function*() {
          assert.strictEqual(outgoing.body._tag, "Stream")
          if (outgoing.body._tag === "Stream") {
            const body = yield* Stream.mkUint8Array(outgoing.body.stream).pipe(Effect.orDie)
            received.push(new TextDecoder().decode(body))
          }
          return HttpClientResponse.fromWeb(outgoing, new Response(null, { status: received.length === 1 ? 503 : 200 }))
        })
      ).pipe(HttpClient.filterStatusOk, HttpClient.retry({ times: 1 }))
      const response = yield* client.execute(request)
      assert.strictEqual(response.status, 200)
      assert.deepStrictEqual(received, [payload, payload])
    }))
})
