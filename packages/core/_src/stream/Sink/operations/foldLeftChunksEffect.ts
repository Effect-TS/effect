/**
 * A sink that effectfully folds its input chunks with the provided function
 * and initial state. `f` must preserve chunking-invariance.
 *
 * @tsplus static ets/Sink/Ops foldLeftChunksEffect
 */
export function foldLeftChunksEffect<R, E, In, S>(
  z: LazyArg<S>,
  f: (s: S, input: Chunk<In>) => Effect<R, E, S>,
  __tsplusTrace?: string
): Sink<R, E, In, never, S> {
  return Sink.foldChunksEffect(z, () => true, f).dropLeftover();
}
