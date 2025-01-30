/**
 * @since 1.0.0
 */
import { AiError } from "@effect/ai/AiError"
import * as EmbeddingResponse from "@effect/ai/EmbeddingResponse"
import * as Embeddings from "@effect/ai/Embeddings"
import * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import type * as Generated from "./Generated.js"
import { OpenAiClient } from "./OpenAiClient.js"

const make = (options: {
  readonly model: string
  readonly dimensions?: number
}) =>
  Effect.gen(function*() {
    const client = yield* OpenAiClient

    return Embeddings.make({
      create({ input }) {
        return client.client.createEmbedding({
          model: options.model,
          dimensions: options.dimensions,
          input: input as typeof Generated.CreateEmbeddingRequest.Encoded.input
        }).pipe(
          Effect.catchAll((cause) =>
            Effect.fail(
              new AiError({
                module: "OpenAiEmbeddings",
                method: "create",
                description: "An error occurred",
                cause
              })
            )
          ),
          Effect.map((response) => {
            const res = response.data.map((embedding) => new EmbeddingResponse.EmbeddingResponse(embedding))
            return Chunk.fromIterable(res)
          })
        )
      }
    })
  })

/**
 * @since 1.0.0
 * @category layers
 */
export const layer = (options: {
  readonly model: string
  readonly dimensions?: number
}): Layer.Layer<Embeddings.Embeddings, never, OpenAiClient> => Layer.effect(Embeddings.Embeddings, make(options))
