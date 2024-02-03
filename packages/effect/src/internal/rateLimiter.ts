// Direct port of https://github.com/svroonland/rezilience/blob/master/rezilience/shared/src/main/scala/nl/vroste/rezilience/RateLimiter.scala
import type { Duration } from "effect"
import { Chunk, Deferred, Effect, pipe, Queue, Ref, Stream } from "effect"

// Find the next power of 2 greater than or equal to n.
/** @internal */
const nextPow2 = (n: number): number => {
  const nextPow = Math.ceil(Math.log(n) / Math.log(2))
  return Math.max(Math.pow(2, nextPow), 2)
}

/** @internal */
export const make = (max: number, interval: Duration.DurationInput) => {
  return Effect.gen(function*(_outer) {
    const q = yield* _outer(Queue.bounded<[Ref.Ref<boolean>, Effect.Effect<never, never, void>]>(nextPow2(max)))

    yield* _outer(
      pipe(
        Stream.fromQueue(q, { maxChunkSize: 1 }),
        Stream.filterEffect(([interrupted]) => {
          return pipe(
            Ref.get(interrupted),
            Effect.map((b) => !b)
          )
        }),
        Stream.throttle({
          strategy: "shape",
          duration: interval,
          cost: (x) => Chunk.size(x),
          units: max
        }),
        Stream.mapEffect(([_interrupted, eff]) => eff, { concurrency: "unbounded", unordered: true }),
        Stream.runDrain,
        Effect.forkScoped
      )
    )

    const apply = <R, E, A>(task: Effect.Effect<R, E, A>) =>
      Effect.gen(function*(_inner) {
        const start = yield* _inner(Deferred.make<never, void>())
        const done = yield* _inner(Deferred.make<never, void>())
        const interruptedRef = yield* _inner(Ref.make(false))

        const action = pipe(
          Deferred.succeed(start, void 0),
          Effect.flatMap(() => Deferred.await(done))
        )

        const onInterruptOrCompletion = pipe(
          Ref.set(interruptedRef, true),
          Effect.flatMap(() => Deferred.succeed(done, void 0))
        )

        const run = pipe(
          Queue.offer(q, [interruptedRef, action]),
          Effect.onInterrupt(() => onInterruptOrCompletion)
        )

        const result = yield* _inner(
          Effect.scoped(
            pipe(
              Effect.acquireReleaseInterruptible(run, () => onInterruptOrCompletion),
              Effect.flatMap(() => Deferred.await(start)),
              Effect.flatMap(() => task)
            )
          )
        )

        return result
      })

    return apply
  })
}
