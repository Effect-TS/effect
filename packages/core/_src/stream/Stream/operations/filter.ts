/**
 * Filters the elements emitted by this stream using the provided function.
 *
 * @tsplus fluent ets/Stream filter
 */
export function filter_<R, E, A, B extends A>(
  self: Stream<R, E, A>,
  f: Refinement<A, B>,
  __tsplusTrace?: string
): Stream<R, E, B>;
export function filter_<R, E, A>(
  self: Stream<R, E, A>,
  f: Predicate<A>,
  __tsplusTrace?: string
): Stream<R, E, A>;
export function filter_<R, E, A>(
  self: Stream<R, E, A>,
  f: Predicate<A>,
  __tsplusTrace?: string
): Stream<R, E, A> {
  return self.mapChunks((chunk) => chunk.filter(f));
}

/**
 * Filters the elements emitted by this stream using the provided function.
 *
 * @tsplus static ets/Stream/Aspects filter
 */
export function filter<A, B extends A>(
  f: Refinement<A, B>,
  __tsplusTrace?: string
): <R, E>(self: Stream<R, E, A>) => Stream<R, E, B>;
export function filter<A>(f: Predicate<A>, __tsplusTrace?: string): <R, E>(self: Stream<R, E, A>) => Stream<R, E, A>;
export function filter<A>(f: Predicate<A>, __tsplusTrace?: string) {
  return <R, E>(self: Stream<R, E, A>): Stream<R, E, A> => self.filter(f);
}
