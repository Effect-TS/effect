import { assert, describe, it } from "@effect/vitest"
import { Effect, Redacted, Schema, Tracer } from "effect"
import { HttpClient, type HttpClientRequest, HttpClientResponse, UrlParams } from "effect/http"
import { HttpApi, HttpApiClient, HttpApiEndpoint, HttpApiGroup } from "effect/http-api"

const baseUrl = "https://example.test"
const secret = Redacted.make("secret &+#/é")

describe("HttpApiClient query redaction", () => {
  it.effect("sends secrets while masking traces and request inspection", () =>
    Effect.gen(function*() {
      const api = makeApi(Schema.Struct({ token: Schema.Redacted(Schema.String) }))
      const captured = yield* captureRequest(Effect.gen(function*() {
        const client = yield* HttpApiClient.make(api, { baseUrl })
        yield* client.items.get({ query: { token: secret } })
      }))

      assert.strictEqual(captured.url.searchParams.get("token"), Redacted.value(secret))
      assert.isFalse(JSON.stringify(captured.request).includes("secret"))
      assertTrace(captured.span, "token=<redacted>")
    }))

  it.effect("preserves redaction after renaming and encoding a field", () =>
    Effect.gen(function*() {
      const query = Schema.Struct({ count: Schema.Redacted(Schema.Number) }).pipe(
        Schema.encodeKeys({ count: "private_count" })
      )
      const captured = yield* captureRequest(Effect.gen(function*() {
        const client = yield* HttpApiClient.make(makeApi(query), { baseUrl })
        yield* client.items.get({ query: { count: Redacted.make(42) } })
      }))

      assert.strictEqual(captured.url.searchParams.get("private_count"), "42")
      const stored = captured.request.urlParams.params[0][1]
      assert(Redacted.isRedacted(stored))
      assert.strictEqual(Redacted.value(stored), "42")
      assertTrace(captured.span, "private_count=<redacted>")

      const decoded = Schema.decodeSync(Schema.toCodecStringTree(query))({ private_count: "42" })
      assert.strictEqual(Redacted.value(decoded.count), 42)
    }))

  it.effect("masks only the redacted entries of a repeated parameter", () =>
    Effect.gen(function*() {
      const api = makeApi(Schema.Struct({
        token: Schema.Array(Schema.Union([Schema.String, Schema.Redacted(Schema.String)]))
      }))
      const captured = yield* captureRequest(Effect.gen(function*() {
        const client = yield* HttpApiClient.make(api, { baseUrl })
        yield* client.items.get({ query: { token: ["public", secret, "visible"] } })
      }))

      assert.deepStrictEqual(captured.url.searchParams.getAll("token"), ["public", Redacted.value(secret), "visible"])
      assertTrace(captured.span, "token=public&token=<redacted>&token=visible")
    }))

  it.effect("preserves the shape of a redacted collection", () =>
    Effect.gen(function*() {
      const api = makeApi(Schema.Struct({ token: Schema.Redacted(Schema.Array(Schema.String)) }))
      const captured = yield* captureRequest(Effect.gen(function*() {
        const client = yield* HttpApiClient.make(api, { baseUrl })
        yield* client.items.get({ query: { token: Redacted.make(["first-secret", "second-secret"]) } })
      }))

      assert.deepStrictEqual(captured.url.searchParams.getAll("token"), ["first-secret", "second-secret"])
      assertTrace(captured.span, "token=<redacted>&token=<redacted>")
    }))

  it.effect("preserves nested RedactedFromValue fields and omits absent fields", () =>
    Effect.gen(function*() {
      const api = makeApi(Schema.Struct({
        nested: Schema.Struct({ token: Schema.RedactedFromValue(Schema.String) }),
        absent: Schema.optional(Schema.Redacted(Schema.String))
      }))
      const captured = yield* captureRequest(Effect.gen(function*() {
        const client = yield* HttpApiClient.make(api, { baseUrl })
        yield* client.items.get({ query: { nested: { token: secret } } })
      }))

      assert.strictEqual(captured.url.searchParams.get("nested[token]"), Redacted.value(secret))
      assert.isFalse(captured.url.searchParams.has("absent"))
      assertTrace(captured.span, "nested%5Btoken%5D=<redacted>")
    }))

  it.effect("preserves redaction in query-style payloads", () =>
    Effect.gen(function*() {
      const api = HttpApi.make("test").add(
        HttpApiGroup.make("items").add(
          HttpApiEndpoint.get("get", "/items", { payload: { token: Schema.Redacted(Schema.String) } })
        )
      )
      const captured = yield* captureRequest(Effect.gen(function*() {
        const client = yield* HttpApiClient.make(api, { baseUrl })
        yield* client.items.get({ payload: { token: secret } })
      }))

      assert.strictEqual(captured.url.searchParams.get("token"), Redacted.value(secret))
      assertTrace(captured.span, "token=<redacted>")
    }))

  it.effect("preserves redaction when automatic codecs are disabled", () =>
    Effect.gen(function*() {
      const api = HttpApi.make("test").add(
        HttpApiGroup.make("items").add(
          HttpApiEndpoint.get("get", "/items", {
            disableCodecs: true,
            query: { token: Schema.RedactedFromValue(Schema.String) }
          })
        )
      )
      const captured = yield* captureRequest(Effect.gen(function*() {
        const client = yield* HttpApiClient.make(api, { baseUrl })
        yield* client.items.get({ query: { token: secret } })
      }))

      assert.strictEqual(captured.url.searchParams.get("token"), Redacted.value(secret))
      assertTrace(captured.span, "token=<redacted>")
    }))

  it.effect("retains validation before wrapping encoded values", () =>
    Effect.gen(function*() {
      const api = makeApi(Schema.Struct({ token: Schema.Redacted(Schema.String.check(Schema.isMinLength(10))) }))
      let sent = false
      const httpClient = HttpClient.make((request) => {
        sent = true
        return Effect.succeed(HttpClientResponse.fromWeb(request, new Response(null, { status: 204 })))
      })
      const client = yield* HttpApiClient.makeWith(api, { httpClient, baseUrl })
      const error = yield* Effect.flip(client.items.get({ query: { token: Redacted.make("short") } }))

      assert(Schema.isSchemaError(error))
      assert.isFalse(error.message.includes("short"))
      assert.isFalse(sent)
    }))

  it.effect("preserves redacted fields in class schemas", () =>
    Effect.gen(function*() {
      class Query extends Schema.Class<Query>("Query")({ token: Schema.Redacted(Schema.String) }) {}
      const captured = yield* captureRequest(Effect.gen(function*() {
        const client = yield* HttpApiClient.make(makeApi(Query), { baseUrl })
        yield* client.items.get({ query: new Query({ token: secret }) })
      }))

      assert.strictEqual(captured.url.searchParams.get("token"), Redacted.value(secret))
      assertTrace(captured.span, "token=<redacted>")
    }))

  it("unwraps URL builder output with and without a base URL", () => {
    const api = makeApi(Schema.Struct({ token: Schema.Redacted(Schema.String) }))
    const input = { query: { token: secret } }
    const path = "/items?token=secret+%26%2B%23%2F%C3%A9"

    assert.strictEqual(HttpApiClient.urlBuilder(api).items.get(input), path)
    assert.strictEqual(HttpApiClient.urlBuilder(api, { baseUrl }).items.get(input), `${baseUrl}${path}`)
  })
})

