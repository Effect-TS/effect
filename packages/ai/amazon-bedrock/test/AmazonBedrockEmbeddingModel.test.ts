import { AmazonBedrockClient, AmazonBedrockEmbeddingModel } from "@effect/ai-amazon-bedrock"
import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer, Redacted } from "effect"
import { EmbeddingModel } from "effect/ai"
import { Digest, Mac, SecureRandom } from "effect/crypto"
import { HttpClient, type HttpClientError, HttpClientResponse } from "effect/http"

describe("AmazonBedrockEmbeddingModel", () => {
  it.effect("Titan sends one request per text, keeps input order and sums the token count headers", () =>
    Effect.gen(function*() {
      const http = makeHttpClient((body) => ({
        body: { embedding: [body.inputText.length, 0], inputTextTokenCount: body.inputText.length },
        inputTokens: body.inputText.length
      }))

      const response = yield* Effect.gen(function*() {
        const model = yield* EmbeddingModel.EmbeddingModel
        return yield* model.embedMany(["a", "bb", "ccc"])
      }).pipe(
        Effect.provide(AmazonBedrockEmbeddingModel.layer({
          model: "amazon.titan-embed-text-v2:0",
          family: "titan-embed-text-v2",
          config: { dimensions: 256, normalize: true }
        })),
        Effect.provide(http.layer)
      )

      assert.deepStrictEqual(response.embeddings.map((embedding) => embedding.vector), [[1, 0], [2, 0], [3, 0]])
      assert.strictEqual(response.usage.inputTokens, 6)
      assert.sameDeepMembers(http.requests.map((request) => request.body), [
        { dimensions: 256, normalize: true, inputText: "a" },
        { dimensions: 256, normalize: true, inputText: "bb" },
        { dimensions: 256, normalize: true, inputText: "ccc" }
      ])
    }))

  it.effect("Cohere v3 splits 97 texts into requests of 96 and 1 without output_dimension", () =>
    Effect.gen(function*() {
      const http = makeHttpClient((body) => ({
        body: {
          id: "1",
          texts: body.texts,
          embeddings: body.texts.map((text: string) => [Number(text)]),
          response_type: "embeddings_floats"
        }
      }))
      const inputs = Array.from({ length: 97 }, (_, i) => String(i))

      const response = yield* Effect.gen(function*() {
        const model = yield* EmbeddingModel.EmbeddingModel
        return yield* model.embedMany(inputs)
      }).pipe(
        Effect.provide(AmazonBedrockEmbeddingModel.layer({
          model: "cohere.embed-english-v3",
          family: "cohere-embed-v3",
          config: { dimensions: 1024, input_type: "search_document" }
        })),
        Effect.provide(http.layer)
      )

      assert.deepStrictEqual(
        response.embeddings.map((embedding) => embedding.vector),
        inputs.map((input) => [Number(input)])
      )
      assert.sameDeepMembers(http.requests.map((request) => request.body), [
        { input_type: "search_document", texts: inputs.slice(0, 96) },
        { input_type: "search_document", texts: ["96"] }
      ])
      assert.isUndefined(response.usage.inputTokens)
    }))

  it.effect("Cohere v4 provides dimensions and isolates scoped configuration overrides", () =>
    Effect.gen(function*() {
      const http = makeHttpClient((body) => ({
        body: { embeddings: { float: body.texts.map((text: string) => [text.charCodeAt(0)]) } },
        inputTokens: 1
      }))

      const [dimensions, responses] = yield* Effect.gen(function*() {
        const model = yield* EmbeddingModel.EmbeddingModel
        const responses = yield* Effect.all([
          model.embed("a").pipe(AmazonBedrockEmbeddingModel.withConfigOverride({ input_type: "search_query" })),
          model.embed("b"),
          model.embed("c").pipe(AmazonBedrockEmbeddingModel.withConfigOverride({ input_type: "search_query" }))
        ], { concurrency: "unbounded" })
        return [yield* EmbeddingModel.Dimensions, responses] as const
      }).pipe(
        Effect.provide(AmazonBedrockEmbeddingModel.model("eu.cohere.embed-v4:0", {
          dimensions: 256,
          family: "cohere-embed-v4",
          config: { input_type: "search_document", truncate: "RIGHT" }
        })),
        Effect.provide(http.layer)
      )

      assert.strictEqual(dimensions, 256)
      assert.deepStrictEqual(responses.map((response) => response.vector), [[97], [98], [99]])
      const url = "https://bedrock-runtime.us-east-1.amazonaws.com/model/eu.cohere.embed-v4%3A0/invoke"
      assert.sameDeepMembers(http.requests, [
        { url, body: { input_type: "search_query", truncate: "RIGHT", output_dimension: 256, texts: ["a", "c"] } },
        { url, body: { input_type: "search_document", truncate: "RIGHT", output_dimension: 256, texts: ["b"] } }
      ])
    }))

  it.effect("rejects chunk count mismatches even when the total count matches", () =>
    Effect.gen(function*() {
      const http = makeHttpClient((body) => ({
        body: { embeddings: Array.from({ length: body.texts.length === 96 ? 95 : 2 }, () => [1]) }
      }))
      const error = yield* Effect.gen(function*() {
        const model = yield* EmbeddingModel.EmbeddingModel
        return yield* Effect.flip(model.embedMany(Array.from({ length: 97 }, () => "text")))
      }).pipe(
        Effect.provide(AmazonBedrockEmbeddingModel.layer({ model: "cohere", family: "cohere-embed-v3" })),
        Effect.provide(http.layer)
      )
      assert.strictEqual(error.reason._tag, "InvalidOutputError")
    }))

  it.effect("treats malformed token counts as unavailable", () =>
    Effect.gen(function*() {
      for (const inputTokens of ["invalid", "Infinity", "", "-1", "1.5"]) {
        const http = makeHttpClient(() => ({ body: { embedding: [1] }, inputTokens }))
        const response = yield* Effect.gen(function*() {
          const model = yield* EmbeddingModel.EmbeddingModel
          return yield* model.embedMany(["text"])
        }).pipe(
          Effect.provide(AmazonBedrockEmbeddingModel.layer({ model: "titan", family: "titan-embed-text-v2" })),
          Effect.provide(http.layer)
        )
        assert.isUndefined(response.usage.inputTokens)
      }
    }))

  it.effect("rejects incompatible Cohere v3 dimensions including scoped overrides", () =>
    Effect.gen(function*() {
      const http = makeHttpClient(() => ({ body: { embeddings: [[1]] } }))
      const embed = Effect.flatMap(EmbeddingModel.EmbeddingModel, (model) => Effect.flip(model.embed("text")))
      const model = (dimensions: number) =>
        AmazonBedrockEmbeddingModel.model("cohere", { family: "cohere-embed-v3", dimensions })
      const errors = yield* Effect.all([
        embed.pipe(Effect.provide(model(256))),
        embed.pipe(
          AmazonBedrockEmbeddingModel.withConfigOverride({ dimensions: 512 }),
          Effect.provide(model(1024))
        )
      ]).pipe(Effect.provide(http.layer))
      assert.deepStrictEqual(errors.map((error) => error.reason._tag), ["InvalidRequestError", "InvalidRequestError"])
      assert.deepStrictEqual(http.requests, [])
    }))
})

