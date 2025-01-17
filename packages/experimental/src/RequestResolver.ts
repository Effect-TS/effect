/**
 * @since 1.0.0
 */
import * as Arr from "effect/Array"
import * as Deferred from "effect/Deferred"
import type * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import * as FiberHandle from "effect/FiberHandle"
import { dual, pipe } from "effect/Function"
import * as Option from "effect/Option"
import * as Request from "effect/Request"
import * as RequestResolver from "effect/RequestResolver"
import type * as Schema from "effect/Schema"
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
  (options: {
    readonly window: Duration.DurationInput
    readonly maxBatchSize?: number
  }) => <A extends Request.Request<any, any>>(
    self: RequestResolver.RequestResolver<A, never>
  ) => Effect.Effect<RequestResolver.RequestResolver<A, never>, never, Scope.Scope>,
  <A extends Request.Request<any, any>>(
    self: RequestResolver.RequestResolver<A, never>,
    options: {
      readonly window: Duration.DurationInput
      readonly maxBatchSize?: number
    }
  ) => Effect.Effect<RequestResolver.RequestResolver<A, never>, never, Scope.Scope>
>(2, <A extends Request.Request<any, any>>(self: RequestResolver.RequestResolver<A, never>, options: {
  readonly window: Duration.DurationInput
  readonly maxBatchSize?: number
}) =>
  Effect.gen(function*() {
    const scope = yield* Effect.scope
    const handle = yield* FiberHandle.make<void, never>()
    const maxSize = options.maxBatchSize ?? Infinity
    let batch = Arr.empty<DataLoaderItem<A>>()
    const process = (items: ReadonlyArray<DataLoaderItem<A>>) =>
      Effect.forEach(
        items,
        ({ deferred, request }) =>
          Effect.request(request, self).pipe(
            Effect.withRequestCaching(false),
            Effect.exit,
            Effect.flatMap((exit) => Deferred.done(deferred, exit))
          ),
        { batching: true, discard: true }
      )
    const loop: Effect.Effect<void> = Effect.suspend(() => {
      if (batch.length === 0) {
        return Effect.void
      }
      return Effect.sleep(options.window).pipe(
        Effect.flatMap(() => {
          const items = batch
          batch = []
          return Effect.forkIn(process(items), scope)
        }),
        Effect.zipRight(loop)
      )
    }).pipe(Effect.interruptible)
    const runLoop = FiberHandle.run(handle, loop, { onlyIfMissing: true })
    const runLoopReset = FiberHandle.run(handle, loop)
    const run = Effect.suspend(() => {
      if (batch.length > maxSize) {
        const items = batch.splice(0, maxSize)
        return runLoopReset.pipe(
          Effect.zipRight(process(items)),
          Effect.interruptible,
          Effect.forkIn(scope)
        )
      }
      return runLoop
    }).pipe(Effect.uninterruptible)
    return RequestResolver.fromEffect((request: A) =>
      Effect.flatMap(Deferred.make<Request.Request.Success<A>, Request.Request.Error<A>>(), (deferred) => {
        const item: DataLoaderItem<A> = { request, deferred }
        batch.push(item)
        return run.pipe(
          Effect.zipRight(Deferred.await(deferred)),
          Effect.onInterrupt(() =>
            Effect.sync(() => {
              const index = batch.indexOf(item)
              if (index >= 0) {
                batch.splice(index, 1)
              }
            })
          )
        )
      })
    )
  }))

/**
 * @since 1.0.0
 * @category model
 */
export interface PersistedRequest<R, IE, E, IA, A> extends Request.Request<A, E>, Schema.WithResult<A, IA, E, IE, R> {}

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
  <Req extends PersistedRequest.Any>(options: {
    readonly storeId: string
    readonly timeToLive: (...args: Persistence.ResultPersistence.TimeToLiveArgs<Req>) => Duration.DurationInput
  }): (
    self: RequestResolver.RequestResolver<Req, never>
  ) => Effect.Effect<
    RequestResolver.RequestResolver<Req, Schema.WithResult.Context<Req>>,
    never,
    Persistence.ResultPersistence | Scope.Scope
  >
  <Req extends PersistedRequest.Any>(
    self: RequestResolver.RequestResolver<Req, never>,
    options: {
      readonly storeId: string
      readonly timeToLive: (...args: Persistence.ResultPersistence.TimeToLiveArgs<Req>) => Duration.DurationInput
    }
  ): Effect.Effect<
    RequestResolver.RequestResolver<Req, Schema.WithResult.Context<Req>>,
    never,
    Persistence.ResultPersistence | Scope.Scope
  >
} = dual(2, <Req extends PersistedRequest.Any>(
  self: RequestResolver.RequestResolver<Req, never>,
  options: {
    readonly storeId: string
    readonly timeToLive: (...args: Persistence.ResultPersistence.TimeToLiveArgs<Req>) => Duration.DurationInput
  }
): Effect.Effect<
  RequestResolver.RequestResolver<Req, Schema.WithResult.Context<Req>>,
  never,
  Persistence.ResultPersistence | Scope.Scope
> =>
  Effect.gen(function*() {
    const storage = yield* (yield* Persistence.ResultPersistence).make({
      storeId: options.storeId,
      timeToLive: options.timeToLive as any
    })

    const partition = (requests: ReadonlyArray<Req>) =>
      storage.getMany(requests as any).pipe(
        Effect.map(
          Arr.partitionMap((_, i) =>
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

    return RequestResolver.makeBatched((requests: Arr.NonEmptyArray<Req>) =>
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
