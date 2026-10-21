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

describe("request body", () => {
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
