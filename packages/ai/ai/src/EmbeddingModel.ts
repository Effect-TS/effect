/**
 * The `EmbeddingModel` module provides vector embeddings for text using AI
 * models.
 *
 * This module enables efficient conversion of text into high-dimensional vector
 * representations that capture semantic meaning. It supports batching, caching,
 * and request optimization for production use cases like semantic search,
 * document similarity, and clustering.
 *
 * @example
 * ```ts
 * import { EmbeddingModel } from "@effect/ai"
 * import { Effect } from "effect"
 *
 * // Basic embedding usage
 * const program = Effect.gen(function* () {
 *   const embedding = yield* EmbeddingModel.EmbeddingModel
 *
 *   const vector = yield* embedding.embed("Hello world!")
 *   console.log(vector) // [0.123, -0.456, 0.789, ...]
 *
 *   return vector
 * })
 * ```
 *
 * @example
 * ```ts
 * import { EmbeddingModel } from "@effect/ai"
 * import { Effect, Duration } from "effect"
 *
 * declare const generateVectorFor: (text: string) => Array<number>
 *
 * // Create embedding service with batching and caching
 * const embeddingService = EmbeddingModel.make({
 *   embedMany: (texts) => Effect.succeed(
 *     texts.map((text, index) => ({
 *       index,
 *       embeddings: generateVectorFor(text)
 *     }))
 *   ),
 *   maxBatchSize: 50,
 *   cache: {
 *     capacity: 1000,
 *     timeToLive: Duration.minutes(30)
 *   }
 * })
 * ```
 *
 * @since 1.0.0
 */
import { dataLoader } from "@effect/experimental/RequestResolver"
import * as Context from "effect/Context"
import type * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import { identity } from "effect/Function"
import * as Option from "effect/Option"
import * as Request from "effect/Request"
import * as RequestResolver from "effect/RequestResolver"
import * as Schema from "effect/Schema"
import type * as Types from "effect/Types"
import * as AiError from "./AiError.js"

/**
 * The `EmbeddingModel` service tag for dependency injection.
 *
 * This tag provides access to vector embedding functionality throughout your application,
 * enabling conversion of text to high-dimensional vectors for semantic analysis.
 *
 * @example
 * ```ts
 * import { EmbeddingModel } from "@effect/ai"
 * import { Effect } from "effect"
 *
 * const useEmbeddings = Effect.gen(function* () {
 *   const embedder = yield* EmbeddingModel
 *
 *   const documentVector = yield* embedder.embed("This is a sample document")
 *   const queryVector = yield* embedder.embed("sample query")
 *
 *   const similarity = cosineSimilarity(documentVector, queryVector)
 *   return similarity
 * })
 * ```
 *
 * @since 1.0.0
 * @category Context
 */
export class EmbeddingModel extends Context.Tag("@effect/ai/EmbeddingModel")<
  EmbeddingModel,
  Service
>() {}

/**
 * The service interface for vector embedding operations.
 *
 * Defines the contract that all embedding model implementations must fulfill.
 * The service provides text-to-vector conversion functionality.
 *
 * @since 1.0.0
 * @category Models
 */
export interface Service {
  /**
   * Converts a text string into a vector embedding.
   */
  readonly embed: (input: string) => Effect.Effect<Array<number>, AiError.AiError>
  /**
   * Converts a batch of text strings into a chunk of vector embeddings.
   */
  readonly embedMany: (input: ReadonlyArray<string>, options?: {
    /**
     * The concurrency level to use while batching requests.
     */
    readonly concurrency?: Types.Concurrency | undefined
  }) => Effect.Effect<Array<Array<number>>, AiError.AiError>
}

/**
 * Represents the result of a batch embedding operation.
 *
 * Used internally by the batching system to associate embeddings with their
 * original request positions in the batch.
 *
 * @example
 * ```ts
 * import { EmbeddingModel } from "@effect/ai"
 *
 * const batchResults: EmbeddingModel.Result[] = [
 *   { index: 0, embeddings: [0.1, 0.2, 0.3] },
 *   { index: 1, embeddings: [0.4, 0.5, 0.6] },
 *   { index: 2, embeddings: [0.7, 0.8, 0.9] }
 * ]
 *
 * // Results correspond to input texts at positions 0, 1, 2
 * ```
 *
 * @since 1.0.0
 * @category Models
 */
export interface Result {
  /**
   * The position index of this result in the original batch request.
   */
  readonly index: number

  /**
   * The vector embedding for the text at this index.
   */
  readonly embeddings: Array<number>
}

class EmbeddingRequest extends Schema.TaggedRequest<EmbeddingRequest>(
  "@effect/ai/EmbeddingModel/Request"
)("EmbeddingRequest", {
  failure: AiError.AiError,
  success: Schema.mutable(Schema.Array(Schema.Number)),
  payload: { input: Schema.String }
}) {}

