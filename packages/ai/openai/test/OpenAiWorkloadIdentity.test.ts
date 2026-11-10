import { OpenAiClient, OpenAiWorkloadIdentity } from "@effect/ai-openai"
import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer, Redacted, Stream } from "effect"
import { HttpClient, HttpClientError, type HttpClientRequest, HttpClientResponse } from "effect/http"
import * as Socket from "effect/socket/Socket"
import { TestClock } from "effect/testing"
import { WS } from "vitest-websocket-mock"

const IDENTITY_TOKEN = "identity.token.signature"
const TOKEN_URL = "https://auth.openai.com/oauth/token"
const API_URL = "https://api.openai.com/v1/responses"

describe("OpenAiWorkloadIdentity", () => {
  it.effect("exchanges the identity token and authenticates requests with the access token", () =>
    Effect.gen(function*() {
      // OpenAI can leave `expires_in` out of the token response.
      const http = makeHttp({ token: () => Effect.succeed(Response.json({ access_token: "access-1" })) })
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
        Effect.succeed(echoResponse(
          JSON.stringify({
            error: "invalid_subject_token",
            error_description: `Authentication failed for ${IDENTITY_TOKEN}`,
            [IDENTITY_TOKEN]: true
          }).replaceAll(".", "\\u002e")
        ))
    },
    {
      name: "a rejected exchange with an escaped identity token",
      reason: "AuthenticationError",
      description: "Authentication failed for <redacted>",
      token: () =>
        Effect.succeed(echoResponse(
          JSON.stringify({
            error: {
              message: `Authentication failed for ${IDENTITY_TOKEN}`,
              type: "invalid_request_error",
              code: "invalid_subject_token"
            }
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

  it.effect("layer authenticates the HttpClient it provides, and not the exchange", () =>
    Effect.gen(function*() {
      const http = makeHttp()
      const client = yield* OpenAiClient.OpenAiClient.pipe(provideLayerClient(http))

      // The empty response does not decode. Only the requests matter here.
      const createResponse = Effect.exit(client.createResponse({ model: "gpt-4o", input: "test" }))
      yield* createResponse
      yield* createResponse

      assert.deepStrictEqual(http.requests.map((request) => request.url), [TOKEN_URL, API_URL, API_URL])
      assert.deepStrictEqual(authorizations(http), [undefined, "Bearer access-1", "Bearer access-1"])
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

    it.effect("keeps using a connected socket after the access token expires", () =>
      Effect.gen(function*() {
        const apiUrl = "https://connected.test/v1"
        const server = yield* makeSocketServer(apiUrl)
        let rejected = false
        const http = makeHttp({
          token: () =>
            Effect.succeed(
              rejected
                ? Response.json({ error: "invalid_subject_token" }, { status: 401 })
                : Response.json({ access_token: "access-1", expires_in: 40 })
            )
        })
        const connections: Array<string | undefined> = []

        yield* Effect.gen(function*() {
          const client = yield* OpenAiClient.OpenAiClient
          const turn = Effect.gen(function*() {
            const [, stream] = yield* client.createResponseStream({ model: "gpt-4o", input: "test" })
            yield* Effect.all([
              Stream.runDrain(stream),
              Effect.promise(() => server.nextMessage).pipe(
                Effect.tap(() => Effect.sync(() => server.send(completedEvent)))
              )
            ], { concurrency: "unbounded" })
          })

          yield* turn
          // The access token is used for 30 seconds, and an idle socket stays open for 60.
          rejected = true
          yield* TestClock.adjust("31 seconds")
          yield* turn
        }).pipe(OpenAiClient.withWebSocketMode, provideSocketClient(http, apiUrl, connections))

        assert.deepStrictEqual(connections, ["Bearer access-1"])
        assert.lengthOf(http.requests, 1)
      }))

    it.effect("authenticates a connection of a client provided with the layer", () =>
      Effect.gen(function*() {
        const apiUrl = "https://layer.test/v1"
        const server = yield* makeSocketServer(apiUrl)
        const http = makeHttp()
        const connections: Array<string | undefined> = []

        yield* Effect.gen(function*() {
          const client = yield* OpenAiClient.OpenAiClient
          const [, stream] = yield* client.createResponseStream({ model: "gpt-4o", input: "test" })
          yield* Effect.all([
            Stream.runDrain(stream),
            Effect.promise(() => server.nextMessage).pipe(
              Effect.tap(() => Effect.sync(() => server.send(completedEvent)))
            )
          ], { concurrency: "unbounded" })
        }).pipe(OpenAiClient.withWebSocketMode, provideLayerClient(http, apiUrl), recordConnections(connections))

        assert.deepStrictEqual(connections, ["Bearer access-1"])
        assert.deepStrictEqual(http.requests.map((request) => request.url), [TOKEN_URL])
        assert.isUndefined(http.requests[0].headers.authorization)
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

type Options = OpenAiWorkloadIdentity.Options<Error>

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

// Provides `OpenAiClient` with the `HttpClient` of `OpenAiWorkloadIdentity.layer`.
const provideLayerClient = (http: Http, apiUrl?: string) => <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  effect.pipe(
    Effect.provide(
      OpenAiClient.layer({ apiUrl }).pipe(
        Layer.provide(OpenAiWorkloadIdentity.layer({
          identityToken: Effect.succeed(Redacted.make(IDENTITY_TOKEN)),
          identityProviderId: "idp_1",
          serviceAccountId: "sa_1"
        }))
      )
    ),
    Effect.provideService(HttpClient.HttpClient, http.client)
  )

// Records the Authorization header of every WebSocket connection.
const recordConnections = (connections: Array<string | undefined>) => <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  Effect.provideService(effect, Socket.WebSocketConstructor, (url, options) => {
    const headers = typeof options === "object" && "headers" in options ? options.headers : undefined
    connections.push((headers as Record<string, string> | undefined)?.authorization)
    return new globalThis.WebSocket(url)
  })

const provideSocketClient =
  (http: Http, apiUrl: string, connections: Array<string | undefined>) => <A, E, R>(effect: Effect.Effect<A, E, R>) =>
    effect.pipe(provideClient(http, undefined, apiUrl), recordConnections(connections))

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
