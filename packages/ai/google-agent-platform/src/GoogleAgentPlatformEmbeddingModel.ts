/**
 * Gemini Enterprise Agent Platform embedding model implementation.
 *
 * Provides an `EmbeddingModel` implementation for text embedding models via
 * `predict` and for `gemini-embedding-2` via `embedContent`.
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
import { GoogleAgentPlatformClient } from "./GoogleAgentPlatformClient.ts"
import type * as Schemas from "./internal/schemas.ts"

/**
 * Embedding model identifiers supported by Gemini Enterprise Agent Platform.
 *
 * See the [text embeddings](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/embeddings/get-text-embeddings)
 * documentation for the current model identifiers.
 *
 * `gemini-embedding-2` uses the separate `embedContent` API. See the
 * [multimodal embeddings](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/embeddings/get-multimodal-embeddings)
 * documentation for details.
 *
 * @category models
 * @since 4.0.0
 */
export type Model =
  | (string & {})
  | "gemini-embedding-2"
  | "gemini-embedding-001"
  | "text-embedding-005"
  | "text-multilingual-embedding-002"

/**
 * Service definition for Google Agent Platform embedding model configuration.
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
     * Only applies to text embedding models served through `predict`.
     */
    readonly taskType?: string
    /**
     * An optional title for the text, used with `RETRIEVAL_DOCUMENT`.
     * Only applies to text embedding models served through `predict`.
     */
    readonly title?: string
    /**
     * The number of dimensions the resulting output embeddings should have.
     */
    readonly outputDimensionality?: number
    /**
     * Whether to silently truncate inputs longer than the maximum token length.
     * Only applies to text embedding models served through `predict`.
     */
    readonly autoTruncate?: boolean
  }>
>()("@effect/ai-google-agent-platform/GoogleAgentPlatformEmbeddingModel/Config") {}

/**
 * Creates an `AiModel` for a Google Agent Platform embedding model with its configured
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
): AiModel.Model<
  "google-agent-platform",
  EmbeddingModel.EmbeddingModel | EmbeddingModel.Dimensions,
  GoogleAgentPlatformClient
> =>
  AiModel.make(
    "google-agent-platform",
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
 * Creates a Google Agent Platform embedding model service.
 *
 * @category constructors
 * @since 4.0.0
 */
export const make = Effect.fnUntraced(function*({ config: providerConfig, model }: {
  readonly model: Model
  readonly config?: Omit<typeof Config.Service, "model"> | undefined
}): Effect.fn.Return<EmbeddingModel.Service, never, GoogleAgentPlatformClient> {
  const client = yield* GoogleAgentPlatformClient

  const makeConfig = Effect.gen(function*() {
    const services = yield* Effect.context<never>()
    return { model, ...providerConfig, ...services.mapUnsafe.get(Config.key) }
  })

  return yield* EmbeddingModel.make({
    embedMany: Effect.fnUntraced(function*({ inputs }) {
      const config = yield* makeConfig
      if (usesEmbedContent(config.model!)) {
        const responses = yield* Effect.forEach(inputs, (input) =>
          client.embedContent({
            model: config.model!,
            request: {
              content: { parts: [{ text: input }] },
              ...(Predicate.isNotUndefined(config.outputDimensionality)
                ? { embedContentConfig: { outputDimensionality: config.outputDimensionality } }
                : undefined)
            }
          }))
        return {
          results: responses.map(([response]) => [...response.embedding.values]),
          usage: {
            inputTokens: responses.reduce(
              (total, [response]) => total + (response.usageMetadata?.promptTokenCount ?? 0),
              0
            )
          }
        }
      }
      const instances = inputs.map(makePredictInstance(config))
      const parameters = makePredictParameters(config)
      if (usesSingleInputPredict(config.model!)) {
        const responses = yield* Effect.forEach(instances, (instance) =>
          Effect.flatMap(
            client.predict({
              model: config.model!,
              instances: [instance],
              parameters
            }),
            ([response]) => mapProviderResponse(1, response)
          ))
        return combineProviderResponses(responses)
      }
      const [response] = yield* client.predict({
        model: config.model!,
        instances,
        parameters
      })
      return yield* mapProviderResponse(inputs.length, response)
    })
  })
})

/**
 * Creates a layer for the Google Agent Platform embedding model.
 *
 * @category layers
 * @since 4.0.0
 */
export const layer = (options: {
  readonly model: Model
  readonly config?: Omit<typeof Config.Service, "model"> | undefined
}): Layer.Layer<EmbeddingModel.EmbeddingModel, never, GoogleAgentPlatformClient> =>
  Layer.effect(EmbeddingModel.EmbeddingModel, make(options))

/**
 * Provides config overrides for Google Agent Platform embedding model operations.
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

const usesEmbedContent = (model: string): boolean =>
  model === "gemini-embedding-2" || model.endsWith("/gemini-embedding-2")

const usesSingleInputPredict = (model: string): boolean =>
  model === "gemini-embedding-001" || model.endsWith("/gemini-embedding-001")

const makePredictInstance = (config: typeof Config.Service) => (content: string) => ({
  content,
  ...(Predicate.isNotUndefined(config.taskType) ? { task_type: config.taskType } : undefined),
  ...(Predicate.isNotUndefined(config.title) ? { title: config.title } : undefined)
})

const makePredictParameters = (config: typeof Config.Service) => ({
  ...(Predicate.isNotUndefined(config.outputDimensionality)
    ? { outputDimensionality: config.outputDimensionality }
    : undefined),
  ...(Predicate.isNotUndefined(config.autoTruncate) ? { autoTruncate: config.autoTruncate } : undefined)
})

const combineProviderResponses = (
  responses: ReadonlyArray<EmbeddingModel.ProviderResponse>
): EmbeddingModel.ProviderResponse => ({
  results: responses.flatMap((response) => response.results),
  usage: {
    inputTokens: responses.reduce((total, response) => total + (response.usage.inputTokens ?? 0), 0)
  }
})

const invalidOutput = (description: string): AiError.AiError =>
  AiError.make({
    module: "GoogleAgentPlatformEmbeddingModel",
    method: "embedMany",
    reason: new AiError.InvalidOutputError({ description })
  })
