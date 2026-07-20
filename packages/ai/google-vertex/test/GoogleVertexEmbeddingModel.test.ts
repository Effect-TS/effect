import { GoogleVertexClient, GoogleVertexEmbeddingModel } from "@effect/ai-google-vertex"
import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer, Redacted } from "effect"
import { EmbeddingModel } from "effect/unstable/ai"
import { HttpClient, type HttpClientError, type HttpClientRequest, HttpClientResponse } from "effect/unstable/http"

describe("GoogleVertexEmbeddingModel", () => {
  it.effect("maps embeddings and request configuration", () =>
    Effect.gen(function*() {
      let capturedRequest: HttpClientRequest.HttpClientRequest | undefined
      const clientLayer = GoogleVertexClient.layer({
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
          GoogleVertexEmbeddingModel.layer({
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
