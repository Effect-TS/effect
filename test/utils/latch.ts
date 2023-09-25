import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Ref from "effect/Ref"

export const withLatch = <R, E, A>(
  f: (release: Effect.Effect<never, never, void>) => Effect.Effect<R, E, A>
): Effect.Effect<R, E, A> => {
  return pipe(
    Deferred.make<never, void>(),
    Effect.flatMap((latch) =>
      pipe(f(pipe(Deferred.succeed(latch, void 0), Effect.asUnit)), Effect.zipLeft(Deferred.await(latch)))
    )
  )
}

export const withLatchAwait = <R, E, A>(
  f: (release: Effect.Effect<never, never, void>, wait: Effect.Effect<never, never, void>) => Effect.Effect<R, E, A>
): Effect.Effect<R, E, A> => {
  return Effect.gen(function*($) {
    const ref = yield* $(Ref.make(true))
    const latch = yield* $(Deferred.make<never, void>())
    const result = yield* $(
      f(
        pipe(Deferred.succeed(latch, void 0), Effect.asUnit),
        Effect.uninterruptibleMask((restore) =>
          pipe(Ref.set(ref, false), Effect.zipRight(restore(Deferred.await(latch))))
        )
      )
    )
    yield* $(Deferred.await(latch), Effect.whenEffect(Ref.get(ref)))
    return result
  })
}