const makeHttpClient = (
  respond: (body: any) => { readonly body: unknown; readonly inputTokens?: number | string }
) => {
  const requests: Array<{ readonly url: string; readonly body: unknown }> = []
  const client = HttpClient.makeWith(
    Effect.fnUntraced(function*(requestEffect) {
      const request = yield* requestEffect
      if (request.body._tag !== "Uint8Array") {
        return yield* Effect.die(new Error("Expected Uint8Array body"))
      }
      const body = JSON.parse(new TextDecoder().decode(request.body.body))
      requests.push({ url: request.url, body })
      const response = respond(body)
      return HttpClientResponse.fromWeb(
        request,
        new Response(JSON.stringify(response.body), {
          status: 200,
          headers: {
            "content-type": "application/json",
            ...(response.inputTokens === undefined
              ? {}
              : { "x-amzn-bedrock-input-token-count": String(response.inputTokens) })
          }
        })
      )
    }),
    Effect.succeed as HttpClient.HttpClient.Preprocess<HttpClientError.HttpClientError, never>
  )
  const layer = AmazonBedrockClient.layer({ region: "us-east-1", apiKey: Redacted.make("bedrock-api-key") }).pipe(
    Layer.provide([
      Layer.succeed(HttpClient.HttpClient, client),
      Digest.layerWebCrypto,
      Mac.layerWebCrypto.pipe(Layer.provide(SecureRandom.layerWebCrypto))
    ])
  )
  return { requests, layer }
}
