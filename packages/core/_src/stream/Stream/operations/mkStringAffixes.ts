/**
 * Returns a combined string resulting from concatenating each of the values
 * from the stream beginning with `before` interspersed with `middle` and
 * ending with `after`.
 *
 * @tsplus static effect/core/stream/Stream.Aspects mkStringAffixes
 * @tsplus pipeable effect/core/stream/Stream mkStringAffixes
 */
export function mkStringAffixes(
  start: LazyArg<string>,
  middle: LazyArg<string>,
  end: LazyArg<string>
) {
  return <R, E, A>(self: Stream<R, E, A>): Effect<R, E, string> =>
    self.intersperseAffixes(
      start,
      middle,
      end
    ).mkString
}
