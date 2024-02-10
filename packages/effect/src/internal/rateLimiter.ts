import * as Chunk from "../Chunk.js"
import * as Deferred from "../Deferred.js"
import type { DurationInput } from "../Duration.js"
import * as Effect from "../Effect.js"
import * as FiberRef from "../FiberRef.js"
import { globalValue } from "../GlobalValue.js"
import { nextPow2 } from "../Number.js"
import * as Queue from "../Queue.js"
import * as Ref from "../Ref.js"
import * as Stream from "../Stream.js"

/** @internal */
export const make = (tokens: number, interval: DurationInput) => {
  return Effect.gen(function*(_) {
    const queue = yield* _(Queue.bounded<[Ref.Ref<boolean>, Effect.Effect<void>, cost: number]>(nextPow2(tokens)))

    yield* _(
      Stream.fromQueue(queue, { maxChunkSize: 1 }),
      Stream.filterEffect(([interrupted]) => Effect.negate(Ref.get(interrupted))),
      Stream.throttle({
        strategy: "shape",
        duration: interval,
        cost: Chunk.reduce(0, (acc, [, , cost]) => acc + cost),
        units: tokens
      }),
      Stream.mapEffect(([, effect]) => effect, { concurrency: "unbounded", unordered: true }),
      Stream.runDrain,
      Effect.interruptible,
      Effect.forkScoped
    )

    const apply = <A, E, R>(task: Effect.Effect<A, E, R>) =>
      Effect.gen(function*(_) {
        const cost = yield* _(FiberRef.get(currentCost))
        const start = yield* _(Deferred.make<void>())
        const done = yield* _(Deferred.make<void>())
        const interrupted = yield* _(Ref.make(false))
        const action = Deferred.succeed(start, void 0).pipe(
          Effect.zipRight(Deferred.await(done))
        )
        const cleanup = Ref.set(interrupted, true).pipe(
          Effect.zipRight(Deferred.succeed(done, void 0))
        )
        const offer = Queue.offer(queue, [interrupted, action, cost]).pipe(
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
const currentCost = globalValue(
  Symbol.for("effect/RateLimiter/currentCost"),
  () => FiberRef.unsafeMake(1)
)

/** @internal */
export const withCost = (cost: number) => Effect.locally(currentCost, cost)
