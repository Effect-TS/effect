import type { DurationInput } from "../Duration.js"
import * as Duration from "../Duration.js"
import * as Effect from "../Effect.js"
import * as FiberRef from "../FiberRef.js"
import { globalValue } from "../GlobalValue.js"
import * as Queue from "../Queue.js"
import type * as RateLimiter from "../RateLimiter.js"
import type * as Scope from "../Scope.js"
import * as SynchronizedRef from "../SynchronizedRef.js"

/** @internal */
export const make = ({
  algorithm = "token-bucket",
  interval,
  limit
}: RateLimiter.RateLimiter.Options): Effect.Effect<
  RateLimiter.RateLimiter,
  never,
  Scope.Scope
> => {
  switch (algorithm) {
    case "fixed-window": {
      return fixedWindow(limit, interval)
    }
    case "token-bucket": {
      return tokenBucket(limit, interval)
    }
  }
}

const tokenBucket = (limit: number, window: DurationInput): Effect.Effect<
  RateLimiter.RateLimiter,
  never,
  Scope.Scope
> =>
  Effect.gen(function*(_) {
    const millisPerToken = Math.ceil(Duration.toMillis(window) / limit)
    const queue = yield* _(Queue.bounded<void>(limit - 1))
    yield* _(
      queue.take,
      Effect.zipRight(Effect.sleep(millisPerToken)),
      Effect.forever,
      Effect.forkScoped,
      Effect.interruptible
    )
    const offer = Effect.flatMap(
      FiberRef.get(currentCost),
      (cost) =>
        cost > 1
          ? Queue.offerAll(queue, new Array(cost).fill(void 0))
          : Queue.offer(queue, void 0)
    )
    return (effect) => Effect.zipRight(offer, effect)
  })

const fixedWindow = (limit: number, window: DurationInput): Effect.Effect<
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
    const take = Effect.flatMap(
      FiberRef.get(currentCost),
      (cost) => Effect.zipRight(semaphore.take(cost), reset)
    )
    return (effect) => Effect.zipRight(take, effect)
  })

/** @internal */
const currentCost = globalValue(
  Symbol.for("effect/RateLimiter/currentCost"),
  () => FiberRef.unsafeMake(1)
)

/** @internal */
export const withCost = (cost: number) => Effect.locally(currentCost, cost)
