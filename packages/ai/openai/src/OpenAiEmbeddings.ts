/**
 * @since 1.0.0
 */
import * as Embeddings from "@effect/ai/Embeddings"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import type { Simplify } from "effect/Types"
import type * as Generated from "./Generated.js"
import { OpenAiClient } from "./OpenAiClient.js"
import { AiError } from "@effect/ai/AiError"

/**
 * @since 1.0.0
 * @category tags
 */
export class OpenAiEmbeddingsConfig extends Context.Tag("@effect/ai-openai/OpenAiEmbeddings/Config")<
  OpenAiEmbeddingsConfig,
  Simplify<
    Partial<
      Omit<
        typeof Generated.CreateEmbeddingRequest.Encoded,
        "input"
      >
    >
  >
>() {
  /**
   * @since 1.0.0
   */
  static readonly getOrUndefined: Effect.Effect<typeof OpenAiEmbeddingsConfig.Service | undefined> = Effect.map(
    Effect.context<never>(),
    (context) => context.unsafeMap.get(OpenAiEmbeddingsConfig.key)
  )
}

const make = (options: {
  readonly model: string
}) =>
  Effect.gen(function*() {
    const client = yield* OpenAiClient
    const config = yield* OpenAiEmbeddingsConfig.getOrUndefined

    function makeRequest(input: ReadonlyArray<string>) {
      return Effect.flatMap(Effect.context<never>(), (context) =>
        client.client.createEmbedding({
          input,
          model: options.model,
          ...config,
          ...context.unsafeMap.get(OpenAiEmbeddingsConfig.key)
        }))
    }

    return yield* Embeddings.make({
      embedMany(input) {
        return makeRequest(input).pipe(
          Effect.map((response) =>
            response.data.map(({ embedding, index }) => ({
              embeddings: embedding as Array<number>,
              index
            }))
          ),
          Effect.mapError((cause) => {
            const common = {
              module: "OpenAiEmbeddings",
              method: "embed",
              cause
            }
            if (cause._tag === "ParseError") {
              return new AiError({
                description: "Malformed input detected in request",
                ...common
              })
            }
            return new AiError({
              description: "An error occurred with the OpenAI API",
              ...common
            })
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
}): Layer.Layer<Embeddings.Embeddings, never, OpenAiClient> => 
  Layer.effect(Embeddings.Embeddings, make(options))
