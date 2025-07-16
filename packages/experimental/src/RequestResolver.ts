/**
 * @since 1.0.0
 */
import * as Arr from "effect/Array"
import type * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import * as Fiber from "effect/Fiber"
import { dual, pipe } from "effect/Function"
import * as Option from "effect/Option"
import * as Request from "effect/Request"
import * as RequestResolver from "effect/RequestResolver"
import * as Runtime from "effect/Runtime"
import type * as Schema from "effect/Schema"
import * as Scope from "effect/Scope"
import * as Persistence from "./Persistence.js"

interface DataLoaderItem<A extends Request.Request<any, any>> {
  readonly request: A
  readonly resume: (effect: Effect.Effect<Request.Request.Success<A>, Request.Request.Error<A>>) => void
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
>(
  2,
  Effect.fnUntraced(function*<
    A extends Request.Request<any, any>
  >(self: RequestResolver.RequestResolver<A, never>, options: {
    readonly window: Duration.DurationInput
    readonly maxBatchSize?: number
  }) {
    const maxSize = options.maxBatchSize ?? Infinity
    const scope = yield* Effect.scope
    const runtime = yield* Effect.runtime<never>().pipe(
      Effect.interruptible
    )
    const runFork = Runtime.runFork(runtime)

    let batch = new Set<DataLoaderItem<A>>()
    const process = (items: Iterable<DataLoaderItem<A>>) =>
      Effect.withRequestCaching(
        Effect.forEach(
          items,
          ({ request, resume }) =>
            Effect.request(request, self).pipe(
              Effect.exit,
              Effect.map(resume)
            ),
          { batching: true, discard: true }
        ),
        false
      )
    const delayedProcess = Effect.sleep(options.window).pipe(
      Effect.flatMap(() => {
        const currentBatch = batch
        batch = new Set()
        fiber = undefined
        return process(currentBatch)
      })
    )

    let fiber: Fiber.RuntimeFiber<void> | undefined
    yield* Scope.addFinalizer(scope, Effect.suspend(() => fiber ? Fiber.interrupt(fiber) : Effect.void))

    return RequestResolver.fromEffect((request: A) =>
      Effect.async<Request.Request.Success<A>, Request.Request.Error<A>>((resume) => {
        const item: DataLoaderItem<A> = { request, resume }
        batch.add(item)
        if (batch.size >= maxSize) {
          const currentBatch = batch
          batch = new Set()
          if (fiber) {
            const parent = Option.getOrThrow(Fiber.getCurrentFiber())
            fiber.unsafeInterruptAsFork(parent.id())
            fiber = undefined
          }
          runFork(process(currentBatch))
        } else if (!fiber) {
          fiber = runFork(delayedProcess)
        }

        return Effect.sync(() => {
          batch.delete(item)
        })
      })
    )
  })
)

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
