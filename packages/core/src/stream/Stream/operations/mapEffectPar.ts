import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"
import * as Chunk from "@fp-ts/data/Chunk"

/**
 * Maps over elements of the stream with the specified effectful function,
 * executing up to `n` invocations of `f` concurrently. Transformed elements
 * will be emitted in the original order.
 *
 * @note This combinator destroys the chunking structure. It's recommended to use
 * rechunk afterwards.
 *
 * @tsplus static effect/core/stream/Stream.Aspects mapEffectPar
 * @tsplus pipeable effect/core/stream/Stream mapEffectPar
 * @category mapping
 * @since 1.0.0
 */
export function mapEffectPar<A, R1, E1, B>(
  n: number,
  f: (a: A) => Effect<R1, E1, B>
) {
  return <R, E>(self: Stream<R, E, A>): Stream<R | R1, E | E1, B> => {
    concreteStream(self)
    return new StreamInternal(
      self.channel
        .concatMap(Channel.writeChunk)
        .mapOutEffectPar(n, f)
        .mapOut(Chunk.single)
    )
  }
}
