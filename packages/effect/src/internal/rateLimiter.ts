import * as Chunk from "../Chunk.js"
import * as Deferred from "../Deferred.js"
import type { DurationInput } from "../Duration.js"
import * as Effect from "../Effect.js"
import { nextPow2 } from "../Number.js"
import * as Queue from "../Queue.js"
import type * as RateLimiter from "../RateLimiter.js"
import * as Ref from "../Ref.js"
import type * as Scope from "../Scope.js"
import * as Stream from "../Stream.js"
import * as SynchronizedRef from "../SynchronizedRef.js"

/** @internal */
export const tokenBucket: (
  tokens: number,
  interval: DurationInput
) => Effect.Effect<
  RateLimiter.RateLimiter,
  never,
  Scope.Scope
> = (tokens: number, interval: DurationInput) => {
  return Effect.gen(function*(_) {
    const queue = yield* _(Queue.bounded<[Ref.Ref<boolean>, Effect.Effect<void>]>(nextPow2(tokens)))

    yield* _(
      Stream.fromQueue(queue, { maxChunkSize: 1 }),
      Stream.filterEffect(([interrupted]) => Effect.negate(Ref.get(interrupted))),
      Stream.throttle({ strategy: "shape", duration: interval, cost: Chunk.size, units: tokens }),
      Stream.mapEffect(([, effect]) => effect, { concurrency: "unbounded", unordered: true }),
      Stream.runDrain,
      Effect.interruptible,
      Effect.forkScoped
    )

    const apply = <A, E, R>(task: Effect.Effect<A, E, R>) =>
      Effect.gen(function*(_) {
        const start = yield* _(Deferred.make<void>())
        const done = yield* _(Deferred.make<void>())
        const interrupted = yield* _(Ref.make(false))
        const action = Deferred.succeed(start, void 0).pipe(
          Effect.zipRight(Deferred.await(done))
        )
        const cleanup = Ref.set(interrupted, true).pipe(
          Effect.zipRight(Deferred.succeed(done, void 0))
        )
        const offer = Queue.offer(queue, [interrupted, action]).pipe(
          Effect.onInterrupt(() => cleanup)
        )
        return yield* _(
          Effect.acquireReleaseInterruptible(offer, () => cleanup),
          Effect.zipRight(Deferred.await(start)),
          Effect.zipRight(task),
          Effect.scoped
        )
      })

    return apply
  })
}

/** @internal */
export const fixedWindow = (limit: number, window: DurationInput): Effect.Effect<
  RateLimiter.RateLimiter,
  never,
  Scope.Scope
> =>
  Effect.gen(function*(_) {
    const scope = yield* _(Effect.scope)
    const semaphore = yield* _(Effect.makeSemaphore(limit))
    const ref = yield* _(SynchronizedRef.make(false))
    const reset = SynchronizedRef.updateEffect(
      ref,
      (running) =>
        running ? Effect.succeed(true) : Effect.sleep(window).pipe(
          Effect.zipRight(SynchronizedRef.set(ref, false)),
          Effect.zipRight(semaphore.releaseAll),
          Effect.forkIn(scope),
          Effect.interruptible,
          Effect.as(true)
        )
    )
    const take = Effect.zipRight(semaphore.take(1), reset)
    return (effect) => Effect.zipRight(take, effect)
  })
