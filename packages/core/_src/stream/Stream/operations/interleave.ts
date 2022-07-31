/**
 * Interleaves this stream and the specified stream deterministically by
 * alternating pulling values from this stream and the specified stream. When
 * one stream is exhausted all remaining values in the other stream will be
 * pulled.
 *
 * @tsplus static effect/core/stream/Stream.Aspects interleave
 * @tsplus pipeable effect/core/stream/Stream interleave
 */
export function interleave<R2, E2, A2>(
  that: LazyArg<Stream<R2, E2, A2>>
) {
  return <R, E, A>(self: Stream<R, E, A>): Stream<R | R2, E | E2, A | A2> =>
    self.interleaveWith(that, Stream(true, false).forever)
}
