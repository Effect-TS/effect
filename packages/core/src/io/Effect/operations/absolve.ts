import type { Either } from "@fp-ts/data/Either"

/**
 * Submerges the error case of an `Either` into the `Effect`. The inverse
 * operation of `either`.
 *
 * @tsplus static effect/core/io/Effect.Ops absolve
 * @tsplus getter effect/core/io/Effect absolve
 * @category mutations
 * @since 1.0.0
 */
export function absolve<R, E, A>(self: Effect<R, E, Either<E, A>>): Effect<R, E, A> {
  return self.flatMap((either) => Effect.fromEither(either))
}
