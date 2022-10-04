/**
 * Zips each element with the previous element. Initially accompanied by
 * `None`.
 *
 * @tsplus getter effect/core/stream/Stream zipWithPrevious
 */
export function zipWithPrevious<R, E, A>(
  self: Stream<R, E, A>
): Stream<R, E, readonly [Maybe<A>, A]> {
  return self.mapAccum(
    Maybe.empty<A>(),
    (prev, next) => [Maybe.some(next), [prev, next] as const]
  )
}
