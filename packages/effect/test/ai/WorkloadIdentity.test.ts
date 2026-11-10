import { assert, describe, it } from "@effect/vitest"
import { Deferred, Effect, Fiber, Redacted } from "effect"
import { WorkloadIdentity } from "effect/ai"
import { FetchHttpClient, HttpClient, HttpClientError, HttpClientRequest, HttpClientResponse } from "effect/http"
import { TestClock } from "effect/testing"

const IDENTITY_TOKEN = "identity.token.signature"
const TOKEN_URL = "https://auth.example.com/oauth/token"
const API_URL = "https://api.example.com/v1/models"

describe("WorkloadIdentity", () => {
  it.effect("exchanges the identity token and authenticates requests with the access token", () =>
    Effect.gen(function*() {
      const http = makeHttp()
      const client = yield* makeClient(http, {
        identityToken: Effect.succeed(Redacted.make(`${IDENTITY_TOKEN}\n`))
      })

      yield* client.get(API_URL)

      const [exchange, request] = http.requests
      assert.strictEqual(exchange.method, "POST")
      assert.strictEqual(exchange.url, TOKEN_URL)
      assert.strictEqual(exchange.headers.accept, "application/json")
      assert.deepStrictEqual(bodyJson(exchange), { subject_token: IDENTITY_TOKEN })
      assert.strictEqual(request.headers.authorization, "Bearer access-1")
    }))

  it.effect("shares one exchange between concurrent requests, even when one is interrupted", () =>
    Effect.gen(function*() {
      const latch = yield* Deferred.make<void>()
      const http = makeHttp({ token: (_, n) => Effect.as(Deferred.await(latch), tokenResponse(n)) })
      const client = yield* makeClient(http)

      const interrupted = yield* Effect.forkChild(client.get(API_URL), { startImmediately: true })
      const fibers = yield* Effect.forEach(
        [1, 2],
        () => Effect.forkChild(client.get(API_URL), { startImmediately: true })
      )
      yield* Fiber.interrupt(interrupted)
      yield* Deferred.succeed(latch, void 0)
      yield* Fiber.joinAll(fibers)

      assert.deepStrictEqual(authorizations(http), [undefined, "Bearer access-1", "Bearer access-1"])
    }))

  it.effect("exchanges a new identity token once the access token is about to expire", () =>
    Effect.gen(function*() {
      let identityTokens = 0
      const http = makeHttp()
      const client = yield* makeClient(http, {
        identityToken: Effect.sync(() => Redacted.make(`identity-${++identityTokens}`))
      })

      yield* client.get(API_URL)
      yield* TestClock.adjust("3569 seconds")
      yield* client.get(API_URL)
      yield* TestClock.adjust("1 second")
      yield* client.get(API_URL)

      assert.deepStrictEqual(authorizations(http), [
        undefined,
        "Bearer access-1",
        "Bearer access-1",
        undefined,
        "Bearer access-2"
      ])
      assert.deepStrictEqual(bodyJson(http.requests[3]), { subject_token: "identity-2" })
    }))

  it.effect("requires expires_in in the token response unless a default lifetime is given", () =>
    Effect.gen(function*() {
      const http = makeHttp({ token: (_, n) => Effect.succeed(Response.json({ access_token: `access-${n}` })) })

      const error = yield* Effect.flip((yield* makeClient(http)).get(API_URL))
      assert.strictEqual(error.reason._tag, "DecodeError")

      const client = yield* makeClient(http, { defaultExpiresIn: "2 minutes" })
      yield* client.get(API_URL)
      yield* TestClock.adjust("89 seconds")
      yield* client.get(API_URL)
      yield* TestClock.adjust("1 second")
      yield* client.get(API_URL)

      assert.deepStrictEqual(authorizations(http), [
        undefined,
        undefined,
        "Bearer access-2",
        "Bearer access-2",
        undefined,
        "Bearer access-3"
      ])
    }))

  it.effect("exchanges again on the request after a failed exchange", () =>
    Effect.gen(function*() {
      const http = makeHttp({
        token: (_, n) => Effect.succeed(n === 1 ? new Response(null, { status: 503 }) : tokenResponse(n))
      })
      const client = yield* makeClient(http)

      const error = yield* Effect.flip(client.get(API_URL))
      yield* client.get(API_URL)

      assert.strictEqual(error.response?.status, 503)
      assert.deepStrictEqual(authorizations(http), [undefined, undefined, "Bearer access-2"])
    }))

  it.effect("discards an access token rejected with a 401 without replaying the request", () =>
    Effect.gen(function*() {
      const latch = yield* Deferred.make<void>()
      const http = makeHttp({
        api: (request) =>
          Effect.as(
            request.url.endsWith("/slow") ? Deferred.await(latch) : Effect.void,
            new Response(null, { status: request.headers.authorization === "Bearer access-1" ? 401 : 200 })
          )
      })
      const client = yield* makeClient(http)
      const status = (url: string) => Effect.map(client.get(url), (response) => response.status)

      const slow = yield* Effect.forkChild(status(`${API_URL}/slow`), { startImmediately: true })
      assert.strictEqual(yield* status(API_URL), 401)
      assert.strictEqual(yield* status(API_URL), 200)
      // The late rejection of the first token must not discard the second one.
      yield* Deferred.succeed(latch, void 0)
      assert.strictEqual(yield* Fiber.join(slow), 401)
      assert.strictEqual(yield* status(API_URL), 200)

      assert.deepStrictEqual(authorizations(http), [
        undefined,
        "Bearer access-1",
        "Bearer access-1",
        undefined,
        "Bearer access-2",
        "Bearer access-2"
      ])
    }))

  it.effect("discards a rejected access token when the client fails on error statuses", () =>
    Effect.gen(function*() {
      const http = makeHttp({
        api: (request) =>
          Effect.succeed(
            new Response(null, { status: request.headers.authorization === "Bearer access-1" ? 401 : 200 })
          )
      })
      const transform = yield* make(http)
      const client = transform(HttpClient.filterStatusOk(http.client))

      yield* Effect.flip(client.get(API_URL))
      yield* client.get(API_URL)

      assert.deepStrictEqual(authorizations(http), [undefined, "Bearer access-1", undefined, "Bearer access-2"])
    }))

  it.effect.each<{
    readonly name: string
    readonly body: string
    readonly redacted: string
  }>([
    {
      name: "a JSON body with escaped characters",
      body: JSON.stringify({ message: `Authentication failed for ${IDENTITY_TOKEN}`, [IDENTITY_TOKEN]: true })
        .replaceAll(".", "\\u002e"),
      redacted: "{\"message\":\"Authentication failed for <redacted>\",\"<redacted>\":true}"
    },
    {
      name: "a text body",
      body: `Authentication failed for ${IDENTITY_TOKEN}`,
      redacted: "Authentication failed for <redacted>"
    }
  ])("redacts the identity token from a rejected exchange with $name", ({ body, redacted }) =>
    Effect.gen(function*() {
      const http = makeHttp({
        token: () =>
          Effect.succeed(
            new Response(body, {
              status: 401,
              headers: { "www-authenticate": `Bearer error_description="${IDENTITY_TOKEN}"` }
            })
          )
      })
      const client = yield* makeClient(http)

      const error = yield* Effect.flip(client.get(API_URL))

      assert.strictEqual(error.reason._tag, "StatusCodeError")
      const response = error.response
      if (response === undefined) return assert.fail("Expected a response")
      assert.strictEqual(response.status, 401)
      assert.strictEqual(response.headers["www-authenticate"], "Bearer error_description=\"<redacted>\"")
      assert.strictEqual(yield* response.text, redacted)
      assert.isFalse(contains(error, IDENTITY_TOKEN))
      assert.lengthOf(http.requests, 1)
    }))

  const sourceError = new Error("ENOENT")

  it.effect.each<{
    readonly name: string
    readonly reason: string
    readonly description: string
    readonly cause?: unknown
    readonly token?: TokenHandler
    readonly identityToken?: Effect.Effect<Redacted.Redacted<string>, Error>
  }>([
    {
      name: "an unreachable token endpoint",
      reason: "TransportError",
      description: "failed to send <redacted>: socket hang up",
      token: (request) =>
        Effect.fail(
          new HttpClientError.HttpClientError({
            reason: new HttpClientError.TransportError({
              request,
              description: `failed to send ${IDENTITY_TOKEN}`,
              cause: new Error("socket hang up", { cause: { request } })
            })
          })
        )
    },
    {
      name: "an invalid token response",
      reason: "DecodeError",
      description: "invalid token response",
      token: () => Effect.succeed(Response.json({ subject_token: IDENTITY_TOKEN }))
    },
    {
      name: "a failing identity token source",
      reason: "EncodeError",
      description: "Failed to load the identity token",
      cause: sourceError,
      identityToken: Effect.fail(sourceError)
    },
    {
      name: "an empty identity token",
      reason: "EncodeError",
      description: "The identity token is empty",
      identityToken: Effect.succeed(Redacted.make("\n"))
    }
  ])(
    "fails with an HttpClientError without the identity token for $name",
    ({ cause, description, identityToken, reason, token }) =>
      Effect.gen(function*() {
        const http = makeHttp({ token })
        const client = yield* makeClient(http, { identityToken })

        const error = yield* Effect.flip(client.get(API_URL))

        assert.strictEqual(error.reason._tag, reason)
        assert.include(error.message, description)
        assert.strictEqual(error.reason.cause, cause)
        assert.isFalse(contains(error, IDENTITY_TOKEN))
        assert.lengthOf(http.requests, token === undefined ? 0 : 1)
      })
  )

  it.effect("does not follow a redirect of the exchange", () =>
    Effect.gen(function*() {
      const redirects: Array<RequestRedirect | undefined> = []
      const transform = yield* WorkloadIdentity.make({
        tokenUrl: TOKEN_URL,
        identityToken: Effect.succeed(Redacted.make(IDENTITY_TOKEN)),
        exchangeRequest
      })
      const client = transform(yield* HttpClient.HttpClient)

      const error = yield* Effect.flip(client.get(API_URL)).pipe(
        Effect.provideService(
          FetchHttpClient.Fetch,
          Object.assign((_input: RequestInfo | URL, init?: RequestInit) => {
            redirects.push(init?.redirect)
            return Promise.resolve(new Response(null, { status: 307, headers: { location: "https://example.com" } }))
          }, { preconnect: () => {} })
        )
      )

      assert.deepStrictEqual(redirects, ["manual"])
      assert.strictEqual(error.reason._tag, "TransportError")
      assert.include(error.message, "Redirects are not followed")
      assert.isFalse(contains(error, IDENTITY_TOKEN))
    }).pipe(Effect.provide(FetchHttpClient.layer)))

  it.effect("refuses a token URL that is not https", () =>
    Effect.gen(function*() {
      const exit = yield* Effect.exit(make(makeHttp(), { tokenUrl: "http://gateway.internal/oauth/token" }))
      assert.isTrue(exit._tag === "Failure" && exit.cause.reasons.every((reason) => reason._tag === "Die"))
    }))
})

