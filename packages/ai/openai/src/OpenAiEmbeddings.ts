/**
 * @since 1.0.0
 */
import { AiError } from "@effect/ai/AiError"
import * as Embeddings from "@effect/ai/Embeddings"
import * as Context from "effect/Context"
import type * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import type { Simplify } from "effect/Types"
import type * as Generated from "./Generated.js"
import { OpenAiClient } from "./OpenAiClient.js"

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

const makeRequest = (
  client: OpenAiClient.Service,
  input: ReadonlyArray<string>,
  parentConfig: typeof OpenAiEmbeddingsConfig.Service | undefined,
  options: {
    readonly model: string
    readonly maxBatchSize?: number
    readonly cache?: {
      readonly capacity: number
      readonly timeToLive: Duration.DurationInput
    }
  }
) =>
  Effect.context<never>().pipe(
    Effect.flatMap((context) => {
      const localConfig = context.unsafeMap.get(OpenAiEmbeddingsConfig.key)
      return client.client.createEmbedding({
        input,
        model: options.model,
        ...parentConfig,
        ...localConfig
      })
    }),
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

const make = Effect.fnUntraced(function*(options: {
  readonly model: string
  readonly maxBatchSize?: number
  readonly cache?: {
    readonly capacity: number
    readonly timeToLive: Duration.DurationInput
  }
}) {
  const client = yield* OpenAiClient
  const parentConfig = yield* OpenAiEmbeddingsConfig.getOrUndefined
  return yield* Embeddings.make({
    cache: options.cache,
    maxBatchSize: options.maxBatchSize ?? 2048,
    embedMany(input) {
      return makeRequest(client, input, parentConfig, options)
    }
  })
})

const makeDataLoader = Effect.fnUntraced(function*(options: {
  readonly model: string
  readonly window: Duration.DurationInput
  readonly maxBatchSize?: number
}) {
  const client = yield* OpenAiClient
  const parentConfig = yield* OpenAiEmbeddingsConfig.getOrUndefined
  return yield* Embeddings.makeDataLoader({
    window: options.window,
    maxBatchSize: options.maxBatchSize ?? 2048,
    embedMany(input) {
      return makeRequest(client, input, parentConfig, options)
    }
  })
})

/**
 * @since 1.0.0
 * @category layers
 */
export const layer = (options: {
  readonly model: string
  readonly maxBatchSize?: number
  readonly cache?: {
    readonly capacity: number
    readonly timeToLive: Duration.DurationInput
  }
}): Layer.Layer<Embeddings.Embeddings, never, OpenAiClient> => Layer.effect(Embeddings.Embeddings, make(options))

/**
 * @since 1.0.0
 * @category layers
 */
export const layerDataLoader = (options: {
  readonly model: string
  readonly window: Duration.DurationInput
  readonly maxBatchSize?: number
}): Layer.Layer<Embeddings.Embeddings, never, OpenAiClient> =>
  Layer.scoped(Embeddings.Embeddings, makeDataLoader(options))
