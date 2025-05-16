import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Ref from "effect/Ref"

export const withLatch = <A, E, R>(
  f: (release: Effect.Effect<void>) => Effect.Effect<A, E, R>
): Effect.Effect<A, E, R> => {
  return pipe(
    Deferred.make<void>(),
    Effect.flatMap((latch) =>
      pipe(f(pipe(Deferred.succeed(latch, void 0), Effect.asVoid)), Effect.zipLeft(Deferred.await(latch)))
    )
  )
}

export const withLatchAwait = <A, E, R>(
  f: (release: Effect.Effect<void>, wait: Effect.Effect<void>) => Effect.Effect<A, E, R>
): Effect.Effect<A, E, R> => {
  return Effect.gen(function*() {
    const ref = yield* Ref.make(true)
    const latch = yield* Deferred.make<void>()
    const result = yield* f(
      pipe(Deferred.succeed(latch, void 0), Effect.asVoid),
      Effect.uninterruptibleMask((restore) =>
        pipe(Ref.set(ref, false), Effect.zipRight(restore(Deferred.await(latch))))
      )
    )
    yield* Deferred.await(latch).pipe(Effect.whenEffect(Ref.get(ref)))
    return result
  })
}
