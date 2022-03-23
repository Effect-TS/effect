import type { Chunk } from "../../../collection/immutable/Chunk"
import type { Effect } from "../../../io/Effect"
import type { Stream } from "../definition"
import { concreteStream, StreamInternal } from "./_internal/StreamInternal"

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
  concreteStream(self)
  return new StreamInternal(self.channel.mapOutEffect(f))
}

/**
 * Effectfully transforms the chunks emitted by this stream.
 */
export const mapChunksEffect = Pipeable(mapChunksEffect_)
