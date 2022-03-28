import { Chunk } from "../../../collection/immutable/Chunk"
import type { LazyArg } from "../../../data/Function"
import { Sink } from "../definition"

/**
 * Creates a sink that folds elements of type `In` into a structure of type
 * `S`, until `max` worth of elements (determined by the `costFn`) have been
 * folded.
 *
 * @note Elements that have an individual cost larger than `max` will force
 * the sink to cross the `max` cost. See `foldWeightedDecompose` for a variant
 * that can handle these cases.
 *
 * @tsplus static ets/SinkOps foldWeighted
 */
export function foldWeighted<In, S>(
  z: LazyArg<S>,
  costFn: (s: S, input: In) => number,
  max: number,
  f: (s: S, input: In) => S,
  __tsplusTrace?: string
): Sink<unknown, never, In, In, S> {
  return Sink.foldWeightedDecompose(z, costFn, max, Chunk.single, f)
}
