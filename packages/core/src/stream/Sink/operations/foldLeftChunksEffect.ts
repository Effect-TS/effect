import type { Chunk } from "@fp-ts/data/Chunk"
import { constTrue } from "@fp-ts/data/Function"

/**
 * A sink that effectfully folds its input chunks with the provided function
 * and initial state. `f` must preserve chunking-invariance.
 *
 * @tsplus static effect/core/stream/Sink.Ops foldLeftChunksEffect
 * @category folding
 * @since 1.0.0
 */
export function foldLeftChunksEffect<R, E, In, S>(
  z: S,
  f: (s: S, input: Chunk<In>) => Effect<R, E, S>
): Sink<R, E, In, never, S> {
  return Sink.foldChunksEffect(z, constTrue, f).dropLeftover
}
