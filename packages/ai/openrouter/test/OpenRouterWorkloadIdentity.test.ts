import { OpenRouterClient, OpenRouterWorkloadIdentity } from "@effect/ai-openrouter"
import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer, Redacted } from "effect"
import { HttpClient, type HttpClientRequest, HttpClientResponse } from "effect/http"

const IDENTITY_TOKEN = "identity.token.signature"
const TOKEN_URL = "https://openrouter.ai/api/v1/oauth/token"

describe("OpenRouterWorkloadIdentity", () => {
  it.effect("exchanges the identity token and authenticates every client request path", () =>
    Effect.gen(function*() {
      const http = makeHttp()
      const client = yield* OpenRouterClient.OpenRouterClient.pipe(provideClient(http))
      const messages = [{ role: "user" as const, content: "hello" }]

      yield* Effect.ignore(client.createChatCompletion({ model: "openai/gpt-4o-mini", messages }))
      yield* Effect.ignore(client.createChatCompletionStream({ model: "openai/gpt-4o-mini", messages }))
      yield* Effect.ignore(client.createDecisions({ model: "openai/gpt-4o-mini", state: {}, questions: {} }))

      const [exchange, ...requests] = http.requests
      assert.strictEqual(exchange.url, TOKEN_URL)
      assert.isUndefined(exchange.headers.authorization)
      assert.strictEqual(exchange.headers["content-type"], "application/x-www-form-urlencoded")
      assert.deepStrictEqual(bodyParams(exchange), {
        grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
        subject_token: IDENTITY_TOKEN,
        subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
        federation_policy_id: "policy_1",
        scope: "inference"
      })
      assert.deepStrictEqual(
        requests.map((request) => [request.url, request.headers.authorization]),
        [
          ["https://openrouter.ai/api/v1/chat/completions", "Bearer access-1"],
          ["https://openrouter.ai/api/v1/chat/completions", "Bearer access-1"],
          ["https://openrouter.ai/api/alpha/decisions", "Bearer access-1"]
        ]
      )
    }))

  it.effect("maps a rejected exchange to an AiError without the identity token", () =>
    Effect.gen(function*() {
      const http = makeHttp(() =>
        Response.json({ error: "invalid_grant", error_description: `Rejected ${IDENTITY_TOKEN}` }, { status: 400 })
      )
      const client = yield* OpenRouterClient.OpenRouterClient.pipe(provideClient(http))

      const error = yield* Effect.flip(client.createChatCompletion({
        model: "openai/gpt-4o-mini",
        messages: [{ role: "user", content: "hello" }]
      }))

      assert.strictEqual(error._tag, "AiError")
      assert.lengthOf(http.requests, 1)
      assert.notInclude(JSON.stringify(error), IDENTITY_TOKEN)
    }))
})

type Http = ReturnType<typeof makeHttp>

const makeHttp = (token = () => Response.json({ access_token: "access-1", expires_in: 900 })) => {
  const requests: Array<HttpClientRequest.HttpClientRequest> = []
  const client = HttpClient.make((request) => {
    requests.push(request)
    return Effect.succeed(HttpClientResponse.fromWeb(request, request.url === TOKEN_URL ? token() : new Response()))
  })
  return { client, requests }
}

const provideClient = (http: Http) => <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  effect.pipe(
    Effect.provide(
      OpenRouterClient.layer({}).pipe(Layer.provide(OpenRouterWorkloadIdentity.layer({
        identityToken: Effect.succeed(Redacted.make(IDENTITY_TOKEN)),
        federationPolicyId: "policy_1"
      })))
    ),
    Effect.provideService(HttpClient.HttpClient, http.client)
  )

const bodyParams = (request: HttpClientRequest.HttpClientRequest) =>
  request.body._tag === "Uint8Array"
    ? Object.fromEntries(new URLSearchParams(new TextDecoder().decode(request.body.body)))
    : undefined