const makeApi = <S extends Schema.Top>(query: S) =>
  HttpApi.make("test").add(HttpApiGroup.make("items").add(HttpApiEndpoint.get("get", "/items", { query })))

const captureRequest = Effect.fnUntraced(function*<A, E, R>(effect: Effect.Effect<A, E, R>) {
  let request: HttpClientRequest.HttpClientRequest | undefined
  let url: URL | undefined
  let span: Tracer.NativeSpan | undefined
  const httpClient = HttpClient.make((sentRequest, sentUrl) => {
    request = sentRequest
    url = sentUrl
    return Effect.succeed(HttpClientResponse.fromWeb(sentRequest, new Response(null, { status: 204 })))
  })
  const tracer = Tracer.make({
    span(options) {
      span = new Tracer.NativeSpan(options)
      return span
    }
  })

  yield* effect.pipe(
    Effect.provideService(HttpClient.HttpClient, httpClient),
    Effect.provideService(Tracer.Tracer, tracer)
  )

  assert(request !== undefined)
  assert(url !== undefined)
  assert(span !== undefined)
  assert.strictEqual(UrlParams.toString(request.urlParams), url.search.slice(1))
  return { request, url, span }
})

const assertTrace = (span: Tracer.NativeSpan, query: string) => {
  assert.strictEqual(span.attributes.get("url.query"), query)
  assert.strictEqual(span.attributes.get("url.full"), `${baseUrl}/items?${query}`)
}
