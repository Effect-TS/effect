import { concreteStream, StreamInternal } from "@effect/core/stream/Stream/operations/_internal/StreamInternal";

/**
 * Maps over elements of the stream with the specified effectful function,
 * executing up to `n` invocations of `f` concurrently. Transformed elements
 * will be emitted in the original order.
 *
 * @note This combinator destroys the chunking structure. It's recommended to use
 * rechunk afterwards.
 *
 * @tsplus fluent ets/Stream mapEffectPar
 */
export function mapEffectPar_<R, E, A, R1, E1, B>(
  self: Stream<R, E, A>,
  n: number,
  f: (a: A) => Effect<R1, E1, B>,
  __tsplusTrace?: string
): Stream<R & R1, E | E1, B> {
  concreteStream(self);
  return new StreamInternal(
    self.channel
      .concatMap(Channel.writeChunk)
      .mapOutEffectPar(n, f)
      .mapOut(Chunk.single)
  );
}

/**
 * Maps over elements of the stream with the specified effectful function,
 * executing up to `n` invocations of `f` concurrently. Transformed elements
 * will be emitted in the original order.
 *
 * @note This combinator destroys the chunking structure. It's recommended to use
 * rechunk afterwards.
 *
 * @tsplus static ets/Stream/Aspects mapEffectPar
 */
export const mapEffectPar = Pipeable(mapEffectPar_);
