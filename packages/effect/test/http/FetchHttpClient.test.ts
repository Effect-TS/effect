import { assert, describe, it } from "@effect/vitest"
import { Effect, Option, Stream } from "effect"
import { FetchHttpClient, HttpClient, HttpClientRequest, HttpClientResponse } from "effect/http"

describe("FetchHttpClient", () => {
  it.effect("sends bodies from Web requests", () =>
    Effect.gen(function*() {
      const request = HttpClientRequest.fromWeb(
        new Request("https://example.test/?existing=1#fragment", { method: "POST", body: "hello" })
      ).pipe(HttpClientRequest.setUrlParam("value", "a#b"))
      const client = yield* HttpClient.HttpClient
      const response = yield* client.execute(request)
      assert.strictEqual(response.url, "https://example.test/?existing=1&value=a%23b")
      assert.strictEqual(yield* response.text, "hello")
    }).pipe(
      Effect.provide(FetchHttpClient.layer),
      Effect.provideService(
        FetchHttpClient.Fetch,
        Object.assign(
          async (...args: Parameters<typeof globalThis.fetch>) => new Response(await new Request(...args).text()),
          { preconnect: () => {} }
        )
      )
    ))

  it.effect("exposes the original Web response body", () => {
    const source = new Response(new Uint8Array([1, 2, 3]))
    return Effect.gen(function*() {
      const response = yield* HttpClient.get("https://example.test/archive.tgz")
      const web = Option.getOrThrow(HttpClientResponse.toWeb(response))
      // Runtimes like workerd only accept the original body for known-length writes.
      assert.strictEqual(web.body, source.body)
      assert.deepStrictEqual(new Uint8Array(yield* Effect.promise(() => web.arrayBuffer())), new Uint8Array([1, 2, 3]))
    }).pipe(
      Effect.provide(FetchHttpClient.layer),
      Effect.provideService(
        FetchHttpClient.Fetch,
        Object.assign(async () => source, { preconnect: () => {} })
      )
    )
  })

  it.effect("exposes the original Web response body while streaming an upload", () => {
    const source = new Response("done")
    return Effect.gen(function*() {
      const response = yield* HttpClient.execute(
        HttpClientRequest.post("https://example.test/upload").pipe(
          HttpClientRequest.bodyStream(Stream.make(new Uint8Array([1, 2, 3])))
        )
      )
      const web = Option.getOrThrow(HttpClientResponse.toWeb(response))
      assert.strictEqual(web.body, source.body)
      assert.strictEqual(yield* Effect.promise(() => web.text()), "done")
    }).pipe(
      Effect.provide(FetchHttpClient.layer),
      Effect.provideService(
        FetchHttpClient.Fetch,
        Object.assign(async () => source, { preconnect: () => {} })
      )
    )
  })
})
