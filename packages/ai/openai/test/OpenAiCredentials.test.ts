import { OpenAiClient, OpenAiConfig, OpenAiCredentials } from "@effect/ai-openai"
import { assert, describe, it } from "@effect/vitest"
import { Duration, Effect, Exit, Layer, Redacted } from "effect"
import type { AiError } from "effect/ai"
import { WorkloadIdentity } from "effect/ai"
import { HttpClient, type HttpClientError, HttpClientRequest, HttpClientResponse } from "effect/http"
import * as Socket from "effect/socket/Socket"
import * as TestClock from "effect/testing/TestClock"

interface Reply {
  readonly status: number
  readonly body?: unknown
  readonly headers?: Record<string, string>
}

// Records every request and answers token-endpoint calls from `exchange` and
// everything else from `api`, in order.
const makeServer = (script: { exchange?: Array<Reply>; api?: Array<Reply> }) => {
  const requests: Array<HttpClientRequest.HttpClientRequest> = []
  const client = HttpClient.makeWith(
    Effect.fnUntraced(function*(requestEffect) {
      const request = yield* requestEffect
      requests.push(request)
      const queue = request.url.endsWith("/oauth/token") ? script.exchange : script.api
      const reply: Reply = queue?.shift() ?? { status: 500, body: { error: "unscripted" } }
      return HttpClientResponse.fromWeb(
        request,
        new Response(reply.body === undefined ? null : JSON.stringify(reply.body), {
          status: reply.status,
          headers: { "content-type": "application/json", ...reply.headers }
        })
      )
    }),
    Effect.succeed as HttpClient.HttpClient.Preprocess<HttpClientError.HttpClientError, never>
  )
  return { requests, layer: Layer.succeed(HttpClient.HttpClient, client) }
}

const jsonBody = (request: HttpClientRequest.HttpClientRequest): unknown => {
  const body = request.body
  assert.strictEqual(body._tag, "Uint8Array")
  return JSON.parse(new TextDecoder().decode((body as { readonly body: Uint8Array }).body))
}

const okToken = (token = "oat-test", expiresIn: number | undefined = 3600): Reply => ({
  status: 200,
  body: { access_token: token, ...(expiresIn === undefined ? {} : { expires_in: expiresIn }) }
})

const baseOptions = {
  identityToken: WorkloadIdentity.fromRedacted(Redacted.make("header.payload.signature")),
  identityProviderId: "idp_1",
  serviceAccountId: "svc_1"
}

const authenticate = (
  options: OpenAiCredentials.WorkloadIdentityOptions,
  server: ReturnType<typeof makeServer>
) =>
  Effect.gen(function*() {
    const credentials = yield* OpenAiCredentials.makeWorkloadIdentity(options)
    return yield* credentials.authenticate(HttpClientRequest.post("https://api.openai.com/v1/responses"))
  }).pipe(Effect.scoped, Effect.provide(server.layer))

const settle = Effect.yieldNow.pipe(Effect.repeat({ times: 10 }))

