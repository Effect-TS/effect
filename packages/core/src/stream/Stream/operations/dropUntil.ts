import type { Predicate } from "@fp-ts/data/Predicate"

/**
 * Creates a pipeline that drops elements until the specified predicate
 * evaluates to true.
 *
 * @tsplus static effect/core/stream/Stream.Aspects dropUntil
 * @tsplus pipeable effect/core/stream/Stream dropUntil
 * @category mutations
 * @since 1.0.0
 */
export function dropUntil<A>(f: Predicate<A>) {
  return <R, E>(self: Stream<R, E, A>): Stream<R, E, A> =>
    self.dropWhile((a) => !f(a)).via(Stream.$.drop(1))
}
