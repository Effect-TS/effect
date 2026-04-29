import * as AiError from "@effect/ai/AiError"
import * as HttpClient from "@effect/platform/HttpClient"
import * as HttpClientResponse from "@effect/platform/HttpClientResponse"
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import * as Layer from "effect/Layer"
import * as Redacted from "effect/Redacted"
import * as Ref from "effect/Ref"
import * as PerplexityClient from "../src/PerplexityClient.js"
import * as PerplexitySearch from "../src/PerplexitySearch.js"

interface CapturedRequest {
  readonly method: string
  readonly url: string
  readonly body: unknown
  readonly headers: Record<string, string>
}

const makeMockHttpClient = (responseBody: unknown, status = 200) =>
  Effect.gen(function*() {
    const captured = yield* Ref.make<CapturedRequest | undefined>(undefined)
    const client = HttpClient.make((request) =>
      Effect.gen(function*() {
        const text = request.body._tag === "Uint8Array"
          ? new TextDecoder().decode(request.body.body)
          : request.body._tag === "Raw"
          ? String(request.body.body)
          : ""
        let parsed: unknown = text
        try {
          parsed = text.length > 0 ? JSON.parse(text) : undefined
        } catch {
          // leave as raw
        }
        yield* Ref.set(captured, {
          method: request.method,
          url: request.url,
          body: parsed,
          headers: request.headers as unknown as Record<string, string>
        })
        return HttpClientResponse.fromWeb(
          request,
          new Response(JSON.stringify(responseBody), {
            status,
            headers: { "content-type": "application/json" }
          })
        )
      })
    )
    return { client, captured }
  })

const provideSearch = <A, E>(
  effect: Effect.Effect<A, E, PerplexitySearch.PerplexitySearch>,
  responseBody: unknown,
  status = 200
) =>
  Effect.gen(function*() {
    const { captured, client } = yield* makeMockHttpClient(responseBody, status)
    const result = yield* effect.pipe(
      Effect.provide(
        PerplexitySearch.layer.pipe(
          Layer.provide(
            PerplexityClient.layer({
              apiKey: Redacted.make("test-api-key")
            })
          ),
          Layer.provide(Layer.succeed(HttpClient.HttpClient, client))
        )
      )
    )
    const captureValue = yield* Ref.get(captured)
    return { result, captured: captureValue }
  })

