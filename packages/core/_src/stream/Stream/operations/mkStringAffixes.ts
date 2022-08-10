/**
 * Returns a combined string resulting from concatenating each of the values
 * from the stream beginning with `before` interspersed with `middle` and
 * ending with `after`.
 *
 * @tsplus static effect/core/stream/Stream.Aspects mkStringAffixes
 * @tsplus pipeable effect/core/stream/Stream mkStringAffixes
 */
export function mkStringAffixes(
  start: string,
  middle: string,
  end: string
) {
  return <R, E, A>(self: Stream<R, E, A>): Effect<R, E, string> =>
    self.intersperseAffixes(start, middle, end).mkString
}
