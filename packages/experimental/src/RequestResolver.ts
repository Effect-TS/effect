/**
 * @since 1.0.0
 */
import type * as Serializable from "@effect/schema/Serializable"
import * as ReadonlyArray from "effect/Array"
import * as Deferred from "effect/Deferred"
import type * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import { dual, pipe } from "effect/Function"
import * as Option from "effect/Option"
import type * as PrimaryKey from "effect/PrimaryKey"
import * as Queue from "effect/Queue"
import * as Ref from "effect/Ref"
import * as Request from "effect/Request"
import * as RequestResolver from "effect/RequestResolver"
import type * as Scope from "effect/Scope"
import * as Persistence from "./Persistence.js"

interface DataLoaderItem<A extends Request.Request<any, any>> {
  readonly request: A
  readonly deferred: Deferred.Deferred<
    Request.Request.Success<A>,
    Request.Request.Error<A>
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
  ) => Effect.Effect<RequestResolver.RequestResolver<A, never>, never, Scope.Scope>,
  <A extends Request.Request<any, any>>(
    self: RequestResolver.RequestResolver<A, never>,
    options: {
      readonly window: Duration.DurationInput
      readonly maxBatchSize?: number
    }
  ) => Effect.Effect<RequestResolver.RequestResolver<A, never>, never, Scope.Scope>
>(2, <A extends Request.Request<any, any>>(
  self: RequestResolver.RequestResolver<A, never>,
  options: {
    readonly window: Duration.DurationInput
    readonly maxBatchSize?: number
  }
) =>
  Effect.gen(function*(_) {
    const queue = yield* _(
      Effect.acquireRelease(
        Queue.unbounded<DataLoaderItem<A>>(),
        Queue.shutdown
      )
    )
    const batch = yield* _(Ref.make(ReadonlyArray.empty<DataLoaderItem<A>>()))
    const takeOne = Effect.flatMap(Queue.take(queue), (item) => Ref.updateAndGet(batch, ReadonlyArray.append(item)))
    const takeRest = takeOne.pipe(
      Effect.repeat({
        until: (items) =>
          options.maxBatchSize !== undefined &&
          items.length >= options.maxBatchSize
      }),
      Effect.timeout(options.window),
      Effect.ignore,
      Effect.zipRight(Ref.getAndSet(batch, ReadonlyArray.empty()))
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
      Effect.withRequestCaching(false),
      Effect.forkScoped,
      Effect.interruptible
    )

    return RequestResolver.fromEffect((request: A) =>
      Effect.flatMap(
        Deferred.make<Request.Request.Success<A>, Request.Request.Error<A>>(),
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
 * @category model
 */
export interface PersistedRequest<R, IE, E, IA, A>
  extends Request.Request<A, E>, PrimaryKey.PrimaryKey, Serializable.WithResult<A, IA, E, IE, R>
{}

/**
 * @since 1.0.0
 * @category model
 */
export declare namespace PersistedRequest {
  /**
   * @since 1.0.0
   * @category model
   */
  export type Any = PersistedRequest<any, any, any, any, any> | PersistedRequest<any, never, never, any, any>
}

/**
 * @since 1.0.0
 * @category combinators
 */
export const persisted: {
  (
    storeId: string
  ): <Req extends PersistedRequest.Any>(
    self: RequestResolver.RequestResolver<Req, never>
  ) => Effect.Effect<
    RequestResolver.RequestResolver<Req, Serializable.WithResult.Context<Req>>,
    never,
    Persistence.ResultPersistence | Scope.Scope
  >
  <Req extends PersistedRequest.Any>(
    self: RequestResolver.RequestResolver<Req, never>,
    storeId: string
  ): Effect.Effect<
    RequestResolver.RequestResolver<Req, Serializable.WithResult.Context<Req>>,
    never,
    Persistence.ResultPersistence | Scope.Scope
  >
} = dual(2, <Req extends PersistedRequest.Any>(
  self: RequestResolver.RequestResolver<Req, never>,
  storeId: string
): Effect.Effect<
  RequestResolver.RequestResolver<Req, Serializable.WithResult.Context<Req>>,
  never,
  Persistence.ResultPersistence | Scope.Scope
> =>
  Effect.gen(function*(_) {
    const storage = yield* _(
      (yield* _(Persistence.ResultPersistence)).make(storeId)
    )

    const partition = (requests: ReadonlyArray<Req>) =>
      storage.getMany(requests as any).pipe(
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
    ): Effect.Effect<void, never, any> => Effect.ignoreLogged(storage.set(request as any, result))

    return RequestResolver.makeBatched((requests: Array<Req>) =>
      Effect.flatMap(partition(requests), ([remaining, results]) => {
        const completeCached = Effect.forEach(
          results,
          ([request, result]) => Request.complete(request, result as any) as Effect.Effect<void>,
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
          ),
          Effect.withRequestCaching(false)
        )
        return Effect.zipRight(completeCached, completeUncached)
      })
    )
  }))
