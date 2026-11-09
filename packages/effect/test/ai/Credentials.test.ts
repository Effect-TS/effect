import { assert, describe, it } from "@effect/vitest"
import { Context, Effect, Redacted, Stream } from "effect"
import { AiError, Credentials } from "effect/ai"
import { HttpBody, HttpClient, type HttpClientError, HttpClientRequest, HttpClientResponse } from "effect/http"

const aiError = AiError.make({
  module: "Test",
  method: "authenticate",
  reason: new AiError.AuthenticationError({ kind: "InvalidKey", description: "denied" })
})

// Answers with the scripted statuses in order and records each request and
// response; every response has a body, so draining it is observable.
const scriptedClient = (statuses: Array<number>) => {
  const requests: Array<HttpClientRequest.HttpClientRequest> = []
  const responses: Array<Response> = []
  const client = HttpClient.makeWith(
    Effect.fnUntraced(function*(requestEffect) {
      const request = yield* requestEffect
      requests.push(request)
      const response = new Response("body", { status: statuses.shift() ?? 200 })
      responses.push(response)
      return HttpClientResponse.fromWeb(request, response)
    }),
    Effect.succeed as HttpClient.HttpClient.Preprocess<HttpClientError.HttpClientError, never>
  )
  return { client, requests, responses }
}

// Serves `tokens` in order, moving to the next one only when the current one
// is invalidated.
const tokenSource = (tokens: Array<string>) => {
  let current = tokens.shift()!
  const invalidated: Array<string> = []
  const source: Credentials.BearerTokenSource<never> = {
    get: Effect.sync(() => ({ token: Redacted.make(current) })),
    invalidateWhen: (token) =>
      Effect.sync(() => {
        const value = Redacted.value(token)
        invalidated.push(value)
        if (value === current) current = tokens.shift() ?? current
      })
  }
  return { source, invalidated }
}

const run = (
  client: HttpClient.HttpClient,
  credentials: Credentials.Credentials,
  request = HttpClientRequest.get("https://example.test/v1")
) =>
  client.pipe(
    HttpClient.mapRequestEffect(credentials.authenticate),
    Credentials.retryUnauthorized(credentials)
  ).execute(request)

