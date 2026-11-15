/**
 * The `AmazonBedrockEmbeddingModel` module provides the Amazon Bedrock
 * implementation of Effect AI's `EmbeddingModel` service for Amazon Titan Text
 * Embeddings V2 and Cohere Embed v3 and v4. It sends InvokeModel requests
 * through `AmazonBedrockClient`, exposes constructors for layers and `AiModel`
 * values, and supports scoped request configuration overrides.
 *
 * @stability unstable
 * @since 4.1.5
 */
import * as AiError from "effect/ai/AiError"
import * as EmbeddingModel from "effect/ai/EmbeddingModel"
import * as AiModel from "effect/ai/Model"
import * as Arr from "effect/Array"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { dual } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import { AmazonBedrockClient } from "./AmazonBedrockClient.ts"
import { AmazonBedrockConfig } from "./AmazonBedrockConfig.ts"

/**
 * A Bedrock model identifier, cross-region inference profile id or ARN, such
 * as `amazon.titan-embed-text-v2:0` or `eu.cohere.embed-v4:0`.
 *
 * @stability unstable
 * @category models
 * @since 4.1.5
 */
export type Model = string

/**
 * The embedding model family, which decides the request body and how many
 * texts one request carries.
 *
 * @stability unstable
 * @category models
 * @since 4.1.5
 */
export type Family = "titan-embed-text-v2" | "cohere-embed-v3" | "cohere-embed-v4"

/**
 * Context service for Amazon Bedrock embedding model configuration.
 *
 * **When to use**
 *
 * Use when you need scoped Bedrock request defaults or overrides for embedding
 * requests from Effect context.
 *
 * **Details**
 *
 * The fields use the names of the model's InvokeModel body, except
 * `dimensions`, which each family maps to its own field. Other fields are sent
 * as they are, and Bedrock rejects the ones a model does not accept.
 *
 * @see {@link withConfigOverride} for scoping embedding request overrides
 *
 * @stability unstable
 * @category services
 * @since 4.1.5
 */
export class Config extends Context.Service<Config, {
  /**
   * The vector size. Titan sends it as `dimensions` and Cohere v4 as
   * `output_dimension`. Cohere v3 requires 1024 when specified and does not send it.
   */
  readonly dimensions?: number | undefined
  /** Whether Titan normalizes the vector. */
  readonly normalize?: boolean | undefined
  /** The kind of input, read by Cohere. Both v3 and v4 require it. */
  readonly input_type?: "search_document" | "search_query" | "classification" | "clustering" | undefined
  /** How Cohere truncates long text: v3 uses START/END, v4 uses LEFT/RIGHT. */
  readonly truncate?: "NONE" | "START" | "END" | "LEFT" | "RIGHT" | undefined
  readonly [x: string]: unknown
}>()("@effect/ai-amazon-bedrock/AmazonBedrockEmbeddingModel/Config") {}

/**
 * Creates an `AiModel` for an Amazon Bedrock embedding model with its
 * configured vector dimensions.
 *
 * **When to use**
 *
 * Use to provide an Amazon Bedrock `EmbeddingModel` and its `Dimensions`
 * service to an Effect program.
 *
 * @see {@link layer} for providing only the embedding model service
 * @see {@link withConfigOverride} for scoped request configuration overrides
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.5
 */
export const model = (
  model: Model,
  options: {
    readonly family: Family
    readonly dimensions: number
    readonly config?: Omit<typeof Config.Service, "dimensions">
  }
): AiModel.Model<"amazon-bedrock", EmbeddingModel.EmbeddingModel | EmbeddingModel.Dimensions, AmazonBedrockClient> =>
  AiModel.make(
    "amazon-bedrock",
    model,
    Layer.merge(
      layer({
        model,
        family: options.family,
        config: {
          ...options.config,
          dimensions: options.dimensions
        }
      }),
      Layer.succeed(EmbeddingModel.Dimensions, options.dimensions)
    )
  )

/**
 * Creates an Amazon Bedrock embedding model service.
 *
 * **When to use**
 *
 * Use to construct the `EmbeddingModel` effectfully when
 * `AmazonBedrockClient` is already available in the environment.
 *
 * **Details**
 *
 * The `model` option names the model in the InvokeModel URL, and `family`
 * selects the request body. Titan embeds one text per request and Cohere up to
 * 96, so a larger batch is split into several requests. Constructor `config`
 * supplies request fields, and scoped overrides from `withConfigOverride` are
 * merged last for each request. Usage is the sum of the
 * `x-amzn-bedrock-input-token-count` response headers, or `undefined` when a
 * response has a missing or invalid count.
 *
 * **Gotchas**
 *
 * Concurrent `embed` calls share a request when their `Config` and
 * `AmazonBedrockConfig` values are equal. Up to 5 requests of one batch run at
 * the same time. Other per-call context used by an injected HTTP client comes
 * from the first caller in a batch.
 *
 * @see {@link layer} for providing the embedding model service as a layer
 * @see {@link model} for creating an `AiModel` that also provides dimensions
 * @see {@link withConfigOverride} for scoped request configuration overrides
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.5
 */