describe("PerplexitySearch", () => {
  describe("buildRequestBody", () => {
    it("includes only the query when no options are set", () => {
      const body = PerplexitySearch.buildRequestBody({ query: "hello" })
      assert.deepStrictEqual(body, { query: "hello" })
    })

    it("maps camelCase options to the API's snake_case fields", () => {
      const body = PerplexitySearch.buildRequestBody({
        query: "hello",
        maxResults: 5,
        maxTokensPerPage: 256,
        recencyFilter: "week",
        afterDateFilter: "1/1/2025",
        beforeDateFilter: "12/31/2025",
        domainFilter: ["nytimes.com"]
      })
      assert.deepStrictEqual(body, {
        query: "hello",
        max_results: 5,
        max_tokens_per_page: 256,
        search_domain_filter: ["nytimes.com"],
        search_recency_filter: "week",
        search_after_date_filter: "1/1/2025",
        search_before_date_filter: "12/31/2025"
      })
    })

    it("accepts an allowlist", () => {
      const body = PerplexitySearch.buildRequestBody({
        query: "x",
        domainFilter: ["nytimes.com", "wsj.com"]
      })
      assert.deepStrictEqual(body.search_domain_filter, ["nytimes.com", "wsj.com"])
    })

    it("accepts a denylist", () => {
      const body = PerplexitySearch.buildRequestBody({
        query: "x",
        domainFilter: ["-pinterest.com", "-quora.com"]
      })
      assert.deepStrictEqual(body.search_domain_filter, ["-pinterest.com", "-quora.com"])
    })

    it("rejects mixed allow/deny domain filter entries", () => {
      assert.throws(() =>
        PerplexitySearch.buildRequestBody({
          query: "x",
          domainFilter: ["nytimes.com", "-pinterest.com"]
        }), /cannot mix allowlist and denylist/)
    })
  })

  describe("search", () => {
    it.effect("decodes a successful response", () =>
      Effect.gen(function*() {
        const { captured, result } = yield* provideSearch(
          Effect.gen(function*() {
            const search = yield* PerplexitySearch.PerplexitySearch
            return yield* search.search({ query: "effect typescript", maxResults: 2 })
          }),
          {
            id: "abc",
            results: [
              {
                title: "Effect TS",
                url: "https://effect.website",
                snippet: "Functional effects",
                date: "2026-04-01"
              },
              {
                title: "Effect GitHub",
                url: "https://github.com/Effect-TS/effect",
                snippet: "Source"
              }
            ]
          }
        )
        assert.strictEqual(result.id, "abc")
        assert.strictEqual(result.results.length, 2)
        assert.strictEqual(result.results[0].title, "Effect TS")
        assert.strictEqual(result.results[0].url, "https://effect.website")
        assert.strictEqual(result.results[0].snippet, "Functional effects")
        assert.strictEqual(result.results[0].date, "2026-04-01")
        assert.strictEqual(result.results[1].title, "Effect GitHub")

        // Verify request shape
        assert.ok(captured)
        assert.strictEqual(captured!.method, "POST")
        assert.match(captured!.url, /\/search$/)
        assert.deepStrictEqual(captured!.body, { query: "effect typescript", max_results: 2 })
        assert.strictEqual(captured!.headers["authorization"], "Bearer test-api-key")
      }))

    it.effect("forwards filter options to the request body", () =>
      Effect.gen(function*() {
        const { captured } = yield* provideSearch(
          Effect.gen(function*() {
            const search = yield* PerplexitySearch.PerplexitySearch
            yield* search.search({
              query: "climate news",
              maxResults: 3,
              recencyFilter: "day",
              domainFilter: ["-pinterest.com"],
              afterDateFilter: "1/1/2025",
              beforeDateFilter: "12/31/2025"
            })
          }),
          { results: [] }
        )
        assert.deepStrictEqual(captured!.body, {
          query: "climate news",
          max_results: 3,
          search_recency_filter: "day",
          search_domain_filter: ["-pinterest.com"],
          search_after_date_filter: "1/1/2025",
          search_before_date_filter: "12/31/2025"
        })
      }))

    it.effect("fails with MalformedInput when domainFilter mixes allow and deny", () =>
      Effect.gen(function*() {
        const { result } = yield* provideSearch(
          Effect.gen(function*() {
            const search = yield* PerplexitySearch.PerplexitySearch
            return yield* search.search({
              query: "x",
              domainFilter: ["nytimes.com", "-pinterest.com"]
            }).pipe(Effect.either)
          }),
          { results: [] }
        )
        assert.isTrue(Either.isLeft(result))
        if (Either.isLeft(result)) {
          assert.instanceOf(result.left, AiError.MalformedInput)
          assert.match(result.left.description!, /cannot mix allowlist and denylist/)
        }
      }))

    it.effect("fails with HttpResponseError on non-2xx status", () =>
      Effect.gen(function*() {
        const { result } = yield* provideSearch(
          Effect.gen(function*() {
            const search = yield* PerplexitySearch.PerplexitySearch
            return yield* search.search({ query: "boom" }).pipe(Effect.either)
          }),
          { error: "unauthorized" },
          401
        )
        assert.isTrue(Either.isLeft(result))
        if (Either.isLeft(result)) {
          assert.instanceOf(result.left, AiError.HttpResponseError)
        }
      }))

    it.effect("fails with MalformedOutput when the response body cannot be decoded", () =>
      Effect.gen(function*() {
        const { result } = yield* provideSearch(
          Effect.gen(function*() {
            const search = yield* PerplexitySearch.PerplexitySearch
            return yield* search.search({ query: "x" }).pipe(Effect.either)
          }),
          { results: "not-an-array" }
        )
        assert.isTrue(Either.isLeft(result))
        if (Either.isLeft(result)) {
          assert.instanceOf(result.left, AiError.MalformedOutput)
        }
      }))
  })
})