describe("Credentials", () => {
  it.effect("bearer sets Authorization and applies mapRequest", () =>
    Effect.gen(function*() {
      const { client, requests } = scriptedClient([200])
      const { source } = tokenSource(["t1"])
      const credentials = Credentials.bearer(source, {
        onError: () => aiError,
        mapRequest: HttpClientRequest.setHeader("x-extra", "1")
      })
      yield* run(client, credentials)
      assert.strictEqual(requests[0].headers["authorization"], "Bearer t1")
      assert.strictEqual(requests[0].headers["x-extra"], "1")
    }))

  it.effect("replays a 401 once with a refreshed token", () =>
    Effect.gen(function*() {
      const { client, requests } = scriptedClient([401, 200])
      const { invalidated, source } = tokenSource(["t1", "t2"])
      const response = yield* run(client, Credentials.bearer(source, { onError: () => aiError }))
      assert.strictEqual(response.status, 200)
      assert.deepStrictEqual(requests.map((r) => r.headers["authorization"]), ["Bearer t1", "Bearer t2"])
      assert.deepStrictEqual(invalidated, ["t1"])
    }))

  it.effect("retryUnauthorized accepts the client first", () =>
    Effect.gen(function*() {
      const { client, requests } = scriptedClient([401, 200])
      const { source } = tokenSource(["t1", "t2"])
      const credentials = Credentials.bearer(source, { onError: () => aiError })
      const response = yield* Credentials.retryUnauthorized(
        HttpClient.mapRequestEffect(client, credentials.authenticate),
        credentials
      ).execute(HttpClientRequest.get("https://example.test/v1"))
      assert.strictEqual(response.status, 200)
      assert.deepStrictEqual(requests.map((r) => r.headers["authorization"]), ["Bearer t1", "Bearer t2"])
    }))

  it.effect("bearer does not replay a request without its bearer token", () =>
    Effect.gen(function*() {
      const { invalidated, source } = tokenSource(["t1", "t2"])
      const credentials = Credentials.bearer(source, { onError: () => aiError })
      const request = HttpClientRequest.get("https://example.test/v1")
      assert.isFalse(yield* credentials.onUnauthorized(request))
      assert.isFalse(
        yield* credentials.onUnauthorized(HttpClientRequest.setHeader(request, "authorization", "Basic dTpw"))
      )
      assert.deepStrictEqual(invalidated, [])
    }))

  it.effect("passes a second 401 through", () =>
    Effect.gen(function*() {
      const { client, requests } = scriptedClient([401, 401, 200])
      const { source } = tokenSource(["t1", "t2", "t3"])
      const response = yield* run(client, Credentials.bearer(source, { onError: () => aiError }))
      assert.strictEqual(response.status, 401)
      assert.deepStrictEqual(requests.map((r) => r.headers["authorization"]), ["Bearer t1", "Bearer t2"])
    }))

  it.effect("does not replay a streaming body", () =>
    Effect.gen(function*() {
      const { client, requests } = scriptedClient([401, 200])
      const { source } = tokenSource(["t1", "t2"])
      const request = HttpClientRequest.post("https://example.test/v1").pipe(
        HttpClientRequest.setBody(HttpBody.stream(Stream.make(new Uint8Array([1]))))
      )
      const response = yield* run(client, Credentials.bearer(source, { onError: () => aiError }), request)
      assert.strictEqual(response.status, 401)
      assert.strictEqual(requests.length, 1)
    }))

  it.effect("apiKeyHeader sets the header and never replays", () =>
    Effect.gen(function*() {
      const { client, requests } = scriptedClient([401, 200])
      const credentials = Credentials.apiKeyHeader("x-api-key", Redacted.make("sk-test"))
      const response = yield* run(client, credentials)
      assert.strictEqual(response.status, 401)
      assert.strictEqual(requests.length, 1)
      assert.strictEqual(requests[0].headers["x-api-key"], "sk-test")
    }))

  it.effect("token source failures surface as the mapped AiError", () =>
    Effect.gen(function*() {
      const { client, requests } = scriptedClient([200])
      const source: Credentials.BearerTokenSource<string> = {
        get: Effect.fail("exchange failed"),
        invalidateWhen: () => Effect.void
      }
      const error = yield* run(client, Credentials.bearer(source, { onError: () => aiError })).pipe(Effect.flip)
      assert.strictEqual(error, aiError)
      assert.strictEqual(requests.length, 0)
    }))

  it.effect("bearerToken sets a static Authorization header and never replays", () =>
    Effect.gen(function*() {
      const { client, requests } = scriptedClient([401, 200])
      const credentials = Credentials.bearerToken(Redacted.make("sk-test"))
      const response = yield* run(client, credentials)
      assert.strictEqual(response.status, 401)
      assert.strictEqual(requests.length, 1)
      assert.strictEqual(requests[0].headers["authorization"], "Bearer sk-test")
    }))

  it.effect("replays once when the 401 arrives as a StatusCodeError", () =>
    Effect.gen(function*() {
      const { client, requests, responses } = scriptedClient([401, 200])
      const { invalidated, source } = tokenSource(["t1", "t2"])
      const credentials = Credentials.bearer(source, { onError: () => aiError })
      const response = yield* client.pipe(
        HttpClient.filterStatusOk,
        HttpClient.mapRequestEffect(credentials.authenticate),
        Credentials.retryUnauthorized(credentials)
      ).execute(HttpClientRequest.get("https://example.test/v1"))
      assert.strictEqual(response.status, 200)
      assert.deepStrictEqual(invalidated, ["t1"])
      assert.deepStrictEqual(requests.map((r) => r.headers["authorization"]), ["Bearer t1", "Bearer t2"])
      assert.isTrue(responses[0].bodyUsed)
    }))

  it.effect("a second 401 StatusCodeError fails unchanged", () =>
    Effect.gen(function*() {
      const { client, requests } = scriptedClient([401, 401, 200])
      const { source } = tokenSource(["t1", "t2", "t3"])
      const credentials = Credentials.bearer(source, { onError: () => aiError })
      const error = yield* client.pipe(
        HttpClient.filterStatusOk,
        HttpClient.mapRequestEffect(credentials.authenticate),
        Credentials.retryUnauthorized(credentials)
      ).execute(HttpClientRequest.get("https://example.test/v1")).pipe(Effect.flip)
      assert.strictEqual(error._tag, "HttpClientError")
      assert.strictEqual(requests.length, 2)
    }))

  it.effect("does not replay a 401 StatusCodeError when onUnauthorized returns false", () =>
    Effect.gen(function*() {
      const { client, requests } = scriptedClient([401, 200])
      const credentials = Credentials.bearerToken(Redacted.make("sk-test"))
      const error = yield* client.pipe(
        HttpClient.filterStatusOk,
        HttpClient.mapRequestEffect(credentials.authenticate),
        Credentials.retryUnauthorized(credentials)
      ).execute(HttpClientRequest.get("https://example.test/v1")).pipe(Effect.flip)
      assert.strictEqual(error._tag, "HttpClientError")
      assert.strictEqual(requests.length, 1)
    }))

  it.effect("does not replay a 401 StatusCodeError for a streaming body", () =>
    Effect.gen(function*() {
      const { client, requests } = scriptedClient([401, 200])
      const { source } = tokenSource(["t1", "t2"])
      const credentials = Credentials.bearer(source, { onError: () => aiError })
      const request = HttpClientRequest.post("https://example.test/v1").pipe(
        HttpClientRequest.setBody(HttpBody.stream(Stream.make(new Uint8Array([1]))))
      )
      const error = yield* client.pipe(
        HttpClient.filterStatusOk,
        HttpClient.mapRequestEffect(credentials.authenticate),
        Credentials.retryUnauthorized(credentials)
      ).execute(request).pipe(Effect.flip)
      assert.strictEqual(error._tag, "HttpClientError")
      assert.strictEqual(requests.length, 1)
    }))

  describe("resolve", () => {
    class Service extends Context.Service<Service, Credentials.Credentials>()("test/Service") {}
    const make = (name: string): Credentials.Credentials => ({
      authenticate: (request) => Effect.succeed(HttpClientRequest.setHeader(request, "x-name", name)),
      onUnauthorized: () => Effect.succeed(false)
    })
    const fromApiKey = (key: Redacted.Redacted<string>) => make(`key:${Redacted.value(key)}`)
    const resolve = (options: {
      apiKey?: Redacted.Redacted<string> | undefined
      credentials?: Credentials.Credentials | undefined
    }) =>
      Credentials.resolve({
        module: "TestClient",
        apiKey: options.apiKey,
        credentials: options.credentials,
        fromApiKey,
        tag: Service
      })
    const nameOf = (credentials: Credentials.Credentials | undefined) =>
      credentials === undefined ? Effect.succeed(undefined) : Effect.map(
        credentials.authenticate(HttpClientRequest.get("https://example.test")),
        (request) => request.headers["x-name"]
      )

    it.effect("dies naming the module when both are set", () =>
      Effect.gen(function*() {
        const exit = yield* resolve({ apiKey: Redacted.make("k"), credentials: make("c") }).pipe(Effect.exit)
        assert.isTrue(exit._tag === "Failure")
        assert.include(String(exit), "TestClient: `apiKey` and `credentials` are mutually exclusive")
      }))

    it.effect("returns credentials as given", () =>
      Effect.gen(function*() {
        assert.strictEqual(yield* nameOf(yield* resolve({ credentials: make("c") })), "c")
      }))

    it.effect("builds credentials from the api key", () =>
      Effect.gen(function*() {
        assert.strictEqual(yield* nameOf(yield* resolve({ apiKey: Redacted.make("k") })), "key:k")
      }))

    it.effect("falls back to the service in context", () =>
      Effect.gen(function*() {
        const credentials = yield* resolve({}).pipe(Effect.provideService(Service, make("ctx")))
        assert.strictEqual(yield* nameOf(credentials), "ctx")
      }))

    it.effect("returns undefined with nothing configured", () =>
      Effect.gen(function*() {
        assert.isUndefined(yield* resolve({}))
      }))
  })

  describe("authenticated", () => {
    it.effect("authenticates and replays a 401 once", () =>
      Effect.gen(function*() {
        const { client, requests } = scriptedClient([401, 200])
        const { source } = tokenSource(["t1", "t2"])
        const response = yield* client.pipe(
          Credentials.authenticated(Credentials.bearer(source, { onError: () => aiError }))
        ).execute(HttpClientRequest.get("https://example.test/v1"))
        assert.strictEqual(response.status, 200)
        assert.deepStrictEqual(requests.map((r) => r.headers["authorization"]), ["Bearer t1", "Bearer t2"])
      }))

    it.effect("leaves requests untouched without credentials", () =>
      Effect.gen(function*() {
        const { client, requests } = scriptedClient([401])
        const response = yield* client.pipe(Credentials.authenticated(undefined))
          .execute(HttpClientRequest.get("https://example.test/v1"))
        assert.strictEqual(response.status, 401)
        assert.strictEqual(requests.length, 1)
        assert.isUndefined(requests[0].headers["authorization"])
      }))
  })
})
