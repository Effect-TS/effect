/**
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
import type { Concurrency } from "effect/Types"
import { AiError } from "./AiError.js"

/**
 * @since 1.0.0
 * @category Context
 */
export class AiEmbeddingModel extends Context.Tag("@effect/ai/AiEmbeddingModel")<
  AiEmbeddingModel,
  AiEmbeddingModel.Service
>() {}

/**
 * @since 1.0.0
 */
export declare namespace AiEmbeddingModel {
  /**
   * @since 1.0.0
   * @category Models
   */
  export interface Service {
    readonly embed: (input: string) => Effect.Effect<Array<number>, AiError>
    readonly embedMany: (input: ReadonlyArray<string>, options?: {
      /**
       * The concurrency level to use while batching requests.
       */
      readonly concurrency?: Concurrency | undefined
    }) => Effect.Effect<Array<Array<number>>, AiError>
  }

  /**
   * @since 1.0.0
   * @category Models
   */
  export interface Result {
    readonly index: number
    readonly embeddings: Array<number>
  }
}

class EmbeddingRequest extends Schema.TaggedRequest<EmbeddingRequest>(
  "@effect/ai/AiEmbeddingModel/Request"
)("EmbeddingRequest", {
  failure: AiError,
  success: Schema.mutable(Schema.Array(Schema.Number)),
  payload: { input: Schema.String }
}) {}

const makeBatchedResolver = (
  embedMany: (input: ReadonlyArray<string>) => Effect.Effect<Array<AiEmbeddingModel.Result>, AiError>
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
 * @since 1.0.0
 * @category Constructors
 */
export const make = (options: {
  readonly embedMany: (input: ReadonlyArray<string>) => Effect.Effect<Array<AiEmbeddingModel.Result>, AiError>
  readonly maxBatchSize?: number
  readonly cache?: {
    readonly capacity: number
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

    function embed(input: string) {
      const request = Effect.request(new EmbeddingRequest({ input }), resolver)
      return Option.match(cache, {
        onNone: () => request,
        onSome: (cache) =>
          request.pipe(
            Effect.withRequestCaching(true),
            Effect.withRequestCache(cache)
          )
      }).pipe(Effect.withSpan("AiEmbeddingModel.embed", { captureStackTrace: false }))
    }

    function embedMany(inputs: ReadonlyArray<string>, options?: {
      readonly concurrency?: Concurrency | undefined
    }) {
      return Effect.forEach(inputs, embed, { batching: true, concurrency: options?.concurrency }).pipe(
        Effect.withSpan("AiEmbeddingModel.embedMany", { captureStackTrace: false })
      )
    }

    return AiEmbeddingModel.of({
      embed,
      embedMany
    })
  })

/**
 * Creates an `Embeddings` service which will aggregate all `embed` requests
 * received during the specified `window` (up to a maximum of `maxBatchSize`
 * requests, if specified) and execute them as a single batch.
 *
 * @since 1.0.0
 * @category Constructors
 */
export const makeDataLoader = (options: {
  readonly embedMany: (input: ReadonlyArray<string>) => Effect.Effect<Array<AiEmbeddingModel.Result>, AiError>
  readonly window: Duration.DurationInput
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
        Effect.withSpan("AiEmbeddingModel.embed", { captureStackTrace: false })
      )
    }

    function embedMany(inputs: ReadonlyArray<string>, options?: {
      readonly concurrency?: Concurrency | undefined
    }) {
      return Effect.forEach(inputs, embed, { batching: true, concurrency: options?.concurrency }).pipe(
        Effect.withSpan("AiEmbeddingModel.embedMany", { captureStackTrace: false })
      )
    }

    return AiEmbeddingModel.of({
      embed,
      embedMany
    })
  })
