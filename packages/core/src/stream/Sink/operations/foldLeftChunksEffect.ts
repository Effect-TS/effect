import type { Chunk } from "../../../collection/immutable/Chunk"
import type { LazyArg } from "../../../data/Function"
import { constTrue } from "../../../data/Function"
import type { Effect } from "../../../io/Effect"
import { Sink } from "../definition"

/**
 * A sink that effectfully folds its input chunks with the provided function
 * and initial state. `f` must preserve chunking-invariance.
 *
 * @tsplus static ets/SinkOps foldLeftChunksEffect
 */
export function foldLeftChunksEffect<R, E, In, S>(
  z: LazyArg<S>,
  f: (s: S, input: Chunk<In>) => Effect<R, E, S>,
  __tsplusTrace?: string
): Sink<R, E, In, never, S> {
  return Sink.foldChunksEffect(z, constTrue, f).dropLeftover()
}
