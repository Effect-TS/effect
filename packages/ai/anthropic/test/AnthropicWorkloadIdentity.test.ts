import { AnthropicClient, AnthropicWorkloadIdentity } from "@effect/ai-anthropic"
import { assert, describe, it } from "@effect/vitest"
import { Deferred, Effect, Fiber, Layer, Redacted } from "effect"
import { FetchHttpClient, HttpClient, HttpClientError, type HttpClientRequest, HttpClientResponse } from "effect/http"
import { TestClock } from "effect/testing"

const IDENTITY_TOKEN = "identity.token.signature"
const TOKEN_URL = "https://api.anthropic.com/v1/oauth/token"
const API_URL = "https://api.anthropic.com/v1/messages"

describe("AnthropicWorkloadIdentity", () => {
  it.effect("exchanges the identity token and authenticates requests with the access token", () =>
    Effect.gen(function*() {
      const http = makeHttp()
      const client = yield* makeClient(http, {
        identityToken: Effect.succeed(Redacted.make(`${IDENTITY_TOKEN}\n`)),
        serviceAccountId: "svac_1",
        workspaceId: "wrkspc_1"
      })

      yield* client.get(API_URL, { headers: { "anthropic-beta": "files-api-2025-04-14" } })

      const [exchange, request] = http.requests
      assert.strictEqual(exchange.method, "POST")
      assert.strictEqual(exchange.url, TOKEN_URL)
      assert.strictEqual(exchange.headers["anthropic-beta"], "oauth-2025-04-20,oidc-federation-2026-04-01")
      assert.deepStrictEqual(bodyJson(exchange), {
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: IDENTITY_TOKEN,
        federation_rule_id: "fdrl_1",
        organization_id: "org_1",
        service_account_id: "svac_1",
        workspace_id: "wrkspc_1"
      })
      assert.strictEqual(request.headers.authorization, "Bearer access-1")
      assert.strictEqual(request.headers["anthropic-beta"], "files-api-2025-04-14,oauth-2025-04-20")
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
      assert.strictEqual(bodyJson(http.requests[3]).assertion, "identity-2")
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
    readonly reason: string
    readonly description: string
    readonly token?: TokenHandler
    readonly identityToken?: Effect.Effect<Redacted.Redacted<string>, Error>
  }>([
    {
      name: "a rejected exchange",
      reason: "AuthenticationError",
      description: "Authentication failed for <redacted>",
      token: () =>
        Effect.succeed(echoResponse(
          JSON.stringify({
            type: "error",
            error: { type: "authentication_error", message: `Authentication failed for ${IDENTITY_TOKEN}` },
            request_id: "req_1",
            [IDENTITY_TOKEN]: true
          }).replaceAll(".", "\\u002e")
        ))
    },
    {
      name: "a rejected exchange with a text body",
      reason: "AuthenticationError",
      description: "Response: Authentication failed for <redacted>",
      token: () => Effect.succeed(echoResponse(`Authentication failed for ${IDENTITY_TOKEN}`))
    },
    {
      name: "an unreachable token endpoint",
      reason: "NetworkError",
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
      reason: "InvalidOutputError",
      description: "invalid token response",
      token: () => Effect.succeed(Response.json({ assertion: IDENTITY_TOKEN }))
    },
    {
      name: "a failing identity token source",
      reason: "NetworkError",
      description: "Failed to load the identity token",
      identityToken: Effect.fail(new Error("ENOENT"))
    },
    {
      name: "an empty identity token",
      reason: "NetworkError",
      description: "The identity token is empty",
      identityToken: Effect.succeed(Redacted.make("\n"))
    }
  ])(
    "maps $name to an AiError without the identity token",
    ({ description, identityToken, reason, token }) =>
      Effect.gen(function*() {
        const http = makeHttp({ token })
        const client = yield* AnthropicClient.AnthropicClient.pipe(
          Effect.provide(Layer.unwrap(Effect.map(
            make(http, { identityToken }),
            (transformClient) => AnthropicClient.layer({ transformClient })
          ))),
          Effect.provideService(HttpClient.HttpClient, http.client)
        )

        const error = yield* Effect.flip(client.createMessage({
          payload: { model: "claude-sonnet-4-20250514", max_tokens: 1, messages: [{ role: "user", content: "hello" }] }
        }))

        assert.strictEqual(error.reason._tag, reason)
        assert.include(error.message, description)
        assert.isFalse(contains(error, IDENTITY_TOKEN))
        assert.lengthOf(http.requests, token === undefined ? 0 : 1)
      })
  )

  it.effect("layer authenticates the HttpClient it provides, and not the exchange", () =>
    Effect.gen(function*() {
      const http = makeHttp()
      const client = yield* AnthropicClient.AnthropicClient.pipe(
        Effect.provide(
          AnthropicClient.layer({}).pipe(
            Layer.provide(AnthropicWorkloadIdentity.layer({
              identityToken: Effect.succeed(Redacted.make(IDENTITY_TOKEN)),
              federationRuleId: "fdrl_1",
              organizationId: "org_1"
            }))
          )
        ),
        Effect.provideService(HttpClient.HttpClient, http.client)
      )

      // The empty response does not decode. Only the requests matter here.
      const createMessage = Effect.exit(client.createMessage({
        payload: { model: "claude-sonnet-4-20250514", max_tokens: 1, messages: [{ role: "user", content: "hello" }] }
      }))
      yield* createMessage
      yield* createMessage

      const messagesUrl = `${API_URL}?beta=true`
      assert.deepStrictEqual(http.requests.map((request) => request.url), [TOKEN_URL, messagesUrl, messagesUrl])
      assert.deepStrictEqual(authorizations(http), [undefined, "Bearer access-1", "Bearer access-1"])
      assert.strictEqual(http.requests[1].headers["anthropic-beta"], "oauth-2025-04-20")
    }))

  it.effect("does not follow a redirect of the exchange", () =>
    Effect.gen(function*() {
      const redirects: Array<RequestRedirect | undefined> = []
      const transform = yield* AnthropicWorkloadIdentity.make({
        identityToken: Effect.succeed(Redacted.make(IDENTITY_TOKEN)),
        federationRuleId: "fdrl_1",
        organizationId: "org_1"
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
      const exit = yield* Effect.exit(make(makeHttp(), { apiUrl: "http://gateway.internal" }))
      assert.isTrue(exit._tag === "Failure" && exit.cause.reasons.every((reason) => reason._tag === "Die"))
    }))
})

type Options = AnthropicWorkloadIdentity.Options<Error>

type TokenHandler = (
  request: HttpClientRequest.HttpClientRequest,
  n: number
) => Effect.Effect<Response, HttpClientError.HttpClientError>

type Http = ReturnType<typeof makeHttp>

// A rejection that echoes the identity token in the body and in a header.
const echoResponse = (body: string) =>
  new Response(body, {
    status: 401,
    headers: { "www-authenticate": `Bearer error_description="${IDENTITY_TOKEN}"` }
  })

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

const make = (http: Http, options: { readonly [K in keyof Options]?: Options[K] | undefined } = {}) =>
  AnthropicWorkloadIdentity.make({
    ...options,
    identityToken: options.identityToken ?? Effect.succeed(Redacted.make(IDENTITY_TOKEN)),
    federationRuleId: "fdrl_1",
    organizationId: "org_1"
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
