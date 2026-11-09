import { AnthropicClient, AnthropicConfig, AnthropicCredentials } from "@effect/ai-anthropic"
import { assert, describe, it } from "@effect/vitest"
import { Config, ConfigProvider, Duration, Effect, Exit, FileSystem, Layer, Option, Redacted } from "effect"
import type { AiError } from "effect/ai"
import { WorkloadIdentity } from "effect/ai"
import {
  FetchHttpClient,
  Headers,
  HttpClient,
  HttpClientError,
  HttpClientRequest,
  HttpClientResponse
} from "effect/http"

interface Reply {
  readonly status: number
  readonly body?: unknown
  readonly rawBody?: string
  readonly headers?: Record<string, string>
  // Answers with a body whose stream fails after the headers arrive.
  readonly failBody?: boolean
}

// Records every request and answers token-endpoint calls from `exchange` and
// everything else from `api`, in order.
const makeServer = (script: { exchange?: Array<Reply>; api?: Array<Reply> }) => {
  const requests: Array<HttpClientRequest.HttpClientRequest> = []
  const fetchInits: Array<globalThis.RequestInit | undefined> = []
  const client = HttpClient.makeWith(
    Effect.fnUntraced(function*(requestEffect) {
      const request = yield* requestEffect
      requests.push(request)
      fetchInits.push(Option.getOrUndefined(yield* Effect.serviceOption(FetchHttpClient.RequestInit)))
      const queue = request.url.endsWith("/v1/oauth/token") ? script.exchange : script.api
      const reply: Reply = queue?.shift() ?? { status: 500, body: { error: "unscripted" } }
      // A fetch with `redirect: "manual"` answers a redirect with an opaque
      // response, whose status is 0; only `Response.error()` can build one.
      if (reply.status === 0) return HttpClientResponse.fromWeb(request, Response.error())
      const body = reply.failBody
        ? new ReadableStream({
          pull(controller) {
            controller.error(new Error("connection reset"))
          }
        })
        : reply.rawBody ?? (reply.body === undefined ? null : JSON.stringify(reply.body))
      return HttpClientResponse.fromWeb(
        request,
        new Response(body, {
          status: reply.status,
          headers: { "content-type": "application/json", ...reply.headers }
        })
      )
    }),
    Effect.succeed as HttpClient.HttpClient.Preprocess<HttpClientError.HttpClientError, never>
  )
  return { requests, fetchInits, layer: Layer.succeed(HttpClient.HttpClient, client) }
}

const jsonBody = (request: HttpClientRequest.HttpClientRequest): unknown => {
  const body = request.body
  assert.strictEqual(body._tag, "Uint8Array")
  return JSON.parse(new TextDecoder().decode((body as { readonly body: Uint8Array }).body))
}

// Whether `assertion` is reachable from `value` through own properties, as a
// string or as encoded bytes.
const reaches = (value: unknown, assertion: string, seen = new Set<unknown>()): boolean => {
  if (typeof value === "string") return value.includes(assertion)
  if (value instanceof Uint8Array) return new TextDecoder().decode(value).includes(assertion)
  if (typeof value !== "object" || value === null || seen.has(value)) return false
  seen.add(value)
  return Object.getOwnPropertyNames(value).some((key) =>
    key !== "stack" && reaches((value as Record<string, unknown>)[key], assertion, seen)
  )
}

const okToken = (token = "sk-ant-oat01-test", expiresIn = 3600): Reply => ({
  status: 200,
  body: { access_token: token, token_type: "Bearer", expires_in: expiresIn, scope: "workspace:developer" }
})

const baseOptions = {
  identityToken: WorkloadIdentity.fromRedacted(Redacted.make("header.payload.signature")),
  federationRuleId: "fdrl_1",
  organizationId: "00000000-0000-0000-0000-000000000000"
}

const authenticate = (
  options: AnthropicCredentials.WorkloadIdentityOptions,
  server: ReturnType<typeof makeServer>
) =>
  Effect.gen(function*() {
    const credentials = yield* AnthropicCredentials.makeWorkloadIdentity(options)
    return yield* credentials.authenticate(HttpClientRequest.post("https://api.anthropic.com/v1/messages"))
  }).pipe(Effect.scoped, Effect.provide(server.layer))

