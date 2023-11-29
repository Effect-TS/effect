/**
 * @since 1.0.0
 */
import * as Schema from "@effect/schema/Schema"
import * as Cause from "effect/Cause"
import * as Chunk from "effect/Chunk"
import * as Deferred from "effect/Deferred"
import type * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import { dual, pipe } from "effect/Function"
import * as Option from "effect/Option"
import * as PrimaryKey from "effect/PrimaryKey"
import * as Queue from "effect/Queue"
import * as ReadonlyArray from "effect/ReadonlyArray"
import * as Ref from "effect/Ref"
import * as Request from "effect/Request"
import * as RequestResolver from "effect/RequestResolver"
import type * as Scope from "effect/Scope"
import * as Persistence from "./Persistence.js"

interface DataLoaderItem<A extends Request.Request<any, any>> {
  readonly request: A
  readonly deferred: Deferred.Deferred<
    Request.Request.Error<A>,
    Request.Request.Success<A>
  >
}

/**
 * @since 1.0.0
 * @category combinators
 */
export const dataLoader = dual<
  (
    options: {
      readonly window: Duration.DurationInput
      readonly maxBatchSize?: number
    }
  ) => <A extends Request.Request<any, any>>(
    self: RequestResolver.RequestResolver<A, never>
  ) => Effect.Effect<Scope.Scope, never, RequestResolver.RequestResolver<A, never>>,
  <A extends Request.Request<any, any>>(
    self: RequestResolver.RequestResolver<A, never>,
    options: {
      readonly window: Duration.DurationInput
      readonly maxBatchSize?: number
    }
  ) => Effect.Effect<Scope.Scope, never, RequestResolver.RequestResolver<A, never>>
>(2, <A extends Request.Request<any, any>>(
  self: RequestResolver.RequestResolver<A, never>,
  options: {
    readonly window: Duration.DurationInput
    readonly maxBatchSize?: number
  }
) =>
  Effect.gen(function*(_) {
    const queue = yield* _(Queue.unbounded<DataLoaderItem<A>>())
    const batch = yield* _(Ref.make(Chunk.empty<DataLoaderItem<A>>()))
    const takeOne = Effect.flatMap(Queue.take(queue), (item) => Ref.updateAndGet(batch, Chunk.append(item)))
    const takeRest = takeOne.pipe(
      Effect.repeatUntil(
        (items) =>
          options.maxBatchSize !== undefined &&
          items.length >= options.maxBatchSize
      ),
      Effect.timeout(options.window),
      Effect.zipRight(Ref.getAndSet(batch, Chunk.empty()))
    )

    yield* _(
      takeOne,
      Effect.zipRight(takeRest),
      Effect.flatMap(
        Effect.filter(({ deferred }) => Deferred.isDone(deferred), {
          negate: true
        })
      ),
      Effect.flatMap(
        Effect.forEach(
          ({ deferred, request }) =>
            Effect.flatMap(Effect.exit(Effect.request(request, self)), (exit) => Deferred.complete(deferred, exit)),
          { batching: true, discard: true }
        )
      ),
      Effect.forever,
      Effect.forkScoped
    )

    return RequestResolver.fromEffect((request: A) =>
      Effect.flatMap(
        Deferred.make<Request.Request.Error<A>, Request.Request.Success<A>>(),
        (deferred) =>
          Queue.offer(queue, { request, deferred }).pipe(
            Effect.zipRight(Deferred.await(deferred)),
            Effect.onInterrupt(() => Deferred.interrupt(deferred))
          )
      )
    )
  }))

/**
 * @since 1.0.0
 * @category combinators
 */
export const persisted = dual<
  <EI, EA, AI, AA>(
    options: {
      readonly storeId: string
      readonly failureSchema: Schema.Schema<EI, EA>
      readonly successSchema: Schema.Schema<AI, AA>
    }
  ) => <Req extends Request.Request<EA, AA> & { readonly _tag: string } & PrimaryKey.PrimaryKey>(
    self: RequestResolver.RequestResolver<Req, never>
  ) => Effect.Effect<Persistence.SchemaPersistence | Scope.Scope, never, RequestResolver.RequestResolver<Req, never>>,
  <Req extends Request.Request<EA, AA> & { readonly _tag: string } & PrimaryKey.PrimaryKey, EI, EA, AI, AA>(
    self: RequestResolver.RequestResolver<Req, never>,
    options: {
      readonly storeId: string
      readonly failureSchema: Schema.Schema<EI, EA>
      readonly successSchema: Schema.Schema<AI, AA>
    }
  ) => Effect.Effect<Persistence.SchemaPersistence | Scope.Scope, never, RequestResolver.RequestResolver<Req, never>>
>(2, <Req extends Request.Request<EA, AA> & { readonly _tag: string } & PrimaryKey.PrimaryKey, EI, EA, AI, AA>(
  self: RequestResolver.RequestResolver<Req, never>,
  options: {
    readonly storeId: string
    readonly failureSchema: Schema.Schema<EI, EA>
    readonly successSchema: Schema.Schema<AI, AA>
  }
): Effect.Effect<Persistence.SchemaPersistence | Scope.Scope, never, RequestResolver.RequestResolver<Req, never>> =>
  Effect.gen(function*(_) {
    const resultSchema = Schema.either(options.failureSchema, options.successSchema)
    const storage = yield* _(
      (yield* _(Persistence.SchemaPersistence)).make(options.storeId, resultSchema)
    )
    const requestKey = (request: Req) => `${request._tag}:${request[PrimaryKey.symbol]()}`

    const partition = (requests: ReadonlyArray<Req>) =>
      storage.getMany(requests.map(requestKey)).pipe(
        Effect.map(
          ReadonlyArray.partitionMap((_, i) =>
            Option.match(_, {
              onNone: () => Either.left(requests[i]),
              onSome: (_) => Either.right([requests[i], _] as const)
            })
          )
        ),
        Effect.orElseSucceed(() => [requests, []] as const)
      )

    const set = (
      request: Req,
      result: Request.Request.Result<Req>
    ): Effect.Effect<never, never, void> => {
      const key = requestKey(request)
      if (result._tag === "Failure") {
        return Either.match(Cause.failureOrCause(result.cause), {
          onLeft: (e) => Effect.ignoreLogged(storage.set(key, Either.left(e))),
          onRight: (_cause) => Effect.unit
        })
      }
      return Effect.ignoreLogged(storage.set(key, Either.right(result.value)))
    }

    return RequestResolver.makeBatched((requests: Array<Req>) =>
      Effect.flatMap(partition(requests), ([remaining, results]) => {
        const completeCached = Effect.forEach(
          results,
          ([request, result]) =>
            Request.completeEffect(request, result as any) as Effect.Effect<
              never,
              never,
              void
            >,
          { discard: true }
        )
        const completeUncached = pipe(
          Effect.forEach(
            remaining,
            (request) => Effect.exit(Effect.request(request, self)),
            { batching: true }
          ),
          Effect.flatMap((results) =>
            Effect.forEach(
              results,
              (result, i) => {
                const request = remaining[i]
                return Effect.zipRight(
                  set(request, result as any),
                  Request.complete(request, result as any)
                )
              },
              { discard: true }
            )
          )
        )
        return Effect.zipRight(completeCached, completeUncached)
      })
    )
  }))
