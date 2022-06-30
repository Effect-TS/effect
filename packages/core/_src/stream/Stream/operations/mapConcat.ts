/**
 * Maps each element to an Collection, and flattens the Collections into the
 * output of this stream.
 *
 * @tsplus static effect/core/stream/Stream.Aspects mapConcat
 * @tsplus pipeable effect/core/stream/Stream mapConcat
 */
export function mapConcat<A, A2>(
  f: (a: A) => Collection<A2>,
  __tsplusTrace?: string
) {
  return <R, E>(self: Stream<R, E, A>): Stream<R, E, A2> =>
    self.chunksWith((chunk) => chunk.map((chunk) => chunk.flatMap((a) => Chunk.from(f(a)))))
}