describe("OpenAiCredentials", () => {
  describe("workloadIdentity exchange", () => {
    it.effect("sends the RFC 8693 exchange as JSON", () =>
      Effect.gen(function*() {
        const server = makeServer({ exchange: [okToken()] })
        yield* authenticate(baseOptions, server)
        const exchange = server.requests[0]
        assert.strictEqual(exchange.method, "POST")
        assert.strictEqual(exchange.url, "https://auth.openai.com/oauth/token")
        assert.deepStrictEqual(jsonBody(exchange), {
          grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
          subject_token: "header.payload.signature",
          subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
          identity_provider_id: "idp_1",
          service_account_id: "svc_1"
        })
      }))

    it.effect("sends the id_token subject type of the source and the client id when set", () =>
      Effect.gen(function*() {
        const server = makeServer({ exchange: [okToken()] })
        yield* authenticate({
          ...baseOptions,
          identityToken: WorkloadIdentity.fromRedacted(Redacted.make("header.payload.signature"), {
            type: "id_token"
          }),
          clientId: "client_1"
        }, server)
        assert.deepStrictEqual(jsonBody(server.requests[0]), {
          grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
          subject_token: "header.payload.signature",
          subject_token_type: "urn:ietf:params:oauth:token-type:id_token",
          identity_provider_id: "idp_1",
          service_account_id: "svc_1",
          client_id: "client_1"
        })
      }))

    it.effect("omits an empty client id from the exchange body", () =>
      Effect.gen(function*() {
        const server = makeServer({ exchange: [okToken()] })
        yield* authenticate({ ...baseOptions, clientId: "" }, server)
        assert.deepStrictEqual(jsonBody(server.requests[0]), {
          grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
          subject_token: "header.payload.signature",
          subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
          identity_provider_id: "idp_1",
          service_account_id: "svc_1"
        })
      }))

    it.effect("sets the bearer token", () =>
      Effect.gen(function*() {
        const server = makeServer({ exchange: [okToken("oat-1")] })
        const request = yield* authenticate(baseOptions, server)
        assert.strictEqual(request.headers["authorization"], "Bearer oat-1")
      }))

    it.effect("caches the token for an hour when expires_in is absent", () =>
      Effect.gen(function*() {
        const server = makeServer({ exchange: [okToken("t1", undefined), okToken("t2")] })
        yield* Effect.gen(function*() {
          const credentials = yield* OpenAiCredentials.makeWorkloadIdentity(baseOptions)
          const authorization = () =>
            credentials.authenticate(HttpClientRequest.post("https://api.openai.com/v1/responses")).pipe(
              Effect.map((request) => request.headers["authorization"])
            )
          assert.strictEqual(yield* authorization(), "Bearer t1")
          yield* TestClock.adjust(Duration.seconds(3600 - 1201))
          assert.strictEqual(yield* authorization(), "Bearer t1")
          yield* settle
          assert.strictEqual(server.requests.length, 1)
          yield* TestClock.adjust(Duration.seconds(1))
          assert.strictEqual(yield* authorization(), "Bearer t1")
          yield* settle
          assert.strictEqual(server.requests.length, 2)
          assert.strictEqual(yield* authorization(), "Bearer t2")
        }).pipe(Effect.scoped, Effect.provide(server.layer))
      }))

    it.effect("waits five seconds after a failed background refresh before the next", () =>
      Effect.gen(function*() {
        const server = makeServer({ exchange: [okToken("t1"), { status: 503 }, okToken("t2")] })
        yield* Effect.gen(function*() {
          const credentials = yield* OpenAiCredentials.makeWorkloadIdentity(baseOptions)
          const authorization = () =>
            credentials.authenticate(HttpClientRequest.post("https://api.openai.com/v1/responses")).pipe(
              Effect.map((request) => request.headers["authorization"])
            )
          yield* authorization()
          yield* TestClock.adjust(Duration.seconds(3600 - 1200))
          assert.strictEqual(yield* authorization(), "Bearer t1")
          yield* settle
          assert.strictEqual(server.requests.length, 2)
          yield* TestClock.adjust(Duration.millis(4_999))
          assert.strictEqual(yield* authorization(), "Bearer t1")
          yield* settle
          assert.strictEqual(server.requests.length, 2)
          yield* TestClock.adjust(Duration.millis(1))
          assert.strictEqual(yield* authorization(), "Bearer t1")
          yield* settle
          assert.strictEqual(server.requests.length, 3)
          assert.strictEqual(yield* authorization(), "Bearer t2")
        }).pipe(Effect.scoped, Effect.provide(server.layer))
      }))

    it.effect("rejects an unusable token response", () =>
      Effect.gen(function*() {
        const bodies = [
          { access_token: "tok", expires_in: 0 },
          { access_token: "tok", expires_in: -5 },
          { access_token: "" },
          { access_token: "to\nk" },
          { access_token: " tok" },
          { access_token: "tok " }
        ]
        for (const body of bodies) {
          const server = makeServer({ exchange: [{ status: 200, body }] })
          const error = yield* authenticate(baseOptions, server).pipe(Effect.flip)
          assert.strictEqual(error.reason._tag, "InvalidResponseError")
        }
      }))

    it.effect("maps 400, 401 and 403 to an authentication error with a hint", () =>
      Effect.gen(function*() {
        for (const status of [400, 401, 403]) {
          const server = makeServer({ exchange: [{ status, body: { error: "invalid_request" } }] })
          const error = yield* authenticate(baseOptions, server).pipe(Effect.flip)
          assert.strictEqual(error.reason._tag, "AuthenticationError")
          assert.strictEqual((error.reason as AiError.AuthenticationError).kind, "InvalidKey")
          assert.include(error.message, "identity provider")
          assert.include(error.message, "service account")
        }
      }))

    it.effect("maps a 429 to a rate limit error with retry-after and request id", () =>
      Effect.gen(function*() {
        const server = makeServer({
          exchange: [{ status: 429, headers: { "retry-after": "3", "x-request-id": "req_429" }, body: {} }]
        })
        const error = yield* authenticate(baseOptions, server).pipe(Effect.flip)
        assert.strictEqual(error.reason._tag, "RateLimitError")
        const reason = error.reason as AiError.RateLimitError
        assert.isTrue(Duration.equals(reason.retryAfter!, Duration.seconds(3)))
        assert.strictEqual(reason.metadata.openai?.requestId, "req_429")
      }))

    it.effect("does not retry a 503", () =>
      Effect.gen(function*() {
        const server = makeServer({ exchange: [{ status: 503, body: { error: "unavailable" } }, okToken()] })
        const error = yield* authenticate(baseOptions, server).pipe(Effect.flip)
        assert.strictEqual(error.reason._tag, "InternalProviderError")
        assert.strictEqual(server.requests.length, 1)
      }))

    it.effect("does not follow a redirect", () =>
      Effect.gen(function*() {
        const server = makeServer({
          exchange: [{ status: 307, headers: { location: "https://evil.example.com/token" } }, okToken()]
        })
        const error = yield* authenticate(baseOptions, server).pipe(Effect.flip)
        assert.strictEqual(error.reason._tag, "AuthenticationError")
        assert.strictEqual(server.requests.length, 1)
      }))

    it.effect("carries error type and request id in the OpenAI metadata", () =>
      Effect.gen(function*() {
        const server = makeServer({
          exchange: [{
            status: 401,
            headers: { "x-request-id": "req_1" },
            body: { error: { type: "invalid_request_error" } }
          }]
        })
        const error = yield* authenticate(baseOptions, server).pipe(Effect.flip)
        assert.deepStrictEqual((error.reason as AiError.AuthenticationError).metadata.openai, {
          errorCode: null,
          errorType: "invalid_request_error",
          requestId: "req_1"
        })
      }))

    it.effect("rejects a non-https token URL as a defect and accepts http on localhost", () =>
      Effect.gen(function*() {
        const server = makeServer({ exchange: [okToken()] })
        const exit = yield* authenticate({ ...baseOptions, tokenUrl: "http://example.com/oauth/token" }, server).pipe(
          Effect.exit
        )
        assert.isTrue(exit._tag === "Failure" && exit.cause.reasons.some((reason) => reason._tag === "Die"))
        assert.strictEqual(server.requests.length, 0)

        yield* authenticate({ ...baseOptions, tokenUrl: "http://localhost:8080/oauth/token" }, server)
        assert.strictEqual(server.requests[0].url, "http://localhost:8080/oauth/token")
      }))
  })

  it.effect("layerWorkloadIdentity provides OpenAiCredentials", () =>
    Effect.gen(function*() {
      const server = makeServer({ exchange: [okToken("oat-layer")] })
      const request = yield* Effect.gen(function*() {
        const credentials = yield* OpenAiCredentials.OpenAiCredentials
        return yield* credentials.authenticate(HttpClientRequest.post("https://api.openai.com/v1/responses"))
      }).pipe(
        Effect.provide(OpenAiCredentials.layerWorkloadIdentity(baseOptions)),
        Effect.provide(server.layer)
      )
      assert.strictEqual(request.headers["authorization"], "Bearer oat-layer")
    }))

  it.effect("apiKey sets Authorization: Bearer", () =>
    Effect.gen(function*() {
      const credentials = OpenAiCredentials.apiKey(Redacted.make("sk-test"))
      const request = yield* credentials.authenticate(HttpClientRequest.post("https://api.openai.com/v1/responses"))
      assert.strictEqual(request.headers["authorization"], "Bearer sk-test")
    }))

  describe("OpenAiClient integration", () => {
    const responseBody = {
      id: "resp_test123",
      object: "response",
      created_at: 1,
      model: "gpt-4o-mini",
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

    const payload = { model: "gpt-4o", input: "hello" }

    const clientLayer = (server: ReturnType<typeof makeServer>, options: OpenAiClient.Options = {}) =>
      Layer.unwrap(Effect.map(
        OpenAiCredentials.makeWorkloadIdentity(baseOptions),
        (credentials) => OpenAiClient.layer({ ...options, credentials })
      )).pipe(Layer.provide(server.layer))

    const createResponse = Effect.gen(function*() {
      const client = yield* OpenAiClient.OpenAiClient
      return yield* client.createResponse(payload)
    })

    it.effect("sends the federated bearer token with the organization and project headers", () =>
      Effect.gen(function*() {
        const server = makeServer({ exchange: [okToken("oat-1")], api: [{ status: 200, body: responseBody }] })
        yield* createResponse.pipe(Effect.provide(clientLayer(server, {
          organizationId: Redacted.make("org-1"),
          projectId: Redacted.make("proj-1")
        })))
        const api = server.requests[1]
        assert.strictEqual(api.url, "https://api.openai.com/v1/responses")
        assert.strictEqual(api.headers["authorization"], "Bearer oat-1")
        assert.strictEqual(api.headers["openai-organization"], "org-1")
        assert.strictEqual(api.headers["openai-project"], "proj-1")
      }))

    it.effect("replays a 401 from createResponse once with a new token", () =>
      Effect.gen(function*() {
        const server = makeServer({
          exchange: [okToken("first"), okToken("second")],
          api: [
            { status: 401, body: { error: { type: "invalid_request_error", message: "expired" } } },
            { status: 200, body: responseBody }
          ]
        })
        yield* createResponse.pipe(Effect.provide(clientLayer(server)))
        const api = server.requests.filter((request) => request.url.endsWith("/responses"))
        assert.deepStrictEqual(api.map((request) => request.headers["authorization"]), [
          "Bearer first",
          "Bearer second"
        ])
      }))

    it.effect("surfaces an exchange failure from createResponse as the credentials AiError", () =>
      Effect.gen(function*() {
        const server = makeServer({ exchange: [{ status: 401, body: { error: "invalid_grant" } }] })
        const error = yield* createResponse.pipe(Effect.flip, Effect.provide(clientLayer(server)))
        assert.strictEqual(error.module, "OpenAiCredentials")
        assert.strictEqual(error.reason._tag, "AuthenticationError")
      }))

    it.effect("passing both apiKey and credentials is a defect", () =>
      Effect.gen(function*() {
        const exit = yield* OpenAiClient.make({
          apiKey: Redacted.make("sk-test"),
          credentials: OpenAiCredentials.apiKey(Redacted.make("sk-other"))
        }).pipe(Effect.provide(makeServer({}).layer), Effect.exit)
        assert.isTrue(Exit.hasDies(exit))
      }))

    it.effect("uses OpenAiCredentials from context when no option is passed", () =>
      Effect.gen(function*() {
        const server = makeServer({ api: [{ status: 200, body: responseBody }] })
        yield* createResponse.pipe(
          Effect.provide(OpenAiClient.layer({})),
          Effect.provide(Layer.succeed(
            OpenAiCredentials.OpenAiCredentials,
            OpenAiCredentials.apiKey(Redacted.make("sk-context"))
          )),
          Effect.provide(server.layer)
        )
        assert.strictEqual(server.requests[0].headers["authorization"], "Bearer sk-context")
      }))

    it.effect("apiKey sends Authorization: Bearer", () =>
      Effect.gen(function*() {
        const server = makeServer({ api: [{ status: 200, body: responseBody }] })
        yield* createResponse.pipe(
          Effect.provide(OpenAiClient.layer({ apiKey: Redacted.make("sk-key") })),
          Effect.provide(server.layer)
        )
        assert.strictEqual(server.requests[0].headers["authorization"], "Bearer sk-key")
      }))

    it.effect("transformClient cannot remove or overwrite the credentials", () =>
      Effect.gen(function*() {
        const transforms = [
          HttpClient.mapRequest(HttpClientRequest.removeHeader("authorization")),
          HttpClient.mapRequest(HttpClientRequest.setHeader("authorization", "tampered"))
        ]
        for (const transformClient of transforms) {
          const server = makeServer({ exchange: [okToken()], api: [{ status: 200, body: responseBody }] })
          yield* createResponse.pipe(Effect.provide(clientLayer(server, { transformClient })))
          assert.strictEqual(server.requests[1].headers["authorization"], "Bearer oat-test")
        }
      }))

    it.effect("OpenAiConfig.withClientTransform sees the authenticated request", () =>
      Effect.gen(function*() {
        const server = makeServer({ exchange: [okToken()], api: [{ status: 200, body: responseBody }] })
        const seen: Array<string | undefined> = []
        yield* createResponse.pipe(
          OpenAiConfig.withClientTransform(
            HttpClient.tapRequest((request) => Effect.sync(() => seen.push(request.headers["authorization"])))
          ),
          Effect.provide(clientLayer(server))
        )
        assert.deepStrictEqual(seen, ["Bearer oat-test"])
      }))

    it.effect("opens the WebSocket with the federated bearer token", () =>
      Effect.gen(function*() {
        const server = makeServer({ exchange: [okToken("oat-ws")] })
        const options: Array<Socket.WebSocketConstructorOptions | undefined> = []
        yield* OpenAiClient.withWebSocketMode(
          Effect.gen(function*() {
            const client = yield* OpenAiClient.OpenAiClient
            return yield* client.createResponseStream(payload)
          })
        ).pipe(
          Effect.provide(clientLayer(server)),
          Effect.provideService(Socket.WebSocketConstructor, (_url, socketOptions) => {
            options.push(socketOptions)
            throw new Error("handshake recorded")
          }),
          Effect.exit
        )
        assert.strictEqual(options.length, 1)
        const headers = (options[0] as Socket.WebSocketClientOptions).headers
        assert.strictEqual(headers?.["authorization"], "Bearer oat-ws")
      }))

    it.effect("fails createResponseStream in WebSocket mode with the credentials AiError", () =>
      Effect.gen(function*() {
        const server = makeServer({
          exchange: [
            { status: 401, body: { error: "invalid_grant" } },
            { status: 401, body: { error: "invalid_grant" } }
          ]
        })
        const exit = yield* OpenAiClient.withWebSocketMode(
          Effect.gen(function*() {
            const client = yield* OpenAiClient.OpenAiClient
            return yield* client.createResponseStream(payload)
          })
        ).pipe(
          Effect.provide(clientLayer(server)),
          Effect.provideService(Socket.WebSocketConstructor, () => {
            throw new Error("the socket must not be opened")
          }),
          Effect.exit
        )
        assert.isTrue(Exit.isFailure(exit) && !Exit.hasDies(exit))
        const error = yield* exit.pipe(Effect.flip)
        assert.strictEqual(error.module, "OpenAiCredentials")
        assert.strictEqual(error.reason._tag, "AuthenticationError")
      }))
  })
})
