import { Chunk } from "../../../collection/immutable/Chunk"
import { identity } from "../../../data/Function"
import type { Effect } from "../../../io/Effect"
import type { Stream } from "../definition"

/**
 * Effectfully maps each element to an iterable, and flattens the iterables
 * into the output of this stream.
 *
 * @tsplus fluent ets/Stream mapConcatEffect
 */
export function mapConcatEffect_<R, E, A, R2, E2, A2>(
  self: Stream<R, E, A>,
  f: (a: A) => Effect<R2, E2, Iterable<A2>>,
  __tsplusTrace?: string
): Stream<R & R2, E | E2, A2> {
  return self.mapEffect((a) => f(a).map(Chunk.from)).mapConcatChunk(identity)
}

/**
 * Effectfully maps each element to an iterable, and flattens the iterables
 * into the output of this stream.
 */
export const mapConcatEffect = Pipeable(mapConcatEffect_)
