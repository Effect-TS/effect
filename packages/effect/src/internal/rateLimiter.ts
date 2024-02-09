import type { DurationInput } from "../Duration.js"
import * as Effect from "../Effect.js"
import type { RateLimiter } from "../RateLimiter.js"
import type { Scope } from "../Scope.js"
import * as SynchronizedRef from "../SynchronizedRef.js"

/** @internal */
export const make = (limit: number, window: DurationInput): Effect.Effect<
  RateLimiter,
  never,
  Scope
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
