import { assert, describe, it } from "@effect/vitest"
import { Effect, Result, Stream } from "effect"
import { FetchHttpClient, HttpClient, HttpClientRequest } from "effect/http"
import { afterEach, beforeEach, vi } from "vitest"

const NativeRequest = globalThis.Request
type FetchFunction = (...args: Parameters<typeof globalThis.fetch>) => ReturnType<typeof globalThis.fetch>

// Model browsers that stringify stream bodies and never read the duplex option.
const unsupportedRuntime = () =>
  vi.stubGlobal(
    "Request",
    class extends NativeRequest {
      constructor(input: RequestInfo | URL, init?: RequestInit) {
        super(input, {
          method: init?.method ?? "GET",
          headers: init?.headers ?? {},
          body: init?.body instanceof ReadableStream ? String(init.body) : init?.body ?? null
        })
      }
    }
  )

const streamRequest = () =>
  HttpClientRequest.post("https://example.test/upload").pipe(
    HttpClientRequest.bodyStream(Stream.make(new Uint8Array([104, 101]), new Uint8Array([108, 108, 111])), {
      contentType: "application/octet-stream"
    })
  )

describe("FetchHttpClient", { concurrent: false }, () => {
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

  describe("streaming request bodies", () => {
    beforeEach(() => {
      // Capability detection may be cached at module initialization.
      vi.resetModules()
    })

    afterEach(() => {
      vi.unstubAllGlobals()
      vi.resetModules()
    })

    it.effect("rejects unsupported streaming without sending the request", () =>
      Effect.gen(function*() {
        unsupportedRuntime()
        const FetchHttpClient = yield* Effect.promise(() => import("effect/http/FetchHttpClient"))
        const fetch = vi.fn<FetchFunction>(async () => new Response("sent"))
        const result = yield* HttpClient.execute(streamRequest()).pipe(
          Effect.provide(FetchHttpClient.layer),
          Effect.provideService(FetchHttpClient.Fetch, Object.assign(fetch, { preconnect: () => {} })),
          Effect.result
        )

        assert.strictEqual(fetch.mock.calls.length, 0)
        assert.isTrue(Result.isFailure(result))
        if (Result.isFailure(result)) {
          assert.strictEqual(result.failure._tag, "HttpClientError")
          assert.strictEqual(result.failure.reason._tag, "EncodeError")
          assert.match(result.failure.reason.description ?? "", /streaming request bodies.*not supported/i)
        }
      }))

    it.effect("buffers unsupported streaming only when explicitly opted in", () =>
      Effect.gen(function*() {
        unsupportedRuntime()
        const FetchHttpClient = yield* Effect.promise(() => import("effect/http/FetchHttpClient"))
        const fetch = vi.fn<FetchFunction>(async (_input, init) => {
          assert.instanceOf(init?.body, Uint8Array)
          assert.deepStrictEqual(init.body, new Uint8Array([104, 101, 108, 108, 111]))
          assert.strictEqual(new Headers(init.headers).get("content-type"), "application/octet-stream")
          return new Response(init.body)
        })

        // Proposed public reference for the implementation handoff.
        assert.isDefined(FetchHttpClient.StreamBodyFallback)
        const response = yield* HttpClient.execute(streamRequest()).pipe(
          Effect.provide(FetchHttpClient.layer),
          Effect.provideService(FetchHttpClient.Fetch, Object.assign(fetch, { preconnect: () => {} })),
          Effect.provideService(FetchHttpClient.StreamBodyFallback, "buffer")
        )
        assert.strictEqual(yield* response.text, "hello")
        assert.strictEqual(fetch.mock.calls.length, 1)
      }))

    it.effect("keeps supported request bodies streaming with duplex half", () =>
      Effect.gen(function*() {
        const FetchHttpClient = yield* Effect.promise(() => import("effect/http/FetchHttpClient"))
        const fetch = vi.fn<FetchFunction>(async (input, init) => {
          assert.instanceOf(init?.body, ReadableStream)
          assert.strictEqual((init as RequestInit & { duplex?: string }).duplex, "half")
          return new Response(await new NativeRequest(input, init).text())
        })
        const response = yield* HttpClient.execute(streamRequest()).pipe(
          Effect.provide(FetchHttpClient.layer),
          Effect.provideService(FetchHttpClient.Fetch, Object.assign(fetch, { preconnect: () => {} }))
        )

        assert.strictEqual(yield* response.text, "hello")
        assert.strictEqual(fetch.mock.calls.length, 1)
      }))
  })
})
