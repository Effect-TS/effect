/**
 * Filters this stream by the specified predicate, removing all elements for
 * which the predicate evaluates to true.
 *
 * @tsplus fluent ets/Stream filterNot
 */
export function filterNot_<R, E, A, B extends A>(
  self: Stream<R, E, A>,
  f: Refinement<A, B>,
  __tsplusTrace?: string
): Stream<R, E, A>;
export function filterNot_<R, E, A>(
  self: Stream<R, E, A>,
  f: Predicate<A>,
  __tsplusTrace?: string
): Stream<R, E, A>;
export function filterNot_<R, E, A>(
  self: Stream<R, E, A>,
  f: Predicate<A>,
  __tsplusTrace?: string
): Stream<R, E, A> {
  return self.filter((a) => !f(a));
}

/**
 * Filters this stream by the specified predicate, removing all elements for
 * which the predicate evaluates to true.
 */
export function filterNot<A, B extends A>(
  f: Refinement<A, B>,
  __tsplusTrace?: string
): <R, E>(self: Stream<R, E, A>) => Stream<R, E, A>;
export function filterNot<A>(f: Predicate<A>, __tsplusTrace?: string): <R, E>(self: Stream<R, E, A>) => Stream<R, E, A>;
export function filterNot<A>(f: Predicate<A>, __tsplusTrace?: string) {
  return <R, E>(self: Stream<R, E, A>): Stream<R, E, A> => self.filterNot(f);
}
