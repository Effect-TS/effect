/**
 * Intersperse and also add a prefix and a suffix.
 *
 * @tsplus static effect/core/stream/Stream.Aspects intersperseAffixes
 * @tsplus pipeable effect/core/stream/Stream intersperseAffixes
 * @category mutations
 * @since 1.0.0
 */
export function intersperseAffixes<A2>(start: A2, middle: A2, end: A2) {
  return <R, E, A>(self: Stream<R, E, A>): Stream<R, E, A | A2> =>
    Stream(start).concat(self.intersperse(middle)).concat(Stream(end))
}
