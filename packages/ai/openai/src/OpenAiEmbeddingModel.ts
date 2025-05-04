/**
 * @since 1.0.0
 */
import * as AiEmbeddingModel from "@effect/ai/AiEmbeddingModel"
import { AiError } from "@effect/ai/AiError"
import * as AiModel from "@effect/ai/AiModel"
import * as Tokenizer from "@effect/ai/Tokenizer"
import * as Context from "effect/Context"
import type * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import { dual } from "effect/Function"
import * as Struct from "effect/Struct"
import type { Simplify } from "effect/Types"
import type * as Generated from "./Generated.js"
import { OpenAiClient } from "./OpenAiClient.js"
import * as OpenAiTokenizer from "./OpenAiTokenizer.js"

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

const batchedModelCacheKey = "@effect/ai-openai/OpenAiEmbeddingModel/Batched/AiModel"
const dataLoaderModelCacheKey = "@effect/ai-openai/OpenAiEmbeddingModel/DataLoader/AiModel"

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
): AiModel.AiModel<AiEmbeddingModel.AiEmbeddingModel | Tokenizer.Tokenizer, OpenAiClient> =>
  AiModel.make({
    cacheKey: config.mode === "batched"
      ? batchedModelCacheKey
      : dataLoaderModelCacheKey,
    cachedContext: Effect.map(
      config.mode === "batched"
        ? makeBatched({ model, config })
        : makeDataLoader({ model, config }),
      (model) => Context.make(AiEmbeddingModel.AiEmbeddingModel, model)
    ),
    updateRequestContext: Effect.fnUntraced(
      function*(context: Context.Context<AiEmbeddingModel.AiEmbeddingModel>) {
        const parentConfig = config.mode === "batched"
          ? Struct.omit("mode", "maxBatchSize", "cache")(config)
          : Struct.omit("mode", "maxBatchSize", "window")(config)
        const perRequestConfig = yield* Config.getOrUndefined
        return Context.mergeAll(
          context,
          Context.make(Config, { model, ...parentConfig, ...perRequestConfig }),
          Context.make(Tokenizer.Tokenizer, OpenAiTokenizer.make({ model: perRequestConfig?.model ?? model }))
        )
      }
    )
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

const makeBatched = Effect.fnUntraced(function*(options: {
  readonly model: (string & {}) | Model
  readonly config: Config.Batched
}) {
  const client = yield* OpenAiClient
  const { cache, maxBatchSize = 2048, ...parentConfig } = options.config
  return yield* AiEmbeddingModel.make({
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
  return yield* AiEmbeddingModel.makeDataLoader({
    window,
    maxBatchSize,
    embedMany(input) {
      return makeRequest(client, input, { ...parentConfig, model: options.model })
    }
  })
})

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