describe("AnthropicCredentials", () => {
  describe("workloadIdentity exchange", () => {
    it.effect("does not follow a redirect from the token endpoint", () =>
      Effect.gen(function*() {
        const server = makeServer({
          exchange: [{ status: 307, headers: { location: "https://evil.example.com/token" } }, okToken()]
        })
        const error = yield* authenticate(baseOptions, server).pipe(Effect.flip)
        assert.strictEqual(error.reason._tag, "AuthenticationError")
        assert.include(error.message, "redirect")
        assert.strictEqual(server.requests.length, 1)
      }))

    it.effect("treats an opaque redirect as a redirect", () =>
      Effect.gen(function*() {
        const server = makeServer({ exchange: [{ status: 0 }, okToken()] })
        const error = yield* authenticate(baseOptions, server).pipe(Effect.flip)
        assert.strictEqual(error.reason._tag, "AuthenticationError")
        assert.include(error.message, "redirect")
        assert.strictEqual(server.requests.length, 1)
      }))

    it.effect("runs the exchange with manual redirects and keeps other RequestInit fields", () =>
      Effect.gen(function*() {
        const server = makeServer({ exchange: [okToken()] })
        yield* authenticate(baseOptions, server).pipe(
          Effect.provideService(FetchHttpClient.RequestInit, { credentials: "omit", redirect: "follow" })
        )
        assert.deepStrictEqual(server.fetchInits[0], { credentials: "omit", redirect: "manual" })

        const plain = makeServer({ exchange: [okToken()] })
        yield* authenticate(baseOptions, plain)
        assert.deepStrictEqual(plain.fetchInits[0], { redirect: "manual" })
      }))

    it.effect("maps a 429 to a rate limit error carrying retry-after", () =>
      Effect.gen(function*() {
        const server = makeServer({
          exchange: [{ status: 429, headers: { "retry-after": "3" }, body: { error: "rate_limited" } }]
        })
        const error = yield* authenticate(baseOptions, server).pipe(Effect.flip)
        assert.strictEqual(error.reason._tag, "RateLimitError")
        const reason = error.reason as AiError.RateLimitError
        assert.isTrue(Duration.equals(reason.retryAfter!, Duration.seconds(3)))
      }))

    it.effect("carries the request id and error type in the Anthropic metadata", () =>
      Effect.gen(function*() {
        const limited = makeServer({
          exchange: [{ status: 429, headers: { "retry-after": "3", "request-id": "req_429" }, body: {} }]
        })
        const rateLimit = (yield* authenticate(baseOptions, limited).pipe(Effect.flip)).reason as AiError.RateLimitError
        assert.isTrue(Duration.equals(rateLimit.retryAfter!, Duration.seconds(3)))
        assert.strictEqual(rateLimit.metadata.anthropic?.requestId, "req_429")
        assert.isNull(rateLimit.metadata.anthropic?.errorType)

        const cases = [
          {
            reply: { status: 401, body: { error: { type: "authentication_error" } } },
            tag: "AuthenticationError",
            errorType: "authentication_error"
          },
          {
            reply: { status: 400, body: { error: "invalid_grant" } },
            tag: "AuthenticationError",
            errorType: "invalid_grant"
          },
          {
            reply: { status: 503, body: { error: "temporarily_unavailable" } },
            tag: "InternalProviderError",
            errorType: "temporarily_unavailable"
          },
          { reply: { status: 200, body: { access_token: "x" } }, tag: "InvalidResponseError", errorType: null }
        ]
        for (const { errorType, reply, tag } of cases) {
          const server = makeServer({ exchange: [{ ...reply, headers: { "request-id": "req_1" } }] })
          const error = yield* authenticate(baseOptions, server).pipe(Effect.flip)
          assert.strictEqual(error.reason._tag, tag)
          const metadata = (error.reason as AiError.AuthenticationError).metadata.anthropic
          assert.deepStrictEqual(metadata, { errorType, requestId: "req_1" })
        }
      }))

    it.effect("keeps error descriptions within 2000 characters without splitting a surrogate pair", () =>
      Effect.gen(function*() {
        for (const padding of [1997, 1998]) {
          const message = `${"a".repeat(padding)}😀😀`
          const server = makeServer({ exchange: [{ status: 400, body: { error_description: message } }] })
          const error = yield* authenticate(baseOptions, server).pipe(Effect.flip)
          const reason = error.reason as AiError.AuthenticationError
          const description = reason.description!.slice(reason.description!.indexOf(": ") + 2)
          assert.isAtMost(description.length, 2000)
          assert.isTrue(description.endsWith("…"))
          assert.notMatch(description, /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/)
        }
      }))

    it.effect("does not echo token_type from a rejected response", () =>
      Effect.gen(function*() {
        const server = makeServer({
          exchange: [{ status: 200, body: { access_token: "x", token_type: "MAC-ECHO", expires_in: 3600 } }]
        })
        const error = yield* authenticate(baseOptions, server).pipe(Effect.flip)
        assert.strictEqual(error.reason._tag, "InvalidResponseError")
        assert.notInclude(error.message, "MAC-ECHO")
      }))

    it.effect("accepts a response without token_type", () =>
      Effect.gen(function*() {
        const server = makeServer({ exchange: [{ status: 200, body: { access_token: "tok", expires_in: 3600 } }] })
        const request = yield* authenticate(baseOptions, server)
        assert.strictEqual(request.headers["authorization"], "Bearer tok")
      }))

    it.effect("rejects a response body over 1 MiB", () =>
      Effect.gen(function*() {
        const server = makeServer({ exchange: [{ status: 200, rawBody: "a".repeat(1024 * 1024 + 1) }] })
        const error = yield* authenticate(baseOptions, server).pipe(Effect.flip)
        assert.strictEqual(error.reason._tag, "InvalidResponseError")
        assert.include(error.message, "1 MiB")
      }))

    it.effect("reports a transport failure as a network error with the token URL", () =>
      Effect.gen(function*() {
        const failing = HttpClient.make((request) =>
          Effect.fail(
            new HttpClientError.HttpClientError({
              reason: new HttpClientError.TransportError({ request, description: "connection refused" })
            })
          )
        )
        const error = yield* Effect.gen(function*() {
          const credentials = yield* AnthropicCredentials.makeWorkloadIdentity(baseOptions)
          return yield* credentials.authenticate(HttpClientRequest.post("https://api.anthropic.com/v1/messages"))
        }).pipe(Effect.scoped, Effect.provideService(HttpClient.HttpClient, failing), Effect.flip)
        assert.strictEqual(error.reason._tag, "NetworkError")
        assert.strictEqual((error.reason as AiError.NetworkError).url, "https://api.anthropic.com/v1/oauth/token")
        assert.include(error.message, "connection refused")
        assert.isFalse(reaches(error, "header.payload.signature"))
      }))

    it.effect("reports a failure reading the token response as a network error with the token URL", () =>
      Effect.gen(function*() {
        const server = makeServer({ exchange: [{ status: 200, failBody: true }] })
        const error = yield* authenticate(baseOptions, server).pipe(Effect.flip)
        assert.strictEqual(error.reason._tag, "NetworkError")
        assert.strictEqual((error.reason as AiError.NetworkError).url, "https://api.anthropic.com/v1/oauth/token")
        assert.isFalse(reaches(error, "header.payload.signature"))
      }))

    it.effect("sends the jwt-bearer exchange with beta and user-agent headers", () =>
      Effect.gen(function*() {
        const server = makeServer({ exchange: [okToken()] })
        yield* authenticate(baseOptions, server)
        const exchange = server.requests[0]
        assert.strictEqual(exchange.method, "POST")
        assert.strictEqual(exchange.url, "https://api.anthropic.com/v1/oauth/token")
        assert.strictEqual(exchange.headers["anthropic-beta"], "oauth-2025-04-20,oidc-federation-2026-04-01")
        assert.include(exchange.headers["user-agent"], "workloadIdentity")
        assert.deepStrictEqual(jsonBody(exchange), {
          grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
          assertion: "header.payload.signature",
          federation_rule_id: "fdrl_1",
          organization_id: "00000000-0000-0000-0000-000000000000"
        })
      }))

    it.effect("includes service_account_id and workspace_id when set", () =>
      Effect.gen(function*() {
        const server = makeServer({ exchange: [okToken()] })
        yield* authenticate({ ...baseOptions, serviceAccountId: "svac_1", workspaceId: "wrkspc_1" }, server)
        const body = jsonBody(server.requests[0]) as Record<string, string>
        assert.strictEqual(body.service_account_id, "svac_1")
        assert.strictEqual(body.workspace_id, "wrkspc_1")
      }))

    it.effect("sets the bearer token and merges the OAuth beta into existing betas", () =>
      Effect.gen(function*() {
        const credentials = yield* AnthropicCredentials.makeWorkloadIdentity(baseOptions)
        const request = yield* credentials.authenticate(
          HttpClientRequest.post("https://api.anthropic.com/v1/messages").pipe(
            HttpClientRequest.setHeader("anthropic-beta", "files-api-2025-04-14, oauth-2025-04-20")
          )
        )
        assert.strictEqual(request.headers["authorization"], "Bearer sk-ant-oat01-test")
        assert.strictEqual(request.headers["anthropic-beta"], "files-api-2025-04-14, oauth-2025-04-20")
        const fresh = yield* credentials.authenticate(HttpClientRequest.post("https://api.anthropic.com/v1/messages"))
        assert.strictEqual(fresh.headers["anthropic-beta"], "oauth-2025-04-20")
        const other = yield* credentials.authenticate(
          HttpClientRequest.post("https://api.anthropic.com/v1/messages").pipe(
            HttpClientRequest.setHeader("anthropic-beta", "files-api-2025-04-14")
          )
        )
        assert.strictEqual(other.headers["anthropic-beta"], "files-api-2025-04-14,oauth-2025-04-20")
      }).pipe(Effect.scoped, Effect.provide(makeServer({ exchange: [okToken()] }).layer)))

    it.effect.each([
      { url: "https://auth.example.com/token", ok: true },
      { url: "http://localhost:8080/v1/oauth/token", ok: true },
      { url: "http://127.0.0.1/v1/oauth/token", ok: true },
      { url: "http://[::1]/v1/oauth/token", ok: true },
      { url: "http://LOCALHOST/v1/oauth/token", ok: true },
      { url: "http://example.com/v1/oauth/token", ok: false },
      { url: "http://127.0.0.2/v1/oauth/token", ok: false },
      { url: "not a url", ok: false }
    ])("token URL $url accepted: $ok", ({ ok, url }) =>
      Effect.gen(function*() {
        const exit = yield* AnthropicCredentials.makeWorkloadIdentity({ ...baseOptions, tokenUrl: url }).pipe(
          Effect.scoped,
          Effect.provide(makeServer({}).layer),
          Effect.exit
        )
        assert.strictEqual(Exit.isSuccess(exit), ok)
        if (!ok) assert.isTrue(Exit.hasDies(exit))
      }))

    it.effect("rejects an assertion over 16 KiB without a request", () =>
      Effect.gen(function*() {
        const server = makeServer({ exchange: [okToken()] })
        const error = yield* authenticate({
          ...baseOptions,
          identityToken: WorkloadIdentity.fromRedacted(Redacted.make("a".repeat(16 * 1024 + 1)))
        }, server).pipe(Effect.flip)
        assert.strictEqual(error.reason._tag, "AuthenticationError")
        assert.strictEqual(server.requests.length, 0)
      }))

    it.effect("maps a 401 to an authentication error with the workspace hint when workspaceId is unset", () =>
      Effect.gen(function*() {
        const server = makeServer({
          exchange: [{
            status: 401,
            headers: { "request-id": "req_123" },
            body: { type: "error", error: { type: "authentication_error", message: "Authentication failed" } }
          }]
        })
        const error = yield* authenticate(baseOptions, server).pipe(Effect.flip)
        assert.strictEqual(error.reason._tag, "AuthenticationError")
        assert.include(error.message, "req_123")
        assert.include(error.message, "authentication_error: Authentication failed")
        assert.include(error.message, "ANTHROPIC_WORKSPACE_ID")
        assert.include(error.message, "jti_reused")
      }))

    it.effect("omits the workspace hint when workspaceId is set", () =>
      Effect.gen(function*() {
        const server = makeServer({ exchange: [{ status: 401, body: { error: { type: "authentication_error" } } }] })
        const error = yield* authenticate({ ...baseOptions, workspaceId: "wrkspc_1" }, server).pipe(Effect.flip)
        assert.notInclude(error.message, "ANTHROPIC_WORKSPACE_ID")
      }))

    it.effect("does not retry a 503", () =>
      Effect.gen(function*() {
        const server = makeServer({
          exchange: [{ status: 503, body: { error: "temporarily_unavailable" } }, okToken()]
        })
        const error = yield* authenticate(baseOptions, server).pipe(Effect.flip)
        assert.strictEqual(error.reason._tag, "InternalProviderError")
        assert.strictEqual(server.requests.length, 1)
      }))

    it.effect("never copies non-standard error fields into the description", () =>
      Effect.gen(function*() {
        const server = makeServer({
          exchange: [{ status: 400, body: { error: "invalid_request", assertion: "header.payload.signature" } }]
        })
        const error = yield* authenticate(baseOptions, server).pipe(Effect.flip)
        assert.include(error.message, "invalid_request")
        assert.notInclude(error.message, "header.payload.signature")
      }))

    it.effect("rejects a non-Bearer token_type", () =>
      Effect.gen(function*() {
        const server = makeServer({
          exchange: [{ status: 200, body: { access_token: "x", token_type: "MAC", expires_in: 3600 } }]
        })
        const error = yield* authenticate(baseOptions, server).pipe(Effect.flip)
        assert.strictEqual(error.reason._tag, "InvalidResponseError")
      }))

    it.effect("rejects a response missing expires_in", () =>
      Effect.gen(function*() {
        const server = makeServer({ exchange: [{ status: 200, body: { access_token: "x" } }] })
        const error = yield* authenticate(baseOptions, server).pipe(Effect.flip)
        assert.strictEqual(error.reason._tag, "InvalidResponseError")
      }))

    it.effect("rejects an access token containing CR or LF without echoing it", () =>
      Effect.gen(function*() {
        const token = "sk-ant-oat\r\nx-injected: 1"
        const server = makeServer({ exchange: [{ status: 200, body: { access_token: token, expires_in: 3600 } }] })
        const error = yield* authenticate(baseOptions, server).pipe(Effect.flip)
        assert.strictEqual(error.reason._tag, "InvalidResponseError")
        assert.include(error.message, "cannot be sent in a header")
        assert.notInclude(error.message, "x-injected")
      }))
  })

  it.effect("layerWorkloadIdentity provides AnthropicCredentials", () =>
    Effect.gen(function*() {
      const server = makeServer({ exchange: [okToken()] })
      const request = yield* Effect.gen(function*() {
        const credentials = yield* AnthropicCredentials.AnthropicCredentials
        return yield* credentials.authenticate(HttpClientRequest.post("https://api.anthropic.com/v1/messages"))
      }).pipe(
        Effect.provide(AnthropicCredentials.layerWorkloadIdentity(baseOptions)),
        Effect.provide(server.layer)
      )
      assert.strictEqual(request.headers["authorization"], "Bearer sk-ant-oat01-test")
    }))

  it.effect("apiKey sets x-api-key", () =>
    Effect.gen(function*() {
      const request = yield* AnthropicCredentials.apiKey(Redacted.make("sk-test")).authenticate(
        HttpClientRequest.get("https://api.anthropic.com/v1/models")
      )
      assert.strictEqual(request.headers["x-api-key"], "sk-test")
    }))

  describe("AnthropicClient integration", () => {
    const messageBody = {
      id: "msg_1",
      type: "message",
      role: "assistant",
      model: "claude-opus-5-5",
      content: [{ type: "text", text: "hi" }],
      stop_reason: "end_turn",
      stop_sequence: null,
      usage: { input_tokens: 1, output_tokens: 1 }
    }

    const payload = {
      model: "claude-opus-5-5",
      max_tokens: 16,
      messages: [{ role: "user" as const, content: "hello" }]
    }

    const clientLayer = (server: ReturnType<typeof makeServer>, options: AnthropicClient.Options = {}) =>
      Layer.unwrap(Effect.map(
        AnthropicCredentials.makeWorkloadIdentity(baseOptions),
        (credentials) => AnthropicClient.layer({ ...options, credentials })
      )).pipe(Layer.provide(server.layer))

    it.effect("sends the bearer token and OAuth beta on messages, not x-api-key", () =>
      Effect.gen(function*() {
        const server = makeServer({ exchange: [okToken()], api: [{ status: 200, body: messageBody }] })
        yield* Effect.gen(function*() {
          const client = yield* AnthropicClient.AnthropicClient
          yield* client.createMessage({ payload, params: { "anthropic-beta": "files-api-2025-04-14" } })
        }).pipe(Effect.provide(clientLayer(server)))
        const message = server.requests[1]
        assert.strictEqual(message.headers["authorization"], "Bearer sk-ant-oat01-test")
        assert.isUndefined(message.headers["x-api-key"])
        assert.strictEqual(message.headers["anthropic-beta"], "files-api-2025-04-14,oauth-2025-04-20")
      }))

    it.effect("replays a 401 from createMessage once with a new token", () =>
      Effect.gen(function*() {
        const server = makeServer({
          exchange: [okToken("first"), okToken("second")],
          api: [{ status: 401, body: { type: "error", error: { type: "authentication_error", message: "expired" } } }, {
            status: 200,
            body: messageBody
          }]
        })
        yield* Effect.gen(function*() {
          const client = yield* AnthropicClient.AnthropicClient
          yield* client.createMessage({ payload })
        }).pipe(Effect.provide(clientLayer(server)))
        const api = server.requests.filter((r) => r.url.endsWith("/v1/messages?beta=true"))
        assert.deepStrictEqual(api.map((r) => r.headers["authorization"]), ["Bearer first", "Bearer second"])
      }))

    it.effect("replays a 401 from createMessageStream once with a new token", () =>
      Effect.gen(function*() {
        const server = makeServer({
          exchange: [okToken("first"), okToken("second")],
          api: [{ status: 401, body: { type: "error", error: { type: "authentication_error", message: "expired" } } }, {
            status: 200,
            body: { type: "message_stop" }
          }]
        })
        yield* Effect.gen(function*() {
          const client = yield* AnthropicClient.AnthropicClient
          yield* client.createMessageStream({ payload })
        }).pipe(Effect.provide(clientLayer(server)))
        const api = server.requests.filter((r) => r.url.endsWith("/v1/messages"))
        assert.deepStrictEqual(api.map((r) => r.headers["authorization"]), ["Bearer first", "Bearer second"])
      }))

    it.effect("surfaces an exchange failure from createMessage as the credentials AiError", () =>
      Effect.gen(function*() {
        const server = makeServer({ exchange: [{ status: 401, body: { error: { type: "authentication_error" } } }] })
        const error = yield* Effect.gen(function*() {
          const client = yield* AnthropicClient.AnthropicClient
          return yield* client.createMessage({ payload }).pipe(Effect.flip)
        }).pipe(Effect.provide(clientLayer(server)))
        assert.strictEqual(error.module, "AnthropicCredentials")
        assert.strictEqual(error.reason._tag, "AuthenticationError")
      }))

    it.effect("surfaces an exchange failure from createMessageStream as the credentials AiError", () =>
      Effect.gen(function*() {
        const server = makeServer({ exchange: [{ status: 401, body: { error: { type: "authentication_error" } } }] })
        const error = yield* Effect.gen(function*() {
          const client = yield* AnthropicClient.AnthropicClient
          return yield* client.createMessageStream({ payload }).pipe(Effect.flip)
        }).pipe(Effect.provide(clientLayer(server)))
        assert.strictEqual(error.module, "AnthropicCredentials")
        assert.strictEqual(error.reason._tag, "AuthenticationError")
      }))

    it.effect("transformClient cannot remove or overwrite the credentials", () =>
      Effect.gen(function*() {
        const createMessage = Effect.gen(function*() {
          const client = yield* AnthropicClient.AnthropicClient
          yield* client.createMessage({ payload })
        })
        const tamper = (name: string) => [
          HttpClient.mapRequest(HttpClientRequest.removeHeader(name)),
          HttpClient.mapRequest(HttpClientRequest.setHeader(name, "tampered"))
        ]

        for (const transformClient of tamper("authorization")) {
          const server = makeServer({ exchange: [okToken()], api: [{ status: 200, body: messageBody }] })
          yield* createMessage.pipe(Effect.provide(clientLayer(server, { transformClient })))
          assert.strictEqual(server.requests[1].headers["authorization"], "Bearer sk-ant-oat01-test")
        }

        for (const transformClient of tamper("x-api-key")) {
          const server = makeServer({ api: [{ status: 200, body: messageBody }] })
          yield* createMessage.pipe(
            Effect.provide(AnthropicClient.layer({ apiKey: Redacted.make("sk-real"), transformClient })),
            Effect.provide(server.layer)
          )
          assert.strictEqual(server.requests[0].headers["x-api-key"], "sk-real")
        }
      }))

    it.effect("the exchange bypasses transformClient", () =>
      Effect.gen(function*() {
        const server = makeServer({ exchange: [okToken()], api: [{ status: 200, body: messageBody }] })
        const seen: Array<string> = []
        yield* Effect.gen(function*() {
          const client = yield* AnthropicClient.AnthropicClient
          yield* client.createMessage({ payload })
        }).pipe(Effect.provide(clientLayer(server, {
          transformClient: HttpClient.mapRequest((request) => {
            seen.push(request.url)
            return request
          })
        })))
        assert.isTrue(seen.every((url) => !url.endsWith("/v1/oauth/token")))
        assert.isTrue(seen.length > 0)
      }))

    it.effect("redacts authorization and x-api-key", () =>
      Effect.gen(function*() {
        const server = makeServer({ exchange: [okToken()], api: [{ status: 200, body: messageBody }] })
        let redacted: ReadonlyArray<string | RegExp> = []
        yield* Effect.gen(function*() {
          const client = yield* AnthropicClient.AnthropicClient
          yield* client.createMessage({ payload })
        }).pipe(Effect.provide(clientLayer(server, {
          transformClient: HttpClient.mapRequestEffect(Effect.fnUntraced(function*(request) {
            redacted = yield* Headers.CurrentRedactedNames
            return request
          }))
        })))
        assert.include(redacted, "authorization")
        assert.include(redacted, "x-api-key")
      }))

    it.effect("AnthropicConfig.withClientTransform sees the authenticated request", () =>
      Effect.gen(function*() {
        const server = makeServer({ exchange: [okToken()], api: [{ status: 200, body: messageBody }] })
        const seen: Array<string | undefined> = []
        yield* Effect.gen(function*() {
          const client = yield* AnthropicClient.AnthropicClient
          yield* client.createMessage({ payload }).pipe(
            AnthropicConfig.withClientTransform(
              HttpClient.tapRequest((request) => Effect.sync(() => seen.push(request.headers["authorization"])))
            )
          )
        }).pipe(Effect.provide(clientLayer(server)))
        assert.deepStrictEqual(seen, ["Bearer sk-ant-oat01-test"])
      }))

    it.effect("passing both apiKey and credentials is a defect", () =>
      Effect.gen(function*() {
        const exit = yield* AnthropicClient.make({
          apiKey: Redacted.make("sk-test"),
          credentials: AnthropicCredentials.apiKey(Redacted.make("sk-other"))
        }).pipe(Effect.provide(makeServer({}).layer), Effect.exit)
        assert.isTrue(Exit.hasDies(exit))
      }))

    it.effect("uses AnthropicCredentials from context when no option is passed", () =>
      Effect.gen(function*() {
        const server = makeServer({ api: [{ status: 200, body: messageBody }] })
        yield* Effect.gen(function*() {
          const client = yield* AnthropicClient.AnthropicClient
          yield* client.createMessage({ payload })
        }).pipe(
          Effect.provide(AnthropicClient.layer({})),
          Effect.provide(Layer.succeed(
            AnthropicCredentials.AnthropicCredentials,
            AnthropicCredentials.apiKey(Redacted.make("sk-context"))
          )),
          Effect.provide(server.layer)
        )
        assert.strictEqual(server.requests[0].headers["x-api-key"], "sk-context")
      }))
  })

  describe("layerWorkloadIdentityConfig", () => {
    const run = (env: Record<string, string>, fileContents = "file.jwt.token") => {
      const server = makeServer({ exchange: [okToken()] })
      return Effect.gen(function*() {
        const credentials = yield* AnthropicCredentials.AnthropicCredentials
        yield* credentials.authenticate(HttpClientRequest.post("https://api.anthropic.com/v1/messages"))
        return jsonBody(server.requests[0]) as Record<string, string>
      }).pipe(
        Effect.provide(AnthropicCredentials.layerWorkloadIdentityConfig()),
        Effect.provide(server.layer),
        Effect.provide(FileSystem.layerNoop({ readFileString: () => Effect.succeed(fileContents) })),
        Effect.provide(ConfigProvider.layer(ConfigProvider.fromUnknown(env)))
      )
    }

    const required = {
      ANTHROPIC_FEDERATION_RULE_ID: "fdrl_env",
      ANTHROPIC_ORGANIZATION_ID: "org-env"
    }

    it.effect("reads the identity token from ANTHROPIC_IDENTITY_TOKEN_FILE in preference to the literal", () =>
      Effect.gen(function*() {
        const body = yield* run({
          ...required,
          ANTHROPIC_IDENTITY_TOKEN_FILE: "/var/run/token",
          ANTHROPIC_IDENTITY_TOKEN: "literal.jwt.token"
        })
        assert.strictEqual(body.assertion, "file.jwt.token")
        assert.strictEqual(body.federation_rule_id, "fdrl_env")
        assert.strictEqual(body.organization_id, "org-env")
        assert.isUndefined(body.service_account_id)
        assert.isUndefined(body.workspace_id)
      }))

    it.effect("falls back to ANTHROPIC_IDENTITY_TOKEN and reads the optional ids", () =>
      Effect.gen(function*() {
        const body = yield* run({
          ...required,
          ANTHROPIC_IDENTITY_TOKEN: "literal.jwt.token",
          ANTHROPIC_SERVICE_ACCOUNT_ID: "svac_env",
          ANTHROPIC_WORKSPACE_ID: "wrkspc_env"
        })
        assert.strictEqual(body.assertion, "literal.jwt.token")
        assert.strictEqual(body.service_account_id, "svac_env")
        assert.strictEqual(body.workspace_id, "wrkspc_env")
      }))

    it.effect("reads the identity token from ANTHROPIC_IDENTITY_TOKEN_FILE alone", () =>
      Effect.gen(function*() {
        const body = yield* run({ ...required, ANTHROPIC_IDENTITY_TOKEN_FILE: "/var/run/token" })
        assert.strictEqual(body.assertion, "file.jwt.token")
      }))

    it.effect("honors Config overrides and the refresh policy", () =>
      Effect.gen(function*() {
        const server = makeServer({ exchange: [okToken("first"), okToken("second")] })
        // Every token is already inside its mandatory window, so each request
        // exchanges again.
        const refreshPolicy: WorkloadIdentity.RefreshPolicy = {
          advisory: (lifetime) => lifetime,
          mandatory: (lifetime) => lifetime,
          advisoryFailureBackoff: Duration.zero
        }
        const tokens = yield* Effect.gen(function*() {
          const credentials = yield* AnthropicCredentials.AnthropicCredentials
          const request = HttpClientRequest.post("https://api.anthropic.com/v1/messages")
          const first = yield* credentials.authenticate(request)
          const second = yield* credentials.authenticate(request)
          return [first.headers["authorization"], second.headers["authorization"]]
        }).pipe(
          Effect.provide(AnthropicCredentials.layerWorkloadIdentityConfig({
            identityToken: Config.succeed(WorkloadIdentity.fromRedacted(Redacted.make("override.jwt.token"))),
            federationRuleId: Config.succeed("fdrl_override"),
            apiUrl: Config.succeed("https://proxy.example.com"),
            refreshPolicy
          })),
          Effect.provide(server.layer),
          Effect.provide(FileSystem.layerNoop({})),
          Effect.provide(ConfigProvider.layer(ConfigProvider.fromUnknown(required)))
        )
        assert.deepStrictEqual(tokens, ["Bearer first", "Bearer second"])
        assert.strictEqual(server.requests[0].url, "https://proxy.example.com/v1/oauth/token")
        const body = jsonBody(server.requests[0]) as Record<string, string>
        assert.strictEqual(body.assertion, "override.jwt.token")
        assert.strictEqual(body.federation_rule_id, "fdrl_override")
        assert.strictEqual(body.organization_id, "org-env")
      }))

    it.effect("propagates a source error from the ANTHROPIC_IDENTITY_TOKEN_FILE lookup", () =>
      Effect.gen(function*() {
        const env = ConfigProvider.fromUnknown({ ...required, ANTHROPIC_IDENTITY_TOKEN: "literal.jwt.token" })
        const provider = ConfigProvider.make((path) =>
          path[0] === "ANTHROPIC_IDENTITY_TOKEN_FILE"
            ? Effect.fail(new ConfigProvider.SourceError({ message: "vault unreachable" }))
            : env.load(path)
        )
        const exit = yield* Effect.gen(function*() {
          yield* AnthropicCredentials.AnthropicCredentials
        }).pipe(
          Effect.provide(AnthropicCredentials.layerWorkloadIdentityConfig()),
          Effect.provide(makeServer({}).layer),
          Effect.provide(FileSystem.layerNoop({})),
          Effect.provide(ConfigProvider.layer(provider)),
          Effect.exit
        )
        assert.isTrue(Exit.isFailure(exit))
        assert.isFalse(Exit.hasDies(exit))
        assert.include(String(Exit.isFailure(exit) ? exit.cause : ""), "vault unreachable")
      }))

    it.effect.each([
      { name: "rule id", env: { ANTHROPIC_ORGANIZATION_ID: "org", ANTHROPIC_IDENTITY_TOKEN: "a.b.c" } },
      { name: "organization id", env: { ANTHROPIC_FEDERATION_RULE_ID: "fdrl", ANTHROPIC_IDENTITY_TOKEN: "a.b.c" } },
      { name: "identity token", env: { ANTHROPIC_FEDERATION_RULE_ID: "fdrl", ANTHROPIC_ORGANIZATION_ID: "org" } }
    ])("fails with a ConfigError when the $name is missing", ({ env }) =>
      Effect.gen(function*() {
        const exit = yield* Effect.exit(run(env))
        assert.isTrue(Exit.isFailure(exit))
        assert.isFalse(Exit.hasDies(exit))
      }))
  })
})
