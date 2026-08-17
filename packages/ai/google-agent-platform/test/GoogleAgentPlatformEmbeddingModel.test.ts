import { GoogleAgentPlatformClient, GoogleAgentPlatformEmbeddingModel } from "@effect/ai-google-agent-platform"
import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer, Redacted } from "effect"
import { EmbeddingModel } from "effect/unstable/ai"
import { HttpClient, type HttpClientError, type HttpClientRequest, HttpClientResponse } from "effect/unstable/http"

describe("GoogleAgentPlatformEmbeddingModel", () => {
  it.effect("maps embeddings and request configuration", () =>
    Effect.gen(function*() {
      let capturedRequest: HttpClientRequest.HttpClientRequest | undefined
      const clientLayer = GoogleAgentPlatformClient.layer({
        apiKey: Redacted.make("key")
      }).pipe(
        Layer.provide(
          Layer.succeed(
            HttpClient.HttpClient,
            makeHttpClient((request) => {
              capturedRequest = request
              return Effect.succeed(
                HttpClientResponse.fromWeb(
                  request,
                  new Response(
                    JSON.stringify({
                      predictions: [
                        {
                          embeddings: {
                            values: [1, 2],
                            statistics: { token_count: 3 }
                          }
                        },
                        {
                          embeddings: {
                            values: [3, 4],
                            statistics: { token_count: 4 }
                          }
                        }
                      ]
                    }),
                    {
                      status: 200,
                      headers: { "content-type": "application/json" }
                    }
                  )
                )
              )
            })
          )
        )
      )

      const response = yield* Effect.gen(function*() {
        const model = yield* EmbeddingModel.EmbeddingModel
        return yield* model.embedMany(["first", "second"])
      }).pipe(
        Effect.provide(
          GoogleAgentPlatformEmbeddingModel.layer({
            model: "text-embedding-005",
            config: {
              taskType: "RETRIEVAL_DOCUMENT",
              outputDimensionality: 2
            }
          })
        ),
        Effect.provide(clientLayer)
      )

      assert.deepStrictEqual(
        response.embeddings.map((embedding) => embedding.vector),
        [[1, 2], [3, 4]]
      )
      assert.strictEqual(response.usage.inputTokens, 7)
      assert.isDefined(capturedRequest)
      const body = yield* getRequestBody(
        capturedRequest as HttpClientRequest.HttpClientRequest
      )
      assert.deepStrictEqual(body.instances, [
        { content: "first", task_type: "RETRIEVAL_DOCUMENT" },
        { content: "second", task_type: "RETRIEVAL_DOCUMENT" }
      ])
      assert.deepStrictEqual(body.parameters, { outputDimensionality: 2 })
    }))

  it.effect("uses embedContent for gemini-embedding-2", () =>
    Effect.gen(function*() {
      const capturedRequests: Array<HttpClientRequest.HttpClientRequest> = []
      const clientLayer = GoogleAgentPlatformClient.layer({
        project: "test-project",
        location: "us",
        accessToken: Redacted.make("token")
      }).pipe(
        Layer.provide(
          Layer.succeed(
            HttpClient.HttpClient,
            makeHttpClient((request) => {
              capturedRequests.push(request)
              const index = capturedRequests.length
              return Effect.succeed(
                HttpClientResponse.fromWeb(
                  request,
                  new Response(
                    JSON.stringify({
                      embedding: { values: [index, index + 1] },
                      usageMetadata: { promptTokenCount: index + 2 },
                      truncated: false
                    }),
                    {
                      status: 200,
                      headers: { "content-type": "application/json" }
                    }
                  )
                )
              )
            })
          )
        )
      )

      const response = yield* Effect.gen(function*() {
        const model = yield* EmbeddingModel.EmbeddingModel
        return yield* model.embedMany(["first", "second"])
      }).pipe(
        Effect.provide(
          GoogleAgentPlatformEmbeddingModel.layer({
            model: "gemini-embedding-2",
            config: { outputDimensionality: 2 }
          })
        ),
        Effect.provide(clientLayer)
      )

      assert.deepStrictEqual(
        response.embeddings.map((embedding) => embedding.vector),
        [[1, 2], [2, 3]]
      )
      assert.strictEqual(response.usage.inputTokens, 7)
      assert.lengthOf(capturedRequests, 2)
      for (const [index, request] of capturedRequests.entries()) {
        assert.strictEqual(
          request.url,
          "https://aiplatform.us.rep.googleapis.com/v1/projects/test-project/locations/us/publishers/google/models/gemini-embedding-2:embedContent"
        )
        const body = yield* getRequestBody(request)
        assert.deepStrictEqual(body, {
          content: { parts: [{ text: index === 0 ? "first" : "second" }] },
          embedContentConfig: { outputDimensionality: 2 }
        })
      }
    }))

  it.effect("uses the standard API host for global embedContent requests", () =>
    Effect.gen(function*() {
      let capturedRequest: HttpClientRequest.HttpClientRequest | undefined
      const clientLayer = GoogleAgentPlatformClient.layer({
        project: "test-project",
        location: "global",
        accessToken: Redacted.make("token")
      }).pipe(
        Layer.provide(
          Layer.succeed(
            HttpClient.HttpClient,
            makeHttpClient((request) => {
              capturedRequest = request
              return Effect.succeed(
                HttpClientResponse.fromWeb(
                  request,
                  new Response(
                    JSON.stringify({
                      embedding: { values: [1, 2] },
                      usageMetadata: { promptTokenCount: 3 },
                      truncated: false
                    }),
                    {
                      status: 200,
                      headers: { "content-type": "application/json" }
                    }
                  )
                )
              )
            })
          )
        )
      )

      yield* Effect.gen(function*() {
        const model = yield* EmbeddingModel.EmbeddingModel
        return yield* model.embed("hello")
      }).pipe(
        Effect.provide(
          GoogleAgentPlatformEmbeddingModel.layer({
            model: "gemini-embedding-2"
          })
        ),
        Effect.provide(clientLayer)
      )

      assert.isDefined(capturedRequest)
      assert.strictEqual(
        capturedRequest!.url,
        "https://aiplatform.googleapis.com/v1/projects/test-project/locations/global/publishers/google/models/gemini-embedding-2:embedContent"
      )
    }))

  it.effect("sends one predict request per input for gemini-embedding-001", () =>
    Effect.gen(function*() {
      const capturedRequests: Array<HttpClientRequest.HttpClientRequest> = []
      const clientLayer = GoogleAgentPlatformClient.layer({
        apiKey: Redacted.make("key")
      }).pipe(
        Layer.provide(
          Layer.succeed(
            HttpClient.HttpClient,
            makeHttpClient((request) => {
              capturedRequests.push(request)
              const index = capturedRequests.length
              return Effect.succeed(
                HttpClientResponse.fromWeb(
                  request,
                  new Response(
                    JSON.stringify({
                      predictions: [{
                        embeddings: {
                          values: [index, index + 1],
                          statistics: { token_count: index + 2 }
                        }
                      }]
                    }),
                    {
                      status: 200,
                      headers: { "content-type": "application/json" }
                    }
                  )
                )
              )
            })
          )
        )
      )

      const response = yield* Effect.gen(function*() {
        const model = yield* EmbeddingModel.EmbeddingModel
        return yield* model.embedMany(["first", "second"])
      }).pipe(
        Effect.provide(
          GoogleAgentPlatformEmbeddingModel.layer({
            model: "gemini-embedding-001",
            config: { taskType: "RETRIEVAL_DOCUMENT" }
          })
        ),
        Effect.provide(clientLayer)
      )

      assert.deepStrictEqual(
        response.embeddings.map((embedding) => embedding.vector),
        [[1, 2], [2, 3]]
      )
      assert.strictEqual(response.usage.inputTokens, 7)
      assert.lengthOf(capturedRequests, 2)
      for (const [index, request] of capturedRequests.entries()) {
        const body = yield* getRequestBody(request)
        assert.deepStrictEqual(body.instances, [{
          content: index === 0 ? "first" : "second",
          task_type: "RETRIEVAL_DOCUMENT"
        }])
      }
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

const getRequestBody = (request: HttpClientRequest.HttpClientRequest) =>
  Effect.gen(function*() {
    const body = request.body
    if (body._tag !== "Uint8Array") {
      return yield* Effect.die(new Error("Expected Uint8Array body"))
    }
    return JSON.parse(new TextDecoder().decode(body.body))
  })
