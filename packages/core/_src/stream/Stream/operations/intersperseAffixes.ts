/**
 * Intersperse and also add a prefix and a suffix.
 *
 * @tsplus static effect/core/stream/Stream.Aspects intersperseAffixes
 * @tsplus pipeable effect/core/stream/Stream intersperseAffixes
 */
export function intersperseAffixes<A2>(
  start: LazyArg<A2>,
  middle: LazyArg<A2>,
  end: LazyArg<A2>,
  __tsplusTrace?: string
) {
  return <R, E, A>(self: Stream<R, E, A>): Stream<R, E, A | A2> =>
    Stream.suspend(Stream(start()) + self.intersperse(middle) + Stream(end()))
}
