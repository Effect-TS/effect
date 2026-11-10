import { AnthropicClient, AnthropicWorkloadIdentity } from "@effect/ai-anthropic"
import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer, Redacted } from "effect"
import { HttpClient, HttpClientError, type HttpClientRequest, HttpClientResponse } from "effect/http"

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