export const make = Effect.fnUntraced(function*({ model, family, config: providerConfig }: {
  readonly model: Model
  readonly family: Family
  readonly config?: typeof Config.Service | undefined
}): Effect.fn.Return<EmbeddingModel.EmbeddingModel, never, AmazonBedrockClient> {
  const client = yield* AmazonBedrockClient
  const invoke = client.invokeModel(InvokeModelResponse)
  const row = families[family]

  const makeConfig = Effect.contextWith((services: Context.Context<never>) =>
    Effect.succeed({ ...providerConfig, ...Context.getOrUndefined(services, Config) })
  )

  return yield* EmbeddingModel.make({
    batchKey: (context) => [
      Context.getOrUndefined(context, Config),
      Context.getOrUndefined(context, AmazonBedrockConfig)
    ],
    embedMany: Effect.fnUntraced(function*({ inputs }) {
      const config = yield* makeConfig
      if (family === "cohere-embed-v3" && config.dimensions !== undefined && config.dimensions !== 1024) {
        return yield* Effect.fail(AiError.make({
          module: "AmazonBedrockEmbeddingModel",
          method: "embedMany",
          reason: new AiError.InvalidRequestError({
            parameter: "dimensions",
            description: "Cohere Embed v3 requires 1024 dimensions"
          })
        }))
      }
      const responses = yield* Effect.forEach(
        Arr.chunksOf(inputs, row.textsPerRequest),
        Effect.fnUntraced(function*(texts) {
          const [body, response] = yield* invoke({ modelId: model, body: row.body(config, texts) })
          const results = vectors(body)
          if (results.length !== texts.length) {
            return yield* Effect.fail(AiError.make({
              module: "AmazonBedrockEmbeddingModel",
              method: "embedMany",
              reason: new AiError.InvalidOutputError({
                description: `Expected ${texts.length} embeddings, received ${results.length}`
              })
            }))
          }
          return [results, response] as const
        }),
        { concurrency: 5 }
      )
      return {
        results: responses.flatMap(([results]) => results),
        usage: {
          inputTokens: responses.reduce<number | undefined>((total, [, response]) => {
            const header = response.headers["x-amzn-bedrock-input-token-count"]
            if (total === undefined || header === undefined || !/^\d+$/.test(header)) return undefined
            const sum = total + Number(header)
            return Number.isSafeInteger(sum) ? sum : undefined
          }, 0)
        }
      }
    })
  })
})

/**
 * Creates a layer for the Amazon Bedrock embedding model.
 *
 * **When to use**
 *
 * Use when composing application layers and you want Amazon Bedrock to
 * satisfy `EmbeddingModel.EmbeddingModel` while supplying
 * `AmazonBedrockClient` from another layer.
 *
 * @see {@link make} for constructing the embedding model service effectfully
 * @see {@link model} for creating an `AiModel` that also provides embedding dimensions
 *
 * @stability unstable
 * @category layers
 * @since 4.1.5
 */
export const layer = (options: {
  readonly model: Model
  readonly family: Family
  readonly config?: typeof Config.Service | undefined
}): Layer.Layer<EmbeddingModel.EmbeddingModel, never, AmazonBedrockClient> =>
  Layer.effect(EmbeddingModel.EmbeddingModel, make(options))

/**
 * Provides config overrides for Amazon Bedrock embedding model operations.
 *
 * **When to use**
 *
 * Use when you need scoped Bedrock embedding request defaults for a single
 * effect or workflow without rebuilding the embedding model service, such as
 * `input_type: "search_query"` for a Cohere query.
 *
 * **Details**
 *
 * Supports both data-first and data-last forms. Existing scoped config is read
 * first, then the provided overrides are applied so override fields take
 * precedence.
 *
 * @see {@link Config} for the scoped embedding request configuration service
 *
 * @stability unstable
 * @category configuration
 * @since 4.1.5
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

interface Row {
  readonly textsPerRequest: number
  readonly body: (config: typeof Config.Service, texts: ReadonlyArray<string>) => unknown
}

const families: Record<Family, Row> = {
  "titan-embed-text-v2": {
    textsPerRequest: 1,
    body: (config, texts) => ({ ...config, inputText: texts[0] })
  },
  "cohere-embed-v3": {
    textsPerRequest: 96,
    body: ({ dimensions: _, ...config }, texts) => ({ ...config, texts })
  },
  "cohere-embed-v4": {
    textsPerRequest: 96,
    body: ({ dimensions, ...config }, texts) => ({
      ...config,
      ...(dimensions === undefined ? {} : { output_dimension: dimensions }),
      texts
    })
  }
}

const Vectors = Schema.Array(Schema.Array(Schema.Finite))

const InvokeModelResponse = Schema.Union([
  Schema.Struct({ embedding: Schema.Array(Schema.Finite) }),
  Schema.Struct({ embeddings: Schema.Union([Vectors, Schema.Struct({ float: Vectors })]) })
])

const vectors = (body: typeof InvokeModelResponse.Type): Array<Array<number>> => {
  if ("embedding" in body) {
    return [[...body.embedding]]
  }
  const embeddings = "float" in body.embeddings ? body.embeddings.float : body.embeddings
  return embeddings.map((vector) => [...vector])
}
