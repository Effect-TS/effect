/**
 * Zips each element with both the previous and next element.
 *
 * @tsplus fluent ets/Stream zipWithPreviousAndNext
 */
export function zipWithPreviousAndNext<R, E, A>(
  self: Stream<R, E, A>,
  __tsplusTrace?: string
): Stream<R, E, Tuple<[Option<A>, A, Option<A>]>> {
  return self
    .zipWithPrevious()
    .zipWithNext()
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
