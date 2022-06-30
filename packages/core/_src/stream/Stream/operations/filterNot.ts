/**
 * Filters this stream by the specified predicate, removing all elements for
 * which the predicate evaluates to true.
 *
 * @tsplus static effect/core/stream/Stream.Aspects filterNot
 * @tsplus pipeable effect/core/stream/Stream filterNot
 */
export function filterNot<A, B extends A>(
  f: Refinement<A, B>,
  __tsplusTrace?: string
): <R, E>(self: Stream<R, E, A>) => Stream<R, E, A>
export function filterNot<A>(
  f: Predicate<A>,
  __tsplusTrace?: string
): <R, E>(self: Stream<R, E, A>) => Stream<R, E, A>
export function filterNot<A>(f: Predicate<A>, __tsplusTrace?: string) {
  return <R, E>(self: Stream<R, E, A>): Stream<R, E, A> => self.filter((a) => !f(a))
}
