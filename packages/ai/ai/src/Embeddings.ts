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
import * as Scope from "effect/Scope"
import { AiError } from "./AiError.js"

/**
 * @since 1.0.0
 * @category tags
 */
export class Embeddings extends Context.Tag("@effect/ai/Embeddings")<
  Embeddings,
  Embeddings.Service
>() {}

/**
 * @since 1.0.0
 * @category models
 */
export declare namespace Embeddings {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Service {
    readonly embed: (input: string) => Effect.Effect<Array<number>, AiError>
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface Result {
    readonly index: number
    readonly embeddings: Array<number>
  }
}

class EmbeddingRequest extends Schema.TaggedRequest<EmbeddingRequest>()("EmbeddingRequest", {
  failure: AiError,
  success: Schema.mutable(Schema.Array(Schema.Number)),
  payload: { input: Schema.String }
}) {}

const makeBatchedResolver = (
  embedMany: (input: ReadonlyArray<string>) => Effect.Effect<Array<Embeddings.Result>, AiError>
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
 * @category constructors
 */
export const make = (options: {
  readonly embedMany: (input: ReadonlyArray<string>) => Effect.Effect<Array<Embeddings.Result>, AiError>
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
      }).pipe(Effect.withSpan("Embeddings.create", {
        captureStackTrace: false,
        attributes: { input }
      }))
    }

    return Embeddings.of({
      embed
    })
  }).pipe(Effect.withSpan("Embeddings.make"))

/**
 * Creates an `Embeddings` service which will aggregate all `embed` requests
 * received during the specified `window` (up to a maximum of `maxBatchSize` 
 * requests, if specified) and execute them as a single batch.
 * 
 * @since 1.0.0
 * @category constructors
 */
export const makeDataLoader = (options: {
  readonly embedMany: (input: ReadonlyArray<string>) => Effect.Effect<Array<Embeddings.Result>, AiError>
  readonly window: Duration.DurationInput
  readonly maxBatchSize?: number
}) =>
  Effect.gen(function*() {
    const scope = yield* Effect.scope

    const resolver = makeBatchedResolver(options.embedMany)
    const resolverDelayed = dataLoader(resolver, {
      window: options.window,
      maxBatchSize: options.maxBatchSize
    })

    function embed(input: string) {
      return Effect.request(new EmbeddingRequest({ input }), resolverDelayed).pipe(
        Effect.withSpan("Embeddings.create", {
          captureStackTrace: false,
          attributes: { input }
        })
      ).pipe(Scope.extend(scope))
    }

    return Embeddings.of({
      embed
    })
  }).pipe(Effect.withSpan("Embeddings.makeDataLoader"))
