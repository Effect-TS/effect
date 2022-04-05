/**
 * A sink that folds its input chunks with the provided function and initial
 * state. `f` must preserve chunking-invariance.
 *
 * @tsplus static ets/Sink/Ops foldLeftChunks
 */
export function foldLeftChunks<In, S>(
  z: LazyArg<S>,
  f: (s: S, input: Chunk<In>) => S,
  __tsplusTrace?: string
): Sink<unknown, never, In, never, S> {
  return Sink.foldChunks(z, () => true, f).dropLeftover();
}
