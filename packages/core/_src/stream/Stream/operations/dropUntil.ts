/**
 * Creates a pipeline that drops elements until the specified predicate
 * evaluates to true.
 *
 * @tsplus static effect/core/stream/Stream.Aspects dropUntil
 * @tsplus pipeable effect/core/stream/Stream dropUntil
 */
export function dropUntil<A>(f: Predicate<A>, __tsplusTrace?: string) {
  return <R, E>(self: Stream<R, E, A>): Stream<R, E, A> => self.dropWhile((a) => !f(a)).via(Stream.$.drop(1))
}
