import { concreteStream, StreamInternal } from "@effect-ts/core/stream/Stream/operations/_internal/StreamInternal";

/**
 * Effectfully transforms the chunks emitted by this stream.
 *
 * @tsplus fluent ets/Stream mapChunksEffect
 */
export function mapChunksEffect_<R, E, A, R2, E2, A2>(
  self: Stream<R, E, A>,
  f: (chunk: Chunk<A>) => Effect<R2, E2, Chunk<A2>>,
  __tsplusTrace?: string
): Stream<R & R2, E | E2, A2> {
  concreteStream(self);
  return new StreamInternal(self.channel.mapOutEffect(f));
}

/**
 * Effectfully transforms the chunks emitted by this stream.
 *
 * @tsplus static ets/Stream/Aspects mapChunksEffect
 */
export const mapChunksEffect = Pipeable(mapChunksEffect_);
