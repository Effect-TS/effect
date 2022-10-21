/**
 * Effectfully maps each element to an Collection, and flattens the Collections
 * into the output of this stream.
 *
 * @tsplus static effect/core/stream/Stream.Aspects mapConcatEffect
 * @tsplus pipeable effect/core/stream/Stream mapConcatEffect
 */
export function mapConcatEffect<A, R2, E2, A2>(
  f: (a: A) => Effect<R2, E2, Collection<A2>>
) {
  return <R, E>(self: Stream<R, E, A>): Stream<R | R2, E | E2, A2> =>
    self.mapEffect((a) => f(a).map(Chunk.from)).mapConcat(identity)
}