type Options = Parameters<typeof WorkloadIdentity.make<Error, never>>[0]

type TokenHandler = (
  request: HttpClientRequest.HttpClientRequest,
  n: number
) => Effect.Effect<Response, HttpClientError.HttpClientError>

type Http = ReturnType<typeof makeHttp>

const tokenResponse = (n: number) => Response.json({ access_token: `access-${n}`, expires_in: 3600 })

const makeHttp = (handlers: {
  readonly token?: TokenHandler | undefined
  readonly api?: ((request: HttpClientRequest.HttpClientRequest) => Effect.Effect<Response>) | undefined
} = {}) => {
  const requests: Array<HttpClientRequest.HttpClientRequest> = []
  let exchanges = 0
  const client = HttpClient.make((request) => {
    requests.push(request)
    const response = request.url === TOKEN_URL
      ? (handlers.token ?? ((_, n) => Effect.succeed(tokenResponse(n))))(request, ++exchanges)
      : handlers.api?.(request) ?? Effect.succeed(new Response())
    return Effect.map(response, (response) => HttpClientResponse.fromWeb(request, response))
  })
  return { client, requests }
}

const exchangeRequest: Options["exchangeRequest"] = (request, identityToken) =>
  request.pipe(HttpClientRequest.bodyJsonUnsafe({ subject_token: identityToken }))

