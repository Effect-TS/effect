import { assert, describe, it } from "@effect/vitest"
import { Effect, Redacted } from "effect"
import { FetchHttpClient, HttpClient, HttpClientRequest } from "effect/http"

describe("FetchHttpClient", () => {
  it.effect.each([
    { tracing: "enabled", tracingDisabled: false },
    { tracing: "disabled", tracingDisabled: true }
  ])("sends redacted query parameters with tracing $tracing", ({ tracingDisabled }) =>
    Effect.gen(function*() {
      const client = yield* HttpClient.HttpClient
      const request = HttpClientRequest.get("https://example.test/?existing=1").pipe(
        HttpClientRequest.setUrlParam("token", Redacted.make("secret &+#/é"))
      )
      const web = yield* HttpClientRequest.toWeb(request)
      assert.strictEqual(web.url, "https://example.test/?existing=1&token=secret+%26%2B%23%2F%C3%A9")
      const response = yield* client.execute(request)
      assert.strictEqual(yield* response.text, web.url)
    }).pipe(
      Effect.provide(FetchHttpClient.layer),
      Effect.provideService(HttpClient.TracerDisabledWhen, () => tracingDisabled),
      Effect.provideService(
        FetchHttpClient.Fetch,
        Object.assign(
          async (...args: Parameters<typeof globalThis.fetch>) => new Response(new Request(...args).url),
          { preconnect: () => {} }
        )
      )
    ))

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
})
