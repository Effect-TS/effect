import { OpenAiClient, OpenAiWorkloadIdentity } from "@effect/ai-openai"
import { assert, describe, it } from "@effect/vitest"
import { Deferred, Effect, Fiber, Layer, Redacted, Stream } from "effect"
import { FetchHttpClient, HttpClient, HttpClientError, type HttpClientRequest, HttpClientResponse } from "effect/http"
import * as Socket from "effect/socket/Socket"
import { TestClock } from "effect/testing"
import { WS } from "vitest-websocket-mock"

const IDENTITY_TOKEN = "identity.token.signature"
const TOKEN_URL = "https://auth.openai.com/oauth/token"
const API_URL = "https://api.openai.com/v1/responses"

describe("OpenAiWorkloadIdentity", () => {
  it.effect("exchanges the identity token and authenticates requests with the access token", () =>
    Effect.gen(function*() {
      const http = makeHttp()
      const client = yield* makeClient(http, {
        identityToken: Effect.succeed(Redacted.make(`${IDENTITY_TOKEN}\n`)),
        identityTokenType: "id_token"
      })

      yield* client.get(API_URL)

      const [exchange, request] = http.requests
      assert.strictEqual(exchange.method, "POST")
      assert.strictEqual(exchange.url, TOKEN_URL)
      assert.deepStrictEqual(bodyJson(exchange), {
        grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
        subject_token: IDENTITY_TOKEN,
        subject_token_type: "urn:ietf:params:oauth:token-type:id_token",
        identity_provider_id: "idp_1",
        service_account_id: "sa_1"
      })
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
      assert.strictEqual(bodyJson(http.requests[3]).subject_token, "identity-2")
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
      description: "invalid_subject_token",
      token: () =>
        Effect.succeed(Response.json({
          error: "invalid_subject_token",
          error_description: `Authentication failed for ${IDENTITY_TOKEN}`
        }, { status: 401 }))
    },
    {
      name: "an unreachable token endpoint",
      reason: "NetworkError",
      description: "socket hang up",
      token: (request) =>
        Effect.fail(
          new HttpClientError.HttpClientError({
            reason: new HttpClientError.TransportError({ request, description: "socket hang up" })
          })
        )
    },
    {
      name: "an invalid token response",
      reason: "InvalidOutputError",
      description: "invalid token response",
      token: () => Effect.succeed(Response.json({ subject_token: IDENTITY_TOKEN }))
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
        const client = yield* OpenAiClient.OpenAiClient.pipe(provideClient(http, { identityToken }))

        const error = yield* Effect.flip(client.createResponse({ model: "gpt-4o", input: "test" }))

        assert.strictEqual(error.reason._tag, reason)
        assert.include(error.message, description)
        assert.isFalse(contains(error, IDENTITY_TOKEN))
        assert.lengthOf(http.requests, token === undefined ? 0 : 1)
      })
  )

  it.effect("does not follow a redirect of the exchange", () =>
    Effect.gen(function*() {
      const redirects: Array<RequestRedirect | undefined> = []
      const transform = yield* OpenAiWorkloadIdentity.make({
        identityToken: Effect.succeed(Redacted.make(IDENTITY_TOKEN)),
        identityProviderId: "idp_1",
        serviceAccountId: "sa_1"
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

  describe("WebSocket mode", () => {
    it.effect("authenticates each connection with the current access token", () =>
      Effect.gen(function*() {
        const apiUrl = "https://connections.test/v1"
        const server = yield* makeSocketServer(apiUrl)
        const http = makeHttp()
        const connections: Array<string | undefined> = []

        yield* Effect.gen(function*() {
          const client = yield* OpenAiClient.OpenAiClient
          // An error event makes the client replace the connection.
          const failedTurn = Effect.gen(function*() {
            const [, stream] = yield* client.createResponseStream({ model: "gpt-4o", input: "test" })
            yield* Effect.all([
              Effect.flip(Stream.runDrain(stream)),
              Effect.promise(() => server.nextMessage).pipe(
                Effect.tap(() =>
                  Effect.sync(() => server.send({ type: "error", code: "server_error", message: "bad", param: null }))
                )
              )
            ], { concurrency: "unbounded" })
          })

          yield* failedTurn
          yield* TestClock.adjust("1 hour")
          yield* failedTurn
        }).pipe(OpenAiClient.withWebSocketMode, provideSocketClient(http, apiUrl, connections))

        assert.deepStrictEqual(connections, ["Bearer access-1", "Bearer access-2"])
      }))

    it.effect("fails the stream when the exchange fails, and connects once it succeeds", () =>
      Effect.gen(function*() {
        const apiUrl = "https://exchange-failure.test/v1"
        const server = yield* makeSocketServer(apiUrl)
        let rejected = true
        const http = makeHttp({
          token: (_, n) =>
            Effect.succeed(
              rejected
                ? Response.json({ error: "invalid_subject_token", error_description: IDENTITY_TOKEN }, { status: 401 })
                : tokenResponse(n)
            )
        })
        const connections: Array<string | undefined> = []

        yield* Effect.gen(function*() {
          const client = yield* OpenAiClient.OpenAiClient
          const error = yield* Effect.flip(client.createResponseStream({ model: "gpt-4o", input: "test" }))
          assert.strictEqual(error.reason._tag, "AuthenticationError")
          assert.isFalse(contains(error, IDENTITY_TOKEN))
          assert.deepStrictEqual(connections, [])

          rejected = false
          const [, stream] = yield* client.createResponseStream({ model: "gpt-4o", input: "test" })
          const [events] = yield* Effect.all([
            Stream.runCollect(stream),
            Effect.promise(() => server.nextMessage).pipe(
              Effect.tap(() => Effect.sync(() => server.send(completedEvent)))
            )
          ], { concurrency: "unbounded" })
          assert.deepStrictEqual(events.map((event) => event.type), ["response.completed"])
        }).pipe(OpenAiClient.withWebSocketMode, provideSocketClient(http, apiUrl, connections))

        assert.deepStrictEqual(connections, ["Bearer access-3"])
      }))

    it.effect("fails the stream when the handshake is rejected, keeping the access token", () =>
      Effect.gen(function*() {
        const apiUrl = "https://handshake.test/v1"
        yield* makeSocketServer(apiUrl, { verifyClient: () => false })
        const http = makeHttp()
        const connections: Array<string | undefined> = []

        yield* Effect.gen(function*() {
          const client = yield* OpenAiClient.OpenAiClient
          for (let i = 0; i < 2; i++) {
            const [, stream] = yield* client.createResponseStream({ model: "gpt-4o", input: "test" })
            const error = yield* Effect.flip(Stream.runDrain(stream))
            assert.strictEqual(error.reason._tag, "NetworkError")
          }
        }).pipe(OpenAiClient.withWebSocketMode, provideSocketClient(http, apiUrl, connections))

        assert.isTrue(connections.length >= 2 && connections.every((header) => header === "Bearer access-1"))
      }))
  })
})

type Options = Parameters<typeof OpenAiWorkloadIdentity.make<Error, never>>[0]

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

const make = (http: Http, options: { readonly [K in keyof Options]?: Options[K] | undefined } = {}) =>
  OpenAiWorkloadIdentity.make({
    ...options,
    identityToken: options.identityToken ?? Effect.succeed(Redacted.make(IDENTITY_TOKEN)),
    identityProviderId: "idp_1",
    serviceAccountId: "sa_1"
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

const provideClient =
  (http: Http, options?: Parameters<typeof make>[1], apiUrl?: string) => <A, E, R>(effect: Effect.Effect<A, E, R>) =>
    effect.pipe(
      Effect.provide(Layer.unwrap(Effect.map(
        make(http, options),
        (transformClient) => OpenAiClient.layer({ apiUrl, transformClient })
      ))),
      Effect.provideService(HttpClient.HttpClient, http.client)
    )

const makeSocketServer = (apiUrl: string, options?: ConstructorParameters<typeof WS>[1]) =>
  Effect.acquireRelease(
    Effect.sync(() => new WS(`${apiUrl.replace("https", "wss")}/responses`, { jsonProtocol: true, ...options })),
    (server) => Effect.sync(() => server.close())
  )

// Records the Authorization header of every WebSocket connection.
const provideSocketClient =
  (http: Http, apiUrl: string, connections: Array<string | undefined>) => <A, E, R>(effect: Effect.Effect<A, E, R>) =>
    effect.pipe(
      provideClient(http, undefined, apiUrl),
      Effect.provideService(Socket.WebSocketConstructor, (url, options) => {
        const headers = typeof options === "object" && "headers" in options ? options.headers : undefined
        connections.push((headers as Record<string, string> | undefined)?.authorization)
        return new globalThis.WebSocket(url)
      })
    )

const completedEvent = {
  type: "response.completed",
  sequence_number: 1,
  response: {
    id: "resp_1",
    object: "response",
    created_at: 1,
    model: "gpt-4o",
    status: "completed",
    output: [],
    metadata: null,
    temperature: null,
    top_p: null,
    tools: [],
    tool_choice: "auto",
    error: null,
    incomplete_details: null,
    instructions: null,
    parallel_tool_calls: false
  }
}
