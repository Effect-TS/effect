import * as Chunk from "@fp-ts/data/Chunk"
import { identity } from "@fp-ts/data/Function"

/**
 * Effectfully maps each element to an `Iterable`, and flattens the `Iterable`s
 * into the output of this stream.
 *
 * @tsplus static effect/core/stream/Stream.Aspects mapConcatEffect
 * @tsplus pipeable effect/core/stream/Stream mapConcatEffect
 * @category mapping
 * @since 1.0.0
 */
export function mapConcatEffect<A, R2, E2, A2>(
  f: (a: A) => Effect<R2, E2, Iterable<A2>>
) {
  return <R, E>(self: Stream<R, E, A>): Stream<R | R2, E | E2, A2> =>
    self.mapEffect((a) => f(a).map(Chunk.fromIterable)).mapConcat(identity)
}
