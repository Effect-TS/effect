import { constTrue } from "@tsplus/stdlib/data/Function"

/**
 * A sink that effectfully folds its input chunks with the provided function
 * and initial state. `f` must preserve chunking-invariance.
 *
 * @tsplus static effect/core/stream/Sink.Ops foldLeftChunksEffect
 */
export function foldLeftChunksEffect<R, E, In, S>(
  z: LazyArg<S>,
  f: (s: S, input: Chunk<In>) => Effect<R, E, S>
): Sink<R, E, In, never, S> {
  return Sink.foldChunksEffect(z, constTrue, f).dropLeftover
}
