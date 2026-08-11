import { GoogleAgentPlatformClient } from "@effect/ai-google-agent-platform"
import { assert, describe, it } from "@effect/vitest"
import { Effect, Redacted } from "effect"
import { HttpClient, type HttpClientError, type HttpClientRequest, HttpClientResponse } from "effect/unstable/http"

describe("GoogleAgentPlatformClient", () => {
  it.effect("rejects regional configuration without a project", () =>
    Effect.gen(function*() {
      const error = yield* GoogleAgentPlatformClient.make({}).pipe(
        Effect.flip,
        Effect.provideService(HttpClient.HttpClient, unusedHttpClient)
      )

      assert.strictEqual(error.reason._tag, "InvalidRequestError")
      if (error.reason._tag !== "InvalidRequestError") return
      assert.match(error.reason.description ?? "", /project/)
    }))

  it.effect("rejects conflicting authentication options", () =>
    Effect.gen(function*() {
      const error = yield* GoogleAgentPlatformClient.make({
        apiKey: Redacted.make("key"),
        accessToken: Redacted.make("token")
      }).pipe(
        Effect.flip,
        Effect.provideService(HttpClient.HttpClient, unusedHttpClient)
      )

      assert.strictEqual(error.reason._tag, "InvalidRequestError")
      if (error.reason._tag !== "InvalidRequestError") return
      assert.match(error.reason.description ?? "", /authentication/i)
    }))

  it.effect("decodes provider errors without throwing", () =>
    Effect.gen(function*() {
      const client = yield* GoogleAgentPlatformClient.make({
        apiKey: Redacted.make("key")
      }).pipe(
        Effect.provideService(
          HttpClient.HttpClient,
          makeHttpClient((request) =>
            Effect.succeed(
              HttpClientResponse.fromWeb(
                request,
                new Response(
                  JSON.stringify({
                    error: {
                      code: 400,
                      message: "Invalid request",
                      status: "INVALID_ARGUMENT"
                    }
                  }),
                  {
                    status: 400,
                    headers: { "content-type": "application/json" }
                  }
                )
              )
            )
          )
        )
      )

      const error = yield* client.generateContent({
        model: "gemini-2.5-flash",
        request: { contents: [] }
      }).pipe(Effect.flip)

      assert.strictEqual(error.reason._tag, "InvalidRequestError")
      if (error.reason._tag !== "InvalidRequestError") return
      assert.match(error.reason.description ?? "", /^Invalid request/)
      assert.deepStrictEqual(error.reason.metadata.googleAgentPlatform, {
        status: "INVALID_ARGUMENT"
      })
    }))

  it.effect("rejects embedContent with express-mode API key authentication", () =>
    Effect.gen(function*() {
      const client = yield* GoogleAgentPlatformClient.make({
        apiKey: Redacted.make("key")
      }).pipe(Effect.provideService(HttpClient.HttpClient, unusedHttpClient))

      const error = yield* client.embedContent({
        model: "gemini-embedding-2",
        request: { content: { parts: [{ text: "hello" }] } }
      }).pipe(Effect.flip)

      assert.strictEqual(error.reason._tag, "InvalidRequestError")
      if (error.reason._tag !== "InvalidRequestError") return
      assert.match(error.reason.description ?? "", /OAuth/)
    }))
})

const makeHttpClient = (
  handler: (
    request: HttpClientRequest.HttpClientRequest
  ) => Effect.Effect<
    HttpClientResponse.HttpClientResponse,
    HttpClientError.HttpClientError
  >
) =>
  HttpClient.makeWith(
    Effect.fnUntraced(function*(requestEffect) {
      const request = yield* requestEffect
      return yield* handler(request)
    }),
    Effect.succeed as HttpClient.HttpClient.Preprocess<
      HttpClientError.HttpClientError,
      never
    >
  )

const unusedHttpClient = makeHttpClient(() => Effect.die(new Error("Unexpected HTTP request")))
