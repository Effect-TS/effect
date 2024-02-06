/**
 * This is a direct port of `RateLimiter` from Rezilience
 * https://github.com/svroonland/rezilience/blob/master/rezilience/shared/src/main/scala/nl/vroste/rezilience/RateLimiter.scala
 */

import * as Chunk from "../Chunk.js"
import * as Deferred from "../Deferred.js"
import type { DurationInput } from "../Duration.js"
import * as Effect from "../Effect.js"
import { pipe } from "../Function.js"
import * as Queue from "../Queue.js"
import * as Ref from "../Ref.js"
import * as Stream from "../Stream.js"
import { nextPow2 } from "./nextPow2.js"

/** @internal */
export const make = (limit: number, window: DurationInput) => {
  return Effect.gen(function*($) {
    const q = yield* $(Queue.bounded<[Ref.Ref<boolean>, Effect.Effect<void>]>(nextPow2(limit)))

    yield* $(
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
          duration: window,
          cost: Chunk.size,
          units: limit
        }),
        Stream.mapEffect(([_interrupted, eff]) => eff, { concurrency: "unbounded", unordered: true }),
        Stream.runDrain,
        Effect.forkScoped
      )
    )

    const apply = <R, E, A>(task: Effect.Effect<R, E, A>) =>
      Effect.gen(function*($) {
        const start = yield* $(Deferred.make<void>())
        const done = yield* $(Deferred.make<void>())
        const interruptedRef = yield* $(Ref.make(false))

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

        const result = yield* $(
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
