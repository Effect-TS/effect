import type { Chunk } from "../../../collection/immutable/Chunk"
import { identity } from "../../../data/Function"
import type { Effect } from "../../../io/Effect"
import type { Stream } from "../definition"

/**
 * Effectfully maps each element to a chunk, and flattens the chunks into the
 * output of this stream.
 *
 * @tsplus fluent ets/Stream mapConcatChunkEffect
 */
export function mapConcatChunkEffect_<R, E, A, R2, E2, A2>(
  self: Stream<R, E, A>,
  f: (a: A) => Effect<R2, E2, Chunk<A2>>,
  __tsplusTrace?: string
): Stream<R & R2, E | E2, A2> {
  return self.mapEffect(f).mapConcatChunk(identity)
}

/**
 * Effectfully maps each element to a chunk, and flattens the chunks into the
 * output of this stream.
 */
export const mapConcatChunkEffect = Pipeable(mapConcatChunkEffect_)
