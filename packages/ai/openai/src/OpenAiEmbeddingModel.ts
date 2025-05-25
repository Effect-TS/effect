/**
 * @since 1.0.0
 */
import * as AiEmbeddingModel from "@effect/ai/AiEmbeddingModel"
import { AiError } from "@effect/ai/AiError"
import * as AiModel from "@effect/ai/AiModel"
import * as Context from "effect/Context"
import type * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import { dual } from "effect/Function"
import * as Layer from "effect/Layer"
import type { Simplify } from "effect/Types"
import type * as Generated from "./Generated.js"
import { OpenAiClient } from "./OpenAiClient.js"

/**
 * @since 1.0.0
 * @category Models
 */
export type Model = typeof Generated.CreateEmbeddingRequestModelEnum.Encoded

// =============================================================================
// Configuration
// =============================================================================

/**
 * @since 1.0.0
 * @category Context
 */
export class Config extends Context.Tag("@effect/ai-openai/OpenAiEmbeddingModel/Config")<
  Config,
  Config.Service
>() {
  /**
   * @since 1.0.0
   */
  static readonly getOrUndefined: Effect.Effect<Config.Service | undefined> = Effect.map(
    Effect.context<never>(),
    (context) => context.unsafeMap.get(Config.key)
  )
}

/**
 * @since 1.0.0
 */
export declare namespace Config {
  /**
   * @since 1.0.
   * @category Configuration
   */
  export interface Service extends
    Simplify<
      Partial<
        Omit<
          typeof Generated.CreateEmbeddingRequest.Encoded,
          "input"
        >
      >
    >
  {}

  /**
   * @since 1.0.
   * @category Configuration
   */
  export interface Batched extends Omit<Config.Service, "model"> {
    readonly maxBatchSize?: number
    readonly cache?: {
      readonly capacity: number
      readonly timeToLive: Duration.DurationInput
    }
  }

  /**
   * @since 1.0.
   * @category Configuration
   */
  export interface DataLoader extends Omit<Config.Service, "model"> {
    readonly window: Duration.DurationInput
    readonly maxBatchSize?: number
  }
}

// =============================================================================
// OpenAi Embedding Model
// =============================================================================

/**
 * @since 1.0.0
 * @category Models
 */
export const model = (
  model: (string & {}) | Model,
  config: Simplify<
    (
      | ({ readonly mode: "batched" } & Config.Batched)
      | ({ readonly mode: "data-loader" } & Config.DataLoader)
    )
  >
): AiModel.AiModel<AiEmbeddingModel.AiEmbeddingModel, OpenAiClient> => {
  return AiModel.make(
    config.mode === "batched"
      ? layerBatched({ model, config })
      : layerDataLoader({ model, config })
  )
}

const makeRequest = (
  client: OpenAiClient.Service,
  model: string,
  input: ReadonlyArray<string>,
  config: typeof Config.Service | undefined
) =>
  Effect.context<never>().pipe(
    Effect.flatMap((context) => {
      const perRequestConfig = context.unsafeMap.get(Config.key)
      return client.client.createEmbedding({
        input,
        model,
        ...config,
        ...perRequestConfig
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
        module: "OpenAiEmbeddingModel",
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

/**
 * @since 1.0.0
 * @category Constructors
 */
const makeBatched = Effect.fnUntraced(function*(options: {
  readonly model: (string & {}) | Model
  readonly config?: Config.Batched
}) {
  const client = yield* OpenAiClient
  const { config = {}, model } = options
  const { cache, maxBatchSize = 2048, ...rest } = config
  return yield* AiEmbeddingModel.make({
    cache,
    maxBatchSize,
    embedMany: (input) => makeRequest(client, model, input, rest)
  })
})

/**
 * @since 1.0.0
 * @category Constructors
 */
export const makeDataLoader = Effect.fnUntraced(function*(options: {
  readonly model: (string & {}) | Model
  readonly config: Config.DataLoader
}) {
  const client = yield* OpenAiClient
  const { config, model } = options
  const { maxBatchSize = 2048, window, ...rest } = config
  return yield* AiEmbeddingModel.makeDataLoader({
    window,
    maxBatchSize,
    embedMany: (input) => makeRequest(client, model, input, rest)
  })
})

/**
 * @since 1.0.0
 * @category Layers
 */
export const layerBatched = (options: {
  readonly model: (string & {}) | Model
  readonly config?: Config.Batched
}): Layer.Layer<AiEmbeddingModel.AiEmbeddingModel, never, OpenAiClient> =>
  Layer.effect(AiEmbeddingModel.AiEmbeddingModel, makeBatched(options))

/**
 * @since 1.0.0
 * @category Layers
 */
export const layerDataLoader = (options: {
  readonly model: (string & {}) | Model
  readonly config: Config.DataLoader
}): Layer.Layer<AiEmbeddingModel.AiEmbeddingModel, never, OpenAiClient> =>
  Layer.scoped(AiEmbeddingModel.AiEmbeddingModel, makeDataLoader(options))

/**
 * @since 1.0.0
 * @category Configuration
 */
export const withConfigOverride: {
  (config: Config.Service): <A, E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>
  <A, E, R>(self: Effect.Effect<A, E, R>, config: Config.Service): Effect.Effect<A, E, R>
} = dual<
  (config: Config.Service) => <A, E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>,
  <A, E, R>(self: Effect.Effect<A, E, R>, config: Config.Service) => Effect.Effect<A, E, R>
>(2, (self, overrides) =>
  Effect.flatMap(
    Config.getOrUndefined,
    (config) => Effect.provideService(self, Config, { ...config, ...overrides })
  ))
