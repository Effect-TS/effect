import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/unstable/http"

describe("HttpClientResponse", () => {
  describe("toWeb", () => {
    it.effect("returns the original Web Response instead of rebuilding it", () =>
      Effect.sync(() => {
        const source = new Response(new Uint8Array([1, 2, 3]))
        const response = HttpClientResponse.fromWeb(HttpClientRequest.get("https://example.com/"), source)

        assert.strictEqual(HttpClientResponse.toWeb(response), source)
        // The body must be the native one, not a stream rebuilt in JavaScript,
        // so runtime-specific capabilities (e.g. workerd's known length) survive.
        assert.strictEqual(HttpClientResponse.toWeb(response)?.body, source.body)
      }))

    it.effect("returns the original Web Response through HttpClient.execute", () =>
      Effect.gen(function*() {
        const source = new Response(new Uint8Array([1, 2, 3]))
        const client = HttpClient.make((request) => Effect.succeed(HttpClientResponse.fromWeb(request, source)))

        const response = yield* HttpClient.execute(HttpClientRequest.get("https://example.com/")).pipe(
          Effect.provideService(HttpClient.HttpClient, client)
        )

        assert.strictEqual(HttpClientResponse.toWeb(response), source)
      }))

    it.effect("returns undefined when no Web Response backs the response", () =>
      Effect.sync(() => {
        const response = { source: {} } as unknown as HttpClientResponse.HttpClientResponse
        assert.strictEqual(HttpClientResponse.toWeb(response), undefined)
      }))
  })
})