const makeBatchedResolver = (
  embedMany: (input: ReadonlyArray<string>) => Effect.Effect<Array<Result>, AiError.AiError>
) =>
  RequestResolver.makeBatched(
    (requests: ReadonlyArray<EmbeddingRequest>) =>
      embedMany(requests.map((request) => request.input)).pipe(
        Effect.flatMap(
          Effect.forEach(
            ({ embeddings, index }) => Request.succeed(requests[index], embeddings),
            { discard: true }
          )
        ),
        Effect.catchAll((error) =>
          Effect.forEach(
            requests,
            (request) => Request.fail(request, error),
            { discard: true }
          )
        )
      )
  )

/**
 * Creates an EmbeddingModel service with batching and caching capabilities.
 *
 * This is the primary constructor for creating embedding services. It supports
 * automatic batching of requests for efficiency and optional caching to reduce
 * redundant API calls.
 *
 * @since 1.0.0
 * @category Constructors
 */
export const make = (options: {
  /**
   * A method which processes a batch of text inputs and returns embedding
   * results.
   */
  readonly embedMany: (input: ReadonlyArray<string>) => Effect.Effect<Array<Result>, AiError.AiError>
  /**
   * Optional maximum number of text inputs to process in one batch.
   */
  readonly maxBatchSize?: number
  /**
   * Optional configuration to control how batch request results are cached.
   */
  readonly cache?: {
    /**
     * The capacity of the cache.
     */
    readonly capacity: number
    /**
     * The time-to-live for items in the cache.
     */
    readonly timeToLive: Duration.DurationInput
  }
}) =>
  Effect.gen(function*() {
    const cache = yield* Option.fromNullable(options.cache).pipe(
      Effect.flatMap((config) => Request.makeCache(config)),
      Effect.optionFromOptional
    )

    const resolver = makeBatchedResolver(options.embedMany).pipe(
      options.maxBatchSize ? RequestResolver.batchN(options.maxBatchSize) : identity
    )

    const embed = (input: string) => {
      const request = Effect.request(new EmbeddingRequest({ input }), resolver)
      return Option.match(cache, {
        onNone: () => request,
        onSome: (cache) =>
          request.pipe(
            Effect.withRequestCaching(true),
            Effect.withRequestCache(cache)
          )
      })
    }

    const embedMany = (inputs: ReadonlyArray<string>, options?: {
      readonly concurrency?: Types.Concurrency | undefined
    }) =>
      Effect.forEach(inputs, embed, {
        batching: true,
        concurrency: options?.concurrency
      })

    return EmbeddingModel.of({
      embed: (input) =>
        embed(input).pipe(
          Effect.withSpan("EmbeddingModel.embed", { captureStackTrace: false })
        ),
      embedMany: (inputs) =>
        embedMany(inputs).pipe(
          Effect.withSpan("EmbeddingModel.embedMany", { captureStackTrace: false })
        )
    })
  })

/**
 * Creates an EmbeddingModel service with time-window based batching.
 *
 * This constructor creates a service that uses a data loader pattern to batch
 * embedding requests within a specified time window. This is optimal for
 * high-throughput scenarios where you want to automatically batch requests that
 * arrive within a short time period.
 *
 * @since 1.0.0
 * @category Constructors
 */
export const makeDataLoader = (options: {
  /**
   * A method which processes a batch of text inputs and returns embedding
   * results.
   */
  readonly embedMany: (input: ReadonlyArray<string>) => Effect.Effect<Array<Result>, AiError.AiError>
  /**
   * The duration between batch requests during which requests are collected and
   * added to the current batch.
   */
  readonly window: Duration.DurationInput
  /**
   * Optional maximum number of requests to add to the batch before a batch
   * request must be sent.
   */
  readonly maxBatchSize?: number
}) =>
  Effect.gen(function*() {
    const resolver = makeBatchedResolver(options.embedMany)
    const resolverDelayed = yield* dataLoader(resolver, {
      window: options.window,
      maxBatchSize: options.maxBatchSize
    })

    function embed(input: string) {
      return Effect.request(new EmbeddingRequest({ input }), resolverDelayed).pipe(
        Effect.withSpan("EmbeddingModel.embed", { captureStackTrace: false })
      )
    }

    function embedMany(inputs: ReadonlyArray<string>, options?: {
      readonly concurrency?: Types.Concurrency | undefined
    }) {
      return Effect.forEach(inputs, embed, { batching: true, concurrency: options?.concurrency }).pipe(
        Effect.withSpan("EmbeddingModel.embedMany", { captureStackTrace: false })
      )
    }

    return EmbeddingModel.of({
      embed,
      embedMany
    })
  })
