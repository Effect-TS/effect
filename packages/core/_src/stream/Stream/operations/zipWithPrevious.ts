/**
 * Zips each element with the previous element. Initially accompanied by
 * `None`.
 *
 * @tsplus fluent ets/Stream zipWithPrevious
 */
export function zipWithPrevious<R, E, A>(
  self: Stream<R, E, A>,
  __tsplusTrace?: string
): Stream<R, E, Tuple<[Maybe<A>, A]>> {
  return self.mapAccum(Maybe.emptyOf<A>(), (prev, next) => Tuple(Maybe.some(next), Tuple(prev, next)))
}
