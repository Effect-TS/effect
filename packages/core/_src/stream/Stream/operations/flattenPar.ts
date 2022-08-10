/**
 * Flattens a stream of streams into a stream by executing a non-deterministic
 * concurrent merge. Up to `n` streams may be consumed in parallel and up to
 * `outputBuffer` elements may be buffered by this operator.
 *
 * @tsplus static effect/core/stream/Stream.Aspects flattenPar
 * @tsplus pipeable effect/core/stream/Stream flattenPar
 */
export function flattenPar(n: number, outputBuffer = 16) {
  return <R, E, R1, E1, A>(self: Stream<R, E, Stream<R1, E1, A>>): Stream<R | R1, E | E1, A> =>
    self.flatMapPar(n, identity, outputBuffer)
}
