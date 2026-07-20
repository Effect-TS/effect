/**
 * Google Vertex Embedding Model implementation.
 *
 * Provides an `EmbeddingModel` implementation for the Vertex AI text embedding
 * models via the `predict` endpoint.
 *
 * @since 4.0.0
 */
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { dual } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Predicate from "effect/Predicate"
import type { Simplify } from "effect/Types"
import * as AiError from "effect/unstable/ai/AiError"
import * as EmbeddingModel from "effect/unstable/ai/EmbeddingModel"
import * as AiModel from "effect/unstable/ai/Model"
import { GoogleVertexClient } from "./GoogleVertexClient.ts"
import type * as Schemas from "./internal/schemas.ts"

/**
 * Model identifiers supported by Vertex AI's text embedding API.
 *
 * @category models
 * @since 4.0.0
 */
export type Model = (string & {}) | "gemini-embedding-001" | "text-embedding-004" | "text-embedding-005" | "text-multilingual-embedding-002"

/**
 * Service definition for Google Vertex embedding model configuration.
 *
 * @category services
 * @since 4.0.0
 */
export class Config extends Context.Service<
  Config,
  Simplify<{
    readonly model?: string
    /**
     * The intended downstream task, used to optimize embedding quality (e.g.
     * `RETRIEVAL_QUERY`, `RETRIEVAL_DOCUMENT`, `SEMANTIC_SIMILARITY`).
     */
    readonly taskType?: string
    /**
     * An optional title for the text, used with `RETRIEVAL_DOCUMENT`.
     */
    readonly title?: string
    /**
     * The number of dimensions the resulting output embeddings should have.
     */
    readonly outputDimensionality?: number
    /**
     * Whether to silently truncate inputs longer than the maximum token length.
     */
    readonly autoTruncate?: boolean
  }>
>()("@effect/ai-google-vertex/GoogleVertexEmbeddingModel/Config") {}

/**
 * Creates an `AiModel` for a Google Vertex embedding model with its configured
 * vector dimensions.
 *
 * @category constructors
 * @since 4.0.0
 */
export const model = (
  model: Model,
  options: {
    readonly dimensions: number
    readonly config?: Omit<typeof Config.Service, "model">
  }
): AiModel.Model<"google-vertex", EmbeddingModel.EmbeddingModel | EmbeddingModel.Dimensions, GoogleVertexClient> =>
  AiModel.make(
    "google-vertex",
    model,
    Layer.merge(
      layer({
        model,
        config: { ...options.config, outputDimensionality: options.dimensions }
      }),
      Layer.succeed(EmbeddingModel.Dimensions, options.dimensions)
    )
  )

/**
 * Creates a Google Vertex embedding model service.
 *
 * @category constructors
 * @since 4.0.0
 */
export const make = Effect.fnUntraced(function*({ config: providerConfig, model }: {
  readonly model: Model
  readonly config?: Omit<typeof Config.Service, "model"> | undefined
}): Effect.fn.Return<EmbeddingModel.Service, never, GoogleVertexClient> {
  const client = yield* GoogleVertexClient

  const makeConfig = Effect.gen(function*() {
    const services = yield* Effect.context<never>()
    return { model, ...providerConfig, ...services.mapUnsafe.get(Config.key) }
  })

  return yield* EmbeddingModel.make({
    embedMany: Effect.fnUntraced(function*({ inputs }) {
      const config = yield* makeConfig
      const [response] = yield* client.predict({
        model: config.model!,
        instances: inputs.map((content) => ({
          content,
          ...(Predicate.isNotUndefined(config.taskType) ? { task_type: config.taskType } : undefined),
          ...(Predicate.isNotUndefined(config.title) ? { title: config.title } : undefined)
        })),
        parameters: {
          ...(Predicate.isNotUndefined(config.outputDimensionality)
            ? { outputDimensionality: config.outputDimensionality }
            : undefined),
          ...(Predicate.isNotUndefined(config.autoTruncate) ? { autoTruncate: config.autoTruncate } : undefined)
        }
      })
      return yield* mapProviderResponse(inputs.length, response)
    })
  })
})

/**
 * Creates a layer for the Google Vertex embedding model.
 *
 * @category layers
 * @since 4.0.0
 */
export const layer = (options: {
  readonly model: Model
  readonly config?: Omit<typeof Config.Service, "model"> | undefined
}): Layer.Layer<EmbeddingModel.EmbeddingModel, never, GoogleVertexClient> =>
  Layer.effect(EmbeddingModel.EmbeddingModel, make(options))

/**
 * Provides config overrides for Google Vertex embedding model operations.
 *
 * @category configuration
 * @since 4.0.0
 */
export const withConfigOverride: {
  (overrides: typeof Config.Service): <A, E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E, Exclude<R, Config>>
  <A, E, R>(self: Effect.Effect<A, E, R>, overrides: typeof Config.Service): Effect.Effect<A, E, Exclude<R, Config>>
} = dual<
  (
    overrides: typeof Config.Service
  ) => <A, E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E, Exclude<R, Config>>,
  <A, E, R>(self: Effect.Effect<A, E, R>, overrides: typeof Config.Service) => Effect.Effect<A, E, Exclude<R, Config>>
>(2, (self, overrides) =>
  Effect.flatMap(
    Effect.serviceOption(Config),
    (config) =>
      Effect.provideService(self, Config, {
        ...(config._tag === "Some" ? config.value : {}),
        ...overrides
      })
  ))

const mapProviderResponse = (
  inputLength: number,
  response: Schemas.PredictResponse
): Effect.Effect<EmbeddingModel.ProviderResponse, AiError.AiError> => {
  if (response.predictions.length !== inputLength) {
    return Effect.fail(
      invalidOutput(
        "Provider returned " + response.predictions.length + " embeddings but expected " + inputLength
      )
    )
  }

  const results = response.predictions.map((prediction) => [...prediction.embeddings.values])
  const inputTokens = response.predictions.reduce(
    (total, prediction) => total + (prediction.embeddings.statistics?.token_count ?? 0),
    0
  )

  return Effect.succeed({
    results,
    usage: { inputTokens }
  })
}

const invalidOutput = (description: string): AiError.AiError =>
  AiError.make({
    module: "GoogleVertexEmbeddingModel",
    method: "embedMany",
    reason: new AiError.InvalidOutputError({ description })
  })
