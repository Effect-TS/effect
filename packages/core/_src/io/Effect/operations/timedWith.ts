import { DurationInternal } from "@tsplus/stdlib/data/Duration"

/**
 * A more powerful variation of `timed` that allows specifying the clock.
 *
 * @tsplus static effect/core/io/Effect.Aspects timedWith
 * @tsplus pipeable effect/core/io/Effect timedWith
 */
export function timedWith<R1, E1>(milliseconds: Effect<R1, E1, number>) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R | R1, E | E1, Tuple<[Duration, A]>> =>
    self.summarized(milliseconds, (start, end) => new DurationInternal(end - start))
}
