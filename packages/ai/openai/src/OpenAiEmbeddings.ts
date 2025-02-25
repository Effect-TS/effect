/**
 * @since 1.0.0
 */
import { AiError } from "@effect/ai/AiError"
import * as AiModel from "@effect/ai/AiModel"
import * as Embeddings from "@effect/ai/Embeddings"
import * as Tokenizer from "@effect/ai/Tokenizer"
import * as Context from "effect/Context"
import type * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import { dual } from "effect/Function"
import * as Layer from "effect/Layer"
import type { Simplify } from "effect/Types"
import type * as Generated from "./Generated.js"
import { OpenAiClient } from "./OpenAiClient.js"
import * as OpenAiTokenizer from "./OpenAiTokenizer.js"

/**
 * @since 1.0.0
 * @category models
 */
export type Model = typeof Generated.CreateEmbeddingRequestModelEnum.Encoded

// =============================================================================
// Configuration
// =============================================================================

/**
 * @since 1.0.0
 * @category tags
 */
export class Config extends Context.Tag("@effect/ai-openai/OpenAiEmbeddings/Config")<
  Config,
  Config.Service
>() {
  /**
   * @since 1.0.0
   */
  static readonly getOrUndefined: Effect.Effect<typeof Config.Service | undefined> = Effect.map(
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
   * @category configuration
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
   * @category configuration
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
   * @category configuration
   */
  export interface DataLoader extends Omit<Config.Service, "model"> {
    readonly window: Duration.DurationInput
    readonly maxBatchSize?: number
  }
}

// =============================================================================
// OpenAi Embeddings
// =============================================================================

const modelCacheKey = Symbol.for("@effect/ai-openai/OpenAiEmbeddings/AiModel")

/**
 * @since 1.0.0
 * @category ai models
 */
export const model = (
  model: (string & {}) | Model,
  config: Simplify<
    (
      | ({ readonly mode: "batched" } & Config.Batched)
      | ({ readonly mode: "data-loader" } & Config.DataLoader)
    )
  >
): AiModel.AiModel<Embeddings.Embeddings | Tokenizer.Tokenizer, OpenAiClient> =>
  AiModel.make({
    model,
    cacheKey: modelCacheKey,
    requires: OpenAiClient,
    provides: (config.mode === "batched"
      ? makeBatched({ model, config })
      : makeDataLoader({ model, config })).pipe(
        Effect.map((embeddings) =>
          Context.merge(
            Context.make(Embeddings.Embeddings, embeddings),
            Context.make(Tokenizer.Tokenizer, OpenAiTokenizer.make({ model }))
          )
        )
      ),
    context: Context.make(Config, { ...config, model })
  })

const makeRequest = (
  client: OpenAiClient.Service,
  input: ReadonlyArray<string>,
  parentConfig: typeof Config.Service | undefined
) =>
  Effect.context<never>().pipe(
    Effect.flatMap((context) => {
      const localConfig = context.unsafeMap.get(Config.key)
      return client.client.createEmbedding({
        input,
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

const makeBatched = Effect.fnUntraced(function*(options: {
  readonly model: (string & {}) | Model
  readonly config: Config.Batched
}) {
  const client = yield* OpenAiClient
  const { cache, maxBatchSize = 2048, ...parentConfig } = options.config
  return yield* Embeddings.make({
    cache,
    maxBatchSize,
    embedMany(input) {
      return makeRequest(client, input, { ...parentConfig, model: options.model })
    }
  })
})

const makeDataLoader = Effect.fnUntraced(function*(options: {
  readonly model: (string & {}) | Model
  readonly config: Config.DataLoader
}) {
  const client = yield* OpenAiClient
  const { maxBatchSize = 2048, window, ...parentConfig } = options.config
  return yield* Embeddings.makeDataLoader({
    window,
    maxBatchSize,
    embedMany(input) {
      return makeRequest(client, input, { ...parentConfig, model: options.model })
    }
  })
})

/**
 * @since 1.0.0
 * @category layers
 */
export const layer = (options: {
  readonly model: (string & {}) | Model
  readonly maxBatchSize?: number
  readonly cache?: {
    readonly capacity: number
    readonly timeToLive: Duration.DurationInput
  }
  readonly config?: Config.Service
}): Layer.Layer<Embeddings.Embeddings, never, OpenAiClient> =>
  Layer.effect(
    Embeddings.Embeddings,
    makeBatched({
      model: options.model,
      config: {
        cache: options.cache,
        maxBatchSize: options.maxBatchSize,
        ...options.config
      }
    })
  )

/**
 * @since 1.0.0
 * @category layers
 */
export const layerDataLoader = (options: {
  readonly model: (string & {}) | Model
  readonly window: Duration.DurationInput
  readonly maxBatchSize?: number
  readonly config?: Config.Service
}): Layer.Layer<Embeddings.Embeddings, never, OpenAiClient> =>
  Layer.scoped(
    Embeddings.Embeddings,
    makeDataLoader({
      model: options.model,
      config: {
        window: options.window,
        maxBatchSize: options.maxBatchSize,
        ...options.config
      }
    })
  )

/**
 * @since 1.0.0
 * @category configuration
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
