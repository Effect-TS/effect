/**
 * Zips each element with both the previous and next element.
 *
 * @tsplus getter effect/core/stream/Stream zipWithPreviousAndNext
 */
export function zipWithPreviousAndNext<R, E, A>(
  self: Stream<R, E, A>
): Stream<R, E, Tuple<[Maybe<A>, A, Maybe<A>]>> {
  return self
    .zipWithPrevious
    .zipWithNext
    .map(
      ({
        tuple: [
          {
            tuple: [prev, curr]
          },
          next
        ]
      }) =>
        Tuple(
          prev,
          curr,
          next.map((tuple) => tuple.get(1))
        )
    )
}
