import { assert, describe, it, vi } from "@effect/vitest"
import { Effect } from "effect"
import { FetchHttpClient, HttpClient, HttpClientRequest } from "effect/http"
import { collectGarbage } from "../utils/gc.ts"

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

  // The response registry is chosen at module load, so re-import without
  // FinalizationRegistry (e.g. Hermes) to exercise the timer fallback.
  it.skipIf(process.versions.bun !== undefined || process.versions.deno !== undefined)(
    "does not retain unread responses without FinalizationRegistry",
    async () => {
      vi.stubGlobal("FinalizationRegistry", undefined)
      try {
        vi.resetModules()
        const Fresh = await import("effect")
        const FreshHttp = await import("effect/http")
        const references: Array<WeakRef<object>> = []
        await Fresh.Effect.gen(function*() {
          const client = yield* FreshHttp.HttpClient.HttpClient
          for (let i = 0; i < 10; i++) {
            const response = yield* client.get("https://example.test/")
            references.push(new WeakRef((response as unknown as { original: object }).original))
          }
        }).pipe(
          Fresh.Effect.provide(FreshHttp.FetchHttpClient.layer),
          Fresh.Effect.provideService(
            FreshHttp.FetchHttpClient.Fetch,
            Object.assign(async () => new Response("x"), { preconnect: () => {} })
          ),
          Fresh.Effect.runPromise
        )
        await Effect.runPromise(collectGarbage)
        for (const reference of references) assert.isUndefined(reference.deref())
      } finally {
        vi.unstubAllGlobals()
        vi.resetModules()
      }
    }
  )
})
