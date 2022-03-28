import type { Chunk } from "../../../collection/immutable/Chunk"
import type { LazyArg } from "../../../data/Function"
import { constTrue } from "../../../data/Function"
import { Sink } from "../definition"

/**
 * A sink that folds its input chunks with the provided function and initial
 * state. `f` must preserve chunking-invariance.
 *
 * @tsplus static ets/SinkOps foldLeftChunks
 */
export function foldLeftChunks<In, S>(
  z: LazyArg<S>,
  f: (s: S, input: Chunk<In>) => S,
  __tsplusTrace?: string
): Sink<unknown, never, In, never, S> {
  return Sink.foldChunks(z, constTrue, f).dropLeftover()
}
