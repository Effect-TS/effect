/**
 * A variant of `flatMap` that ignores the value produced by this effect.
 *
 * @tsplus static effect/core/io/Effect.Aspects zipRight
 * @tsplus pipeable effect/core/io/Effect zipRight
 * @tsplus pipeable-operator effect/core/io/Effect >
 * @category zipping
 * @since 1.0.0
 */
export function zipRight<R2, E2, A2>(that: Effect<R2, E2, A2>) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R | R2, E | E2, A2> => self.flatMap(() => that)
}
