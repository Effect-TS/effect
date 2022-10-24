import * as Chunk from "@fp-ts/data/Chunk"

/**
 * Maps each element to an `Iterable`, and flattens the `Iterable`s into the
 * output of this stream.
 *
 * @tsplus static effect/core/stream/Stream.Aspects mapConcat
 * @tsplus pipeable effect/core/stream/Stream mapConcat
 * @category mapping
 * @since 1.0.0
 */
export function mapConcat<A, A2>(f: (a: A) => Iterable<A2>) {
  return <R, E>(self: Stream<R, E, A>): Stream<R, E, A2> =>
    self.chunksWith((stream) => stream.map(Chunk.flatMap((a) => Chunk.fromIterable(f(a)))))
}
