/**
 * Zips each element with both the previous and next element.
 *
 * @tsplus getter effect/core/stream/Stream zipWithPreviousAndNext
 */
export function zipWithPreviousAndNext<R, E, A>(
  self: Stream<R, E, A>
): Stream<R, E, readonly [Maybe<A>, A, Maybe<A>]> {
  return self
    .zipWithPrevious
    .zipWithNext
    .map(([[prev, curr], next]) => [prev, curr, next.map((tuple) => tuple[1])] as const)
}