const make = (http: Http, options: { readonly [K in keyof Options]?: Options[K] | undefined } = {}) =>
  WorkloadIdentity.make({
    tokenUrl: options.tokenUrl ?? TOKEN_URL,
    identityToken: options.identityToken ?? Effect.succeed(Redacted.make(IDENTITY_TOKEN)),
    exchangeRequest,
    defaultExpiresIn: options.defaultExpiresIn
  }).pipe(Effect.provideService(HttpClient.HttpClient, http.client))

const makeClient = (http: Http, options?: Parameters<typeof make>[1]) =>
  Effect.map(make(http, options), (transform) => transform(http.client))

const authorizations = (http: Http) => http.requests.map((request) => request.headers.authorization)

const bodyJson = (request: HttpClientRequest.HttpClientRequest) =>
  request.body._tag === "Uint8Array" ? JSON.parse(new TextDecoder().decode(request.body.body)) : undefined

// Searches every string and byte array reachable from `value`, including error causes.
const contains = (value: unknown, text: string, seen = new Set<unknown>()): boolean => {
  if (typeof value === "string") return value.includes(text)
  if (value instanceof Uint8Array) return new TextDecoder().decode(value).includes(text)
  if (typeof value !== "object" || value === null || seen.has(value)) return false
  seen.add(value)
  return [String(value), ...Reflect.ownKeys(value).map((key) => Reflect.get(value, key))]
    .some((child) => contains(child, text, seen))
}
