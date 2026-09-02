import { assert, describe, it } from "@effect/vitest"
import { Effect, Stream } from "effect"
import { FetchHttpClient, HttpClient, HttpClientRequest } from "effect/unstable/http"

describe("FetchHttpClient", () => {
  const url = "https://example.test/"
  // Validate the native fetch request contract without performing network I/O.
  const fetch: typeof globalThis.fetch = Object.assign(
    async (...args: Parameters<typeof globalThis.fetch>) => new Response(await new Request(...args).text()),
    { preconnect: () => {} }
  )

  for (
    const [name, makeRequest] of Object.entries({
      bodyText: () => HttpClientRequest.post(url).pipe(HttpClientRequest.bodyText("hello")),
      bodyStream: () =>
        HttpClientRequest.post(url).pipe(
          HttpClientRequest.bodyStream(Stream.succeed(new TextEncoder().encode("hello")))
        ),
      fromWeb: () => HttpClientRequest.fromWeb(new Request(url, { method: "POST", body: "hello" }))
    })
  ) {
    it.effect(`sends ${name} bodies`, () =>
      Effect.gen(function*() {
        const client = yield* HttpClient.HttpClient
        const response = yield* client.execute(makeRequest())
        assert.strictEqual(yield* response.text, "hello")
      }).pipe(
        Effect.provide(FetchHttpClient.layer),
        Effect.provideService(FetchHttpClient.Fetch, fetch)
      ))
  }

  it.effect("preserves fromWeb bodies through toWeb", () =>
    Effect.gen(function*() {
      const request = HttpClientRequest.fromWeb(new Request(url, { method: "POST", body: "hello" }))
      const webRequest = yield* HttpClientRequest.toWeb(request)
      assert.strictEqual(yield* Effect.promise(() => webRequest.text()), "hello")
    }))
})
