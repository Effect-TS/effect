import { assert, describe, it } from "@effect/vitest"
import { Effect, Stream } from "effect"
import { HttpClientRequest, HttpEffect, HttpServerRequest } from "effect/http"

const payload = "hello"
const fromClient = () =>
  HttpServerRequest.fromClientRequest(
    HttpClientRequest.post("http://localhost/upload").pipe(
      HttpClientRequest.setHeader("x-test", "headers-only"),
      HttpClientRequest.bodyStream(Stream.succeed(new TextEncoder().encode(payload)), { contentType: "text/plain" })
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

describe("request body", () => {
  for (const [adapter, makeRequest] of [["web", fromWeb], ["client", fromClient]] as const) {
    it.effect(`${adapter}: caches text through modify`, () =>
      Effect.gen(function*() {
        const request = makeRequest()
        assert.strictEqual(yield* request.text, payload)
        assert.strictEqual(yield* request.modify({ url: "/copy" }).text, payload)
      }))
  }

  it.effect("fromWebHandler can inspect headers without reading the body", () =>
    Effect.gen(function*() {
      const request = fromClient()
      const response = yield* HttpEffect.fromWebHandler(async (web) => {
        assert.strictEqual(web.headers.get("x-test"), "headers-only")
        return new Response(null, { status: 204 })
      }).pipe(Effect.provideService(HttpServerRequest.HttpServerRequest, request))
      assert.strictEqual(response.status, 204)
      assert.strictEqual(yield* request.text, payload)
    }))
})
